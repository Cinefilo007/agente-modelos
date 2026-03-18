import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

async def main():
    if not url or not key:
        print("Error: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no encontrados.")
        return

    supabase: Client = create_client(url, key)
    
    print("Verificando/Agregando columnas a la tabla 'models'...")
    
    # Nota: Supabase Python SDK no soporta ALTER TABLE directamente.
    # Usualmente se hace vía SQL Editor o un RPC de mantenimiento.
    # Dado que estamos en un entorno controlado, intentaremos verificar si existen
    # y si no, informaremos que se requiere ejecución manual de SQL o intentaremos un truco.
    
    try:
        # Intento de verificar si las columnas existen
        test_res = supabase.table("models").select("business_connection_id, auto_story_enabled").limit(1).execute()
        print("✅ Las columnas ya existen en la tabla 'models'.")
    except Exception as e:
        print(f"❌ Las columnas parecen no existir o hubo un error: {e}")
        print("\nACCION REQUERIDA: Ejecuta el siguiente SQL en el panel de Supabase:")
        with open("db/012_add_story_config_to_models.sql", "r") as f:
            print(f.read())

if __name__ == "__main__":
    asyncio.run(main())
