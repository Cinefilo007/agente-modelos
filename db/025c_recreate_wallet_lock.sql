-- SQL DUMP: Recrear wallet_lock_funds para apuntar a "orders" en lugar de "escrow_orders"
-- Ejecutar en Supabase SQL Editor

-- Postgres requiere eliminar la función antigua si le vamos a cambiar el tipo de retorno a JSON
DROP FUNCTION IF EXISTS wallet_lock_funds(uuid, numeric, uuid, uuid);

CREATE OR REPLACE FUNCTION wallet_lock_funds(
    p_user_id UUID,
    p_amount DECIMAL,
    p_service_id UUID,
    p_model_id UUID
) RETURNS JSON AS $$
DECLARE
    v_balance DECIMAL;
    v_order_id UUID;
    v_status TEXT;
BEGIN
    -- 1. Verificar balance del cliente
    SELECT wallet_balance INTO v_balance FROM clients WHERE id = p_user_id FOR UPDATE;
    
    IF v_balance IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Cliente no encontrado');
    END IF;
    
    IF v_balance < p_amount THEN
        RETURN json_build_object('success', false, 'error', 'Saldo insuficiente en la billetera');
    END IF;
    
    -- 2. Deducir saldo e incrementarlo en un ledger de retenidos si existiera 
    -- (Por simplicidad lo deducimos de wallet_balance, ya que wallet_release lo suma a la modelo)
    UPDATE clients SET wallet_balance = wallet_balance - p_amount WHERE id = p_user_id;
    
    -- 3. Crear la orden retenida (Escrow)
    -- NOTA IMPORTANTE: Usamos 'orders' y no 'escrow_orders'
    INSERT INTO orders (client_id, model_id, service_id, amount, status, payment_method, delivery_status)
    VALUES (p_user_id, p_model_id, p_service_id, p_amount, 'HELD', 'escrow', 'pending')
    RETURNING id INTO v_order_id;
    
    -- 4. Registrar la transaccion si existe la tabla
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        INSERT INTO transactions (client_id, model_id, type, amount, description)
        VALUES (p_user_id, p_model_id, 'consumption', p_amount, 'Bloqueo en Escrow por servicio');
    END IF;

    -- Return success
    RETURN json_build_object('success', true, 'escrow_id', v_order_id);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
