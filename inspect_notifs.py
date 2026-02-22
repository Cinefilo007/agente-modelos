
from src.services.database import db

def inspect_notifications():
    try:
        # We can't easily get the schema via the client, but we can try to trigger an error or use a known method.
        # Actually, let's try to fetch one and see the keys.
        res = db.service_client.table("notifications").select("*").limit(1).execute()
        if res.data:
            print("Columns found:", res.data[0].keys())
        else:
            print("No data in notifications, but table exists.")
            
        # Try to get info about constraints via a raw SQL query if possible (using service_client)
        # Supabase-py doesn't support raw SQL easily, but we can try to insert a WRONG type to see the error message detail again if needed.
        # But we already have the error message from the user.
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_notifications()
