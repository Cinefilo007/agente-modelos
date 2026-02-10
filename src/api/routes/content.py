from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db
from src.services.storage import upload_file
from datetime import datetime, timedelta

router = APIRouter()

@router.post("/posts")
async def create_post(
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    user: TelegramUser = Depends(get_current_user)
):
    """Create a new post with file upload."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Only models can create posts")

    # Upload file to 'posts' bucket
    public_url = await upload_file(file, bucket_name="posts")
    
    # Determine media type (basic check)
    media_type = "video" if file.content_type.startswith("video") else "image"

    data = {
        "model_id": user.user_id,
        "media_url": public_url,
        "media_type": media_type,
        "caption": caption
    }
    
    response = db.client.table("posts").insert(data).execute()
    return response.data[0]

@router.get("/posts/{user_id}")
async def get_user_posts(user_id: str):
    """Get posts for a specific user (model)."""
    response = db.client.table("posts").select("*").eq("model_id", user_id).order("created_at", desc=True).execute()
    return response.data

@router.post("/stories")
async def create_story(
    file: UploadFile = File(...),
    user: TelegramUser = Depends(get_current_user)
):
    """Create a new story (expires in 24h)."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Only models can create stories")

    # Upload file to 'stories' bucket
    public_url = await upload_file(file, bucket_name="stories")
    
    # Determine media type
    media_type = "video" if file.content_type.startswith("video") else "image"

    expires_at = (datetime.utcnow() + timedelta(hours=24)).isoformat()
    
    data = {
        "model_id": user.user_id,
        "media_url": public_url,
        "media_type": media_type,
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
    """Get global feed."""
    response = db.client.table("posts") \
        .select("*, models(username, full_name, avatar_url)") \
        .order("created_at", desc=True) \
        .limit(50) \
        .execute()
@router.get("/post/{post_id}")
async def get_post_detail(post_id: str):
    """Get a single post by ID."""
    response = db.client.table("posts") \
        .select("*, models(username, full_name, avatar_url, is_verified)") \
        .eq("id", post_id) \
        .single() \
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Post not found")
        
    return response.data
