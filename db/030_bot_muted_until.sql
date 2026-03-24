-- db/030_bot_muted_until.sql
-- Añade una columna para mutear al bot temporalmente después de enviar una notificación de venta
ALTER TABLE public.model_client_relations ADD COLUMN IF NOT EXISTS bot_muted_until TIMESTAMP WITH TIME ZONE;
