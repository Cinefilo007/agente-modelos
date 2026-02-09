import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError("Supabase URL or Key not found in environment variables.")

supabase: Client = create_client(url, key)

def get_db():
    return supabase

if __name__ == "__main__":
    try:
        print(f"--- Verificando conexión a {url} ---")
        # Intento simple: Leer 1 fila de 'models'
        response = supabase.table("models").select("*").limit(1).execute()
        print("✅ Tabla 'models' ENCONTRADA.")
        print(f"   Filas de prueba: {len(response.data)}")
    except Exception as e:
        print(f"❌ Error al consultar 'models': {e}")
        
    try:
        # Intento ver si existe 'modelos' (por si acaso)
        response_es = supabase.table("modelos").select("*").limit(1).execute()
        print("⚠️ Tabla 'modelos' ENCONTRADA (Nombre en español).")
    except Exception as e:
        print("ℹ️ Tabla 'modelos' NO encontrada (como se esperaba).")
