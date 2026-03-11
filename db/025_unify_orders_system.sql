-- Migration 025: Unify Orders System
-- Renames escrow_orders to orders and adds missing columns for generalized service orders (P2P).

-- 1. Rename table if escrow_orders exists and orders doesn't
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'escrow_orders') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        ALTER TABLE escrow_orders RENAME TO orders;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        -- Create from scratch if neither exists (fallback)
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

-- 2. Add missing columns to 'orders' table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS option_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'escrow'; -- 'escrow' or 'direct'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending'; -- 'pending', 'shipped', 'delivered'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS evidence_url TEXT;

-- 3. Create order_reviews table (unified for any service)
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

-- 4. (Optional) If escrow_reviews exists, we could migrate them, but we assume it's new or small.
-- If escrow_reviews exists, let's link it to the new reviews logic if needed.
