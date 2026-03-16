import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
client = create_client(url, key)

try:
    print("Testing crypto_transactions with valid UUID...")
    user = client.table("models").select("id").limit(1).execute()
    if user.data:
        uid = user.data[0]["id"]
        res = client.table("crypto_transactions").insert({
            "user_id": uid,
            "type": "AI_EDIT",
            "amount": 1,
            "currency": "CREDITS",
            "status": "COMPLETED",
            "details": {}
        }).execute()
        print("Success:", res.data)
    else:
        print("No models found")
except Exception as e:
    print("Error:", e)
