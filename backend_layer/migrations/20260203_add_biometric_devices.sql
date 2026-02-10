-- Migration: Add biometric device registration support
-- Created: 2026-02-03
-- Purpose: Enable users to register devices for biometric authentication

-- Create biometric_devices table
CREATE TABLE IF NOT EXISTS biometric_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    device_id VARCHAR(255) NOT NULL UNIQUE,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50), -- 'ios', 'android', 'web'
    biometric_type VARCHAR(50), -- 'fingerprint', 'face_id', 'touch_id', 'iris'
    
    -- Long-lived refresh token for this device
    refresh_token_id UUID,
    
    -- Security tracking
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP,
    revoked_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key to users table
    CONSTRAINT fk_biometric_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    
    -- Ensure one device_id per user (user can re-register same device)
    CONSTRAINT unique_user_device UNIQUE (user_id, device_id)
);

-- Create indexes for performance
CREATE INDEX idx_biometric_devices_user_id ON biometric_devices(user_id);
CREATE INDEX idx_biometric_devices_device_id ON biometric_devices(device_id);
CREATE INDEX idx_biometric_devices_active ON biometric_devices(is_active) WHERE is_active = true;
CREATE INDEX idx_biometric_devices_last_used ON biometric_devices(last_used_at DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_biometric_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_biometric_devices_updated_at
    BEFORE UPDATE ON biometric_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_biometric_devices_updated_at();

-- Add user preference for biometric in users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT false;

-- Verify the migration
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'biometric_devices' 
ORDER BY ordinal_position;

-- Count check
SELECT COUNT(*) as biometric_devices_count FROM biometric_devices;

COMMENT ON TABLE biometric_devices IS 'Stores registered devices for biometric authentication';
COMMENT ON COLUMN biometric_devices.device_id IS 'Unique identifier for the device (generated client-side)';
COMMENT ON COLUMN biometric_devices.refresh_token_id IS 'Reference to long-lived refresh token for this device';
