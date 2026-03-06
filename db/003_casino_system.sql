-- Migración: Sistema de Casino y Minijuegos
-- Descripción: Creación de tablas para juegos, premios de modelos y registro de apuestas.

-- 1. Tabla de Tipos de Juegos
CREATE TABLE IF NOT EXISTS casino_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL, -- 'roulette', 'slots', 'dice'
    name TEXT NOT NULL,
    description TEXT,
    config_json JSONB DEFAULT '{}', -- Configuración global del juego
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de Premios por Modelo
CREATE TABLE IF NOT EXISTS model_casino_prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    prize_type TEXT NOT NULL, -- 'hidden_content', 'service_discount', 'custom_service'
    prize_name TEXT NOT NULL,
    prize_value_json JSONB DEFAULT '{}', -- Detalle del premio (ej: post_id, % descuento)
    probability FLOAT NOT NULL CHECK (probability >= 0 AND probability <= 1),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de Apuestas y Resultados
CREATE TABLE IF NOT EXISTS casino_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    game_id UUID REFERENCES casino_games(id),
    bet_amount DECIMAL(12, 2) NOT NULL,
    outcome_json JSONB NOT NULL, -- Resultado del juego (ej: { won: true, prize_id: '...' })
    payout_amount DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabla de Configuración de Casino por Modelo
CREATE TABLE IF NOT EXISTS model_casino_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    game_slug TEXT NOT NULL,
    spin_price DECIMAL(12, 2) DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(model_id, game_slug)
);

-- 4. Extensión de Tipos de Transacción (Enum o Check si existe)
-- Nota: Esto depende de cómo esté implementada la tabla wallets
-- Supongamos que hay una columna 'transaction_type' en wallet_transactions

-- Insertar juegos iniciales
INSERT INTO casino_games (slug, name, description) 
VALUES 
('roulette', 'Ruleta de la Fortuna', 'Gira la ruleta y gana premios exclusivos de la modelo.'),
('slots', 'Tragamonedas Hot', 'Alinea los símbolos para ganar grandes premios.')
ON CONFLICT (slug) DO NOTHING;

-- Comentarios para documentación
COMMENT ON TABLE casino_games IS 'Catálogo global de minijuegos disponibles.';
COMMENT ON TABLE model_casino_prizes IS 'Configuración de premios que cada modelo ofrece en sus juegos.';
COMMENT ON TABLE casino_bets IS 'Registro de cada jugada realizada por los fans.';
