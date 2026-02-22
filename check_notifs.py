
from src.services.database import db
import json

def check_notifications():
    try:
        # Get last 5 notifications
        res = db.service_client.table("notifications").select("*").order("created_at", desc=True).limit(5).execute()
        print("Recent notifications:")
        print(json.dumps(res.data, indent=2))
        
        # Check if any 'tip' or 'gift' exist
        tips = db.service_client.table("notifications").select("*").eq("type", "tip").execute()
        print(f"\nTotal 'tip' notifications: {len(tips.data)}")
        
        gifts = db.service_client.table("notifications").select("*").eq("type", "gift").execute()
        print(f"Total 'gift' notifications: {len(gifts.data)}")
        
    except Exception as e:
        print(f"Error checking notifications: {e}")

if __name__ == "__main__":
    check_notifications()
