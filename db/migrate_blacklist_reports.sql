-- Migración: Agregar reported_telegram_id a blacklist_reports
-- Permite reportar usuarios que no están registrados como clientes
-- El FK reported_client_id sigue existiendo para clientes registrados

ALTER TABLE blacklist_reports
ADD COLUMN IF NOT EXISTS reported_telegram_id BIGINT;

-- Hacer reported_client_id nullable (ya no es obligatorio)
ALTER TABLE blacklist_reports
ALTER COLUMN reported_client_id DROP NOT NULL;

-- Índice para consultas por telegram_id
CREATE INDEX IF NOT EXISTS idx_blacklist_reports_telegram_id
ON blacklist_reports(reported_telegram_id);

COMMENT ON COLUMN blacklist_reports.reported_telegram_id IS 'Telegram ID del usuario reportado. Permite reportar usuarios que no son clientes registrados.';
