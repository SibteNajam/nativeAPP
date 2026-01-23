-- ═══════════════════════════════════════════════════════════════════════════
-- ANALYST FIXES v6.1 - January 22, 2026
-- Addresses remaining landmines identified in code review:
-- 1. BUY/SELL side-aware fill application
-- 2. Late-fill handling (don't drop on floor)
-- 3. Login roles with membership grants
-- 4. Return value bugs
-- 5. New invariants (I_fill_sum, I_terminal_consistency)
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- FIX 1: LOGIN ROLES WITH MEMBERSHIP GRANTS
-- 
-- The analyst correctly identified that app_role NOLOGIN means nothing
-- unless we bind real login users to it.
-- ═══════════════════════════════════════════════════════════════════════════

-- Create login roles (with actual LOGIN capability)
DO $$
BEGIN
    -- app_user: The login role used by Python orchestrator and NestJS backend
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user LOGIN;
    END IF;
    
    -- readonly_user: For dashboards, reporting, debugging
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'readonly_user') THEN
        CREATE ROLE readonly_user LOGIN;
    END IF;
END $$;

-- Grant role membership (app_user inherits app_role privileges)
GRANT app_role TO app_user;
GRANT readonly_role TO readonly_user;

-- Ensure default privileges for future tables don't accidentally grant more
ALTER DEFAULT PRIVILEGES IN SCHEMA public
REVOKE ALL ON TABLES FROM PUBLIC;

COMMENT ON ROLE app_user IS 
'Login role for application services. Inherits app_role. Cannot directly UPDATE positions/order_intents.';

COMMENT ON ROLE readonly_user IS 
'Login role for dashboards/reporting. SELECT only.';


-- ═══════════════════════════════════════════════════════════════════════════
-- FIX 2: SIDE-AWARE apply_fill_from_row()
-- 
-- The original function always did qty_total -= fill_qty which is
-- ONLY correct for SELL orders. BUY orders should INCREASE holdings.
--
-- For this system (crypto futures), we track BASE asset positions.
-- SELL intent = selling base asset = decrease qty_total
-- BUY intent = buying base asset = increase qty_total
--
-- RESERVATION STRATEGY:
-- - SELL: reserves qty_total (base units we're selling)
-- - BUY: should reserve quote currency, but we track base positions
--        So we add a quote_reserved column OR enforce SELL-only pipeline
--
-- DECISION: Enforce SELL-only for this fill pipeline (existing positions).
--           Entry trades (BUY to open) go through position creation, not fills.
-- ═══════════════════════════════════════════════════════════════════════════

-- Add quote_reserved for BUY intents (alternative approach)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'positions' AND column_name = 'quote_reserved') THEN
        ALTER TABLE positions ADD COLUMN quote_reserved DECIMAL(20,8) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Replace the fill mutator with side-aware version
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
    v_new_total DECIMAL(20,8);
    v_new_reserved DECIMAL(20,8);
