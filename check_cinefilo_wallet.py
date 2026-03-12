from src.services.database import db

res = db.client.table("wallets").select("*").eq("user_id", "f29a435e-05c0-46ff-88c6-a4b73f68c7a0").execute()
print("Wallets for El_cinefilo:", res.data)
