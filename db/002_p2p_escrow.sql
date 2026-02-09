-- 1. UPDATE CLIENTS TABLE
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10, 2) DEFAULT 0.00;

-- 2. ORDERS TABLE (Escrow)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    model_id UUID REFERENCES models(id),
    service_type TEXT, -- 'pack', 'video_call', 'custom_content'
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'held', 'completed', 'disputed', 'refunded', 'released')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DISPUTES TABLE
CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    client_evidence TEXT, -- Links to Supabase Storage
    model_evidence TEXT,
    resolution TEXT CHECK (resolution IN ('pending', 'client_win', 'model_win')) DEFAULT 'pending',
    resolved_by UUID, -- Admin ID (could be hardcoded or linked to a future admins table)
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CLIENT REVIEWS (Reputation System)
CREATE TABLE IF NOT EXISTS client_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id),
    model_id UUID REFERENCES models(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    tags TEXT, -- Comma separated tags: "Generoso,Respetuoso"
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. FUNCTION TO UPDATE CLIENT REPUTATION (Optional Trigger logic placeholder)
-- This would calculate the average rating from client_reviews and update clients.global_reputation
