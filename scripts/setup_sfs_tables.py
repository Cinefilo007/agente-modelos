import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("Error: DATABASE_URL not found in .env")
    exit(1)

SQL = """
-- 1. sfs_users
CREATE TABLE IF NOT EXISTS sfs_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    full_name TEXT,
    is_agency_model BOOLEAN DEFAULT FALSE,
    trust_score INTEGER DEFAULT 100,
    subscription_tier TEXT DEFAULT 'basic',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. channels
CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sfs_user_id UUID REFERENCES sfs_users(id),
    telegram_chat_id BIGINT UNIQUE NOT NULL,
    name TEXT,
    category TEXT CHECK (category IN ('Modelaje', 'Cine y Series', 'Memes', 'Cripto', 'Adultos', 'Otro')),
    followers INTEGER DEFAULT 0,
    avg_views INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5, 2) DEFAULT 0.00,
    status TEXT CHECK (status IN ('pending', 'active', 'inactive', 'banned', 'rejected')),
    admin_notes TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. promo_templates
CREATE TABLE IF NOT EXISTS promo_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sfs_user_id UUID REFERENCES sfs_users(id),
    telegram_message_id_origin BIGINT,
    content_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. promo_campaigns
CREATE TABLE IF NOT EXISTS promo_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES sfs_users(id),
    target_id UUID REFERENCES sfs_users(id),
    type TEXT CHECK (type IN ('sfs_time', 'sfs_views', 'pxp')),
    target_views INTEGER,
    duration_hours INTEGER,
    price DECIMAL(10, 2),
    escrow_status TEXT CHECK (escrow_status IN ('none', 'held', 'released', 'disputed', 'refunded')),
    has_premium_tracking BOOLEAN DEFAULT FALSE,
    requester_invite_link TEXT, -- Link generado para el requester
    target_invite_link TEXT, -- Link generado para el target
    requester_joined_count INTEGER DEFAULT 0,
    target_joined_count INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'failed')),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    requester_template_id UUID REFERENCES promo_templates(id),
    target_template_id UUID REFERENCES promo_templates(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. sfs_reviews
CREATE TABLE IF NOT EXISTS sfs_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_campaign_id UUID REFERENCES promo_campaigns(id),
    reviewer_id UUID REFERENCES sfs_users(id),
    target_id UUID REFERENCES sfs_users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(promo_campaign_id, reviewer_id)
);
"""

try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    print("Executing SFS SQL schema creation...")
    cur.execute(SQL)
    conn.commit()
    print("SFS Tables created successfully.")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error running migration: {e}")
    exit(1)
