from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from typing import List, Optional
from pydantic import BaseModel
from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db
from src.services.storage import upload_file
from datetime import datetime, timedelta

class ReportCreate(BaseModel):
    post_id: str
    reason: str
    description: Optional[str] = None

def calculate_is_online(last_seen_str: Optional[str]) -> bool:
    """Helper to check if a model is online based on last_seen timestamp."""
    if not last_seen_str:
        return False
    try:
        threshold = datetime.utcnow() - timedelta(minutes=5)
        ls_dt = datetime.fromisoformat(last_seen_str.replace('Z', '+00:00'))
        return ls_dt.replace(tzinfo=None) > threshold
    except:
        return False

router = APIRouter()

from src.services.storage import upload_file, generate_video_thumbnail, trim_video
import io

@router.post("/posts")
async def create_post(
    file: UploadFile = File(...),
    thumbnail: Optional[UploadFile] = File(None),
    caption: Optional[str] = Form(None),
    start_time: float = Form(0),
    end_time: Optional[float] = Form(None),
    thumbnail_time: float = Form(0.1),
    user: TelegramUser = Depends(get_current_user)
):
    """Create a new post with file upload."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Only models can create posts")

    # Leer contenido del archivo para poder procesarlo si es video
    file_content = await file.read()
    file.file.seek(0) # Reset para upload_file
    
    # Upload file to 'posts' bucket
    # Para no duplicar lectura, pasamos el contenido o re-usamos UploadFile
    public_url = await upload_file(file, bucket_name="posts")
    
    # Determine media type
    media_type = "video" if file.content_type.startswith("video") else "image"
    thumbnail_url = None

    if media_type == "video":
        # Process trimming if duration is specified
        if end_time is not None and end_time > start_time:
            print(f"[Video Editor] Trimming video from {start_time} to {end_time}")
            file_content = await trim_video(file_content, start_time, end_time)
        
        try:
            # Handle Thumbnail
            thumb_content = None
            if thumbnail:
                print("[Video Editor] Using provided thumbnail file")
                thumb_content = await thumbnail.read()
            else:
                print(f"[Video Editor] Generating thumbnail from frame at {thumbnail_time}s")
                thumb_content = await generate_video_thumbnail(file_content, ss=thumbnail_time)
            
            if thumb_content:
                import uuid
                thumb_filename = f"thumb_{uuid.uuid4()}.jpg"
                try:
                    db.service_client.storage.from_("posts").upload(
                        path=f"thumbnails/{thumb_filename}",
                        file=thumb_content,
                        file_options={"content-type": "image/jpeg"}
                    )
                    thumbnail_url = db.service_client.storage.from_("posts").get_public_url(f"thumbnails/{thumb_filename}")
                except Exception as e:
                    print(f"Error uploading thumbnail: {e}")
        except Exception as e:
            print(f"Error processing video media: {e}")

    # Final file upload (if trimmed, we need a new way to upload bytes or save to temp again)
    # Actually 'upload_file' takes 'UploadFile'. Let's refactor or use a byte-based upload here.
    if media_type == "video" and end_time is not None:
         import uuid
         unique_id = uuid.uuid4()
         filename = f"uploads/{unique_id}.mp4"
         db.service_client.storage.from_("posts").upload(
             path=filename,
             file=file_content,
             file_options={"content-type": "video/mp4"}
         )
         public_url = db.service_client.storage.from_("posts").get_public_url(filename)
    else:
        public_url = await upload_file(file, bucket_name="posts")

    data = {
        "model_id": user.user_id,
        "media_url": public_url,
        "media_type": media_type,
        "caption": caption,
        "thumbnail_url": thumbnail_url
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

    # Fetch posts with model info (including last_seen) and counts
    query = db.client.table("posts").select("*, likes_count, comments_count, models(username, full_name, artistic_name, avatar_url, is_verified, last_seen)")
    
    # Sort
    if sort == "top":
        query = query.order("likes_count", desc=True)
    else: # recent
        query = query.order("created_at", desc=True)

    response = query.limit(50).execute()
    posts = response.data
    
    if not posts:
        return []

    # Enrich with 'is_liked' and 'is_online'
    post_ids = [p['id'] for p in posts]
    
    # Check likes by current user
    liked_posts = []
    if post_ids:
        likes_res = db.client.table("interactions") \
            .select("target_id") \
            .eq("actor_id", user.user_id) \
            .eq("action", "like") \
            .in_("target_id", post_ids) \
            .execute()
        liked_posts = {l['target_id'] for l in likes_res.data}

    # Process posts
    threshold = datetime.utcnow() - timedelta(minutes=5)
    
    enriched_posts = []
    for p in posts:
        # Check Online Status
        model = p.get('models', {})
        is_online = calculate_is_online(model.get('last_seen'))
        
        enriched_posts.append({
            **p,
            "is_liked": p['id'] in liked_posts,
            "is_online": is_online,
            # Ensure counts are present (fallback to 0)
            "likes_count": p.get("likes_count", 0),
            "comments_count": p.get("comments_count", 0)
        })

    return enriched_posts

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
    
    post = response.data
    # Enrich with is_online
    model = post.get('models', {})
    post['is_online'] = calculate_is_online(model.get('last_seen'))
        
    return post

@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    reason: Optional[str] = Body(None, embed=True), # Optional reason for admin deletion
    user: TelegramUser = Depends(get_current_user)
):
    """Delete a post (author or admin)."""
    # 1. Check ownership or admin role
    post = db.client.table("posts").select("model_id").eq("id", post_id).single().execute()
    if not post.data:
        raise HTTPException(status_code=404, detail="Post not found")
    
    is_author = str(post.data['model_id']) == str(user.user_id)
    is_admin = user.role == "admin"

    if not is_author and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")
        
    # 2. Log deletion reason if admin (Future: Notify model)
    if is_admin and reason:
        print(f"[Admin] Post {post_id} deleted by admin {user.id}. Reason: {reason}")
        # TODO: Insert into 'notifications' table for the model

    # 3. Delete associated interactions first (to trigger total_likes decrement in models table)
    db.client.table("interactions").delete().eq("target_id", post_id).execute()

    # 4. Delete the post
    db.client.table("posts").delete().eq("id", post_id).execute()
    
    return {"message": "Post deleted successfully"}

@router.post("/report")
async def report_post(
    report: ReportCreate,
    user: TelegramUser = Depends(get_current_user)
):
    """Report a post content."""
    # Verify post exists
    post = db.client.table("posts").select("id").eq("id", report.post_id).single().execute()
    if not post.data:
        raise HTTPException(status_code=404, detail="Post not found")

    data = {
        "post_id": report.post_id,
        "reporter_id": user.id, # Telegram ID
        "reporter_role": user.role,
        "reason": report.reason,
        "description": report.description,
        "status": "pending"
    }

    try:
        db.client.table("reported_posts").insert(data).execute()
        return {"message": "Report submitted successfully"}
    except Exception as e:
        print(f"[Report] Error submitting report: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit report")

@router.get("/admin/reports")
async def get_reports(user: TelegramUser = Depends(get_current_user)):
    """Get all reports (Admin only)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Fetch reports with Post and Reporter details
    # Note: Supabase joins can be complex.
    # We fetch reports, then manually fetch related data or use deep select if relations exist.
    # Assuming relations: reported_posts.post_id -> posts.id
    
    response = db.client.table("reported_posts") \
        .select("*, posts(*, models(username, artistic_name))") \
        .order("created_at", desc=True) \
        .execute()
        
    return response.data

@router.put("/admin/reports/{report_id}")
async def update_report_status(
    report_id: str,
    status: str = Body(..., embed=True),
    user: TelegramUser = Depends(get_current_user)
):
    """Update report status (resolved, ignored)."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
        
    response = db.client.table("reported_posts").update({"status": status}).eq("id", report_id).execute()
    return response.data[0]
