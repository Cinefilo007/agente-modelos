-- ===========================================================================
-- Migración 021: Restaurar infraestructura SFS y añadir followers_baseline
-- ===========================================================================
-- PROBLEMA 1: La migración 016 borró promo_posts pero no la recreó.
-- PROBLEMA 2: Falta la columna followers_baseline en promo_campaigns,
--             causando error 500 al intentar aceptar una campaña.
-- ===========================================================================

-- 1. Asegurar que promo_campaigns tiene la columna followers_baseline
ALTER TABLE promo_campaigns
    ADD COLUMN IF NOT EXISTS followers_baseline INTEGER DEFAULT 0;

-- 2. Recrear la tabla promo_posts (que fue borrada en 016 por error)
CREATE TABLE IF NOT EXISTS promo_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES promo_campaigns(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    telegram_message_id BIGINT,
    current_views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para promo_posts
CREATE INDEX IF NOT EXISTS idx_promo_posts_campaign ON promo_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_promo_posts_channel ON promo_posts(channel_id);

-- 4. Comentarios descriptivos
COMMENT ON COLUMN promo_campaigns.followers_baseline IS 
    'Suma de seguidores de ambos canales al momento de aceptar el SFS (para medir crecimiento)';

COMMENT ON TABLE promo_posts IS 
    'Registra los mensajes publicados en Telegram para cada campaña SFS activa';

-- FIN MIGRACIÓN 021
