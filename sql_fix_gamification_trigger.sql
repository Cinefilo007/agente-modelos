-- ACTUALIZACIÓN DE TRIGGER: Soporte para Inserciones Directas (Tips/Gifts)
-- El trigger anterior solo funcionaba en UPDATE, pero las propinas se insertan ya completadas.

CREATE OR REPLACE FUNCTION update_client_total_spent()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar si la transacción está completada y es un tipo que suma al gasto
    IF NEW.status = 'COMPLETED' AND (NEW.type = 'TIP' OR NEW.type = 'GIFT' OR NEW.type = 'ESCROW_RELEASE') THEN
        -- Solo sumar en UPDATE si el estado cambió a COMPLETED (evitar doble suma)
        -- En INSERT siempre sumamos si viene como COMPLETED
        IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'COMPLETED') THEN
            UPDATE clients 
            SET total_spent = total_spent + NEW.amount
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar y recrear trigger para incluir INSERT
DROP TRIGGER IF EXISTS trg_update_client_spending ON crypto_transactions;
CREATE TRIGGER trg_update_client_spending
AFTER INSERT OR UPDATE ON crypto_transactions
FOR EACH ROW
EXECUTE FUNCTION update_client_total_spent();
