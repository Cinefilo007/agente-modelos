import asyncio
import os
from src.services.database import db

async def verify_tables():
    print("--- Verificando Tablas de Pagos ---")
    
    tables_to_check = ['wallets', 'crypto_transactions', 'escrow_orders']
    
    try:
        # We can try to select 1 row from each table. Even if empty, it confirms table existence.
        # If table doesn't exist, Supabase/PostgREST usually returns 404 or specific error.
        
        for table in tables_to_check:
            print(f"Checking table '{table}'...")
            try:
                res = db.client.table(table).select("*").limit(1).execute()
                print(f"✅ Table '{table}' exists.")
            except Exception as e:
                print(f"❌ Error checking '{table}': {e}")

    except Exception as e:
        print(f"Global Error: {e}")

if __name__ == "__main__":
    asyncio.run(verify_tables())
