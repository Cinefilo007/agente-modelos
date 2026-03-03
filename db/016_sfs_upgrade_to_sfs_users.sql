-- ===========================================================================
-- Migración 016: Upgrade SFS a arquitectura "sfs_users" (Lead Magnet)
-- ===========================================================================
-- CONTEXTO:
-- La migración 015 creó las tablas SFS (channels, promo_campaigns, etc.)
-- referenciando models(id). Tras la nueva estrategia de Embudo (Lead Magnet),
-- el sistema ahora usa una tabla independiente sfs_users para separar los
-- usuarios de promoción de las modelos oficiales de la agencia.
--
-- Esta migración:
--   1. Crea sfs_users (si no existe).
--   2. Elimina las tablas antiguas de la migración 015 (con CASCADE).
--   3. Las recrea con las FKs correctas apuntando a sfs_users.
--   4. Añade los campos faltantes (category, invite_link, escrow, tracking).
--   5. Crea la tabla sfs_reviews para el sistema P2P.
--   6. Desactiva las RLS policies antiguas (usamos service_client en backend).
-- ===========================================================================

-- ╔═══════════════════════════════════════════╗
-- ║  PASO 1: Crear tabla sfs_users            ║
-- ╚═══════════════════════════════════════════╝
CREATE TABLE IF NOT EXISTS sfs_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    full_name TEXT,
    is_agency_model BOOLEAN DEFAULT FALSE,
    trust_score INTEGER DEFAULT 100,
    subscription_tier TEXT DEFAULT 'basic',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ╔═══════════════════════════════════════════╗
-- ║  PASO 2: Eliminar tablas antiguas (015)   ║
-- ╚═══════════════════════════════════════════╝
-- CASCADE elimina policies, índices y FKs dependientes.
DROP TABLE IF EXISTS promo_posts CASCADE;
DROP TABLE IF EXISTS promo_campaigns CASCADE;
DROP TABLE IF EXISTS promo_templates CASCADE;
DROP TABLE IF EXISTS channels CASCADE;
-- Nota: NO eliminamos sfs_reviews porque es nueva (no existía en 015).

-- ╔═══════════════════════════════════════════╗
-- ║  PASO 3: Recrear channels → sfs_users     ║
-- ╚═══════════════════════════════════════════╝
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sfs_user_id UUID REFERENCES sfs_users(id) ON DELETE CASCADE,
    telegram_chat_id BIGINT UNIQUE NOT NULL,
    name TEXT,
    category TEXT CHECK (category IN (
        'Modelaje', 'Cine y Series', 'Memes', 'Cripto', 'Adultos', 'Otro'
    )),
    followers INTEGER DEFAULT 0,
    avg_views INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5, 2) DEFAULT 0.00,
    status TEXT CHECK (status IN (
        'pending', 'active', 'inactive', 'banned', 'rejected'
    )) DEFAULT 'pending',
    admin_notes TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    invite_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ╔═══════════════════════════════════════════╗
-- ║  PASO 4: Recrear promo_templates           ║
-- ╚═══════════════════════════════════════════╝
CREATE TABLE promo_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sfs_user_id UUID REFERENCES sfs_users(id) ON DELETE CASCADE,
    telegram_message_id_origin BIGINT,
    content_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ╔═══════════════════════════════════════════╗
-- ║  PASO 5: Recrear promo_campaigns           ║
-- ╚═══════════════════════════════════════════╝
CREATE TABLE promo_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES sfs_users(id),
    target_id UUID REFERENCES sfs_users(id),
    type TEXT CHECK (type IN ('sfs_time', 'sfs_views', 'pxp')),
    target_views INTEGER,
    duration_hours INTEGER,
    price DECIMAL(10, 2),
    escrow_status TEXT CHECK (escrow_status IN (
        'none', 'held', 'released', 'disputed', 'refunded'
    )) DEFAULT 'none',
    has_premium_tracking BOOLEAN DEFAULT FALSE,
    requester_invite_link TEXT,
    target_invite_link TEXT,
    requester_joined_count INTEGER DEFAULT 0,
    target_joined_count INTEGER DEFAULT 0,
    status TEXT CHECK (status IN (
        'pending', 'active', 'completed', 'cancelled', 'failed'
    )) DEFAULT 'pending',
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    requester_template_id UUID REFERENCES promo_templates(id),
    target_template_id UUID REFERENCES promo_templates(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ╔═══════════════════════════════════════════╗
-- ║  PASO 6: Crear sfs_reviews (NUEVA)         ║
-- ╚═══════════════════════════════════════════╝
CREATE TABLE IF NOT EXISTS sfs_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_campaign_id UUID REFERENCES promo_campaigns(id),
    reviewer_id UUID REFERENCES sfs_users(id),
    target_id UUID REFERENCES sfs_users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(promo_campaign_id, reviewer_id)
);

-- ╔═══════════════════════════════════════════╗
-- ║  PASO 7: Índices de rendimiento            ║
-- ╚═══════════════════════════════════════════╝
CREATE INDEX IF NOT EXISTS idx_channels_status ON channels(status);
CREATE INDEX IF NOT EXISTS idx_channels_sfs_user ON channels(sfs_user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_requester ON promo_campaigns(requester_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_target ON promo_campaigns(target_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON promo_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_reviews_campaign ON sfs_reviews(promo_campaign_id);
CREATE INDEX IF NOT EXISTS idx_reviews_target ON sfs_reviews(target_id);

-- ╔═══════════════════════════════════════════╗
-- ║  PASO 8: RLS (Desactivado - service_client)║
-- ╚═══════════════════════════════════════════╝
-- El backend usa service_client (service_role_key) que salta RLS.
-- Si en el futuro se habilita acceso directo desde el frontend con
-- Supabase JS Client, se deberán crear policies aquí.
-- Por ahora, dejamos RLS deshabilitado para evitar bloqueos.

-- FIN DE LA MIGRACIÓN 016
