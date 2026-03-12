from src.services.database import db

# Fetch all clients
res = db.client.table("clients").select("id, username, wallet_balance, telegram_id").execute()
for r in res.data:
    print(r)
