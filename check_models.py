from src.services.database import db
import json

try:
    res = db.client.table("models").select("artistic_name, avatar_url, cover_url").eq("status", "active").limit(5).execute()
    print(json.dumps(res.data, indent=2))
except Exception as e:
    print(f"Error: {e}")
