
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db

router = APIRouter()

@router.get("/posts/{model_id}")
async def get_model_posts(
    model_id: str, 
    page: int = Query(1, ge=1), 
    limit: int = Query(10, ge=1, le=50)
):
    """Get posts for a specific model."""
    offset = (page - 1) * limit
    
    response = db.client.table("posts") \
        .select("*") \
        .eq("model_id", model_id) \
        .order("created_at", desc=True) \
        .range(offset, offset + limit - 1) \
        .execute()
        
    return response.data

@router.get("/stories/{model_id}")
async def get_model_stories(model_id: str):
    """Get active stories (not expired)."""
    # Note: In a real app we'd filter by expires_at > NOW()
    # Supabase/PostgREST syntax: "expires_at", "gt", "now()"
    # But usually easier to handle logic like this in a stored procedure or client side if minimal.
    # We will trust the database setup or filter simply.
    
    response = db.client.table("stories") \
        .select("*") \
        .eq("model_id", model_id) \
        .order("created_at", desc=False) \
        .execute()
        
    # Python side filtering if needed, or rely on RLS/Query
    import datetime
    now = datetime.datetime.now(datetime.timezone.utc)
    
    active_stories = [
        s for s in response.data 
        if s.get('expires_at') and datetime.datetime.fromisoformat(s['expires_at'].replace('Z', '+00:00')) > now
    ]
    
    return active_stories
