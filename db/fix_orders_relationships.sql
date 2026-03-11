-- SQL REPAIR: Add Missing Foreign Keys for Unified Orders System
-- This ensures that Supabase (PostgREST) can perform joins with 'models' and 'model_services'.

-- 1. Ensure foreign key from 'orders' to 'models'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_model_id_fkey' 
        AND table_name = 'orders'
    ) THEN
        ALTER TABLE orders 
        ADD CONSTRAINT orders_model_id_fkey 
        FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Ensure foreign key from 'orders' to 'clients'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_client_id_fkey' 
        AND table_name = 'orders'
    ) THEN
        ALTER TABLE orders 
        ADD CONSTRAINT orders_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Ensure foreign key from 'orders' to 'model_services'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_service_id_fkey' 
        AND table_name = 'orders'
    ) THEN
        -- Check if model_services table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'model_services') THEN
            ALTER TABLE orders 
            ADD CONSTRAINT orders_service_id_fkey 
            FOREIGN KEY (service_id) REFERENCES model_services(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 4. Ensure foreign key from 'orders' to 'model_service_options'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_option_id_fkey' 
        AND table_name = 'orders'
    ) THEN
        -- Check if model_service_options table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'model_service_options') THEN
            ALTER TABLE orders 
            ADD CONSTRAINT orders_option_id_fkey 
            FOREIGN KEY (option_id) REFERENCES model_service_options(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 5. Fix order_reviews references if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'order_reviews_model_id_fkey' 
        AND table_name = 'order_reviews'
    ) THEN
        ALTER TABLE order_reviews 
        ADD CONSTRAINT order_reviews_model_id_fkey 
        FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'order_reviews_client_id_fkey' 
        AND table_name = 'order_reviews'
    ) THEN
        ALTER TABLE order_reviews 
        ADD CONSTRAINT order_reviews_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
    END IF;
END $$;
