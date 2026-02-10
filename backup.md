

CREATE TABLE open_orders (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    entry_price NUMERIC(10,4) NOT NULL,
    order_type VARCHAR(10) NOT NULL,
    size VARCHAR(20) NOT NULL,
    quantity NUMERIC(15,6) NOT NULL,
    stop_loss VARCHAR(20),
    take_profit NUMERIC(10,4) NOT NULL,
    side VARCHAR(4) NOT NULL,
    force VARCHAR(3) NOT NULL,
    order_id VARCHAR(50) NOT NULL,
    client_oid VARCHAR(100) NOT NULL,
    trade_placement_time TIMESTAMPTZ NOT NULL,
    tp_level INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);




CREATE TABLE processed_orders (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    entry_price NUMERIC(10,4) NOT NULL,
    stop_loss NUMERIC(10,4),
    take_profit_levels JSONB,
    quantity NUMERIC(15,6) NOT NULL,
    notional NUMERIC(15,6) NOT NULL,
    leverage VARCHAR(10) NOT NULL,
    confidence VARCHAR(10) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    analysis_type VARCHAR(20) NOT NULL,
    market_condition VARCHAR(20) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    order_type VARCHAR(10) NOT NULL,
    force VARCHAR(10) NOT NULL,
    margin_mode VARCHAR(20) NOT NULL,
    timestamp TIMESTAMPTZ,
    amount_percentage NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


select * from processed_orders;
select * from open_orders;


pg_dump --schema-only --no-owner --no-privileges \
-h ep-1234-BYTEBOOMDB.ap-southeast-1.aws.neon.tech \
-U sibtenajam -d mydb -p 5432 > schema_only.sql



CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    date_of_birth TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    password VARCHAR(255),
    is_deleted BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    password_updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP(6) AT TIME ZONE 'UTC'),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP(6) AT TIME ZONE 'UTC'),
    secret_token VARCHAR(255),
    secret_token_created_at TIMESTAMP
);
select * from users;

CREATE TABLE refreshtokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "isRevoked" BOOLEAN DEFAULT FALSE NOT NULL,
    "tokenExpiry" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') NOT NULL,
    "deletedAt" TIMESTAMP,
    "userId" UUID NOT NULL,
    CONSTRAINT "FK_refreshtokens_user" FOREIGN KEY ("userId") 
        REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
select  * from users;

SELECT * FROM  api_credentials;
TRUNCATE TABLE api_credentials RESTART IDENTITY CASCADE;


CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    
    -- Order identification
    order_id BIGINT NOT NULL,
    client_order_id VARCHAR(50),
    exchange VARCHAR(20) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    
    -- Order details
    side VARCHAR(10) NOT NULL, -- BUY or SELL
    type VARCHAR(20) NOT NULL, -- LIMIT, MARKET, STOP_LOSS_LIMIT, etc.
    quantity DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8),
    executed_qty DECIMAL(20, 8) DEFAULT 0,
    status VARCHAR(20) NOT NULL, -- NEW, FILLED, PARTIALLY_FILLED, CANCELED, etc.
    
    -- Linking orders
    parent_order_id BIGINT, -- For TP/SL orders, this links to the buy order_id
    order_group_id VARCHAR(50), -- UUID to group buy order with its TP/SL orders
    order_role VARCHAR(10), -- 'ENTRY', 'TP1', 'TP2', 'SL'
    
    -- TP/SL configuration (stored on entry order)
    tp_levels JSONB, -- Array of TP levels [435.6, 420.3]
    sl_price DECIMAL(20, 8),
    
    -- Timestamps (all in UTC)
    order_timestamp TIMESTAMP WITH TIME ZONE NOT NULL, -- When order was placed on exchange
    filled_timestamp TIMESTAMP WITH TIME ZONE, -- When order was filled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional metadata
    note TEXT,
    user_id INTEGER, -- Optional: link to user if you have user table
    
    -- Indexes for fast lookups
    CONSTRAINT orders_order_id_exchange_unique UNIQUE(order_id, exchange)
);






select * from trades;

DROP TABLE trades CASCADE;
select * from users;
select * from api_cre
select * fROM orders WHERE SYMBOL = 'AVNTUSDT';
select * from orders;
select * from orders where symbol = 'TIAUSDT' AND user_id = '2d7ca37d-9d20-407a-a5eb-791bfe8227a2';
select * from api_credentials;
delete from users whe
select * from orders where user_id = '2d7ca37d-9d20-407a-a5eb-791bfe8227a2';
SELECT *
FROM orders
WHERE created_at >= NOW() - INTERVAL '24 hours'
	AND user_id = '2d7ca37d-9d20-407a-a5eb-791bfe8227a2'
ORDER BY created_at DESC;
select * from positions;
select * from position_ledger;
delete from users where email = 'sibtenajam11@gmail.com';
DELETE FROM refreshtokens 
WHERE "userId" = 'd4053225-74db-4de5-9657-b35bba93ef7f';

select * from refreshtokens;
select symbol,side,type,quantity,price,order_group_id,status,order_role,created_at  from orders where user_id = 'fdc7c522-5b12-42ca-bfe5-964b82d90661' ORDER BY created_at DESC;
ALTER TABLE api_credentials
ADD COLUMN profit_transfer_percentage DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN initial_balance DECIMAL(20, 8) DEFAULT 0.00000000;

-- 1. CREATE THE MAIN TABLE
CREATE TABLE IF NOT EXISTS biometric_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    device_id VARCHAR(255) NOT NULL UNIQUE,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50),
    biometric_type VARCHAR(50),
    refresh_token_id UUID,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP,
    revoked_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_biometric_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_device UNIQUE (user_id, device_id)
);

-- 2. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX idx_biometric_devices_user_id ON biometric_devices(user_id);
CREATE INDEX idx_biometric_devices_device_id ON biometric_devices(device_id);
CREATE INDEX idx_biometric_devices_active ON biometric_devices(is_active) WHERE is_active = true;
CREATE INDEX idx_biometric_devices_last_used ON biometric_devices(last_used_at DESC);

-- 3. CREATE TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_biometric_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. CREATE TRIGGER
CREATE TRIGGER trigger_biometric_devices_updated_at
    BEFORE UPDATE ON biometric_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_biometric_devices_updated_at();

-- 5. ADD COLUMN TO USERS TABLE


ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT false;



SELECT tablename FROM pg_tables WHERE tablename = 'biometric_devices';

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'biometric_devices' 
ORDER BY ordinal_position;

SELECT * FROM biometric_devices 
WHERE user_id = '' 
AND is_active = true;

SELECT indexname FROM pg_indexes WHERE tablename = 'biometric_devices';



