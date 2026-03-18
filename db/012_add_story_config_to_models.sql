-- Migración: 012_add_story_config_to_models.sql
-- Descripción: Añade columnas para gestionar la publicación automática en historias de Telegram Business.

ALTER TABLE models 
ADD COLUMN IF NOT EXISTS business_connection_id TEXT,
ADD COLUMN IF NOT EXISTS auto_story_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS story_caption_template TEXT DEFAULT 'Mira mi nuevo post en mi perfil! 🔗 {profile_link}';

COMMENT ON COLUMN models.business_connection_id IS 'ID de la conexión de Telegram Business para esta modelo';
COMMENT ON COLUMN models.auto_story_enabled IS 'Indica si la modelo desea publicar automáticamente en sus historias de Telegram';
COMMENT ON COLUMN models.story_caption_template IS 'Plantilla para el pie de foto de la historia, soporta {profile_link}';
