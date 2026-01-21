-- Create api_credentials table
-- This stores encrypted exchange API credentials per user

CREATE TABLE IF NOT EXISTS api_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exchange VARCHAR(50) NOT NULL CHECK (exchange IN ('binance', 'mexc', 'bitget', 'gateio')),
    api_key TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    passphrase TEXT,
    is_active BOOLEAN DEFAULT true,
    label VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: one credential per exchange per user
    CONSTRAINT unique_user_exchange UNIQUE (user_id, exchange)
);

-- Create index for faster lookups
CREATE INDEX idx_api_credentials_user_id ON api_credentials(user_id);
CREATE INDEX idx_api_credentials_exchange ON api_credentials(exchange);
CREATE INDEX idx_api_credentials_user_exchange ON api_credentials(user_id, exchange) WHERE is_active = true;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_api_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_api_credentials_updated_at
    BEFORE UPDATE ON api_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_api_credentials_updated_at();

-- Add comments
COMMENT ON TABLE api_credentials IS 'Stores encrypted exchange API credentials for users';
COMMENT ON COLUMN api_credentials.api_key IS 'Encrypted API key from exchange';
COMMENT ON COLUMN api_credentials.secret_key IS 'Encrypted secret key from exchange';
COMMENT ON COLUMN api_credentials.passphrase IS 'Encrypted passphrase (optional, for exchanges like Bitget)';
COMMENT ON COLUMN api_credentials.is_active IS 'Whether this credential is currently active';
COMMENT ON COLUMN api_credentials.label IS 'User-friendly label for this credential';
