-- migration db/015_promo_sfs_system.sql

-- 1. Actualizar tabla models
ALTER TABLE models 
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}';

-- 2. Tabla channels
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    telegram_chat_id BIGINT NOT NULL,
    name TEXT NOT NULL,
    followers INTEGER DEFAULT 0,
    avg_views INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5, 2) DEFAULT 0.00,
    status TEXT CHECK (status IN ('active', 'inactive', 'verifying')) DEFAULT 'verifying',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(model_id, telegram_chat_id)
);

-- 3. Tabla promo_templates
CREATE TABLE IF NOT EXISTS promo_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    telegram_message_id_origin BIGINT NOT NULL,
    content_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla promo_campaigns
CREATE TABLE IF NOT EXISTS promo_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID REFERENCES models(id),
    target_id UUID REFERENCES models(id),
    type TEXT CHECK (type IN ('SFS_VIEWS', 'SFS_TIME', 'PXP')) NOT NULL,
    target_views INTEGER,
    duration_hours INTEGER,
    status TEXT CHECK (status IN ('pending', 'accepted', 'active', 'completed', 'cancelled_fraud')) DEFAULT 'pending',
    start_time TIMESTAMPTZ,
    requester_template_id UUID REFERENCES promo_templates(id),
    target_template_id UUID REFERENCES promo_templates(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla promo_posts
CREATE TABLE IF NOT EXISTS promo_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES promo_campaigns(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    telegram_message_id BIGINT,
    current_views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS Policies
-- Habilitar RLS
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_posts ENABLE ROW LEVEL SECURITY;

-- Políticas para channels
CREATE POLICY "Models can view all active channels" ON channels FOR SELECT USING (status = 'active' OR auth.uid() = model_id);
CREATE POLICY "Models can manage own channels" ON channels FOR ALL USING (auth.uid() = model_id);

-- Políticas para promo_templates
CREATE POLICY "Models can manage own templates" ON promo_templates FOR ALL USING (auth.uid() = model_id);
CREATE POLICY "Models can view target templates" ON promo_templates FOR SELECT USING (
    id IN (SELECT requester_template_id FROM promo_campaigns WHERE target_id = auth.uid()) OR
    id IN (SELECT target_template_id FROM promo_campaigns WHERE requester_id = auth.uid())
);

-- Políticas para promo_campaigns
CREATE POLICY "Models can view own campaigns" ON promo_campaigns FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = target_id);
CREATE POLICY "Models can manage own campaigns" ON promo_campaigns FOR ALL USING (auth.uid() = requester_id OR auth.uid() = target_id);

-- Políticas para promo_posts
CREATE POLICY "Models can view posts for their campaigns" ON promo_posts FOR SELECT USING (
    campaign_id IN (SELECT id FROM promo_campaigns WHERE requester_id = auth.uid() OR target_id = auth.uid())
);
