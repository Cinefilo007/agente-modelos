import asyncio
import os
from src.services.database import db

async def check_types():
    print("--- Verificando Tipos de Columnas en 'models' ---")
    try:
        # We can't query information_schema easily via supabase-py client without strict permissions or RPC.
        # But we can try to insert/update and see behaviors, OR just check the metadata if available.
        # Actually, let's try to query information_schema using the .rpc() or just select from it if allowed?
        # Usually direct select on information_schema from client is blocked or row-level security applies.
        
        # Plan B: Try to update with a string. If it fails (and is JSONB), we know.
        # If it succeeds, it might be TEXT or JSONB (auto-cast).
        
        # Let's assume the directive database_schema.md from Step 3301 was correct about types derived from previous knowledge?
        # Step 3301 said:
        # config_prices JSONB
        # config_persona TEXT
        # config_physique TEXT
        # config_payments JSONB
        
        # Let's verify this hypothesis.
        # Fetch current user (admin/model) or just use the first model found.
        
        res = db.client.table("models").select("telegram_id, config_prices, config_persona").limit(1).execute()
        if not res.data:
            print("No models found.")
            return

        user_id = res.data[0]['telegram_id']
        print(f"Testing with model telegram_id: {user_id}")
        
        # Test 1: Update config_persona with a simple string
        print("Test 1: Updating config_persona with string...")
        try:
            db.client.table("models").update({"config_persona": "TEST_STRING"}).eq("telegram_id", user_id).execute()
            print("✅ config_persona accepts STRING (Likely TEXT)")
        except Exception as e:
            print(f"❌ config_persona rejected STRING: {e}")
            
        # Test 2: Update config_prices with a dict (JSON)
        print("Test 2: Updating config_prices with Dict...")
        try:
            db.client.table("models").update({"config_prices": {"test": "val"}}).eq("telegram_id", user_id).execute()
            print("✅ config_prices accepts JSON/DICT (Likely JSONB)")
        except Exception as e:
            print(f"❌ config_prices rejected JSON/DICT: {e}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_types())
