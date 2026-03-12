from src.services.database import db

# Fetch El_cinefilo client
client_res = db.client.table("clients").select("id, username, wallet_balance, telegram_id").eq("username", "El_cinefilo").single().execute()

if client_res.data:
    print("Client Data:")
    print(client_res.data)
else:
    print("Client not found")

