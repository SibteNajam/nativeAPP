-- ============================================================================
-- CRYPTO-GRAPH-TRADER DATABASE SCHEMA BACKUP
-- Generated from NestJS TypeORM Entities
-- Date: February 3, 2026
-- ============================================================================
-- Tables included:
--   1. users (auth, user management)
--   2. refreshtokens (JWT refresh token management)
--   3. orders (Binance/exchange orders - main trading table)
--   4. api_credentials (exchange API keys per user)
--   5. open_orders (Bitget open orders tracking)
--   6. processed_orders (Bitget processed orders - marked as not critical)
-- ============================================================================

-- Enable UUID extension (required for uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS TABLE (Core authentication)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255),
    date_of_birth TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    is_deleted BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    password_updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP(6) AT TIME ZONE 'UTC'),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP(6) AT TIME ZONE 'UTC'),
    
    -- Secret token for password reset / verification
    secret_token VARCHAR(255),
    secret_token_created_at TIMESTAMP,
    
    -- OTP Verification Fields
    otp_code VARCHAR(10),
    otp_expires_at TIMESTAMP,
    otp_attempts INTEGER DEFAULT 0
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- 2. REFRESH TOKENS TABLE (JWT token management)
-- ============================================================================
CREATE TABLE IF NOT EXISTS refreshtokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
    "isRevoked" BOOLEAN NOT NULL DEFAULT FALSE,
    "tokenExpiry" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP(6),
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP(6),
    "deletedAt" TIMESTAMP DEFAULT NULL
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_refreshtokens_user ON refreshtokens("userId");

-- ============================================================================
-- 3. EXCHANGE TYPE ENUM (for api_credentials)
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE exchange_type AS ENUM ('binance', 'bitget', 'gateio', 'mexc', 'alpha_vantage');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 4. API CREDENTIALS TABLE (Exchange API keys per user)
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange exchange_type NOT NULL,
    api_key TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    passphrase TEXT,  -- Optional, for exchanges like Bitget
    is_active BOOLEAN DEFAULT TRUE,
    label VARCHAR(100),  -- User-friendly name like "My Binance Main"
    active_trading BOOLEAN DEFAULT FALSE,  -- Whether used for active WebSocket trading
    profit_transfer_percentage DECIMAL(5, 2) DEFAULT 0.00,
    initial_balance DECIMAL(20, 8) DEFAULT 0.00000000,
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    
    -- One credential per exchange per user
    CONSTRAINT unique_user_exchange UNIQUE (user_id, exchange)
);

-- Indexes for api_credentials
CREATE INDEX IF NOT EXISTS idx_api_credentials_user ON api_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_api_credentials_exchange ON api_credentials(exchange);
CREATE INDEX IF NOT EXISTS idx_api_credentials_active ON api_credentials(is_active);

-- ============================================================================
-- 5. ORDERS TABLE (Main trading orders - Binance/Bitget/etc)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    client_order_id VARCHAR(50),
    exchange VARCHAR(20) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,  -- BUY or SELL
    type VARCHAR(20) NOT NULL,  -- LIMIT, MARKET, STOP_LOSS_LIMIT, etc.
    quantity DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8),
    executed_qty DECIMAL(20, 8) DEFAULT 0,
    status VARCHAR(20) NOT NULL,  -- NEW, FILLED, PARTIALLY_FILLED, CANCELED, etc.
    
    -- Order linking (for TP/SL grouping)
    parent_order_id BIGINT,
    order_group_id VARCHAR(50),
    order_role VARCHAR(20),  -- 'ENTRY', 'TP1', 'TP2', 'SL', 'MANUAL_SELL', 'MANUAL_BUY'
    
    -- TP/SL configuration (stored on entry order)
    tp_levels JSONB,
    sl_price DECIMAL(20, 8),
    
    -- Timestamps (all in UTC)
    order_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    filled_timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Additional metadata
    note TEXT,
    user_id UUID,
    metadata JSONB,  -- {tp1, tp2, sl, finalSignalId, portfolioId, tpGroup}
    
    -- Unique constraint: one order_id per exchange
    CONSTRAINT unique_order_exchange UNIQUE (order_id, exchange)
);

-- Indexes for orders table (critical for performance)
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_exchange ON orders(exchange);
CREATE INDEX IF NOT EXISTS idx_orders_symbol ON orders(symbol);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_parent_order ON orders(parent_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_group ON orders(order_group_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON orders(order_timestamp);

-- ============================================================================
-- 6. OPEN ORDERS TABLE (Bitget open orders tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS open_orders (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    entry_price NUMERIC(10, 4) NOT NULL,
    order_type VARCHAR(10) NOT NULL,  -- 'market' or 'limit'
    size VARCHAR(20) NOT NULL,
    quantity NUMERIC(15, 6) NOT NULL,
    stop_loss VARCHAR(20),
    take_profit NUMERIC(10, 4) NOT NULL,
    side VARCHAR(4) NOT NULL,  -- 'buy' or 'sell'
    force VARCHAR(10) NOT NULL,  -- 'gtc', 'post_only', 'fok', 'ioc'
    order_id VARCHAR(50) NOT NULL,
    client_oid VARCHAR(100) NOT NULL,
    trade_placement_time TIMESTAMP WITH TIME ZONE NOT NULL,
    tp_level INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for symbol lookups
CREATE INDEX IF NOT EXISTS idx_open_orders_symbol ON open_orders(symbol);
CREATE INDEX IF NOT EXISTS idx_open_orders_order_id ON open_orders(order_id);

-- ============================================================================
-- 7. PROCESSED ORDERS TABLE (Bitget processed orders - lower priority)
-- ============================================================================
CREATE TABLE IF NOT EXISTS processed_orders (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    entry_price NUMERIC(10, 4) NOT NULL,
    stop_loss NUMERIC(10, 4),
    take_profit_levels JSONB,  -- Array of {level, price, percentage}
    quantity NUMERIC(15, 6) NOT NULL,
    notional NUMERIC(15, 6) NOT NULL,
    leverage VARCHAR(10) NOT NULL,
    confidence VARCHAR(10) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    analysis_type VARCHAR(20) NOT NULL,
    market_condition VARCHAR(20) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    order_type VARCHAR(10) NOT NULL,
    force VARCHAR(10) NOT NULL,
    margin_mode VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE,
    amount_percentage NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for processed_orders
CREATE INDEX IF NOT EXISTS idx_processed_orders_symbol ON processed_orders(symbol);

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to api_credentials table
DROP TRIGGER IF EXISTS update_api_credentials_updated_at ON api_credentials;
CREATE TRIGGER update_api_credentials_updated_at
    BEFORE UPDATE ON api_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to orders table
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANTS (adjust 'your_app_user' to your actual database user)
-- ============================================================================
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- ============================================================================
-- VERIFICATION QUERIES (run after import to verify)
-- ============================================================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT COUNT(*) FROM users;
-- SELECT COUNT(*) FROM api_credentials;
-- SELECT COUNT(*) FROM orders;
-- SELECT COUNT(*) FROM refreshtokens;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
