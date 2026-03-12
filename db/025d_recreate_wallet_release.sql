-- SQL DUMP: Recrear wallet_release_funds para trabajar con la tabla unificada "orders" y "wallets"
-- Ejecutar en Supabase SQL Editor

DROP FUNCTION IF EXISTS wallet_release_funds(uuid);

CREATE OR REPLACE FUNCTION wallet_release_funds(
    p_escrow_id UUID
) RETURNS JSON AS $$
DECLARE
    v_order RECORD;
    v_fee DECIMAL;
    v_payout DECIMAL;
BEGIN
    -- 1. Obtener detalles de la orden (bloquendo la fila para update)
    SELECT * INTO v_order FROM orders WHERE id = p_escrow_id FOR UPDATE;
    
    IF v_order IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Orden no encontrada');
    END IF;
    
    IF v_order.status != 'HELD' THEN
        RETURN json_build_object('success', false, 'error', 'La orden no está en custodia o ya fue liberada');
    END IF;

    -- 2. Calcular Comisiones (Asumiendo 2.50 descontado antes o cobrado ahora)
    -- Si el amount en la orden ya incluye el fee (ej: 17.50), y el servicio costaba 15.00
    -- La lógica actual era: fee = 2.50, payout = amount - fee.
    -- O si el amount es el precio base, payout = amount.
    -- Dependerá de cómo lo guarden. Por seguridad, usaremos un fee fijo si era el modelo anterior,
    -- o simplemente enviamos el amount a la wallet si el fee se descontó al comprador.
    -- Según el código: total_amount = price + fee, amount en orden guardada = price.
    -- Wait, in shop.py:
    -- fee = 2.50 if order_data.payment_method == 'escrow' else 0
    -- total_amount = price + fee
    -- rpc_params = { "p_amount": total_amount, ... }   <-- wallet_lock_funds recibe total (17.50)
    -- En python original de shop.py: order_payload["amount"] = price (15) -- wait!
    -- Si el RPC recibe 17.50 y lo guarda en amount: INSERT INTO orders (... amount) VALUES (..., 17.50)
    -- Entonces v_order.amount es 17.50. El modelo recibe 15.
    
    -- Usaremos fee de 2.50
    v_fee := 2.50;
    
    -- Validar que no quede en negativo
    IF v_order.amount <= v_fee THEN
        v_payout := 0;
    ELSE
        v_payout := v_order.amount - v_fee;
    END IF;

    -- 3. Acreditar saldo a la modelo en la tabla 'wallets' y reducir el retenido al cliente
    UPDATE wallets SET balance = balance + v_payout WHERE user_id = v_order.model_id;
    UPDATE wallets SET locked_balance = GREATEST(0, COALESCE(locked_balance, 0) - v_order.amount) WHERE user_id = v_order.client_id;

    
    -- 4. Actualizar estado de la orden
    UPDATE orders SET status = 'COMPLETED', delivery_status = 'delivered' WHERE id = p_escrow_id;
    
    -- 5. Registrar transacciones si existe la tabla
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        INSERT INTO transactions (client_id, model_id, type, amount, description)
        VALUES (v_order.client_id, v_order.model_id, 'income', v_payout, 'Liberación de fondos Escrow');
        
        -- Registrar el Fee para el admin? opcional
    END IF;

    RETURN json_build_object('success', true, 'payout', v_payout, 'fee', v_fee);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
