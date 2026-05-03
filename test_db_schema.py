from src.services.database import db
try:
    res = db.service_client.table("models").select("*").limit(1).execute()
    if res.data:
        print("Keys in models:", list(res.data[0].keys()))
        print("Services in models:", res.data[0].get("services"))
    else:
        print("No models found")
except Exception as e:
    print("Error:", e)
