from src.services.database import db

def check_models_status():
    try:
        res = db.client.table("models").select("id, artistic_name, status").execute()
        print(f"Models found: {len(res.data)}")
        for m in res.data:
            print(f"ID: {m['id']} | Name: {m['artistic_name']} | Status: {m['status']}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_models_status()
