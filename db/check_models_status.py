"""Busca el nombre real del constraint de status en la tabla models."""
import os, requests
from dotenv import load_dotenv
load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}

# Intentar obtener info del constraint via information_schema
# Esto requiere una RPC pero podemos usar el SQL endpoint del dashboard
# Vamos a intentar insertar un registro con status='pending' para ver el error exacto
h2 = {**headers, "Prefer": "return=representation"}
r = requests.post(
    f"{url}/rest/v1/models",
    headers=h2,
    json={"telegram_id": 999999999, "username": "test_constraint", "status": "pending"}
)
body = r.content.decode("utf-8", errors="replace")
# Buscar el nombre del constraint en el error
print(f"Status: {r.status_code}")
# Filtrar las partes relevantes
if "check" in body.lower() or "constraint" in body.lower():
    # Extraer nombre del constraint
    import re
    match = re.search(r'"([^"]*check[^"]*)"', body, re.IGNORECASE)
    if match:
        print(f"Constraint encontrado: {match.group(1)}")
    match2 = re.search(r'constraint\s+"([^"]+)"', body, re.IGNORECASE)
    if match2:
        print(f"Constraint nombre: {match2.group(1)}")

# Imprimir todo lo que sea ASCII-safe
safe = ''.join(c if ord(c) < 128 else '?' for c in body)
print(f"Body: {safe[:600]}")

# Limpiar el test
requests.delete(f"{url}/rest/v1/models?telegram_id=eq.999999999", headers=headers)
