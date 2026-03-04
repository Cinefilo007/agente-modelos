-- Migración 017: Soporte para contratos SFS por vistas (SFS_VIEWS)
-- Añade views_target a promo_campaigns y pending_deletion como status válido

-- 1. Añadir columna views_target (nullable para compatibilidad con campañas existentes)
ALTER TABLE promo_campaigns
    ADD COLUMN IF NOT EXISTS views_target INTEGER DEFAULT NULL;

-- 2. Añadir 'pending_deletion' y 'SFS_VIEWS' como valores permitidos si hay CHECK constraints
-- (Si no hay constraints en type/status, estas líneas son informativas)
-- El status flow ahora es: pending → accepted → active → pending_deletion → completed | cancelled_fraud

-- 3. Índice para que el job de monitoreo sea eficiente
CREATE INDEX IF NOT EXISTS idx_promo_campaigns_status_type
    ON promo_campaigns(status, type);

-- 4. Comentario explicativo en la columna
COMMENT ON COLUMN promo_campaigns.views_target IS
    'Meta de vistas del post para dar por completado el contrato SFS_VIEWS. NULL para campañas antiguas basadas en tiempo.';

COMMENT ON COLUMN promo_campaigns.type IS
    'Tipo de contrato: SFS_VIEWS (por meta de vistas, nuevo), SFS_TIME (por tiempo, legacy)';
