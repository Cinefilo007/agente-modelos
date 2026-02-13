-- 1. Actualizar función de conteo de interacciones para incluir COMENTARIOS
CREATE OR REPLACE FUNCTION update_interactions_count_func()
RETURNS TRIGGER AS $$
DECLARE
    v_model_id UUID;
BEGIN
    -- Manejo de LIKES
    IF (NEW.action = 'like' OR OLD.action = 'like') THEN
        IF (TG_OP = 'INSERT' AND NEW.target_type = 'post' AND NEW.action = 'like') THEN
            UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.target_id RETURNING model_id INTO v_model_id;
            IF v_model_id IS NOT NULL THEN
                UPDATE models SET total_likes = total_likes + 1 WHERE id = v_model_id;
            END IF;
        ELSIF (TG_OP = 'DELETE' AND OLD.target_type = 'post' AND OLD.action = 'like') THEN
            UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.target_id RETURNING model_id INTO v_model_id;
            IF v_model_id IS NOT NULL THEN
                UPDATE models SET total_likes = total_likes - 1 WHERE id = v_model_id;
            END IF;
        END IF;
    END IF;

    -- Manejo de COMENTARIOS
    IF (NEW.action = 'comment' OR OLD.action = 'comment') THEN
        IF (TG_OP = 'INSERT' AND NEW.target_type = 'post' AND NEW.action = 'comment') THEN
            UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.target_id;
        ELSIF (TG_OP = 'DELETE' AND OLD.target_type = 'post' AND OLD.action = 'comment') THEN
            UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.target_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Asegurar que el trigger de interacciones use la nueva función
DROP TRIGGER IF EXISTS trg_update_likes_count ON interactions;
CREATE TRIGGER trg_update_interactions_count
AFTER INSERT OR DELETE ON interactions
FOR EACH ROW EXECUTE FUNCTION update_interactions_count_func();

-- 3. Nuevo Trigger para RESTAR LIKES TOTALES al BORRAR UN POST
-- Esto asegura que si se borra un post con 100 likes, esos 100 desaparezcan del perfil de la modelo
CREATE OR REPLACE FUNCTION cleanup_post_metrics_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.likes_count > 0) THEN
        UPDATE models 
        SET total_likes = GREATEST(0, total_likes - OLD.likes_count)
        WHERE id = OLD.model_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cleanup_post_metrics ON posts;
CREATE TRIGGER trg_cleanup_post_metrics
BEFORE DELETE ON posts
FOR EACH ROW EXECUTE FUNCTION cleanup_post_metrics_func();
