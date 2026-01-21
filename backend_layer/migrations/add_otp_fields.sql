-- Migration: Add OTP verification fields to users table
-- Run this SQL script to add the required columns for OTP email verification

-- Add OTP code column
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6);

-- Add OTP expiration timestamp column
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;

-- Add OTP attempts counter column (for brute-force protection)
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('otp_code', 'otp_expires_at', 'otp_attempts');
