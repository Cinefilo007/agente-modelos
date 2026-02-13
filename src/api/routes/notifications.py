
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
    # We need to map user.user_id (which is model or client ID) to Auth UUID if needed
    # But in notifications table we use auth.users(id) as user_id for RLS
    # Let's get the Auth UUID for this telegram user
    
    # In this system, user.id is the telegram_id, and user.user_id is the system ID (UUID)
    # Actually, RLS policy uses auth.uid(), so we must use the Auth UUID.
    
    auth_id = user.id # Verify if dependencies provide auth_id
    # Let's assume user.user_id corresponds to the user receiving the notification in our schema
    
    try:
        response = db.client.table("notifications") \
            .select("*, actor:actor_id(username, avatar_url)") \
            .eq("user_id", user.user_id) \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()
            
        # Enrich with actor details if necessary (Supabase-py join might need explicit config)
        # For now, let's fetch actor details separately if join fails
        data = response.data
        
        # Collect unique actor IDs from different sources (models/clients)
        actor_ids = list(set([n['actor_id'] for n in data]))
        
        if actor_ids:
            models = db.client.table("models").select("id, username, avatar_url").in_("id", actor_ids).execute()
            clients = db.client.table("clients").select("id, username").in_("id", actor_ids).execute()
            
            user_map = {}
            for m in models.data:
                user_map[m['id']] = { "username": m['username'], "avatar_url": m['avatar_url'] }
            for c in clients.data:
                user_map[c['id']] = { "username": c['username'], "avatar_url": None }
                
            for n in data:
                actor = user_map.get(n['actor_id'], {"username": "Usuario", "avatar_url": None})
                n['actor'] = actor

        return data
    except Exception as e:
        print(f"Error fetching notifications: {e}")
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
