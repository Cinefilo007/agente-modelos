-- Migration 009: Crear tabla para el historial de métricas de los canales SFS

-- 1. Tabla de historial
CREATE TABLE IF NOT EXISTS public.channel_metrics_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    followers INTEGER NOT NULL,
    avg_views INTEGER NOT NULL,
    engagement_rate NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índices para consultas más rápidas
CREATE INDEX IF NOT EXISTS idx_channel_metrics_history_channel_id_auth 
    ON public.channel_metrics_history(channel_id);

CREATE INDEX IF NOT EXISTS idx_channel_metrics_history_created_at 
    ON public.channel_metrics_history(created_at);

-- 3. Habilitar RLS
ALTER TABLE public.channel_metrics_history ENABLE ROW LEVEL SECURITY;

-- 4. Políticas: solo admin o service_role pueden insertar (el scraper),
-- las modelos solo pueden leer el historial de *sus* canales.

-- Política "select" para modelos usando JOIN a channels
CREATE POLICY "Models can view history of their own channels"
    ON public.channel_metrics_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.channels
            WHERE channels.id = channel_metrics_history.channel_id
            AND channels.model_id = auth.uid()
        )
    );

-- Política "all" para admin (quien tenga rol admin)
CREATE POLICY "Admins have full access to metrics history"
    ON public.channel_metrics_history
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
