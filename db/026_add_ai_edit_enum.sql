-- Migration para agregar AI_EDIT al tipo enum de crypto_transactions
ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'AI_EDIT';
