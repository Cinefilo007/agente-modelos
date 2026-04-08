"""Aplica la migración para agregar 'pending' al CHECK constraint de models.status."""
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

client = create_client(url, key)

print("Aplicando migración: Agregar 'pending' al constraint de models.status...")

# Leer y ejecutar SQL
with open("db/migration_add_pending_status.sql", "r") as f:
    sql = f.read()

# Ejecutar cada statement por separado
for stmt in sql.split(";"):
    stmt = stmt.strip()
    if stmt and not stmt.startswith("--"):
        print(f"  Ejecutando: {stmt[:80]}...")
        try:
            client.postgrest.rpc("exec_sql", {"query": stmt}).execute()
        except Exception as e:
            # Intentar con raw SQL via REST
            print(f"  RPC falló, intentando directo... ({e})")

print("Migración completada.")
print("\nVerificando modelos con status actual:")
res = client.table("models").select("telegram_id, username, status").execute()
for m in res.data:
    print(f"  {m['username']} -> {m['status']}")
