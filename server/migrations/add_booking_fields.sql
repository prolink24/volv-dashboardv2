-- Add missing columns to meetings table
ALTER TABLE meetings
ADD COLUMN IF NOT EXISTS booked_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS sequence INTEGER;