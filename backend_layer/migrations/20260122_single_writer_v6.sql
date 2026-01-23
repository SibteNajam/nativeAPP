-- ═══════════════════════════════════════════════════════════════════════════
-- v6.0 SINGLE-WRITER MIGRATION
-- January 22, 2026
-- 
-- This migration implements the CORRECTED single-writer architecture with:
-- 1. SECURITY DEFINER functions (real privilege boundary)
-- 2. No session-variable enforcement (bypassable)
-- 3. No recursion (trigger invokes mutator, mutator doesn't INSERT)
-- 4. Proper reservation (not impersonation)
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 1: CREATE ROLES
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    -- Create ledger_writer role if not exists
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ledger_writer') THEN
        CREATE ROLE ledger_writer NOLOGIN;
        RAISE NOTICE 'Created role: ledger_writer';
    END IF;
    
    -- Create app_role if not exists
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_role') THEN
        CREATE ROLE app_role NOLOGIN;
        RAISE NOTICE 'Created role: app_role';
    END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 2: CREATE TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Positions table
CREATE TABLE IF NOT EXISTS positions (
    position_key VARCHAR(100) PRIMARY KEY,
    user_id UUID NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    
    qty_total DECIMAL(20,8) NOT NULL DEFAULT 0,
    qty_reserved DECIMAL(20,8) NOT NULL DEFAULT 0,
    initial_qty DECIMAL(20,8) NOT NULL DEFAULT 0,
    
    entry_price DECIMAL(20,8),
    avg_cost DECIMAL(20,8),
    
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT qty_non_negative CHECK (qty_total >= 0 AND qty_reserved >= 0),
    CONSTRAINT reserved_lte_total CHECK (qty_reserved <= qty_total)
);

-- Order intents table
CREATE TABLE IF NOT EXISTS order_intents (
    intent_id VARCHAR(32) PRIMARY KEY,
    position_key VARCHAR(100) NOT NULL REFERENCES positions(position_key),
    decision_id VARCHAR(32),
    
    side VARCHAR(4) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    order_type VARCHAR(10) NOT NULL CHECK (order_type IN ('MARKET', 'LIMIT')),
    limit_price DECIMAL(20,8),
    
    qty_requested DECIMAL(20,8) NOT NULL,
    qty_filled DECIMAL(20,8) NOT NULL DEFAULT 0,
    
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'SUBMITTING', 'SUBMITTED', 'PARTIALLY_FILLED', 
        'FILLED', 'CANCELLED', 'FAILED'
    )),
    
    exchange_order_id TEXT,
    client_order_id TEXT UNIQUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    filled_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_intent_position ON order_intents(position_key);
CREATE INDEX IF NOT EXISTS idx_intent_status ON order_intents(status) WHERE status NOT IN ('FILLED', 'CANCELLED', 'FAILED');

