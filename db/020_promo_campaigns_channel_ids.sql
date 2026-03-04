-- ===========================================================================
-- Migración 020: promo_campaigns — columnas faltantes + fix CHECK constraints
-- ===========================================================================
-- PROBLEMA: El backend intenta insertar requester_channel_id y target_channel_id
--           en promo_campaigns (PGRST204), pero esas columnas nunca se añadieron.
--           Además, los CHECK constraints del tipo usan minúsculas (sfs_time)
--           mientras que el backend envía mayúsculas (SFS_TIME, SFS_VIEWS, SFS_FOLLOWERS).
--           El status CHECK tampoco incluye 'accepted', 'pending_deletion', 'cancelled_fraud'.
-- ===========================================================================

-- ╔═══════════════════════════════════════════════════╗
-- ║  PASO 1: Añadir columnas de canal faltantes       ║
-- ╚═══════════════════════════════════════════════════╝
ALTER TABLE promo_campaigns
    ADD COLUMN IF NOT EXISTS requester_channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS target_channel_id    UUID REFERENCES channels(id) ON DELETE SET NULL;

-- ╔═══════════════════════════════════════════════════╗
-- ║  PASO 2: Eliminar CHECK constraints obsoletos     ║
-- ╚═══════════════════════════════════════════════════╝
-- Borramos los CHECK constraints creados en migración 016 que usan minúsculas.
-- El nombre del constraint varía según PostgreSQL, así que intentamos los nombres típicos.

DO $$
BEGIN
    -- Constraint del campo 'type'
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'promo_campaigns_type_check'
          AND conrelid = 'promo_campaigns'::regclass
    ) THEN
        ALTER TABLE promo_campaigns DROP CONSTRAINT promo_campaigns_type_check;
    END IF;

    -- Constraint del campo 'status'
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'promo_campaigns_status_check'
          AND conrelid = 'promo_campaigns'::regclass
    ) THEN
        ALTER TABLE promo_campaigns DROP CONSTRAINT promo_campaigns_status_check;
    END IF;
END $$;

-- ╔═══════════════════════════════════════════════════╗
-- ║  PASO 3: Recrear CHECK constraints correctos      ║
-- ╚═══════════════════════════════════════════════════╝

-- Tipo: ahora acepta mayúsculas (SFS_VIEWS, SFS_TIME, SFS_FOLLOWERS, PXP)
ALTER TABLE promo_campaigns
    ADD CONSTRAINT promo_campaigns_type_check
    CHECK (type IN ('SFS_VIEWS', 'SFS_TIME', 'SFS_FOLLOWERS', 'PXP'));

-- Status: flow completo del backend
ALTER TABLE promo_campaigns
    ADD CONSTRAINT promo_campaigns_status_check
    CHECK (status IN (
        'pending',
        'accepted',
        'active',
        'pending_deletion',
        'completed',
        'cancelled',
        'cancelled_fraud',
        'failed'
    ));

-- ╔═══════════════════════════════════════════════════╗
-- ║  PASO 4: Actualizar registros existentes          ║
-- ╚═══════════════════════════════════════════════════╝
-- Normalizar cualquier valor en minúscula que pudiera existir antes de aplicar el constraint
UPDATE promo_campaigns SET type = UPPER(type) WHERE type != UPPER(type);

-- ╔═══════════════════════════════════════════════════╗
-- ║  PASO 5: Índices para las nuevas columnas         ║
-- ╚═══════════════════════════════════════════════════╝
CREATE INDEX IF NOT EXISTS idx_promo_campaigns_req_channel ON promo_campaigns(requester_channel_id);
CREATE INDEX IF NOT EXISTS idx_promo_campaigns_tgt_channel ON promo_campaigns(target_channel_id);

-- FIN MIGRACIÓN 020
