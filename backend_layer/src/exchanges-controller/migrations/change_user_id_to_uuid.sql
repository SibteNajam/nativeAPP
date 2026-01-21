-- Migration: Change user_id column in orders table from integer to uuid
-- This allows proper linking to the users table which uses UUID for id

-- Step 1: Drop existing index if any
DROP INDEX IF EXISTS idx_orders_user_id;

-- Step 2: Alter the column type from integer to uuid
-- First, set any existing integer values to NULL (they were invalid anyway)
UPDATE orders SET user_id = NULL WHERE user_id IS NOT NULL;

-- Step 3: Alter column type to uuid
ALTER TABLE orders 
ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- Step 4: Recreate the index
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Step 5: Add foreign key constraint to users table (optional but recommended)
-- ALTER TABLE orders 
-- ADD CONSTRAINT fk_orders_user_id 
-- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Note: Run this migration in your PostgreSQL database before restarting the application