BEGIN
    -- ═══════════════════════════════════════════════════════════════════════
    -- STEP 1: Read the event row
    -- ═══════════════════════════════════════════════════════════════════════
    SELECT * INTO v_event
    FROM fill_events
    WHERE event_id = p_event_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 'EVENT_NOT_FOUND'::TEXT, NULL::VARCHAR(20), 
                            NULL::DECIMAL(20,8), NULL::DECIMAL(20,8);
        RETURN;
    END IF;
    
    -- Idempotent: skip if already applied
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
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- STEP 2: Lock intent
    -- ═══════════════════════════════════════════════════════════════════════
    SELECT * INTO v_intent
    FROM order_intents
    WHERE intent_id = v_event.intent_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        UPDATE fill_events 
        SET applied = TRUE, applied_at = NOW(), error_message = 'INTENT_NOT_FOUND'
        WHERE event_id = p_event_id;
        
        RETURN QUERY SELECT 'INTENT_NOT_FOUND'::TEXT, NULL::VARCHAR(20), 
                            NULL::DECIMAL(20,8), NULL::DECIMAL(20,8);
        RETURN;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- STEP 2.5: LATE FILL HANDLING (FIX #2)
    -- 
    -- If intent is terminal AND this is a FILL event, DO NOT drop on floor.
    -- Route to reconciliation instead.
    -- ═══════════════════════════════════════════════════════════════════════
    IF v_intent.status IN ('FILLED', 'CANCELLED', 'FAILED') THEN
        IF v_event.event_type = 'FILL' THEN
            -- LATE FILL: Don't silently ignore! Mark for reconciliation.
            UPDATE fill_events 
            SET applied = FALSE,  -- NOT applied = needs reconciliation
                applied_at = NULL,
                error_message = 'LATE_FILL_PENDING_RECON:intent_status=' || v_intent.status
            WHERE event_id = p_event_id;
            
            -- Insert mismatch for reconciliation engine
            INSERT INTO reconciliation_mismatches (
                mismatch_class, entity_type, entity_id, severity,
                description, expected_state, actual_state
            ) VALUES (
                'E',  -- FILL_NO_INTENT (late fill variant)
                'fill_event',
                p_event_id,
                2,    -- S2_DEGRADE severity
                'Late fill arrived after intent marked ' || v_intent.status,
                jsonb_build_object('expected_intent_status', 'SUBMITTED or PARTIALLY_FILLED'),
                jsonb_build_object(
                    'actual_intent_status', v_intent.status,
                    'fill_qty', v_event.fill_qty,
                    'intent_id', v_event.intent_id
                )
            );
            
            RETURN QUERY SELECT 
                ('LATE_FILL_QUARANTINED:' || v_intent.status)::TEXT,
                v_intent.status,
                NULL::DECIMAL(20,8),
                NULL::DECIMAL(20,8);
            RETURN;
        ELSE
            -- CANCEL/FAIL on terminal intent - just acknowledge
            UPDATE fill_events 
            SET applied = TRUE, applied_at = NOW()
            WHERE event_id = p_event_id;
            
            RETURN QUERY SELECT 
                ('INTENT_TERMINAL:' || v_intent.status)::TEXT,
                v_intent.status,
                NULL::DECIMAL(20,8),
                NULL::DECIMAL(20,8);
            RETURN;
        END IF;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- STEP 3: Lock position
    -- ═══════════════════════════════════════════════════════════════════════
    SELECT * INTO v_position
    FROM positions
    WHERE position_key = v_intent.position_key
    FOR UPDATE;
    
    IF NOT FOUND THEN
        UPDATE fill_events 
        SET applied = TRUE, applied_at = NOW(), error_message = 'POSITION_NOT_FOUND'
        WHERE event_id = p_event_id;
        
        RETURN QUERY SELECT 'POSITION_NOT_FOUND'::TEXT, NULL::VARCHAR(20), 
                            NULL::DECIMAL(20,8), NULL::DECIMAL(20,8);
        RETURN;
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- STEP 4: Apply event based on type AND SIDE (FIX #1)
    -- ═══════════════════════════════════════════════════════════════════════
    CASE v_event.event_type
        WHEN 'FILL' THEN
            v_delta_fill := v_event.fill_qty;
            
            -- Update intent qty_filled
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
            
            -- ═══════════════════════════════════════════════════════════════
            -- SIDE-AWARE POSITION UPDATE (THE CRITICAL FIX)
            -- ═══════════════════════════════════════════════════════════════
            IF v_intent.side = 'SELL' THEN
                -- SELL fill: decrease holdings, release reservation
                v_new_total := v_position.qty_total - v_delta_fill;
                v_new_reserved := v_position.qty_reserved - v_delta_fill;
                
                UPDATE positions
                SET qty_total = v_new_total,
                    qty_reserved = v_new_reserved,
                    updated_at = NOW()
                WHERE position_key = v_intent.position_key;
                
                INSERT INTO position_ledger (
                    position_key, event_type, source_function, intent_id, fill_event_id,
                    delta_total, delta_reserved, new_total, new_reserved, reason
                ) VALUES (
                    v_intent.position_key, 'SELL_FILL_APPLIED', 'apply_fill_from_row', 
                    v_event.intent_id, p_event_id,
                    -v_delta_fill, -v_delta_fill,
                    v_new_total, v_new_reserved,
                    'SELL fill: -' || v_delta_fill::TEXT || ' base units'
                );
                
            ELSIF v_intent.side = 'BUY' THEN
                -- BUY fill: INCREASE holdings, release quote reservation (not base)
                v_new_total := v_position.qty_total + v_delta_fill;
                -- Note: qty_reserved stays same (BUY doesn't reserve base units)
                -- Quote reservation is separate (quote_reserved column)
                v_new_reserved := v_position.qty_reserved;
                
                UPDATE positions
                SET qty_total = v_new_total,
                    -- Release quote reservation proportionally
                    quote_reserved = GREATEST(0, quote_reserved - (v_delta_fill * COALESCE(v_event.fill_price, 0))),
                    updated_at = NOW()
                WHERE position_key = v_intent.position_key;
                
                INSERT INTO position_ledger (
                    position_key, event_type, source_function, intent_id, fill_event_id,
                    delta_total, delta_reserved, new_total, new_reserved, reason
                ) VALUES (
                    v_intent.position_key, 'BUY_FILL_APPLIED', 'apply_fill_from_row', 
                    v_event.intent_id, p_event_id,
                    +v_delta_fill, 0,  -- BUY increases total, no base reservation change
                    v_new_total, v_new_reserved,
                    'BUY fill: +' || v_delta_fill::TEXT || ' base units @ ' || COALESCE(v_event.fill_price::TEXT, 'market')
                );
            ELSE
                -- Unknown side - this should never happen, but don't corrupt data
                UPDATE fill_events 
                SET applied = FALSE, applied_at = NULL, 
                    error_message = 'UNKNOWN_SIDE:' || COALESCE(v_intent.side, 'NULL')
                WHERE event_id = p_event_id;
                
                RETURN QUERY SELECT 
                    ('UNKNOWN_SIDE:' || COALESCE(v_intent.side, 'NULL'))::TEXT,
                    v_intent.status,
                    v_position.qty_total,
                    v_position.qty_reserved;
                RETURN;
            END IF;
            
        WHEN 'CANCEL', 'FAIL' THEN
            -- Release remaining reservation based on side
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
                IF v_intent.side = 'SELL' THEN
                    -- Release base reservation
                    v_new_reserved := v_position.qty_reserved - v_remaining;
                    v_new_total := v_position.qty_total;
                    
                    UPDATE positions
                    SET qty_reserved = v_new_reserved,
                        updated_at = NOW()
                    WHERE position_key = v_intent.position_key;
                    
                ELSIF v_intent.side = 'BUY' THEN
                    -- Release quote reservation (BUY doesn't reserve base)
                    v_new_reserved := v_position.qty_reserved;
                    v_new_total := v_position.qty_total;
                    
                    UPDATE positions
                    SET quote_reserved = GREATEST(0, quote_reserved - (v_remaining * COALESCE(v_intent.limit_price, 0))),
                        updated_at = NOW()
                    WHERE position_key = v_intent.position_key;
                END IF;
                
                INSERT INTO position_ledger (
                    position_key, event_type, source_function, intent_id, fill_event_id,
                    delta_total, delta_reserved, new_total, new_reserved, reason
                ) VALUES (
                    v_intent.position_key, 'RESERVATION_RELEASED', 'apply_fill_from_row',
                    v_event.intent_id, p_event_id,
                    0, 
                    CASE WHEN v_intent.side = 'SELL' THEN -v_remaining ELSE 0 END,
                    v_new_total,
                    v_new_reserved,
                    v_event.event_type || ' (' || v_intent.side || '): released ' || v_remaining::TEXT
                );
            ELSE
                v_new_total := v_position.qty_total;
                v_new_reserved := v_position.qty_reserved;
            END IF;
            
    END CASE;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- STEP 5: Mark event as applied
    -- ═══════════════════════════════════════════════════════════════════════
    UPDATE fill_events
    SET applied = TRUE, applied_at = NOW()
    WHERE event_id = p_event_id;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- STEP 6: Check position closure (only for SELL fills reducing to zero)
    -- ═══════════════════════════════════════════════════════════════════════
    IF v_new_total <= 0.00000001 THEN
        UPDATE positions
        SET status = 'CLOSED', closed_at = NOW()
        WHERE position_key = v_intent.position_key
          AND status = 'OPEN';
    END IF;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- STEP 7: Return CORRECT values (FIX #4)
    -- ═══════════════════════════════════════════════════════════════════════
    RETURN QUERY SELECT 
        'APPLIED'::TEXT,
        v_new_status,
        v_new_total,
        v_new_reserved;
        
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION apply_fill_from_row(TEXT) OWNER TO ledger_writer;


-- ═══════════════════════════════════════════════════════════════════════════
-- FIX 3: BUY RESERVATION FUNCTION (reserve quote, not base)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION reserve_on_intent_create()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_position RECORD;
    v_quote_needed DECIMAL(20,8);
BEGIN
    SELECT * INTO v_position
    FROM positions
    WHERE position_key = NEW.position_key
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'POSITION_NOT_FOUND: %', NEW.position_key;
    END IF;
    
    IF NEW.side = 'SELL' THEN
        -- SELL: Reserve base units
        IF NEW.qty_requested > (v_position.qty_total - v_position.qty_reserved) THEN
            RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE: requested % > available % (total=%, reserved=%)',
                NEW.qty_requested,
                v_position.qty_total - v_position.qty_reserved,
                v_position.qty_total,
                v_position.qty_reserved;
        END IF;
        
        UPDATE positions
        SET qty_reserved = qty_reserved + NEW.qty_requested,
            updated_at = NOW()
        WHERE position_key = NEW.position_key;
        
        INSERT INTO position_ledger (
            position_key, event_type, source_function, intent_id,
            delta_total, delta_reserved, new_total, new_reserved, reason
        ) VALUES (
            NEW.position_key, 'SELL_RESERVATION_CREATED', 'reserve_on_intent_create',
            NEW.intent_id,
            0, NEW.qty_requested,
            v_position.qty_total,
            v_position.qty_reserved + NEW.qty_requested,
            'SELL intent: reserved ' || NEW.qty_requested || ' base units'
        );
        
    ELSIF NEW.side = 'BUY' THEN
        -- BUY: Reserve quote units (need limit_price or use market estimate)
        v_quote_needed := NEW.qty_requested * COALESCE(NEW.limit_price, 0);
        
        -- Note: For market orders without price, we'd need an estimated price
        -- For now, we track quote_reserved for accounting but don't enforce limit
        
        UPDATE positions
        SET quote_reserved = quote_reserved + v_quote_needed,
            updated_at = NOW()
        WHERE position_key = NEW.position_key;
        
        INSERT INTO position_ledger (
            position_key, event_type, source_function, intent_id,
            delta_total, delta_reserved, new_total, new_reserved, reason
        ) VALUES (
            NEW.position_key, 'BUY_RESERVATION_CREATED', 'reserve_on_intent_create',
            NEW.intent_id,
            0, 0,  -- BUY doesn't affect base reservation
            v_position.qty_total,
            v_position.qty_reserved,
            'BUY intent: reserved ' || v_quote_needed || ' quote units'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION reserve_on_intent_create() OWNER TO ledger_writer;


-- ═══════════════════════════════════════════════════════════════════════════
-- FIX 5: NEW INVARIANTS (I_fill_sum, I_terminal_consistency)
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
    WHERE p.qty_total < -0.00000001;
    
    -- I2: Reservation Correctness (qty_reserved = Σ(remaining) over active SELL intents)
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
          AND i.side = 'SELL'  -- Only SELL intents reserve base qty
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
    WHERE p.qty_reserved < -0.00000001;
    
    -- I5: Decision-Intent linkage (every intent has decision)
    RETURN QUERY
    SELECT
        i.position_key,
        'I5'::VARCHAR(10),
        'ORPHAN_INTENT_NO_DECISION'::TEXT,
        1::DECIMAL(20,8),
        0::DECIMAL(20,8),
        1::DECIMAL(20,8)
    FROM order_intents i
    LEFT JOIN decision_events d ON d.decision_id = i.decision_id
    WHERE i.decision_id IS NOT NULL 
      AND d.decision_id IS NULL;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- NEW INVARIANT: I_FILL_SUM
    -- For each intent, qty_filled == SUM(fill_events.fill_qty WHERE applied AND event_type='FILL')
    -- ═══════════════════════════════════════════════════════════════════════
    RETURN QUERY
    SELECT
        i.position_key,
        'I_FILL'::VARCHAR(10),
        'FILL_SUM_MISMATCH'::TEXT,
        COALESCE(fe_sum.total_fill, 0::DECIMAL(20,8)) as expected_value,
        i.qty_filled as actual_value,
        i.qty_filled - COALESCE(fe_sum.total_fill, 0::DECIMAL(20,8)) as difference
    FROM order_intents i
    LEFT JOIN (
        SELECT 
            fe.intent_id,
            SUM(fe.fill_qty)::DECIMAL(20,8) as total_fill
        FROM fill_events fe
        WHERE fe.applied = TRUE
          AND fe.event_type = 'FILL'
        GROUP BY fe.intent_id
    ) fe_sum ON fe_sum.intent_id = i.intent_id
    WHERE ABS(i.qty_filled - COALESCE(fe_sum.total_fill, 0::DECIMAL(20,8))) > 0.00000001;
    
    -- ═══════════════════════════════════════════════════════════════════════
    -- NEW INVARIANT: I_TERMINAL_CONSISTENCY
    -- If intent.status = 'FILLED' then qty_filled >= qty_requested - epsilon
    -- ═══════════════════════════════════════════════════════════════════════
    RETURN QUERY
    SELECT
        i.position_key,
        'I_TERM'::VARCHAR(10),
        'FILLED_BUT_INCOMPLETE'::TEXT,
        i.qty_requested as expected_value,
        i.qty_filled as actual_value,
        i.qty_requested - i.qty_filled as difference
    FROM order_intents i
    WHERE i.status = 'FILLED'
      AND i.qty_filled < i.qty_requested - 0.00000001;
    
    -- I12: Ledger completeness (every fill has ledger entry)
    RETURN QUERY
    SELECT
        oi.position_key,
        'I12'::VARCHAR(10),
        'FILL_WITHOUT_LEDGER'::TEXT,
        1::DECIMAL(20,8),
        0::DECIMAL(20,8),
        1::DECIMAL(20,8)
    FROM fill_events fe
    JOIN order_intents oi ON oi.intent_id = fe.intent_id
    LEFT JOIN position_ledger pl ON pl.fill_event_id = fe.event_id
    WHERE fe.applied = TRUE
      AND fe.event_type = 'FILL'
      AND pl.ledger_id IS NULL;
      
    -- I13: No unprocessed late fills pending for too long
    RETURN QUERY
    SELECT
        oi.position_key,
        'I13'::VARCHAR(10),
        'STALE_LATE_FILL'::TEXT,
        1::DECIMAL(20,8),
        0::DECIMAL(20,8),
        EXTRACT(EPOCH FROM (NOW() - fe.received_at))::DECIMAL(20,8) as difference
    FROM fill_events fe
    JOIN order_intents oi ON oi.intent_id = fe.intent_id
    WHERE fe.applied = FALSE
      AND fe.error_message LIKE 'LATE_FILL%'
      AND fe.received_at < NOW() - INTERVAL '15 minutes';
      
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════
-- FIX 6: LATE FILL RECONCILIATION FUNCTION
-- 
-- Called by reconciliation engine to apply quarantined late fills
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION reconcile_late_fill(p_event_id TEXT)
RETURNS TABLE(
    success BOOLEAN,
    action TEXT,
    reconcile_decision_id VARCHAR(32)
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_event RECORD;
    v_intent RECORD;
    v_position RECORD;
    v_decision_id VARCHAR(32);
BEGIN
    -- Get the late fill event
    SELECT * INTO v_event
    FROM fill_events
    WHERE event_id = p_event_id
      AND applied = FALSE
      AND error_message LIKE 'LATE_FILL%'
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'EVENT_NOT_FOUND_OR_ALREADY_PROCESSED'::TEXT, NULL::VARCHAR(32);
        RETURN;
    END IF;
    
    -- Get intent (should be terminal)
    SELECT * INTO v_intent
    FROM order_intents
    WHERE intent_id = v_event.intent_id
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'INTENT_NOT_FOUND'::TEXT, NULL::VARCHAR(32);
        RETURN;
    END IF;
    
    -- Get position
    SELECT * INTO v_position
    FROM positions
    WHERE position_key = v_intent.position_key
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'POSITION_NOT_FOUND'::TEXT, NULL::VARCHAR(32);
        RETURN;
    END IF;
    
    -- Create reconciliation decision
    v_decision_id := 'dec_' || encode(gen_random_bytes(12), 'hex');
    
    INSERT INTO decision_events (
        decision_id, decision_type, policy_hash, policy_version,
        user_id, position_key, symbol, side,
        trigger_type, trigger_snapshot, decision_payload,
        decision_window, decision_seq, idempotency_hash
    ) VALUES (
        v_decision_id, 'RECONCILE_DECISION', 'LATEFILL', 0,
        COALESCE(v_intent.user_id, '00000000-0000-0000-0000-000000000000'::UUID),
        v_intent.position_key, 
        (SELECT symbol FROM positions WHERE position_key = v_intent.position_key),
        v_intent.side,
        'LATE_FILL_RECONCILE',
        jsonb_build_object(
            'original_event_id', p_event_id,
            'original_intent_status', v_intent.status,
            'fill_qty', v_event.fill_qty
        ),
        jsonb_build_object(
            'action', 'APPLY_LATE_FILL',
            'quantity', v_event.fill_qty
        ),
        compute_decision_window(NOW()), 1,
        encode(sha256(('LATEFILL:' || p_event_id)::BYTEA), 'hex')
    );
    
    -- Apply the fill based on side
    IF v_intent.side = 'SELL' THEN
        UPDATE positions
        SET qty_total = qty_total - v_event.fill_qty,
            updated_at = NOW()
        WHERE position_key = v_intent.position_key;
    ELSE
        UPDATE positions
        SET qty_total = qty_total + v_event.fill_qty,
            updated_at = NOW()
        WHERE position_key = v_intent.position_key;
    END IF;
    
    -- Update intent
    UPDATE order_intents
    SET qty_filled = qty_filled + v_event.fill_qty,
        status = CASE 
            WHEN qty_filled + v_event.fill_qty >= qty_requested THEN 'FILLED'
            ELSE status
        END
    WHERE intent_id = v_event.intent_id;
    
    -- Mark fill event as applied
    UPDATE fill_events
    SET applied = TRUE, 
        applied_at = NOW(),
        error_message = 'LATE_FILL_RECONCILED:' || v_decision_id
    WHERE event_id = p_event_id;
    
    -- Audit log
    INSERT INTO position_ledger (
        position_key, event_type, source_function, intent_id, fill_event_id,
        delta_total, delta_reserved, new_total, new_reserved, reason
    ) VALUES (
        v_intent.position_key, 'LATE_FILL_RECONCILED', 'reconcile_late_fill',
        v_event.intent_id, p_event_id,
        CASE WHEN v_intent.side = 'SELL' THEN -v_event.fill_qty ELSE +v_event.fill_qty END,
        0,
        v_position.qty_total + CASE WHEN v_intent.side = 'SELL' THEN -v_event.fill_qty ELSE +v_event.fill_qty END,
        v_position.qty_reserved,
        'Late fill reconciled via ' || v_decision_id
    );
    
    -- Update mismatch as resolved
    UPDATE reconciliation_mismatches
    SET resolved_at = NOW(),
        repair_succeeded = TRUE,
        auto_repair_action = 'reconcile_late_fill'
    WHERE entity_id = p_event_id
      AND mismatch_class = 'E'
      AND resolved_at IS NULL;
    
    RETURN QUERY SELECT TRUE, 'LATE_FILL_APPLIED'::TEXT, v_decision_id;
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION reconcile_late_fill(TEXT) OWNER TO ledger_writer;


-- ═══════════════════════════════════════════════════════════════════════════
-- FIX 7: PRIVILEGE BOUNDARY VERIFICATION FUNCTION
-- 
-- Call this to prove the boundary works
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION verify_privilege_boundary()
RETURNS TABLE(
    test_name TEXT,
    passed BOOLEAN,
    detail TEXT
) AS $$
DECLARE
    v_current_user TEXT;
    v_can_update_positions BOOLEAN;
    v_can_update_intents BOOLEAN;
    v_can_insert_fills BOOLEAN;
BEGIN
    v_current_user := current_user;
    
    -- Test 1: Current user identification
    RETURN QUERY SELECT 
        'current_user_identity'::TEXT,
        v_current_user IN ('app_user', 'readonly_user'),
        ('connected as: ' || v_current_user)::TEXT;
    
    -- Test 2: Cannot update positions directly
    BEGIN
        EXECUTE 'UPDATE positions SET qty_total = qty_total WHERE FALSE';
        v_can_update_positions := TRUE;
    EXCEPTION WHEN insufficient_privilege THEN
        v_can_update_positions := FALSE;
    END;
    
    RETURN QUERY SELECT
        'cannot_update_positions'::TEXT,
        NOT v_can_update_positions,
        CASE WHEN v_can_update_positions THEN 'FAIL: can update positions!' ELSE 'OK: blocked' END::TEXT;
    
    -- Test 3: Cannot update order_intents.qty_filled directly
    BEGIN
        EXECUTE 'UPDATE order_intents SET qty_filled = qty_filled WHERE FALSE';
        v_can_update_intents := TRUE;
    EXCEPTION WHEN insufficient_privilege THEN
        v_can_update_intents := FALSE;
    END;
    
    RETURN QUERY SELECT
        'cannot_update_intents'::TEXT,
        NOT v_can_update_intents,
        CASE WHEN v_can_update_intents THEN 'FAIL: can update intents!' ELSE 'OK: blocked' END::TEXT;
    
    -- Test 4: CAN insert into fill_events
    BEGIN
        -- Don't actually insert, just check permission
        EXECUTE 'INSERT INTO fill_events (event_id, intent_id, event_type, fill_qty, event_ts) 
                 SELECT ''test'', ''test'', ''FILL'', 0, NOW() WHERE FALSE';
        v_can_insert_fills := TRUE;
    EXCEPTION WHEN insufficient_privilege THEN
        v_can_insert_fills := FALSE;
    END;
    
    RETURN QUERY SELECT
        'can_insert_fill_events'::TEXT,
        v_can_insert_fills,
        CASE WHEN v_can_insert_fills THEN 'OK: can insert fills' ELSE 'FAIL: cannot insert fills!' END::TEXT;
    
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════
-- SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════
/*
ANALYST FIXES v6.1:

1. LOGIN ROLES:
   - Created app_user (LOGIN) with GRANT app_role TO app_user
   - Created readonly_user (LOGIN) with GRANT readonly_role TO readonly_user
   - Services must connect as app_user, not owner/superuser

2. SIDE-AWARE FILL APPLICATION:
   - apply_fill_from_row() now branches on v_intent.side
   - SELL: qty_total -= fill_qty, qty_reserved -= fill_qty
   - BUY: qty_total += fill_qty, quote_reserved -= fill_value
   - Added quote_reserved column for BUY orders

3. LATE FILL HANDLING:
   - Late fills (intent terminal + FILL event) are NOT applied=TRUE
   - Instead: applied=FALSE, error_message='LATE_FILL_PENDING_RECON'
   - Mismatch class 'E' inserted for reconciliation
   - reconcile_late_fill() function to process quarantined fills

4. RETURN VALUE FIXES:
   - CANCEL/FAIL path now returns v_new_reserved (computed correctly)
   - All paths return actually-computed values, not stale position state

5. NEW INVARIANTS:
   - I_FILL_SUM: qty_filled == SUM(fill_events.fill_qty) for each intent
   - I_TERMINAL: FILLED intents must have qty_filled >= qty_requested
   - I13: No stale late fills pending > 15 minutes

6. PRIVILEGE VERIFICATION:
   - verify_privilege_boundary() function to prove boundary works
*/
