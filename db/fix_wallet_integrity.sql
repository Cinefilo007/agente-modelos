-- SOLUCIÓN: Error de Integridad en Billeteras
-- Este script elimina la restricción de clave foránea que requiere que el usuario esté en auth.users,
-- permitiendo que perfiles creados por el bot (models/clients) puedan tener billetera sin errores.

-- 1. Identificar y eliminar la restricción actual
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'wallets_user_id_fkey' 
        AND table_name = 'wallets'
    ) THEN
        ALTER TABLE wallets DROP CONSTRAINT wallets_user_id_fkey;
    END IF;
END $$;

-- 2. (Opcional) Podemos añadir una FK a una tabla pública si queremos mantener integridad parcial,
-- pero dado que user_id puede ser de un 'model' o un 'client', lo dejaremos como UUID libre por ahora
-- para maxima compatibilidad con el sistema de auth personalizado.

-- 3. Asegurar que las tablas de transacciones y escrow también sean flexibles si es necesario
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'crypto_transactions_user_id_fkey' AND table_name = 'crypto_transactions') THEN
        ALTER TABLE crypto_transactions DROP CONSTRAINT crypto_transactions_user_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'escrow_orders_client_id_fkey' AND table_name = 'escrow_orders') THEN
        ALTER TABLE escrow_orders DROP CONSTRAINT escrow_orders_client_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'escrow_orders_model_id_fkey' AND table_name = 'escrow_orders') THEN
        ALTER TABLE escrow_orders DROP CONSTRAINT escrow_orders_model_id_fkey;
    END IF;
END $$;
