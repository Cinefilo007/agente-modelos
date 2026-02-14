
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import logging
from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db

logger = logging.getLogger(__name__)
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
    logger.info(f"[Notifications] Fetching for user {user.user_id}")
    
    try:
        # Use service_client to bypass RLS for reading notifications
        response = db.service_client.table("notifications") \
            .select("*") \
            .eq("user_id", user.user_id) \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()
            
        data = response.data or []
        logger.info(f"[Notifications] Found {len(data)} items")
        
        if not data:
            return []

        # Collect unique actor IDs
        actor_ids = list(set([str(n['actor_id']) for n in data]))
        
        # Fetch details from Models and Clients
        user_map = {}
        if actor_ids:
            try:
                models = db.service_client.table("models").select("id, username, artistic_name, avatar_url").in_("id", actor_ids).execute()
                for m in models.data:
                    user_map[str(m['id'])] = { 
                        "username": m.get('artistic_name') or m.get('username'), 
                        "avatar_url": m.get('avatar_url') 
                    }
                
                clients = db.service_client.table("clients").select("id, username, avatar_url").in_("id", actor_ids).execute()
                for c in clients.data:
                    if str(c['id']) not in user_map:
                        user_map[str(c['id'])] = { 
                            "username": c.get('username'), 
                            "avatar_url": c.get('avatar_url') 
                        }
            except Exception as e:
                logger.error(f"[Notifications] Error fetching actors: {e}")

        # Enrich data
        for n in data:
            actor_info = user_map.get(str(n['actor_id']), {"username": "Usuario", "avatar_url": None})
            n['actor'] = actor_info

        return data
    except Exception as e:
        logger.error(f"[Notifications] Global error: {e}")
        import traceback
        traceback.print_exc()
        return []

@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    user: TelegramUser = Depends(get_current_user)
):
    """Mark a notification as read."""
    db.service_client.table("notifications") \
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
    db.service_client.table("notifications") \
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
    res = db.service_client.table("notifications") \
        .select("id", count="exact") \
        .eq("user_id", user.user_id) \
        .eq("is_read", False) \
        .execute()
    return {"count": res.count or 0}
