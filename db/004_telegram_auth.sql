-- Add birth_date to models
ALTER TABLE models 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Add birth_date and terms_accepted to clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE;

-- Ensure clients table has is_blacklisted (it was in schema.sql but just to be safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='is_blacklisted') THEN
        ALTER TABLE clients ADD COLUMN is_blacklisted BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
