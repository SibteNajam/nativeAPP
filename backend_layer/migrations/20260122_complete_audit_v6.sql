-- ═══════════════════════════════════════════════════════════════════════════
-- COMPLETE AUDIT IMPLEMENTATION v6.0
-- From CORRECTED_AUDIT_JAN22_2026.md Parts U, R, N, S, T, W
-- January 22, 2026
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- PART U.1: DB-TIME DECISION WINDOWS
-- ═══════════════════════════════════════════════════════════════════════════

-- Function: Compute decision window from DB time (not orchestrator clock)
CREATE OR REPLACE FUNCTION compute_decision_window(p_timestamp TIMESTAMPTZ DEFAULT NOW())
RETURNS TIMESTAMPTZ AS $$
DECLARE
    window_seconds INT := 300;  -- 5 minutes
BEGIN
    RETURN date_trunc('hour', p_timestamp) 
           + (FLOOR(EXTRACT(EPOCH FROM (p_timestamp - date_trunc('hour', p_timestamp))) / window_seconds) 
              * window_seconds) * INTERVAL '1 second';
END;
$$ LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE;

COMMENT ON FUNCTION compute_decision_window IS 
'Computes 5-minute decision window from DB time. Example: 12:59:59 → 12:55:00, 13:04:59 → 13:00:00';


-- ═══════════════════════════════════════════════════════════════════════════
-- PART U.1.3: DECISION_EVENTS with row_hash (tamper detection)
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing table if exists (for clean migration)
DROP TABLE IF EXISTS decision_events CASCADE;

CREATE TABLE decision_events (
    -- Identity
    decision_id VARCHAR(32) PRIMARY KEY,
    decision_type VARCHAR(20) NOT NULL,
    
    -- Policy context (frozen at decision time)
    policy_hash VARCHAR(16) NOT NULL,
    policy_version INT NOT NULL,
    
    -- Target
    user_id UUID NOT NULL,
    position_key VARCHAR(100) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(4) NOT NULL,
    
    -- Trigger context (immutable snapshot)
    trigger_type VARCHAR(30) NOT NULL,
    trigger_snapshot JSONB NOT NULL,
    
    -- Decision payload
    decision_payload JSONB NOT NULL,
    
    -- DB-authoritative window (Part U.1.2)
    decision_window TIMESTAMPTZ NOT NULL DEFAULT compute_decision_window(NOW()),
    
    -- Sequence within window for multi-decisions (Part U.1.4)
    decision_seq SMALLINT NOT NULL DEFAULT 1,
    
    -- Idempotency
    idempotency_hash VARCHAR(64) NOT NULL,
    
    -- Row hash for tamper detection (Part U.2.4)
    row_hash VARCHAR(64) GENERATED ALWAYS AS (
        encode(sha256(
            (decision_id || '|' || 
             decision_type || '|' ||
             position_key || '|' ||
             trigger_type || '|' ||
             decision_window::TEXT || '|' ||
             decision_seq::TEXT || '|' ||
             trigger_snapshot::TEXT || '|' ||
             decision_payload::TEXT
            )::BYTEA
        ), 'hex')
    ) STORED,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_decision_type CHECK (decision_type IN (
        'ENTRY_DECISION', 'EXIT_DECISION', 'MANUAL_DECISION', 'DCA_DECISION', 'RECONCILE_DECISION'
    )),
    CONSTRAINT valid_side CHECK (side IN ('BUY', 'SELL')),
    CONSTRAINT valid_seq CHECK (decision_seq BETWEEN 1 AND 10)
);

-- Window-based uniqueness with sequence support
CREATE UNIQUE INDEX idx_decision_window_dedup 
ON decision_events(position_key, trigger_type, decision_window, decision_seq);

-- Idempotency for exact duplicate detection
CREATE UNIQUE INDEX idx_decision_idempotency
ON decision_events(idempotency_hash);

-- Efficient lookups
CREATE INDEX idx_decision_user ON decision_events(user_id);
CREATE INDEX idx_decision_symbol ON decision_events(symbol);
CREATE INDEX idx_decision_created ON decision_events(created_at);
CREATE INDEX idx_decision_position ON decision_events(position_key);


