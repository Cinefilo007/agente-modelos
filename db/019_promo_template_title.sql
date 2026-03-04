-- ===========================================================================
-- Migración 019: Título de Posts (promo_templates)
-- ===========================================================================

-- Los templates pueden ahora tener un título legible para el usuario
ALTER TABLE promo_templates ADD COLUMN IF NOT EXISTS title TEXT;

-- Índice para búsqueda rápida por título (opcional, por si el futuro lo necesita)
CREATE INDEX IF NOT EXISTS idx_promo_templates_title ON promo_templates(title);

-- FIN MIGRACIÓN 019
