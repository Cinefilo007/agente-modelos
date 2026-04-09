
import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

async def main():
    if not url or not key:
        print("X Error: Supabase credentials not found.")
        return

    supabase: Client = create_client(url, key)
    bucket_name = "temp_ai"
    
    print(f"Verificando bucket '{bucket_name}'...")
    try:
        buckets = supabase.storage.list_buckets()
        existing = [b.name for b in buckets]
        
        if bucket_name not in existing:
            print(f"Bucket '{bucket_name}' no encontrado. Creando...")
            supabase.storage.create_bucket(bucket_name, options={"public": True})
            print(f"✅ Bucket '{bucket_name}' creado correctamente como público.")
        else:
            print(f"Bucket '{bucket_name}' ya existe.")
            # Actualizar a público por si acaso
            supabase.storage.update_bucket(bucket_name, options={"public": True})
            print(f"✅ Bucket '{bucket_name}' actualizado a público.")

    except Exception as e:
        print(f"❌ Error gestionando storage: {e}")

if __name__ == "__main__":
    asyncio.run(main())