-- Fill events table (append-only)
CREATE TABLE IF NOT EXISTS fill_events (
    event_id TEXT PRIMARY KEY,
    intent_id VARCHAR(32) NOT NULL REFERENCES order_intents(intent_id),
    event_type VARCHAR(10) NOT NULL CHECK (event_type IN ('FILL', 'CANCEL', 'FAIL')),
    fill_qty DECIMAL(20,8) NOT NULL DEFAULT 0,
    fill_price DECIMAL(20,8),
    event_ts TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_payload JSONB,
    applied BOOLEAN NOT NULL DEFAULT FALSE,
    applied_at TIMESTAMPTZ,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_fill_events_intent ON fill_events(intent_id);
CREATE INDEX IF NOT EXISTS idx_fill_events_pending ON fill_events(intent_id) WHERE NOT applied;

-- Position ledger (audit trail)
CREATE TABLE IF NOT EXISTS position_ledger (
    ledger_id BIGSERIAL PRIMARY KEY,
    position_key VARCHAR(100) NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    source_function VARCHAR(50) NOT NULL,
    intent_id VARCHAR(32),
    fill_event_id TEXT,
    delta_total DECIMAL(20,8) NOT NULL DEFAULT 0,
    delta_reserved DECIMAL(20,8) NOT NULL DEFAULT 0,
    new_total DECIMAL(20,8) NOT NULL,
    new_reserved DECIMAL(20,8) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_position ON position_ledger(position_key);
CREATE INDEX IF NOT EXISTS idx_ledger_intent ON position_ledger(intent_id);

-- Decision events table
CREATE TABLE IF NOT EXISTS decision_events (
    decision_id VARCHAR(32) PRIMARY KEY,
    decision_type VARCHAR(20) NOT NULL,
    user_id UUID NOT NULL,
    position_key VARCHAR(100) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(4) NOT NULL CHECK (side IN ('BUY', 'SELL')),
    trigger_type VARCHAR(30) NOT NULL,
    trigger_snapshot JSONB NOT NULL,
    decision_payload JSONB NOT NULL,
    decision_window TIMESTAMPTZ NOT NULL,
    decision_seq SMALLINT NOT NULL DEFAULT 1,
    idempotency_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_decision_window_dedup 
ON decision_events(position_key, trigger_type, decision_window, decision_seq);

CREATE UNIQUE INDEX IF NOT EXISTS idx_decision_idempotency
ON decision_events(idempotency_hash);

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 3: GRANT PERMISSIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- ledger_writer: Full access to position/intent tables
GRANT SELECT, UPDATE ON positions TO ledger_writer;
GRANT SELECT, UPDATE ON order_intents TO ledger_writer;
GRANT SELECT, UPDATE ON fill_events TO ledger_writer;
GRANT INSERT ON position_ledger TO ledger_writer;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO ledger_writer;

-- app_role: INSERT only on event tables, SELECT on everything
GRANT INSERT ON fill_events TO app_role;
GRANT INSERT ON decision_events TO app_role;
GRANT INSERT ON order_intents TO app_role;
GRANT INSERT ON positions TO app_role;  -- For initial position creation
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_role;

-- CRITICAL: Revoke direct UPDATE/DELETE from app_role
REVOKE UPDATE, DELETE ON positions FROM app_role;
REVOKE UPDATE, DELETE ON fill_events FROM app_role;
REVOKE UPDATE, DELETE ON decision_events FROM app_role;
-- Note: app_role CAN update order_intents for status transitions (PENDING→SUBMITTED)
-- but the trigger will enforce which transitions are allowed

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 4: CREATE MUTATOR FUNCTION (SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION apply_fill_from_row(p_event_id TEXT)
RETURNS TABLE(
    result TEXT,
    intent_status VARCHAR(20),
    position_qty_total DECIMAL(20,8),
    position_qty_reserved DECIMAL(20,8)
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event RECORD;
    v_intent RECORD;
    v_position RECORD;
    v_delta_fill DECIMAL(20,8);
    v_remaining DECIMAL(20,8);
    v_new_status VARCHAR(20);
BEGIN
    -- Read the event row
    SELECT * INTO v_event
    FROM fill_events
    WHERE event_id = p_event_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'EVENT_NOT_FOUND'::TEXT, NULL::VARCHAR(20), NULL::DECIMAL(20,8), NULL::DECIMAL(20,8);
        RETURN;
    END IF;
    
    -- Skip if already applied
    IF v_event.applied THEN
        RETURN QUERY SELECT 
            'ALREADY_APPLIED'::TEXT,
            (SELECT status FROM order_intents WHERE intent_id = v_event.intent_id),
            (SELECT qty_total FROM positions p 
             JOIN order_intents i ON i.position_key = p.position_key 
             WHERE i.intent_id = v_event.intent_id),
            (SELECT qty_reserved FROM positions p 
             JOIN order_intents i ON i.position_key = p.position_key 
             WHERE i.intent_id = v_event.intent_id);
        RETURN;
    END IF;
    
    -- Lock intent
    SELECT * INTO v_intent
    FROM order_intents
    WHERE intent_id = v_event.intent_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        UPDATE fill_events 
        SET applied = TRUE, applied_at = NOW(), error_message = 'INTENT_NOT_FOUND'
        WHERE event_id = p_event_id;
        RETURN QUERY SELECT 'INTENT_NOT_FOUND'::TEXT, NULL::VARCHAR(20), NULL::DECIMAL(20,8), NULL::DECIMAL(20,8);
        RETURN;
    END IF;
    
    -- Check terminal state
    IF v_intent.status IN ('FILLED', 'CANCELLED', 'FAILED') THEN
        UPDATE fill_events 
        SET applied = TRUE, applied_at = NOW()
        WHERE event_id = p_event_id;
        RETURN QUERY SELECT 
            ('INTENT_TERMINAL:' || v_intent.status)::TEXT,
            v_intent.status, NULL::DECIMAL(20,8), NULL::DECIMAL(20,8);
        RETURN;
    END IF;
    
    -- Lock position
    SELECT * INTO v_position
    FROM positions
    WHERE position_key = v_intent.position_key
    FOR UPDATE;
    
    IF NOT FOUND THEN
        UPDATE fill_events 
        SET applied = TRUE, applied_at = NOW(), error_message = 'POSITION_NOT_FOUND'
        WHERE event_id = p_event_id;
        RETURN QUERY SELECT 'POSITION_NOT_FOUND'::TEXT, NULL::VARCHAR(20), NULL::DECIMAL(20,8), NULL::DECIMAL(20,8);
        RETURN;
    END IF;
    
    -- Apply event
    CASE v_event.event_type
        WHEN 'FILL' THEN
            v_delta_fill := v_event.fill_qty;
            
            UPDATE order_intents
            SET qty_filled = qty_filled + v_delta_fill,
                status = CASE 
                    WHEN qty_filled + v_delta_fill >= qty_requested THEN 'FILLED'
                    ELSE 'PARTIALLY_FILLED'
                END,
                filled_at = CASE 
                    WHEN qty_filled + v_delta_fill >= qty_requested THEN NOW()
                    ELSE filled_at
                END
            WHERE intent_id = v_event.intent_id
            RETURNING status INTO v_new_status;
            
            UPDATE positions
            SET qty_total = qty_total - v_delta_fill,
                qty_reserved = qty_reserved - v_delta_fill,
                updated_at = NOW()
            WHERE position_key = v_intent.position_key;
            
            INSERT INTO position_ledger (
                position_key, event_type, source_function, intent_id, fill_event_id,
                delta_total, delta_reserved, new_total, new_reserved, reason
            ) VALUES (
                v_intent.position_key, 'FILL_APPLIED', 'apply_fill_from_row', 
                v_event.intent_id, p_event_id,
                -v_delta_fill, -v_delta_fill,
                v_position.qty_total - v_delta_fill,
                v_position.qty_reserved - v_delta_fill,
                'Fill delta: ' || v_delta_fill::TEXT
            );
            
        WHEN 'CANCEL', 'FAIL' THEN
            v_remaining := v_intent.qty_requested - v_intent.qty_filled;
            v_delta_fill := 0;
            
            UPDATE order_intents
            SET status = CASE v_event.event_type 
                    WHEN 'CANCEL' THEN 'CANCELLED' 
                    ELSE 'FAILED' 
                END,
                cancelled_at = CASE WHEN v_event.event_type = 'CANCEL' THEN NOW() END,
                failed_at = CASE WHEN v_event.event_type = 'FAIL' THEN NOW() END
            WHERE intent_id = v_event.intent_id
            RETURNING status INTO v_new_status;
            
            IF v_remaining > 0 THEN
                UPDATE positions
                SET qty_reserved = qty_reserved - v_remaining,
                    updated_at = NOW()
                WHERE position_key = v_intent.position_key;
                
                INSERT INTO position_ledger (
                    position_key, event_type, source_function, intent_id, fill_event_id,
                    delta_total, delta_reserved, new_total, new_reserved, reason
                ) VALUES (
                    v_intent.position_key, 'RESERVATION_RELEASED', 'apply_fill_from_row',
                    v_event.intent_id, p_event_id,
                    0, -v_remaining,
                    v_position.qty_total,
                    v_position.qty_reserved - v_remaining,
                    v_event.event_type || ': released ' || v_remaining::TEXT
                );
            END IF;
    END CASE;
    
    -- Mark applied
    UPDATE fill_events
    SET applied = TRUE, applied_at = NOW()
    WHERE event_id = p_event_id;
    
    -- Check closure
    IF v_position.qty_total - COALESCE(v_delta_fill, 0) <= 0.00000001 THEN
        UPDATE positions
        SET status = 'CLOSED', closed_at = NOW()
        WHERE position_key = v_intent.position_key;
    END IF;
    
    RETURN QUERY SELECT 
        'APPLIED'::TEXT,
        v_new_status,
        v_position.qty_total - COALESCE(v_delta_fill, 0),
        v_position.qty_reserved - COALESCE(v_delta_fill, v_remaining, 0::DECIMAL(20,8));
END;
$$ LANGUAGE plpgsql;

-- Set owner to ledger_writer
ALTER FUNCTION apply_fill_from_row(TEXT) OWNER TO ledger_writer;
GRANT EXECUTE ON FUNCTION apply_fill_from_row(TEXT) TO app_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 5: CREATE TRIGGER FOR FILL EVENTS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION trigger_apply_fill_event()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM apply_fill_from_row(NEW.event_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fill_events_apply ON fill_events;
CREATE TRIGGER trg_fill_events_apply
AFTER INSERT ON fill_events
FOR EACH ROW
EXECUTE FUNCTION trigger_apply_fill_event();

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 6: CREATE RESERVATION FUNCTION (SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION reserve_on_intent_create()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_position RECORD;
BEGIN
    SELECT * INTO v_position
    FROM positions
    WHERE position_key = NEW.position_key
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'POSITION_NOT_FOUND: %', NEW.position_key;
    END IF;
    
    IF NEW.qty_requested > (v_position.qty_total - v_position.qty_reserved) THEN
        RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE: requested % > available %',
            NEW.qty_requested,
            v_position.qty_total - v_position.qty_reserved;
    END IF;
    
    UPDATE positions
    SET qty_reserved = qty_reserved + NEW.qty_requested,
        updated_at = NOW()
    WHERE position_key = NEW.position_key;
    
    INSERT INTO position_ledger (
        position_key, event_type, source_function, intent_id,
        delta_total, delta_reserved, new_total, new_reserved, reason
    ) VALUES (
        NEW.position_key, 'RESERVATION_CREATED', 'reserve_on_intent_create',
        NEW.intent_id,
        0, NEW.qty_requested,
        v_position.qty_total,
        v_position.qty_reserved + NEW.qty_requested,
        'Intent created'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION reserve_on_intent_create() OWNER TO ledger_writer;

DROP TRIGGER IF EXISTS trg_reserve_on_intent_create ON order_intents;
CREATE TRIGGER trg_reserve_on_intent_create
AFTER INSERT ON order_intents
FOR EACH ROW
EXECUTE FUNCTION reserve_on_intent_create();

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 7: ENFORCEMENT TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION enforce_position_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF current_user = 'ledger_writer' THEN
        RETURN NEW;
    END IF;
    
    IF (SELECT usesuper FROM pg_user WHERE usename = current_user) THEN
        RAISE WARNING 'SUPERUSER position mutation: %, position=%',
            current_user, COALESCE(OLD.position_key, NEW.position_key);
        RETURN NEW;
    END IF;
    
    RAISE EXCEPTION 'UNAUTHORIZED_MUTATION: Position update blocked. Caller: %, Position: %',
        current_user, COALESCE(OLD.position_key, NEW.position_key);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_position_mutation ON positions;
CREATE TRIGGER trg_enforce_position_mutation
BEFORE UPDATE OF qty_total, qty_reserved ON positions
FOR EACH ROW
EXECUTE FUNCTION enforce_position_mutation();

CREATE OR REPLACE FUNCTION enforce_intent_mutation()
RETURNS TRIGGER AS $$
BEGIN
    IF current_user = 'ledger_writer' THEN
        RETURN NEW;
    END IF;
    
    -- Allow status transitions for submission flow
    IF OLD.qty_filled = NEW.qty_filled THEN
        IF (OLD.status = 'PENDING' AND NEW.status = 'SUBMITTING') OR
           (OLD.status = 'SUBMITTING' AND NEW.status = 'SUBMITTED') THEN
            RETURN NEW;
        END IF;
    END IF;
    
    IF (SELECT usesuper FROM pg_user WHERE usename = current_user) THEN
        RAISE WARNING 'SUPERUSER intent mutation: %, intent=%', current_user, OLD.intent_id;
        RETURN NEW;
    END IF;
    
    RAISE EXCEPTION 'UNAUTHORIZED_MUTATION: Intent update blocked. Caller: %, Intent: %',
        current_user, OLD.intent_id;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_intent_mutation ON order_intents;
CREATE TRIGGER trg_enforce_intent_mutation
BEFORE UPDATE OF qty_filled, status ON order_intents
FOR EACH ROW
EXECUTE FUNCTION enforce_intent_mutation();

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 8: IMMUTABILITY ENFORCEMENT
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION enforce_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- ledger_writer can update fill_events.applied
    IF TG_TABLE_NAME = 'fill_events' AND TG_OP = 'UPDATE' THEN
        IF current_user = 'ledger_writer' THEN
            IF OLD.event_id = NEW.event_id AND 
               OLD.intent_id = NEW.intent_id AND
               OLD.event_type = NEW.event_type AND
               OLD.fill_qty = NEW.fill_qty THEN
                RETURN NEW;
            END IF;
        END IF;
    END IF;
    
    IF (SELECT usesuper FROM pg_user WHERE usename = current_user) THEN
        RAISE WARNING 'SUPERUSER % on %: %, record=%',
            TG_OP, TG_TABLE_NAME, current_user, 
            CASE TG_OP WHEN 'DELETE' THEN OLD::TEXT ELSE NEW::TEXT END;
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;
    
    RAISE EXCEPTION 'IMMUTABLE_VIOLATION: % on % is FORBIDDEN', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fill_events_immutable ON fill_events;
CREATE TRIGGER trg_fill_events_immutable
BEFORE UPDATE OR DELETE ON fill_events
FOR EACH ROW
EXECUTE FUNCTION enforce_immutability();

DROP TRIGGER IF EXISTS trg_decision_events_immutable ON decision_events;
CREATE TRIGGER trg_decision_events_immutable
BEFORE UPDATE OR DELETE ON decision_events
FOR EACH ROW
EXECUTE FUNCTION enforce_immutability();

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 9: INVARIANT CHECK FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_position_invariants()
RETURNS TABLE(
    position_key VARCHAR(100),
    invariant_violated TEXT,
    expected_value DECIMAL(20,8),
    actual_value DECIMAL(20,8),
    difference DECIMAL(20,8)
) AS $$
BEGIN
    -- I2: Reservation consistency
    RETURN QUERY
    SELECT 
        p.position_key,
        'RESERVATION_MISMATCH'::TEXT,
        COALESCE(computed.expected_reserved, 0),
        p.qty_reserved,
        p.qty_reserved - COALESCE(computed.expected_reserved, 0)
    FROM positions p
    LEFT JOIN (
        SELECT 
            i.position_key,
            SUM(i.qty_requested - i.qty_filled) as expected_reserved
        FROM order_intents i
        WHERE i.status IN ('PENDING', 'SUBMITTING', 'SUBMITTED', 'PARTIALLY_FILLED')
        GROUP BY i.position_key
    ) computed ON computed.position_key = p.position_key
    WHERE p.status = 'OPEN'
      AND ABS(p.qty_reserved - COALESCE(computed.expected_reserved, 0)) > 0.00000001;
    
    -- Negative quantities
    RETURN QUERY
    SELECT p.position_key, 'NEGATIVE_QTY'::TEXT, 0::DECIMAL(20,8),
           LEAST(p.qty_total, p.qty_reserved), LEAST(p.qty_total, p.qty_reserved)
    FROM positions p
    WHERE p.qty_total < 0 OR p.qty_reserved < 0;
    
    -- Reserved > total
    RETURN QUERY
    SELECT p.position_key, 'RESERVED_EXCEEDS_TOTAL'::TEXT,
           p.qty_total, p.qty_reserved, p.qty_reserved - p.qty_total
    FROM positions p
    WHERE p.qty_reserved > p.qty_total + 0.00000001;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- PART 10: DECISION WINDOW FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION compute_decision_window(p_timestamp TIMESTAMPTZ DEFAULT NOW())
RETURNS TIMESTAMPTZ AS $$
DECLARE
    window_seconds INT := 300;
BEGIN
    RETURN date_trunc('hour', p_timestamp) 
           + (FLOOR(EXTRACT(EPOCH FROM (p_timestamp - date_trunc('hour', p_timestamp))) / window_seconds) 
              * window_seconds) * INTERVAL '1 second';
END;
$$ LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (Run after migration)
-- ═══════════════════════════════════════════════════════════════════════════

-- Check roles exist
-- SELECT rolname FROM pg_roles WHERE rolname IN ('ledger_writer', 'app_role');

-- Check function ownership
-- SELECT proname, pg_get_userbyid(proowner) as owner 
-- FROM pg_proc 
-- WHERE proname IN ('apply_fill_from_row', 'reserve_on_intent_create');

-- Check SECURITY DEFINER
-- SELECT proname, prosecdef 
-- FROM pg_proc 
-- WHERE proname IN ('apply_fill_from_row', 'reserve_on_intent_create');

-- Check triggers
-- SELECT tgname, tgrelid::regclass, tgfoid::regproc 
-- FROM pg_trigger 
-- WHERE tgname LIKE 'trg_%';

-- Run invariant check
-- SELECT * FROM check_position_invariants();
