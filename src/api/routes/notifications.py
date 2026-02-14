
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class NotificationUpdate(BaseModel):
    is_read: bool

@router.get("/")
async def get_notifications(
    user: TelegramUser = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0
):
    """Get notifications for the current user."""
    print(f"[DEBUG] Fetching notifications for User System ID: {user.user_id}")
    
    try:
        response = db.client.table("notifications") \
            .select("*") \
            .eq("user_id", user.user_id) \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()
            
        data = response.data or []
        print(f"[DEBUG] Found {len(data)} notifications")
        
        if not data:
            return []

        # Collect unique actor IDs
        actor_ids = list(set([str(n['actor_id']) for n in data]))
        print(f"[DEBUG] Actor IDs to fetch: {actor_ids}")
        
        # Fetch details from Models and Clients
        user_map = {}
        if actor_ids:
            try:
                models = db.client.table("models").select("id, username, artistic_name, avatar_url").in_("id", actor_ids).execute()
                for m in models.data:
                    user_map[str(m['id'])] = { 
                        "username": m.get('artistic_name') or m.get('username'), 
                        "avatar_url": m.get('avatar_url') 
                    }
                
                clients = db.client.table("clients").select("id, username, avatar_url").in_("id", actor_ids).execute()
                for c in clients.data:
                    if str(c['id']) not in user_map:
                        user_map[str(c['id'])] = { 
                            "username": c.get('username'), 
                            "avatar_url": c.get('avatar_url') 
                        }
            except Exception as e:
                print(f"[DEBUG] Error fetching actor details: {e}")

        # Enrich data
        for n in data:
            actor_info = user_map.get(str(n['actor_id']), {"username": "Usuario", "avatar_url": None})
            n['actor'] = actor_info

        return data
    except Exception as e:
        print(f"[DEBUG] Global error in get_notifications: {e}")
        import traceback
        traceback.print_exc()
        return []

@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    user: TelegramUser = Depends(get_current_user)
):
    """Mark a notification as read."""
    res = db.client.table("notifications") \
        .update({"is_read": True}) \
        .eq("id", notification_id) \
        .eq("user_id", user.user_id) \
        .execute()
    return {"status": "ok"}

@router.put("/read-all")
async def mark_all_as_read(
    user: TelegramUser = Depends(get_current_user)
):
    """Mark all notifications as read for current user."""
    res = db.client.table("notifications") \
        .update({"is_read": True}) \
        .eq("user_id", user.user_id) \
        .eq("is_read", False) \
        .execute()
    return {"status": "ok"}

@router.get("/unread-count")
async def get_unread_count(
    user: TelegramUser = Depends(get_current_user)
):
    """Get the count of unread notifications."""
    res = db.client.table("notifications") \
        .select("id", count="exact") \
        .eq("user_id", user.user_id) \
        .eq("is_read", False) \
        .execute()
    return {"count": res.count or 0}
