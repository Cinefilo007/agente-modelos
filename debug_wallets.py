
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
s = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

print("--- DIAGNÓSTICO DE BILLETERAS ---")
wallets = s.table("wallets").select("*").execute()

for w in wallets.data:
    uid = w['user_id']
    # Manual lookup to avoid maybe_single issues
    m = s.table("models").select("username").eq("id", uid).execute()
    c = s.table("clients").select("username").eq("id", uid).execute()
    
    username = "Desconocido"
    if m.data: username = m.data[0]['username']
    elif c.data: username = c.data[0]['username']
    
    print(f"User: {username} | Saldo: {w['balance']} USDT | UID: {uid}")

print("\n--- ÚLTIMAS TRANSACCIONES ---")
txs = s.table("crypto_transactions").select("*").order("created_at", desc=True).limit(5).execute()
for t in txs.data:
    print(f"{t['created_at']} | {t['type']} | {t['amount']} {t['currency']} | Status: {t['status']}")
