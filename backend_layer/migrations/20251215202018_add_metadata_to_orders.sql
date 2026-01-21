-- Migration: Add metadata column to orders table
-- Date: 2025-12-15
-- Purpose: Store TP/SL levels, finalSignalId, and portfolioId as JSON metadata

-- Add metadata column (JSONB type for PostgreSQL)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create index on metadata for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_orders_metadata ON orders USING GIN (metadata);

-- Add comment explaining the metadata structure
COMMENT ON COLUMN orders.metadata IS 'JSON metadata: {tp1?: number, tp2?: number, sl?: number, finalSignalId?: string, portfolioId?: string}';
