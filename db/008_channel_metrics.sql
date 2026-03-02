-- Añadir invite_link a channels
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS invite_link TEXT;

-- Crear tabla tracker de posts
CREATE TABLE IF NOT EXISTS public.channel_metrics_tracker (
    id BIGSERIAL PRIMARY KEY,
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    telegram_message_id BIGINT NOT NULL,
    views INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.channel_metrics_tracker ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Servicio puede ver posts"
    ON public.channel_metrics_tracker FOR SELECT
    TO service_role
    USING (true);

CREATE POLICY "Servicio puede insertar posts"
    ON public.channel_metrics_tracker FOR INSERT
    TO service_role
    WITH CHECK (true);

CREATE POLICY "Servicio puede actualizar posts"
    ON public.channel_metrics_tracker FOR UPDATE
    TO service_role
    USING (true);
