-- ===========================================================================
-- Migración 018: Canal Settings + Wallet en SFS Users
-- ===========================================================================

-- ╔═══════════════════════════════════════╗
-- ║ PARTE A: Channels — Configuración     ║
-- ╚═══════════════════════════════════════╝

-- Modo de participación: sfs (intercambio gratuito), pxp (publicidad paga), both
ALTER TABLE channels ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'sfs';

-- Tipos de contrato que acepta este canal
ALTER TABLE channels ADD COLUMN IF NOT EXISTS accepted_contract_types TEXT[] DEFAULT '{SFS_VIEWS,SFS_TIME}';

-- Límite mínimo de seguidores que debe tener el canal contraparte
ALTER TABLE channels ADD COLUMN IF NOT EXISTS min_partner_followers INTEGER DEFAULT 0;

-- Meta mínima de vistas que el canal está dispuesto a acordar
ALTER TABLE channels ADD COLUMN IF NOT EXISTS min_views_target INTEGER DEFAULT 0;

-- Bio/descripción libre del canal
ALTER TABLE channels ADD COLUMN IF NOT EXISTS bio TEXT;

-- ╔═══════════════════════════════════════╗
-- ║ PARTE B: sfs_users — Wallet SFS       ║
-- ╚═══════════════════════════════════════╝

-- Saldo disponible dentro del sistema SFS (en USD)
ALTER TABLE sfs_users ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(12,6) DEFAULT 0.00;

-- Dirección TON/USDT para retiros
ALTER TABLE sfs_users ADD COLUMN IF NOT EXISTS payout_address TEXT;

-- ╔═══════════════════════════════════════╗
-- ║ PARTE C: promo_campaigns — followers  ║
-- ╚═══════════════════════════════════════╝

-- Meta de nuevos seguidores (para tipo SFS_FOLLOWERS)
ALTER TABLE promo_campaigns ADD COLUMN IF NOT EXISTS followers_target INTEGER DEFAULT NULL;

-- Arreglar CHECK constraint del tipo (si existe) para incluir SFS_FOLLOWERS y pending_deletion en status
-- (Se hace via recreación comentada: en Supabase se acepta con ALTER TABLE IF NOT EXISTS)
ALTER TABLE promo_campaigns ADD COLUMN IF NOT EXISTS views_target INTEGER DEFAULT NULL;

-- ╔═══════════════════════════════════════╗
-- ║ PARTE D: Tabla sfs_withdrawals        ║
-- ╚═══════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS sfs_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sfs_user_id UUID REFERENCES sfs_users(id) ON DELETE CASCADE,
    amount DECIMAL(12,6) NOT NULL,
    wallet_address TEXT NOT NULL,
    status TEXT DEFAULT 'pending',   -- pending, processing, completed, rejected
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sfs_withdrawals_user ON sfs_withdrawals(sfs_user_id);
CREATE INDEX IF NOT EXISTS idx_sfs_withdrawals_status ON sfs_withdrawals(status);

-- FIN MIGRACIÓN 018
