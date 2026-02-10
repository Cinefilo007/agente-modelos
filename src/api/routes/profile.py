
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict
from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db

router = APIRouter()

class SocialLinks(BaseModel):
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    facebook: Optional[str] = None
    tiktok: Optional[str] = None
    onlyfans: Optional[str] = None

class ProfileUpdate(BaseModel):
    bio_short: Optional[str] = None
    social_links: Optional[SocialLinks] = None
    cover_url: Optional[str] = None
    avatar_url: Optional[str] = None

@router.get("/me")
async def get_my_profile(user: TelegramUser = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    model = db.client.table("models").select("*").eq("telegram_id", user.id).single().execute()
    
    if not model.data:
        raise HTTPException(status_code=404, detail="Model profile not found. Please register via the bot first.")
        
    return model.data

@router.put("/me")
async def update_my_profile(update_data: ProfileUpdate, user: TelegramUser = Depends(get_current_user)):
    """Update profile details."""
    model = db.client.table("models").select("id").eq("telegram_id", user.id).single().execute()
    
    if not model.data:
        raise HTTPException(status_code=404, detail="Model profile not found.")

    updates = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if "social_links" in updates:
        # Convert Pydantic model to dict for JSONB
        updates["social_links"] = updates["social_links"]
    
    if not updates:
        return {"message": "No changes detected"}

    response = db.client.table("models").update(updates).eq("telegram_id", user.id).execute()
    return response.data[0]

@router.get("/{model_id}")
async def get_public_profile(model_id: str):
    """Get a public profile by ID."""
    # Fetch model data
    model = db.client.table("models") \
        .select("id, full_name, username, bio_short, avatar_url, cover_url, followers_count, total_likes, reputation_score, social_links") \
        .eq("id", model_id) \
        .single() \
        .execute()
        
    if not model.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    user_data = model.data

    # Fetch posts count
    posts_count = db.client.table("posts").select("id", count="exact").eq("model_id", model_id).execute()
    user_data['posts_count'] = posts_count.count if posts_count.count else 0
    
    # Fetch latest posts (limit 9 for grid)
    posts = db.client.table("posts").select("id, media_url, media_type, likes_count").eq("model_id", model_id).order("created_at", desc=True).limit(9).execute()
    user_data['posts'] = posts.data if posts.data else []

    return user_data
