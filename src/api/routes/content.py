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

@router.get("/stories/feed")
async def get_stories_feed(user: TelegramUser = Depends(get_current_user)):
    """Get active stories for the feed (global for now)."""
    try:
        now = datetime.utcnow().isoformat()
        # Fetch active stories with model info
        response = db.client.table("stories") \
            .select("*, models(username, full_name, artistic_name, avatar_url)") \
            .gt("expires_at", now) \
            .order("created_at", desc=False) \
            .limit(100) \
            .execute()
        
        return response.data
    except Exception as e:
        print(f"Error fetching stories feed: {e}")
        # Return empty list instead of crashing, or re-raise with more info
        raise HTTPException(status_code=500, detail=str(e))

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
async def get_feed(
    sort: str = "recent", 
    filter_type: str = "global",
    user: TelegramUser = Depends(get_current_user)
):
    """Get global feed with filters."""
    query = db.client.table("posts").select("*, models(username, full_name, artistic_name, avatar_url, is_verified)")
    
    # Filter by following (if strictly requested)
    if filter_type == "following":
        # Get client ID
        client = db.client.table("clients").select("id").eq("telegram_id", user.id).maybe_single().execute()
        if client.data:
            following = db.client.table("followers").select("model_id").eq("client_id", client.data['id']).execute()
            model_ids = [f['model_id'] for f in following.data]
            if model_ids:
                query = query.in_("model_id", model_ids)
            else:
                return [] # Follows no one
        else:
             return [] # Not a client

    # Sort
    if sort == "top":
        query = query.order("likes_count", desc=True)
    else: # recent
        query = query.order("created_at", desc=True)
        
    response = query.limit(50).execute()
    return response.data
@router.get("/post/{post_id}")
async def get_post_detail(post_id: str):
    """Get a single post by ID."""
    response = db.client.table("posts") \
        .select("*, models(username, full_name, artistic_name, avatar_url, is_verified)") \
        .eq("id", post_id) \
        .single() \
        .execute()
    
    if not response.data:
        raise HTTPException(status_code=404, detail="Post not found")
        
    if not response.data:
        raise HTTPException(status_code=404, detail="Post not found")
        
    return response.data

@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    user: TelegramUser = Depends(get_current_user)
):
    """Delete a post (only author)."""
    # 1. Check ownership
    post = db.client.table("posts").select("model_id").eq("id", post_id).single().execute()
    if not post.data:
        raise HTTPException(status_code=404, detail="Post not found")
        
    if str(post.data['model_id']) != str(user.user_id): # Ensure string comparison
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")
        
    # 2. Delete (Storage deletion is ideal but optional for now, just DB)
    db.client.table("posts").delete().eq("id", post_id).execute()
    
    return {"message": "Post deleted successfully"}
