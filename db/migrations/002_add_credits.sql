-- 1. Create Credit Packages Table
CREATE TABLE IF NOT EXISTS credit_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert Default Packages
INSERT INTO credit_packages (name, credits, price) VALUES
('Starter Pack', 50, 10),
('Pro Pack', 150, 25),
('Agency Pack', 500, 75);

-- 3. Create Transactions Log Table (Optional but good for history)
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT CHECK (type IN ('purchase', 'manual', 'admin', 'usage')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
