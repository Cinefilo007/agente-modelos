from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional
from pydantic import BaseModel
from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db
from datetime import datetime, timedelta

router = APIRouter()

class PostCreate(BaseModel):
    media_url: str
    media_type: str = "image"
    caption: Optional[str] = None

class StoryCreate(BaseModel):
    media_url: str
    media_type: str = "image"

@router.post("/posts")
async def create_post(post: PostCreate, user: TelegramUser = Depends(get_current_user)):
    """Create a new post."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Only models can create posts")

    data = {
        "model_id": user.user_id, # user.user_id comes from JWT
        "media_url": post.media_url,
        "media_type": post.media_type,
        "caption": post.caption
    }
    
    response = db.client.table("posts").insert(data).execute()
    return response.data[0]

@router.get("/posts/{user_id}")
async def get_user_posts(user_id: str):
    """Get posts for a specific user (model)."""
    response = db.client.table("posts").select("*").eq("model_id", user_id).order("created_at", desc=True).execute()
    return response.data

@router.post("/stories")
async def create_story(story: StoryCreate, user: TelegramUser = Depends(get_current_user)):
    """Create a new story (expires in 24h)."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Only models can create stories")

    expires_at = (datetime.utcnow() + timedelta(hours=24)).isoformat()
    
    data = {
        "model_id": user.user_id,
        "media_url": story.media_url,
        "media_type": story.media_type,
        "expires_at": expires_at
    }
    
    response = db.client.table("stories").insert(data).execute()
    return response.data[0]

@router.get("/stories/{user_id}")
async def get_user_stories(user_id: str):
    """Get active stories for a user."""
    now = datetime.utcnow().isoformat()
    response = db.client.table("stories") \
        .select("*") \
        .eq("model_id", user_id) \
        .gt("expires_at", now) \
        .order("created_at", desc=False) \
        .execute()
    return response.data

@router.get("/feed")
async def get_feed(user: TelegramUser = Depends(get_current_user)):
    """Get global feed (for now) or personalized."""
    # Logic to fetch posts from models followed by user? 
    # For now, just return latest posts from all models
    response = db.client.table("posts") \
        .select("*, models(username, full_name, avatar_url)") \
        .order("created_at", desc=True) \
        .limit(50) \
        .execute()
    return response.data
