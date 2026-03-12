-- SCRIPT DE CONSOLIDACIÓN Y REPARACIÓN DEL SISTEMA DE ÓRDENES --
-- IMPORTANTE: Ejecuta este script directamente en tu Supabase SQL Editor

-- 1. Renombrar tabla si escrow_orders existe y orders no
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'escrow_orders') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        ALTER TABLE escrow_orders RENAME TO orders;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        CREATE TABLE orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            client_id UUID,
            model_id UUID,
            service_id UUID,
            amount DECIMAL(10, 2) NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 2. Asegurar que las columnas nuevas existan
ALTER TABLE orders ADD COLUMN IF NOT EXISTS option_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'escrow';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS evidence_url TEXT;

-- 3. Crear order_reviews si no existe
CREATE TABLE IF NOT EXISTS order_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    client_id UUID NOT NULL,
    model_id UUID NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(order_id)
);

-- 4. Asegurar Claves Foráneas (Foreign Keys) indispensables para los JOINs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'orders_model_id_fkey' AND table_name = 'orders') THEN
        ALTER TABLE orders ADD CONSTRAINT orders_model_id_fkey FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'orders_client_id_fkey' AND table_name = 'orders') THEN
        ALTER TABLE orders ADD CONSTRAINT orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'model_services') AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'orders_service_id_fkey' AND table_name = 'orders') THEN
        ALTER TABLE orders ADD CONSTRAINT orders_service_id_fkey FOREIGN KEY (service_id) REFERENCES model_services(id) ON DELETE SET NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'model_service_options') AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'orders_option_id_fkey' AND table_name = 'orders') THEN
        ALTER TABLE orders ADD CONSTRAINT orders_option_id_fkey FOREIGN KEY (option_id) REFERENCES model_service_options(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'order_reviews_model_id_fkey' AND table_name = 'order_reviews') THEN
        ALTER TABLE order_reviews ADD CONSTRAINT order_reviews_model_id_fkey FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'order_reviews_client_id_fkey' AND table_name = 'order_reviews') THEN
        ALTER TABLE order_reviews ADD CONSTRAINT order_reviews_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 5. RECARGAR EL CACHÉ DE POSTGREST PARA SUPABASE
NOTIFY pgrst, 'reload schema';
