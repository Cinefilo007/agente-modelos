-- 1. Followers Table
CREATE TABLE IF NOT EXISTS followers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(model_id, client_id)
);

-- 2. Trigger: Update Followers Count
CREATE OR REPLACE FUNCTION update_followers_count_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE models SET followers_count = followers_count + 1 WHERE id = NEW.model_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE models SET followers_count = followers_count - 1 WHERE id = OLD.model_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_followers_count ON followers;
CREATE TRIGGER trg_update_followers_count
AFTER INSERT OR DELETE ON followers
FOR EACH ROW EXECUTE FUNCTION update_followers_count_func();

-- 3. Trigger: Update Likes Count (Post & Total Model Likes)
-- Assumes 'interactions' table exists with target_type='post' and action='like'
CREATE OR REPLACE FUNCTION update_likes_count_func()
RETURNS TRIGGER AS $$
DECLARE
    v_model_id UUID;
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.target_type = 'post' AND NEW.action = 'like') THEN
        -- Increment Post Likes
        UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.target_id RETURNING model_id INTO v_model_id;
        -- Increment Model Total Likes
        IF v_model_id IS NOT NULL THEN
            UPDATE models SET total_likes = total_likes + 1 WHERE id = v_model_id;
        END IF;
    ELSIF (TG_OP = 'DELETE' AND OLD.target_type = 'post' AND OLD.action = 'like') THEN
        -- Decrement Post Likes
        UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.target_id RETURNING model_id INTO v_model_id;
        -- Decrement Model Total Likes
        IF v_model_id IS NOT NULL THEN
            UPDATE models SET total_likes = total_likes - 1 WHERE id = v_model_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_likes_count ON interactions;
CREATE TRIGGER trg_update_likes_count
AFTER INSERT OR DELETE ON interactions
FOR EACH ROW EXECUTE FUNCTION update_likes_count_func();

-- 4. Trigger: Update Reputation Score (Reviews)
CREATE OR REPLACE FUNCTION update_reputation_score_func()
RETURNS TRIGGER AS $$
DECLARE
    v_avg_rating DECIMAL(3, 2);
BEGIN
    -- Calculate new average
    SELECT COALESCE(AVG(rating), 0) INTO v_avg_rating
    FROM reviews
    WHERE model_id = (CASE WHEN TG_OP = 'DELETE' THEN OLD.model_id ELSE NEW.model_id END);
    
    -- Update Model
    UPDATE models 
    SET reputation_score = v_avg_rating 
    WHERE id = (CASE WHEN TG_OP = 'DELETE' THEN OLD.model_id ELSE NEW.model_id END);
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_reputation_score ON reviews;
CREATE TRIGGER trg_update_reputation_score
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION update_reputation_score_func();
