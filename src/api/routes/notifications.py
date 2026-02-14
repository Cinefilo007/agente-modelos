
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

@router.get("")
async def get_notifications(
    user: TelegramUser = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0
):
    """Get notifications for the current user."""
    logger.info(f"[Notifications] API Request - User: {user.username} (ID: {user.user_id})")
    
    try:
        # 1. Fetch from DB
        logger.info(f"[Notifications] Querying DB for user_id={user.user_id}")
        response = db.service_client.table("notifications") \
            .select("*") \
            .eq("user_id", user.user_id) \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()
            
        data = response.data or []
        logger.info(f"[Notifications] Got {len(data)} raw notifications from DB")
        
        if not data:
            logger.info("[Notifications] Returning empty list (no data found)")
            return []

        # 2. Extract actor IDs
        actor_ids = []
        for n in data:
            if n.get('actor_id'):
                actor_ids.append(str(n['actor_id']))
        actor_ids = list(set(actor_ids))
        logger.info(f"[Notifications] Found unique actors: {actor_ids}")
        
        # 3. Enrich actors
        user_map = {}
        if actor_ids:
            try:
                # Models
                models_res = db.service_client.table("models").select("id, username, artistic_name, avatar_url").in_("id", actor_ids).execute()
                for m in models_res.data:
                    user_map[str(m['id'])] = { 
                        "username": m.get('artistic_name') or m.get('username') or "Modelo", 
                        "avatar_url": m.get('avatar_url') 
                    }
                
                # Clients
                clients_res = db.service_client.table("clients").select("id, username, avatar_url").in_("id", actor_ids).execute()
                for c in clients_res.data:
                    cid = str(c['id'])
                    if cid not in user_map:
                        user_map[cid] = { 
                            "username": c.get('username') or "Usuario", 
                            "avatar_url": c.get('avatar_url') 
                        }
                logger.info(f"[Notifications] Successfully mapped {len(user_map)} actor details")
            except Exception as e:
                logger.error(f"[Notifications] Actor enrichment failed: {e}")

        # 4. Final mapping
        enriched_data = []
        for n in data:
            actor_id = str(n.get('actor_id'))
            n['actor'] = user_map.get(actor_id, {"username": "Usuario", "avatar_url": None})
            enriched_data.append(n)

        logger.info(f"[Notifications] Returning {len(enriched_data)} enriched notifications")
        return enriched_data

    except Exception as e:
        logger.error(f"[Notifications] CRITICAL ERROR: {e}")
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
