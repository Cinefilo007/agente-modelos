from src.services.database import db

res = db.client.table("wallets").select("*").limit(1).execute()
print(res.data)
