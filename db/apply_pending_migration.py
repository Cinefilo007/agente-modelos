"""Aplica migración: agregar 'pending' al constraint de models.status."""
import os, requests
from dotenv import load_dotenv
load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}

# Ejecutar SQL via RPC
sql1 = "ALTER TABLE models DROP CONSTRAINT IF EXISTS models_status_check"
sql2 = "ALTER TABLE models ADD CONSTRAINT models_status_check CHECK (status IN ('prospect', 'pending', 'verifying', 'active', 'rejected', 'paused'))"

for sql in [sql1, sql2]:
    print(f"Ejecutando: {sql[:60]}...")
    r = requests.post(
        f"{url}/rest/v1/rpc/exec_sql",
        headers=headers,
        json={"query": sql}
    )
    if r.status_code >= 400:
        print(f"  RPC no disponible ({r.status_code}), intentando via pg_net...")
        break
    print(f"  OK: {r.status_code}")

# Si RPC falla, haremos un test directo para ver si el constraint ya se puede actualizar
print("\nVerificando con un update de prueba a 'pending'...")
h2 = {**headers, "Prefer": "return=representation"}
r = requests.patch(f"{url}/rest/v1/models?telegram_id=eq.6116182800", headers=h2, json={"status": "pending"})
print(f"  Status: {r.status_code}")
if r.status_code < 400:
    print("  EXITO: 'pending' ahora es permitido!")
    requests.patch(f"{url}/rest/v1/models?telegram_id=eq.6116182800", headers=h2, json={"status": "prospect"})
    print("  Revertido a prospect.")
else:
    body = r.content.decode("utf-8", errors="replace")
    print(f"  FALLO: Necesitas ejecutar la migracion SQL manualmente.")
    print(f"  Ve a Supabase Dashboard > SQL Editor y ejecuta:")
    print(f"  {sql1};")
    print(f"  {sql2};")
