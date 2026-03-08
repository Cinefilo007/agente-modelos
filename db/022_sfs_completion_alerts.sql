-- ===========================================================================
-- Migración 022: Alertas de finalización SFS (90% + Finalización)
-- ===========================================================================
-- Añade la columna alert_90_sent para evitar notificaciones duplicadas
-- ===========================================================================

-- 1. Añadir columna alert_90_sent a promo_campaigns
ALTER TABLE promo_campaigns
    ADD COLUMN IF NOT EXISTS alert_90_sent BOOLEAN DEFAULT FALSE;

-- 2. Comentario descriptivo
COMMENT ON COLUMN promo_campaigns.alert_90_sent IS 
    'Indica si ya se envió la notificación del 90% de cumplimiento para evitar spam.';

-- FIN MIGRACIÓN 022
