
from src.services.database import db

def check_all_tables():
    # Attempt to list tables or check for notifications specifically
    print("Listing all tables and checking schemas...")
    
    try:
        # Check for notifications specifically
        notif = db.client.table("notifications").select("*").limit(1).execute()
        print("✅ 'notifications' table EXISTS.")
        print(f"Sample data: {notif.data}")
    except Exception as e:
        print("❌ 'notifications' table DOES NOT exist or error.")
        print(f"Error: {e}")

    tables = ["interactions", "followers", "reviews", "comments", "clients", "models", "posts"]
    for table in tables:
        try:
            res = db.client.table(table).select("*").limit(1).execute()
            print(f"✅ '{table}' table exists.")
        except Exception as e:
            print(f"❌ '{table}' table check failed: {e}")

if __name__ == "__main__":
    check_all_tables()
