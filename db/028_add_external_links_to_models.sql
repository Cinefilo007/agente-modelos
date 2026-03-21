-- Migration: 028_add_external_links_to_models.sql
-- Description: Renames social_links to external_links in 'models' table for consistency.

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'models' AND column_name = 'social_links') THEN
        ALTER TABLE models RENAME COLUMN social_links TO external_links;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'models' AND column_name = 'external_links') THEN
        ALTER TABLE models ADD COLUMN external_links JSONB DEFAULT '{}';
    END IF;
END $$;
