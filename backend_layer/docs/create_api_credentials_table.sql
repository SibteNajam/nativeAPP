-- Create api_credentials table
CREATE TABLE IF NOT EXISTS api_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    exchange VARCHAR(50) NOT NULL,
    api_key TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    passphrase TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    label VARCHAR(100),
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT fk_api_credentials_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_user_exchange
        UNIQUE (user_id, exchange)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_credentials_user_id ON api_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_api_credentials_exchange ON api_credentials(exchange);
CREATE INDEX IF NOT EXISTS idx_api_credentials_active ON api_credentials(is_active);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'UTC';
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_api_credentials_updated_at
    BEFORE UPDATE ON api_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();