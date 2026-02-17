# Esquema de Base de Datos (Supabase / SQL)

El sistema utilizará PostgreSQL (vía Supabase).

## 1. Tablas Principales

### `models`
Información de las modelos registradas.
```sql
CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    full_name TEXT,
    bio_short TEXT, -- [NEW]
    status TEXT CHECK (status IN ('prospect', 'verifying', 'active', 'rejected', 'paused')),
    credits_balance INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_video_id TEXT,
    avatar_url TEXT, -- [NEW]
    cover_url TEXT, -- [NEW]
    followers_count INTEGER DEFAULT 0, -- [NEW]
    total_likes INTEGER DEFAULT 0, -- [NEW]
    reputation_score DECIMAL(3, 2) DEFAULT 0.00, -- [NEW] (Calculado basado en reviews)
    social_links JSONB DEFAULT '{}', -- [NEW] (instagram, twitter, facebook, etc.)
    birth_date DATE, -- [NEW] For age verification
    -- Configuración del Bot IA (Mapeado en Backend)
    config_prices JSONB DEFAULT '{}', -- {text: "..."}
    config_persona TEXT, -- Prompt de personalidad
    config_physique TEXT, -- Descripción física
    config_payments JSONB DEFAULT '{}', -- {text: "..."}
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `clients`
Identidad única de leads/clientes (Global).
```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    country_code TEXT,
    avatar_url TEXT, -- [NEW]
    wallet_balance DECIMAL(10, 2) DEFAULT 0.00, -- [NEW]
    birth_date DATE, -- [NEW] For age verification
    global_reputation INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

### `global_blacklist`
Lista negra centralizada gestionada por el Super Admin.
```sql
CREATE TABLE global_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL, -- ID de Telegram bloqueado
    username TEXT, -- Referencia visual
    reason TEXT,
    severity TEXT CHECK (severity IN ('medium', 'high')),
    added_by UUID REFERENCES models(id), -- Null si fue el Super Admin
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `orders` (Escrow System)
Transacciones seguras de servicios P2P.
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    model_id UUID REFERENCES models(id),
    description TEXT, -- Detalles del servicio contratado
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'held', 'completed', 'disputed', 'refunded', 'released')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `disputes`
Gestión de conflictos en órdenes.
```sql
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    client_evidence TEXT, -- URL a media/texto
    model_evidence TEXT, -- URL a media/texto
    resolution TEXT CHECK (resolution IN ('pending', 'client_win', 'model_win')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `client_reviews`
Reputación del cliente (Feedback de modelos).
```sql
CREATE TABLE client_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    model_id UUID REFERENCES models(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    tags TEXT, -- Ej: "Generoso, Amable, Pesado"
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `model_client_relations`
Estado del embudo entre una Modelo y un Cliente (M:N).
```sql
CREATE TABLE model_client_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id),
    client_id UUID REFERENCES clients(id),
    status TEXT CHECK (status IN ('new', 'chatting', 'closing', 'customer', 'archived')),
    total_spend DECIMAL(10, 2) DEFAULT 0.00,
    preferred_payment_method TEXT,
    last_interaction_at TIMESTAMPTZ,
    UNIQUE(model_id, client_id)
);
```

### `transactions`
Historial de créditos.
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id),
    client_id UUID REFERENCES clients(id), -- Opcional
    type TEXT CHECK (type IN ('consumption', 'topup', 'bonus')),
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT CHECK (status IN ('COMPLETED', 'PENDING', 'FAILED')),
    details JSONB DEFAULT '{}', -- [NEW] Metadatos (to_model, gift_name, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
);
```

### `blacklist_reports`
Reportes de bloqueo.
```sql
CREATE TABLE blacklist_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_model_id UUID REFERENCES models(id),
    reported_client_id UUID REFERENCES clients(id),
    reason TEXT,
    proof_link TEXT,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `messages` (Chat Memory)
Historial de todos los mensajes para contexto.
```sql
CREATE TABLE messages (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    relation_id UUID REFERENCES model_client_relations(id),
    sender_type TEXT CHECK (sender_type IN ('user', 'model', 'bot')),
    content TEXT,
    intent TEXT, -- Intención detectada o estado de la conversación
    metadata JSONB DEFAULT '{}', -- Para tokens, tool_calls, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `posts`
Contenido del feed (Permanente).
```sql
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video')),
    caption TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `stories`
Contenido efímero (24h).
```sql
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video')), -- Video max 30s
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `interactions`
Likes, comentarios y visualizaciones.
```sql
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID NOT NULL, -- Client ID or Model ID
    actor_type TEXT CHECK (actor_type IN ('client', 'model')),
    target_id UUID NOT NULL, -- Post ID, Story ID, etc.
    target_type TEXT CHECK (target_type IN ('post', 'story', 'comment')),
    action TEXT CHECK (action IN ('like', 'view', 'comment')),
    content TEXT, -- Para comentarios
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```
