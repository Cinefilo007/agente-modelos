import asyncio
import os
import traceback
from src.services.database import db

async def check_and_migrate():
    print("--- Diagnosticando Esquema de Base de Datos ---")
    try:
        # 1. Verificar si las columnas existen
        print("Verificando columnas en tabla 'models'...")
        # Intentamos seleccionar las columnas nuevas. Si falla, no existen.
        try:
            res = db.client.table("models").select("prices, personality, physical_aspects, payment_methods").limit(1).execute()
            print("✅ Las columnas YA EXISTEN. El esquema parece correcto.")
        except Exception as e:
            print(f"❌ Error al consultar columnas: {e}")
            print("⚠️ Las columnas probablemente NO existen. Intentando aplicar migración...")

            try:
                # 2. Aplicar migración vía SQL directo (si fuera posible, pero supabase-py no tiene query raw fácil)
                # Alternativa: Usar una función RPC o intentar leer el archivo y ejecutarlo si tuvieramos un driver directo.
                # Como estamos limitados al cliente de Supabase, usaremos una llamada a la API de gestión o un workaround.
                # PERO, si tenemos las credenciales de conexión en .env, podemos usar psycopg2 si está instalado (usual en este entorno).
                
                import psycopg2
                from urllib.parse import urlparse
                
                db_url = os.getenv("DATABASE_URL")
                if not db_url:
                    print("❌ No se encontró DATABASE_URL en variables de entorno.")
                    return

                print("Conectando con psycopg2 para ejecutar SQL raw...")
                conn = psycopg2.connect(db_url)
                cursor = conn.cursor()
                
                with open(r"c:\Users\Admin\.gemini\antigravity\brain\54eb7161-6226-4b93-a724-179426bd87af\sql_bot_config_setup.sql", "r", encoding="utf-8") as f:
                    migration_sql = f.read()
                    
                print("Ejecutando SQL...")
                cursor.execute(migration_sql)
                conn.commit()
                print("✅ Migración aplicada exitosamente.")
                
                cursor.close()
                conn.close()
                
            except Exception as migration_error:
                print(f"❌ Error crítico aplicando migración: {migration_error}")
                traceback.print_exc()

    except Exception as e:
        print(f"Error general: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_and_migrate())
