-- Migración: Mejoras en Posts (Links Elegantes y Programación)
-- Añade soporte para botones de link externos y posts programados.

ALTER TABLE IF EXISTS posts 
ADD COLUMN IF NOT EXISTS external_links JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('published', 'scheduled', 'archived'));

-- Índice (opcional pero recomendado para el feed)
CREATE INDEX IF NOT EXISTS idx_posts_status_scheduled ON posts (status, scheduled_at);
