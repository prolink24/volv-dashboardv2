-- Add missing columns to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source_data JSONB;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS lead_source TEXT;

-- Add missing columns to activities table
ALTER TABLE activities ADD COLUMN IF NOT EXISTS source_id TEXT;

-- Add source_id to deals table if it doesn't exist
ALTER TABLE deals ADD COLUMN IF NOT EXISTS source_id TEXT;