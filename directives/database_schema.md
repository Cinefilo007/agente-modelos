# 🗄️ Esquema de Base de Datos: SOP & Ejecución

## 1. SOP: Gestión de Datos (Single Source of Truth)
El sistema utiliza **Supabase (PostgreSQL)** como motor principal. Toda la lógica de persistencia debe ser relacional y seguir estas reglas:

*   **Integridad**: Uso estricto de Claves Foráneas (FK) y Restricciones (Constraints).
*   **Seguridad**: Implementación de Row Level Security (RLS) para proteger datos de modelos y clientes.
*   **Evolución**: Prohibido el cambio manual en el dashboard. Todo cambio debe registrarse en la carpeta `/db` como migración SQL.

---

## 2. Definición de Tablas (Ejecución)

### 2.1 Núcleo de Usuarios y Perfiles

#### `models` (Creadores de Contenido)
Información detallada de las modelos registradas.
```sql
CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    full_name TEXT,
    bio_short TEXT, -- [NEW]
    status TEXT CHECK (status IN ('prospect', 'pending', 'verifying', 'active', 'rejected', 'paused')),
    credits_balance INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_video_id TEXT,
    avatar_url TEXT, -- [NEW]
    cover_url TEXT, -- [NEW]
    followers_count INTEGER DEFAULT 0, -- [NEW]
    total_likes INTEGER DEFAULT 0, -- [NEW]
    reputation_score DECIMAL(3, 2) DEFAULT 0.00,
    social_links JSONB DEFAULT '{}',
    birth_date DATE,
    -- Configuración IA
    config_prices JSONB DEFAULT '{}',
    config_person TEXT, -- Prompt de personalidad
    config_physique TEXT, -- Descripción física para IA
    config_payments JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `clients` (Fans / Leads)
```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    country_code TEXT,
    avatar_url TEXT,
    wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
    birth_date DATE,
    global_reputation INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Contenido Social (Social Hub)

#### `posts` & `stories`
```sql
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video')),
    caption TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stories expiran en 24h
CREATE TABLE stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 Economía y Negocio (Sales & Escrow)

#### `orders` (Sistema Escrow)
```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    model_id UUID REFERENCES models(id),
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'held', 'completed', 'disputed', 'refunded', 'released')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `transactions`
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id),
    client_id UUID REFERENCES clients(id), -- Opcional
    type TEXT CHECK (type IN ('consumption', 'topup', 'bonus')),
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT CHECK (status IN ('COMPLETED', 'PENDING', 'FAILED')),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Relaciones Críticas
- **Models <-> Clients**: Gestionado mediante `model_client_relations` para seguimiento del embudo de ventas (status: `new`, `chatting`, `closing`, `customer`).
- **Escrow Flow**: `orders` -> `disputes` (en caso de conflicto).

---
*Última Actualización: 30 de Marzo de 2026*
