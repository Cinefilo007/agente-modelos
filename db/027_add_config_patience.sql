-- Migration para agregar el nivel de paciencia ajustable por la modelo
ALTER TABLE models ADD COLUMN IF NOT EXISTS config_patience INTEGER DEFAULT 10;

COMMENT ON COLUMN models.config_patience IS 'Cantidad máxima de mensajes que el bot Manager gastará por cliente antes de detenerse.';
