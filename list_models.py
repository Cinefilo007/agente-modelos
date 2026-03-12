from src.services.database import db

res = db.client.table("models").select("id, username, wallet_balance, telegram_id").execute()
for r in res.data:
    print(r)
