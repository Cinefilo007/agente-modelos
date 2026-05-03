-- ============================================================
-- Migración 031: Bot de Fans — Tablas de soporte
-- ============================================================

-- 1. Tabla de favoritas (cliente <-> modelo)
CREATE TABLE IF NOT EXISTS fan_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, model_id)
);

-- 2. Constraint para que un cliente solo pueda dejar 1 review por modelo
-- (Si ya existe, ignorar el error)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'reviews_unique_client_model'
    ) THEN
        ALTER TABLE reviews ADD CONSTRAINT reviews_unique_client_model UNIQUE (client_id, model_id);
    END IF;
END $$;

-- 3. Campo de suscripción a notificaciones push en clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;

-- 4. Asegurar que is_blacklisted existe en clients (puede ya existir)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT FALSE;

-- 5. Índices para consultas frecuentes del bot de fans
CREATE INDEX IF NOT EXISTS idx_fan_favorites_client ON fan_favorites(client_id);
CREATE INDEX IF NOT EXISTS idx_fan_favorites_model ON fan_favorites(model_id);
CREATE INDEX IF NOT EXISTS idx_reviews_model ON reviews(model_id);
CREATE INDEX IF NOT EXISTS idx_models_verified_active ON models(is_verified, status) WHERE is_verified = true AND status = 'active';