-- ═══════════════════════════════════════════════════════════════════════════
-- PART U.1.4: Advisory Lock-Based Sequence Allocation (NOT MAX+1)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION allocate_decision_seq_v2(
    p_position_key VARCHAR(100),
    p_trigger_type VARCHAR(30),
    p_decision_window TIMESTAMPTZ
) RETURNS SMALLINT AS $$
DECLARE
    v_lock_key BIGINT;
    v_next_seq SMALLINT;
BEGIN
    -- Compute deterministic lock key from inputs
    v_lock_key := hashtext(p_position_key || ':' || p_trigger_type || ':' || p_decision_window::TEXT);
    
    -- Acquire advisory lock (blocks concurrent allocations)
    PERFORM pg_advisory_xact_lock(v_lock_key);
    
    -- Now safely get next sequence
    SELECT COALESCE(MAX(decision_seq), 0) + 1 INTO v_next_seq
    FROM decision_events
    WHERE position_key = p_position_key
      AND trigger_type = p_trigger_type
      AND decision_window = p_decision_window;
    
    IF v_next_seq > 10 THEN
        RAISE EXCEPTION 'MAX_DECISIONS_PER_WINDOW: 10 reached for %/% at %',
            p_position_key, p_trigger_type, p_decision_window;
    END IF;
    
    RETURN v_next_seq;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART U.2.4: Row Hash Verification Functions
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION verify_decision_integrity(p_decision_id VARCHAR(32))
RETURNS TABLE(
    decision_id VARCHAR(32),
    stored_hash VARCHAR(64),
    computed_hash VARCHAR(64),
    integrity_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.decision_id,
        d.row_hash as stored_hash,
        encode(sha256(
            (d.decision_id || '|' || 
             d.decision_type || '|' ||
             d.position_key || '|' ||
             d.trigger_type || '|' ||
             d.decision_window::TEXT || '|' ||
             d.decision_seq::TEXT || '|' ||
             d.trigger_snapshot::TEXT || '|' ||
             d.decision_payload::TEXT
            )::BYTEA
        ), 'hex') as computed_hash,
        d.row_hash = encode(sha256(
            (d.decision_id || '|' || 
             d.decision_type || '|' ||
             d.position_key || '|' ||
             d.trigger_type || '|' ||
             d.decision_window::TEXT || '|' ||
             d.decision_seq::TEXT || '|' ||
             d.trigger_snapshot::TEXT || '|' ||
             d.decision_payload::TEXT
            )::BYTEA
        ), 'hex') as integrity_valid
    FROM decision_events d
    WHERE d.decision_id = p_decision_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION verify_all_decision_integrity()
RETURNS TABLE(
    total_decisions BIGINT,
    valid_decisions BIGINT,
    tampered_decisions BIGINT,
    tampered_ids TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH verification AS (
        SELECT 
            d.decision_id,
            d.row_hash = encode(sha256(
                (d.decision_id || '|' || 
                 d.decision_type || '|' ||
                 d.position_key || '|' ||
                 d.trigger_type || '|' ||
                 d.decision_window::TEXT || '|' ||
                 d.decision_seq::TEXT || '|' ||
                 d.trigger_snapshot::TEXT || '|' ||
                 d.decision_payload::TEXT
                )::BYTEA
            ), 'hex') as is_valid
        FROM decision_events d
    )
    SELECT 
        COUNT(*)::BIGINT as total_decisions,
        SUM(CASE WHEN is_valid THEN 1 ELSE 0 END)::BIGINT as valid_decisions,
        SUM(CASE WHEN NOT is_valid THEN 1 ELSE 0 END)::BIGINT as tampered_decisions,
        ARRAY_AGG(verification.decision_id) FILTER (WHERE NOT is_valid) as tampered_ids
    FROM verification;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART N.1: STATE MACHINE UNDER ADVISORY LOCK
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION submit_order_intent(
    p_intent_id VARCHAR(32)
) RETURNS TABLE(
    success BOOLEAN,
    reason VARCHAR(50),
    intent_status VARCHAR(20)
) AS $$
DECLARE
    v_intent RECORD;
    v_lock_key BIGINT;
BEGIN
    -- 1. Compute deterministic lock key from intent_id
    v_lock_key := hashtext('intent:' || p_intent_id);
    
    -- 2. Acquire advisory lock (blocks concurrent workers)
    PERFORM pg_advisory_xact_lock(v_lock_key);
    
    -- 3. SELECT FOR UPDATE within same transaction
    SELECT * INTO v_intent
    FROM order_intents
    WHERE intent_id = p_intent_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'INTENT_NOT_FOUND'::VARCHAR(50), NULL::VARCHAR(20);
        RETURN;
    END IF;
    
    -- 4. State machine validation
    IF v_intent.status != 'PENDING' THEN
        RETURN QUERY SELECT FALSE, 
            ('INVALID_STATE:' || v_intent.status)::VARCHAR(50),
            v_intent.status::VARCHAR(20);
        RETURN;
    END IF;
    
    -- 5. Atomic state transition
    UPDATE order_intents
    SET status = 'SUBMITTING',
        submitted_at = NOW()
    WHERE intent_id = p_intent_id;
    
    -- 6. Return success (lock released on commit)
    RETURN QUERY SELECT TRUE, 'OK'::VARCHAR(50), 'SUBMITTING'::VARCHAR(20);
END;
$$ LANGUAGE plpgsql;


-- Mark intent as submitted after exchange confirms
CREATE OR REPLACE FUNCTION mark_intent_submitted(
    p_intent_id VARCHAR(32),
    p_exchange_order_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_lock_key BIGINT;
    v_intent RECORD;
BEGIN
    v_lock_key := hashtext('intent:' || p_intent_id);
    PERFORM pg_advisory_xact_lock(v_lock_key);
    
    SELECT * INTO v_intent
    FROM order_intents
    WHERE intent_id = p_intent_id
    FOR UPDATE;
    
    IF NOT FOUND OR v_intent.status != 'SUBMITTING' THEN
        RETURN FALSE;
    END IF;
    
    UPDATE order_intents
    SET status = 'SUBMITTED',
        exchange_order_id = p_exchange_order_id
    WHERE intent_id = p_intent_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;


-- Mark intent as failed
CREATE OR REPLACE FUNCTION mark_intent_failed(
    p_intent_id VARCHAR(32),
    p_error_message TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_lock_key BIGINT;
    v_intent RECORD;
    v_position RECORD;
BEGIN
    v_lock_key := hashtext('intent:' || p_intent_id);
    PERFORM pg_advisory_xact_lock(v_lock_key);
    
    SELECT * INTO v_intent
    FROM order_intents
    WHERE intent_id = p_intent_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Only PENDING or SUBMITTING can transition to FAILED
    IF v_intent.status NOT IN ('PENDING', 'SUBMITTING') THEN
        RETURN FALSE;
    END IF;
    
    -- Release reservation
    SELECT * INTO v_position
    FROM positions
    WHERE position_key = v_intent.position_key
    FOR UPDATE;
    
    IF FOUND THEN
        UPDATE positions
        SET qty_reserved = qty_reserved - (v_intent.qty_requested - v_intent.qty_filled),
            updated_at = NOW()
        WHERE position_key = v_intent.position_key;
        
        -- Audit log
        INSERT INTO position_ledger (
            position_key, event_type, source_function, intent_id,
            delta_total, delta_reserved, new_total, new_reserved, reason
        ) VALUES (
            v_intent.position_key, 'RESERVATION_RELEASED', 'mark_intent_failed',
            p_intent_id,
            0, -(v_intent.qty_requested - v_intent.qty_filled),
            v_position.qty_total,
            v_position.qty_reserved - (v_intent.qty_requested - v_intent.qty_filled),
            'Intent failed: ' || p_error_message
        );
    END IF;
    
    UPDATE order_intents
    SET status = 'FAILED',
        failed_at = NOW()
    WHERE intent_id = p_intent_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to ledger_writer (these need to update positions)
ALTER FUNCTION mark_intent_failed(VARCHAR(32), TEXT) OWNER TO ledger_writer;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART U.4.3: COMPLETE RESERVATION LIFECYCLE FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Release reservation on CANCELLED (different from FAILED - no error)
CREATE OR REPLACE FUNCTION release_intent_reservation(
    p_intent_id VARCHAR(32)
) RETURNS VOID AS $$
DECLARE
    v_intent RECORD;
    v_position RECORD;
BEGIN
    -- Get intent with lock on position
    SELECT i.*, p.position_key as pos_key, p.qty_total, p.qty_reserved
    INTO v_intent
    FROM order_intents i
    JOIN positions p ON p.position_key = i.position_key
    WHERE i.intent_id = p_intent_id
    FOR UPDATE OF p;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'INTENT_NOT_FOUND: %', p_intent_id;
    END IF;
    
    IF v_intent.status NOT IN ('FAILED', 'CANCELLED') THEN
        RAISE EXCEPTION 'INVALID_STATE_FOR_RELEASE: % is %', p_intent_id, v_intent.status;
    END IF;
    
    -- Release the reservation (qty_requested minus any partial fills)
    UPDATE positions
    SET qty_reserved = qty_reserved - (v_intent.qty_requested - v_intent.qty_filled),
        updated_at = NOW()
    WHERE position_key = v_intent.position_key;
    
    -- If there were partial fills, also reduce total
    IF v_intent.qty_filled > 0 THEN
        UPDATE positions
        SET qty_total = qty_total - v_intent.qty_filled
        WHERE position_key = v_intent.position_key;
    END IF;
    
    -- Audit log
    INSERT INTO position_ledger (
        position_key, event_type, source_function, intent_id,
        delta_total, delta_reserved, new_total, new_reserved, reason
    ) VALUES (
        v_intent.position_key, 'RESERVATION_RELEASED', 'release_intent_reservation',
        p_intent_id,
        -COALESCE(v_intent.qty_filled, 0),
        -(v_intent.qty_requested - v_intent.qty_filled),
        v_intent.qty_total - COALESCE(v_intent.qty_filled, 0),
        v_intent.qty_reserved - (v_intent.qty_requested - v_intent.qty_filled),
        'Intent ' || v_intent.status || ' - reservation released'
    );
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION release_intent_reservation(VARCHAR(32)) OWNER TO ledger_writer;


-- Handle late fills (exchange filled after we marked FAILED)
CREATE OR REPLACE FUNCTION handle_late_fill(
    p_intent_id VARCHAR(32),
    p_actual_filled DECIMAL(20,8),
    p_exchange_order_id VARCHAR(100)
) RETURNS VARCHAR(32) AS $$
DECLARE
    v_intent RECORD;
    v_position RECORD;
    v_reconcile_decision_id VARCHAR(32);
BEGIN
    SELECT * INTO v_intent
    FROM order_intents
    WHERE intent_id = p_intent_id
    FOR UPDATE;
    
    IF v_intent.status != 'FAILED' THEN
        RAISE EXCEPTION 'LATE_FILL_ONLY_FOR_FAILED: % is %', p_intent_id, v_intent.status;
    END IF;
    
    -- Get position
    SELECT * INTO v_position
    FROM positions
    WHERE position_key = v_intent.position_key
    FOR UPDATE;
    
    -- Create reconciliation decision
    v_reconcile_decision_id := 'dec_' || gen_random_uuid()::TEXT;
    
    INSERT INTO decision_events (
        decision_id, decision_type, policy_hash, policy_version,
        user_id, position_key, symbol, side,
        trigger_type, trigger_snapshot, decision_payload,
        decision_window, decision_seq, idempotency_hash
    ) VALUES (
        v_reconcile_decision_id, 'RECONCILE_DECISION', 'RECONCILE', 0,
        v_intent.user_id, v_intent.position_key, 
        (SELECT symbol FROM positions WHERE position_key = v_intent.position_key),
        v_intent.side,
        'LATE_FILL_RECONCILE',
        jsonb_build_object(
            'original_intent_id', p_intent_id,
            'exchange_order_id', p_exchange_order_id,
            'discovered_at', NOW()
        ),
        jsonb_build_object(
            'action', 'RECONCILE_LATE_FILL',
            'quantity', p_actual_filled,
            'reason', 'Exchange filled order after system marked FAILED'
        ),
        compute_decision_window(NOW()), 1,
        encode(sha256(('LATE_FILL:' || p_intent_id || ':' || p_actual_filled::TEXT)::BYTEA), 'hex')
    );
    
    -- Update intent status to reflect reconciliation
    UPDATE order_intents
    SET status = 'FILLED',
        qty_filled = p_actual_filled,
        exchange_order_id = p_exchange_order_id,
        filled_at = NOW()
    WHERE intent_id = p_intent_id;
    
    -- Adjust position (was already released, now need to reduce total)
    UPDATE positions
    SET qty_total = qty_total - p_actual_filled,
        updated_at = NOW()
    WHERE position_key = v_intent.position_key;
    
    -- Audit log
    INSERT INTO position_ledger (
        position_key, event_type, source_function, intent_id,
        delta_total, delta_reserved, new_total, new_reserved, reason
    ) VALUES (
        v_intent.position_key, 'LATE_FILL_RECONCILED', 'handle_late_fill',
        p_intent_id,
        -p_actual_filled, 0,
        v_position.qty_total - p_actual_filled,
        v_position.qty_reserved,
        'Late fill reconciled: ' || v_reconcile_decision_id
    );
    
    RETURN v_reconcile_decision_id;
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION handle_late_fill(VARCHAR(32), DECIMAL(20,8), VARCHAR(100)) OWNER TO ledger_writer;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART U.4.4: RESERVATION INTEGRITY CHECK
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION verify_reservation_integrity()
RETURNS TABLE(
    position_key VARCHAR(100),
    recorded_reserved DECIMAL(20,8),
    computed_reserved DECIMAL(20,8),
    difference DECIMAL(20,8)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.position_key,
        p.qty_reserved as recorded_reserved,
        COALESCE(SUM(
            CASE WHEN i.status IN ('PENDING', 'SUBMITTING', 'SUBMITTED', 'PARTIALLY_FILLED')
            THEN i.qty_requested - i.qty_filled
            ELSE 0 END
        ), 0::DECIMAL(20,8)) as computed_reserved,
        p.qty_reserved - COALESCE(SUM(
            CASE WHEN i.status IN ('PENDING', 'SUBMITTING', 'SUBMITTED', 'PARTIALLY_FILLED')
            THEN i.qty_requested - i.qty_filled
            ELSE 0 END
        ), 0::DECIMAL(20,8)) as difference
    FROM positions p
    LEFT JOIN order_intents i ON i.position_key = p.position_key
    WHERE p.status = 'OPEN'
    GROUP BY p.position_key, p.qty_reserved
    HAVING ABS(p.qty_reserved - COALESCE(SUM(
            CASE WHEN i.status IN ('PENDING', 'SUBMITTING', 'SUBMITTED', 'PARTIALLY_FILLED')
            THEN i.qty_requested - i.qty_filled
            ELSE 0 END
        ), 0::DECIMAL(20,8))) > 0.00000001;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART W.1: EXTENDED INVARIANT CHECK
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS check_position_invariants();

CREATE OR REPLACE FUNCTION check_position_invariants()
RETURNS TABLE(
    position_key VARCHAR(100),
    invariant_code VARCHAR(10),
    invariant_violated TEXT,
    expected_value DECIMAL(20,8),
    actual_value DECIMAL(20,8),
    difference DECIMAL(20,8)
) AS $$
BEGIN
    -- I1: Position Conservation (qty_total >= 0)
    RETURN QUERY
    SELECT
        p.position_key,
        'I1'::VARCHAR(10),
        'NEGATIVE_QTY_TOTAL'::TEXT,
        0::DECIMAL(20,8),
        p.qty_total,
        p.qty_total
    FROM positions p
    WHERE p.qty_total < 0;
    
    -- I2: Reservation Correctness (qty_reserved = Σ(remaining) over active intents)
    RETURN QUERY
    SELECT 
        p.position_key,
        'I2'::VARCHAR(10),
        'RESERVATION_MISMATCH'::TEXT,
        COALESCE(computed.expected_reserved, 0::DECIMAL(20,8)),
        p.qty_reserved,
        p.qty_reserved - COALESCE(computed.expected_reserved, 0::DECIMAL(20,8))
    FROM positions p
    LEFT JOIN (
        SELECT 
            i.position_key,
            SUM(i.qty_requested - i.qty_filled)::DECIMAL(20,8) as expected_reserved
        FROM order_intents i
        WHERE i.status IN ('PENDING', 'SUBMITTING', 'SUBMITTED', 'PARTIALLY_FILLED')
        GROUP BY i.position_key
    ) computed ON computed.position_key = p.position_key
    WHERE p.status = 'OPEN'
      AND ABS(p.qty_reserved - COALESCE(computed.expected_reserved, 0::DECIMAL(20,8))) > 0.00000001;
    
    -- I3: Reserved cannot exceed Total
    RETURN QUERY
    SELECT
        p.position_key,
        'I3'::VARCHAR(10),
        'RESERVED_EXCEEDS_TOTAL'::TEXT,
        p.qty_total,
        p.qty_reserved,
        p.qty_reserved - p.qty_total
    FROM positions p
    WHERE p.qty_reserved > p.qty_total + 0.00000001;
    
    -- I4: No negative reservation
    RETURN QUERY
    SELECT
        p.position_key,
        'I4'::VARCHAR(10),
        'NEGATIVE_RESERVATION'::TEXT,
        0::DECIMAL(20,8),
        p.qty_reserved,
        p.qty_reserved
    FROM positions p
    WHERE p.qty_reserved < 0;
    
    -- I5: Decision-Intent linkage (every intent has decision)
    RETURN QUERY
    SELECT
        i.position_key,
        'I5'::VARCHAR(10),
        'ORPHAN_INTENT_NO_DECISION'::TEXT,
        1::DECIMAL(20,8),  -- expected: has decision
        0::DECIMAL(20,8),  -- actual: no decision
        1::DECIMAL(20,8)
    FROM order_intents i
    LEFT JOIN decision_events d ON d.decision_id = i.decision_id
    WHERE i.decision_id IS NOT NULL 
      AND d.decision_id IS NULL;
    
    -- I12: Ledger completeness (every fill has ledger entry)
    RETURN QUERY
    SELECT
        fe.intent_id::VARCHAR(100) as position_key,
        'I12'::VARCHAR(10),
        'FILL_WITHOUT_LEDGER'::TEXT,
        1::DECIMAL(20,8),
        0::DECIMAL(20,8),
        1::DECIMAL(20,8)
    FROM fill_events fe
    LEFT JOIN position_ledger pl ON pl.fill_event_id = fe.event_id
    WHERE fe.applied = TRUE
      AND fe.event_type = 'FILL'
      AND pl.ledger_id IS NULL;
      
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART N.6: TIERED RECONCILIATION SUPPORT TABLES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reconciliation_mismatches (
    mismatch_id BIGSERIAL PRIMARY KEY,
    mismatch_class VARCHAR(10) NOT NULL,  -- A, B, C, D, E, F, G, H, Z
    entity_type VARCHAR(20) NOT NULL,     -- intent, position, decision, order
    entity_id VARCHAR(100) NOT NULL,
    
    severity SMALLINT NOT NULL,           -- 0=OBSERVE, 1=AUTO_REPAIR, 2=DEGRADE, 3=HALT
    
    description TEXT NOT NULL,
    expected_state JSONB,
    actual_state JSONB,
    
    -- Auto-repair tracking
    auto_repair_action VARCHAR(50),
    repair_attempted BOOLEAN DEFAULT FALSE,
    repair_succeeded BOOLEAN,
    repair_error TEXT,
    
    -- Timestamps
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    
    -- Escalation tracking
    consecutive_count INT DEFAULT 1,
    escalated BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMPTZ
);

CREATE INDEX idx_mismatch_class ON reconciliation_mismatches(mismatch_class);
CREATE INDEX idx_mismatch_severity ON reconciliation_mismatches(severity);
CREATE INDEX idx_mismatch_unresolved ON reconciliation_mismatches(entity_id, mismatch_class) 
    WHERE resolved_at IS NULL;


-- System alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
    alert_id BIGSERIAL PRIMARY KEY,
    alert_type VARCHAR(50) NOT NULL,
    severity SMALLINT NOT NULL,
    message TEXT NOT NULL,
    context JSONB,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_unack ON system_alerts(alert_type) WHERE NOT acknowledged;


-- Trading mode control
CREATE TABLE IF NOT EXISTS trading_mode (
    mode_id SERIAL PRIMARY KEY,
    mode VARCHAR(20) NOT NULL DEFAULT 'NORMAL',  -- NORMAL, DEGRADED, HALTED
    reason TEXT,
    changed_by VARCHAR(100),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_mode CHECK (mode IN ('NORMAL', 'DEGRADED', 'HALTED'))
);

-- Insert default mode
INSERT INTO trading_mode (mode, reason, changed_by)
VALUES ('NORMAL', 'System initialized', 'migration')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- PART R.3: ORDER_INTENTS → DECISION_EVENTS LINKAGE
-- ═══════════════════════════════════════════════════════════════════════════

-- Add user_id to order_intents if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_intents' AND column_name = 'user_id') THEN
        ALTER TABLE order_intents ADD COLUMN user_id UUID;
    END IF;
END $$;

-- Add trigger_type to order_intents if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_intents' AND column_name = 'trigger_type') THEN
        ALTER TABLE order_intents ADD COLUMN trigger_type VARCHAR(30);
    END IF;
END $$;

-- Add idempotency_key to order_intents if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_intents' AND column_name = 'idempotency_key') THEN
        ALTER TABLE order_intents ADD COLUMN idempotency_key VARCHAR(64);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_intent_idempotency ON order_intents(idempotency_key);
    END IF;
END $$;

-- Add policy_hash to order_intents if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'order_intents' AND column_name = 'policy_hash') THEN
        ALTER TABLE order_intents ADD COLUMN policy_hash VARCHAR(16);
    END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- NONCE STORAGE FOR REPLAY PROTECTION (Part U.3)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS decision_nonces (
    nonce VARCHAR(64) PRIMARY KEY,
    decision_id VARCHAR(32) NOT NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes'
);

CREATE INDEX idx_nonce_expires ON decision_nonces(expires_at);

-- Cleanup function for expired nonces
CREATE OR REPLACE FUNCTION cleanup_expired_nonces()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM decision_nonces
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════
-- GRANT PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Grant app_role permissions on new tables
GRANT INSERT, SELECT ON decision_events TO app_role;
GRANT SELECT ON reconciliation_mismatches TO app_role;
GRANT INSERT, SELECT ON system_alerts TO app_role;
GRANT SELECT ON trading_mode TO app_role;
GRANT INSERT, SELECT, DELETE ON decision_nonces TO app_role;

-- Sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_role;

-- ledger_writer can update reconciliation mismatches
GRANT SELECT, UPDATE ON reconciliation_mismatches TO ledger_writer;
GRANT SELECT, UPDATE ON trading_mode TO ledger_writer;


-- ═══════════════════════════════════════════════════════════════════════════
-- SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════
/*
This migration implements:

PART U.1 - DB-Time Decision Windows:
  - compute_decision_window() function
  - decision_events table with DB-computed window
  - allocate_decision_seq_v2() with advisory lock

PART U.2 - Row Hash Verification:
  - row_hash GENERATED column on decision_events
  - verify_decision_integrity() function
  - verify_all_decision_integrity() function

PART N.1 - State Machine Under Advisory Lock:
  - submit_order_intent() function
  - mark_intent_submitted() function
  - mark_intent_failed() function

PART U.4 - Reservation Lifecycle:
  - release_intent_reservation() function
  - handle_late_fill() function
  - verify_reservation_integrity() function

PART W.1 - Extended Invariant Checks:
  - check_position_invariants() with I1-I5, I12

PART N.6 - Tiered Reconciliation Support:
  - reconciliation_mismatches table
  - system_alerts table
  - trading_mode table

PART U.3 - Replay Protection:
  - decision_nonces table
  - cleanup_expired_nonces() function
*/
