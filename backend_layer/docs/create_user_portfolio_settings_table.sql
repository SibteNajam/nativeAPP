-- Create user_portfolio_settings table for per-user capital and risk management
-- Run this migration in PostgreSQL (Railway database)

CREATE TABLE IF NOT EXISTS user_portfolio_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    
    -- Portfolio Settings
    total_capital DECIMAL(18, 2) NOT NULL DEFAULT 150.00,
    trading_enabled BOOLEAN DEFAULT TRUE,
    
    -- Risk Management Settings
    max_position_size_pct DECIMAL(5, 4) NOT NULL DEFAULT 0.1330, -- 13.3% = ~$20 for $150
    max_total_exposure_pct DECIMAL(5, 4) NOT NULL DEFAULT 0.6000, -- 60% max deployed
    max_drawdown_pct DECIMAL(5, 4) NOT NULL DEFAULT 0.3000, -- 30% loss tolerance
    max_positions INTEGER NOT NULL DEFAULT 3, -- Max concurrent positions
    
    -- Metadata
    created_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    updated_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),

    CONSTRAINT fk_user_portfolio_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    
    -- Validation constraints
    CONSTRAINT chk_total_capital_positive CHECK (total_capital > 0),
    CONSTRAINT chk_max_position_size_valid CHECK (max_position_size_pct > 0 AND max_position_size_pct <= 1),
    CONSTRAINT chk_max_exposure_valid CHECK (max_total_exposure_pct > 0 AND max_total_exposure_pct <= 1),
    CONSTRAINT chk_max_drawdown_valid CHECK (max_drawdown_pct > 0 AND max_drawdown_pct <= 1),
    CONSTRAINT chk_max_positions_positive CHECK (max_positions > 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_portfolio_user_id ON user_portfolio_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_portfolio_trading_enabled ON user_portfolio_settings(trading_enabled);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_portfolio_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'UTC';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_portfolio_updated_at
    BEFORE UPDATE ON user_portfolio_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_portfolio_updated_at();

-- Optional: Insert default settings for existing users
-- Uncomment and modify as needed:
-- INSERT INTO user_portfolio_settings (user_id, total_capital, max_position_size_pct, max_total_exposure_pct, max_drawdown_pct, max_positions)
-- SELECT id, 150.00, 0.1330, 0.6000, 0.3000, 3
-- FROM users
-- WHERE id NOT IN (SELECT user_id FROM user_portfolio_settings);

COMMENT ON TABLE user_portfolio_settings IS 'Per-user portfolio and risk management settings for automated trading';
COMMENT ON COLUMN user_portfolio_settings.total_capital IS 'Total capital available for trading (USD)';
COMMENT ON COLUMN user_portfolio_settings.max_position_size_pct IS 'Maximum percentage of capital per single position (0.1330 = 13.3%)';
COMMENT ON COLUMN user_portfolio_settings.max_total_exposure_pct IS 'Maximum total exposure across all positions (0.6000 = 60%)';
COMMENT ON COLUMN user_portfolio_settings.max_drawdown_pct IS 'Maximum drawdown tolerance before risk reduction (0.3000 = 30%)';
COMMENT ON COLUMN user_portfolio_settings.max_positions IS 'Maximum number of concurrent open positions';
COMMENT ON COLUMN user_portfolio_settings.trading_enabled IS 'Whether automated trading is enabled for this user';
