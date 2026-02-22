
-- 013_add_tips_count_to_posts.sql

-- 1. Añadir columna a la tabla posts si no existe
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tips_count INTEGER DEFAULT 0;

-- 2. Actualizar la función del trigger para que también incremente tips_count en posts
-- Esta función se encarga de:
--   a) Sumar al total_spent del cliente
--   b) Sumar al tips_count del post asociado (si existe)
CREATE OR REPLACE FUNCTION update_client_total_spent()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actuar si la transacción está COMPLETED
    IF NEW.status = 'COMPLETED' THEN
        
        -- A. LÓGICA DE GASTO TOTAL PARA CLIENTES
        -- Aplica a TIP, GIFT y liberación de ESCROW
        IF (NEW.type = 'TIP' OR NEW.type = 'GIFT' OR NEW.type = 'ESCROW_RELEASE') THEN
            -- Evitar doble suma si es un UPDATE de PENDING a COMPLETED
            IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'COMPLETED') THEN
                UPDATE clients 
                SET total_spent = total_spent + NEW.amount
                WHERE id = NEW.user_id;
            END IF;
        END IF;

        -- B. LÓGICA DE CONTADOR DE PROPINAS EN POSTS
        -- Solo si hay un post_id en reference_id
        IF (NEW.type = 'TIP' OR NEW.type = 'GIFT') AND NEW.reference_id IS NOT NULL THEN
            IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'COMPLETED') THEN
                -- Intentar actualizar el post (usando casting a uuid por seguridad)
                UPDATE posts 
                SET tips_count = tips_count + 1
                WHERE id = NEW.reference_id::uuid;
            END IF;
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- El trigger ya debería existir (trg_update_client_spending), 
-- por lo que al actualizar la función, el trigger usará la nueva lógica automáticamente.
