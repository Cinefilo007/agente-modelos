-- Migración 023: TON Storage y NFT Marketplace
-- Descripción: Creación de tablas para almacenamiento descentralizado TON, gestión de renta y marketplace de NFTs.

-- 1. Tabla para items almacenados en TON Storage
CREATE TABLE IF NOT EXISTS ton_storage_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL, -- Referencia a models.id o clients.id
    bag_id TEXT UNIQUE NOT NULL, -- Hash identificador en TON Storage
    encryption_key TEXT NOT NULL, -- Llave AES cifrada para este archivo
    file_name TEXT,
    file_size BIGINT, -- Tamaño en bytes
    rental_status TEXT CHECK (rental_status IN ('active', 'warning', 'expired')) DEFAULT 'active',
    last_rental_payment TIMESTAMPTZ DEFAULT NOW(),
    rental_expiry TIMESTAMPTZ NOT NULL, -- Fecha límite del próximo pago de renta
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para búsquedas por dueño y estado de renta
CREATE INDEX IF NOT EXISTS idx_ton_storage_owner ON ton_storage_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_ton_storage_expiry ON ton_storage_items(rental_expiry);

-- 2. Historial de pagos de renta
CREATE TABLE IF NOT EXISTS ton_rental_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES ton_storage_items(id) ON DELETE CASCADE,
    amount_ton DECIMAL(20, 9) NOT NULL, -- Monto pagado a la red TON
    equivalent_credits INTEGER NOT NULL, -- Descuento en créditos internos
    transaction_date TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de NFTs acuñados
CREATE TABLE IF NOT EXISTS nfts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    on_chain_address TEXT UNIQUE, -- Dirección del smart contract en TON
    collection_address TEXT,
    owner_id UUID NOT NULL,
    content_item_id UUID REFERENCES ton_storage_items(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    minted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nfts_owner ON nfts(owner_id);

-- 4. Marketplace de Subastas y Ventas Fijas
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nft_id UUID REFERENCES nfts(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL,
    listing_type TEXT CHECK (listing_type IN ('auction', 'fixed')) DEFAULT 'auction',
    starting_price DECIMAL(10, 2) NOT NULL, -- En Créditos (Diamantes)
    current_bid DECIMAL(10, 2),
    highest_bidder_id UUID,
    start_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT CHECK (status IN ('active', 'sold', 'cancelled')) DEFAULT 'active',
    royalties_config JSONB DEFAULT '{"platform": 5, "model": 10}'::jsonb, -- Configuración de regalías en %
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_expiry ON marketplace_listings(expires_at);

-- Comentarios de tabla para documentación en Supabase
COMMENT ON TABLE ton_storage_items IS 'Archivos cifrados almacenados en la red descentralizada TON Storage';
COMMENT ON TABLE nfts IS 'Títulos de propiedad digitales (NFT) vinculados a contenido exclusivo';
COMMENT ON TABLE marketplace_listings IS 'Mercado de subastas y venta directa de contenido NFT';
