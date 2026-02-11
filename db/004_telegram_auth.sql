-- Add birth_date to models
ALTER TABLE models 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Add missing columns to clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS global_reputation INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Ensure clients table has is_blacklisted (it was in schema.sql but just to be safe)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='is_blacklisted') THEN
        ALTER TABLE clients ADD COLUMN is_blacklisted BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
