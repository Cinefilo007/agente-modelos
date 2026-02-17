
-- 004_add_details_to_transactions.sql
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'crypto_transactions' AND column_name = 'details') THEN
        ALTER TABLE crypto_transactions ADD COLUMN details JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
