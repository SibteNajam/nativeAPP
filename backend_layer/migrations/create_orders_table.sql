-- Create orders table to track buy orders and their linked TP/SL orders
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

-- Create indexes for common queries
CREATE INDEX idx_orders_order_id ON orders(order_id);
CREATE INDEX idx_orders_exchange_symbol ON orders(exchange, symbol);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_parent_order_id ON orders(parent_order_id);
CREATE INDEX idx_orders_order_group_id ON orders(order_group_id);
CREATE INDEX idx_orders_order_timestamp ON orders(order_timestamp);
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE orders IS 'Tracks all orders including entry orders and their linked TP/SL orders';
COMMENT ON COLUMN orders.parent_order_id IS 'For TP/SL orders, references the order_id of the entry (buy) order';
COMMENT ON COLUMN orders.order_group_id IS 'UUID linking entry order with its TP/SL orders';
COMMENT ON COLUMN orders.order_role IS 'Role of order: ENTRY for buy orders, TP1/TP2 for take profits, SL for stop loss';
COMMENT ON COLUMN orders.order_timestamp IS 'Timestamp from exchange when order was placed (UTC)';
COMMENT ON COLUMN orders.filled_timestamp IS 'Timestamp when order status changed to FILLED (UTC)';
