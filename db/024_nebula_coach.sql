-- =====================================================
-- MIGRACIÓN 024: Nebula Coach — Sistema de Consejero IA
-- =====================================================

-- Plan mensual generado por IA para cada modelo
CREATE TABLE IF NOT EXISTS coach_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL CHECK (year >= 2024),
    plan_data JSONB NOT NULL,               -- El plan completo estructurado en JSON
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    last_regenerated_at TIMESTAMPTZ,        -- Control de regeneración manual
    regenerated_count INTEGER DEFAULT 0,    -- Cuántas veces se regeneró este mes
    UNIQUE(model_id, month, year)           -- Un plan por mes por modelo
);

-- Índice para consultas rápidas por modelo
CREATE INDEX IF NOT EXISTS idx_coach_plans_model_id ON coach_plans(model_id);

-- =====================================================

-- Feedback de cada acción del plan (alimenta el pool colectivo)
CREATE TABLE IF NOT EXISTS coach_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES coach_plans(id) ON DELETE CASCADE NOT NULL,
    action_key TEXT NOT NULL,           -- Ej: "sfs_3x_week", "post_daily_content"
    action_category TEXT NOT NULL,      -- Ej: "crecimiento", "ventas", "contenido"
    result TEXT CHECK (result IN ('success', 'failure', 'pending')) DEFAULT 'pending',
    notes TEXT,                         -- Notas opcionales de la modelo
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, action_key)         -- Una respuesta por acción por plan
);

-- Índice para el pool colectivo
CREATE INDEX IF NOT EXISTS idx_coach_feedback_action_key ON coach_feedback(action_key);
CREATE INDEX IF NOT EXISTS idx_coach_feedback_result ON coach_feedback(result);

-- =====================================================

-- Vista agregada del Pool Colectivo (anónima, para enriquecer el prompt de IA)
CREATE OR REPLACE VIEW coach_collective_insights AS
SELECT
    action_key,
    action_category,
    COUNT(*) FILTER (WHERE result = 'success') AS exitos,
    COUNT(*) FILTER (WHERE result = 'failure') AS fracasos,
    COUNT(*) AS total_respuestas,
    ROUND(
        COUNT(*) FILTER (WHERE result = 'success')::DECIMAL /
        NULLIF(COUNT(*) FILTER (WHERE result != 'pending'), 0) * 100,
    1) AS tasa_exito
FROM coach_feedback
WHERE result != 'pending'
GROUP BY action_key, action_category
HAVING COUNT(*) FILTER (WHERE result != 'pending') >= 3  -- Mínimo 3 respuestas para ser estadísticamente válido
ORDER BY tasa_exito DESC NULLS LAST;
