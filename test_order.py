from src.services.database import db

try:
    res = db.client.table("orders") \
        .select("*, models(id, username, artistic_name, avatar_url, telegram_id), clients(id, username, avatar_url, telegram_id), model_services(*), model_service_options(*)") \
        .eq("id", "604b3096-8b63-47a2-8e42-cd091e2761db") \
        .single().execute()
    print("Success:")
    print(res.data)
except Exception as e:
    print("Error:")
    print(e)
