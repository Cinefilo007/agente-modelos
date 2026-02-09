-- Migration: 003_social_network.sql
-- Description: Adds tables for social network features (posts, stories, reviews, interactions) and updates the models table.

-- Add new columns to 'models' table
ALTER TABLE models 
ADD COLUMN IF NOT EXISTS bio_short TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS cover_url TEXT,
ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_likes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reputation_score DECIMAL(3, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- Create 'posts' table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id),
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video')),
    caption TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create 'stories' table
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id),
    media_url TEXT NOT NULL,
    media_type TEXT CHECK (media_type IN ('image', 'video')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create 'reviews' table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id),
    client_id UUID REFERENCES clients(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create 'interactions' table
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL,
    actor_type TEXT CHECK (actor_type IN ('client', 'model')),
    target_id UUID NOT NULL,
    target_type TEXT CHECK (target_type IN ('post', 'story', 'comment')),
    action TEXT CHECK (action IN ('like', 'view', 'comment')),
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster feed lookups
CREATE INDEX IF NOT EXISTS idx_posts_model_id ON posts(model_id);
CREATE INDEX IF NOT EXISTS idx_stories_model_id ON stories(model_id);
CREATE INDEX IF NOT EXISTS idx_reviews_model_id ON reviews(model_id);
