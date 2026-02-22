
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import sys

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

identifier = sys.argv[1] if len(sys.argv) > 1 else "El_cinefilo"

print(f"Buscando usuario: {identifier}")

# Try to find by username in models or clients
res_model = supabase.table("models").select("id, username").eq("username", identifier).execute()
res_client = supabase.table("clients").select("id, username").eq("username", identifier).execute()

user_ids = [r["id"] for r in (res_model.data + res_client.data)]

if not user_ids:
    # Try as UUID
    user_ids = [identifier]

for uid in user_ids:
    print(f"\nChecking Wallet for UUID: {uid}")
    res_wallet = supabase.table("wallets").select("*").eq("user_id", uid).execute()
    if res_wallet.data:
        print(f"Saldo: {res_wallet.data[0]['balance']} USDT")
        print(f"Memo: {res_wallet.data[0]['deposit_memo']}")
    else:
        print("Billetera NO ENCONTRADA")

    print("\nTransacciones recientes (últimas 5):")
    res_tx = supabase.table("crypto_transactions").select("*").eq("user_id", uid).order("created_at", desc=True).limit(5).execute()
    for tx in res_tx.data:
        print(f"  [{tx['created_at']}] {tx['type']}: {tx['amount']} {tx['currency']} ({tx['status']})")
