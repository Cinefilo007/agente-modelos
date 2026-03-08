from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from typing import List, Optional
from pydantic import BaseModel
from src.api.dependencies import get_current_user, get_current_user_optional, TelegramUser
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
        threshold = datetime.utcnow() - timedelta(minutes=1)
        # Handle 'Z' or '+00:00' suffix
        clean_ts = last_seen_str.replace('Z', '+00:00')
        ls_dt = datetime.fromisoformat(clean_ts)
        # Convert to naive UTC for comparison with datetime.utcnow()
        return ls_dt.astimezone(None).replace(tzinfo=None) > threshold
    except Exception as e:
        print(f"[OnlineCheck] Error: {e}")
        return False

router = APIRouter()

from src.services.storage import upload_file, generate_video_thumbnail, trim_video
import io

@router.post("/posts")
async def create_post(
    file: UploadFile = File(...),
    thumbnail: Optional[UploadFile] = File(None),
    caption: Optional[str] = Form(None),
    external_links: str = Form("[]"),
    scheduled_at: Optional[str] = Form(None),
    start_time: float = Form(0),
    end_time: Optional[float] = Form(None),
    thumbnail_time: float = Form(0.1),
    user: TelegramUser = Depends(get_current_user)
):
    """Create a new post with file upload, now supporting links and scheduling."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Only models can create posts")

    # 1. Determine media type and read content
    media_type = "video" if file.content_type.startswith("video") else "image"
    file_content = await file.read()
    
    public_url = None
    thumbnail_url = None

    # 2. Process Media
    if media_type == "video":
        # Handle Trimming if requested
        if end_time is not None and end_time > start_time:
            print(f"[Video Editor] Trimming video: {start_time}s to {end_time}s")
            file_content = await trim_video(file_content, start_time, end_time)
            thumbnail_time = max(0.1, min(thumbnail_time - start_time, (end_time - start_time) / 2))
        
        # Upload Video
        import uuid
        unique_id = uuid.uuid4()
        extension = "mp4"
        filename = f"uploads/{unique_id}.{extension}"
        
        try:
            db.service_client.storage.from_("posts").upload(
                path=filename,
                file=file_content,
                file_options={"content-type": "video/mp4"}
            )
            public_url = db.service_client.storage.from_("posts").get_public_url(filename)
            
            # 3. Handle Thumbnail
            thumb_content = None
            if thumbnail:
                thumb_content = await thumbnail.read()
            else:
                thumb_content = await generate_video_thumbnail(file_content, ss=thumbnail_time)
            
            if thumb_content:
                thumb_filename = f"thumbnails/thumb_{uuid.uuid4()}.jpg"
                db.service_client.storage.from_("posts").upload(
                    path=thumb_filename,
                    file=thumb_content,
                    file_options={"content-type": "image/jpeg"}
                )
                thumbnail_url = db.service_client.storage.from_("posts").get_public_url(thumb_filename)
        except Exception as e:
            print(f"Error processing video upload: {e}")
            raise HTTPException(status_code=500, detail="Error al subir video")

    else:
        # It's an image
        import uuid
        unique_id = uuid.uuid4()
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        filename = f"uploads/{unique_id}.{file_ext}"
        
        try:
            db.service_client.storage.from_("posts").upload(
                path=filename,
                file=file_content,
                file_options={"content-type": file.content_type}
            )
            public_url = db.service_client.storage.from_("posts").get_public_url(filename)
        except Exception as e:
            print(f"Error uploading image: {e}")
            raise HTTPException(status_code=500, detail="Error al subir imagen")

    # 4. Handle Scheduling and Status
    post_status = "published"
    import json
    try:
        links_data = json.loads(external_links)
    except:
        links_data = []

    if scheduled_at:
        try:
            sched_dt = datetime.fromisoformat(scheduled_at.replace('Z', '+00:00'))
            if sched_dt > datetime.now(sched_dt.tzinfo):
                post_status = "scheduled"
        except Exception as e:
            print(f"Error parsing scheduled_at: {e}")

    # 5. Save to Database
    data = {
        "model_id": user.user_id,
        "media_url": public_url,
        "media_type": media_type,
        "caption": caption,
        "thumbnail_url": thumbnail_url,
        "external_links": links_data,
        "scheduled_at": scheduled_at,
        "status": post_status
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

@router.delete("/stories/{story_id}")
async def delete_story(
    story_id: str,
    user: TelegramUser = Depends(get_current_user)
):
    """Delete a story (author or admin) and its media."""
    story = db.client.table("stories").select("model_id, media_url").eq("id", story_id).single().execute()
    if not story.data:
        raise HTTPException(status_code=404, detail="Story not found")
        
    is_author = str(story.data['model_id']) == str(user.user_id)
    is_admin = user.role == "admin"

    if not is_author and not is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this story")
        
    try:
        if story.data.get('media_url'):
            url_parts = story.data['media_url'].split('/')
            if 'stories' in url_parts:
                idx = url_parts.index('stories')
                relative_path = "/".join(url_parts[idx+1:])
                from src.services.storage import delete_file
                delete_file("stories", relative_path)
    except Exception as e:
        print(f"Error attempting to delete storage media for story {story_id}: {e}")

    db.client.table("stories").delete().eq("id", story_id).execute()
    return {"message": "Story deleted successfully"}

@router.put("/stories/{story_id}/toggle-saved")
async def toggle_story_saved(
    story_id: str,
    user: TelegramUser = Depends(get_current_user)
):
    """Toggle the is_saved status of a story (author only)."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Only models can save stories")

    story = db.client.table("stories").select("model_id, is_saved").eq("id", story_id).single().execute()
    if not story.data:
        raise HTTPException(status_code=404, detail="Story not found")
        
    if str(story.data['model_id']) != str(user.user_id):
        raise HTTPException(status_code=403, detail="Not authorized to modify this story")
        
    new_status = not story.data.get('is_saved', False)
    response = db.client.table("stories").update({"is_saved": new_status}).eq("id", story_id).execute()
    
    return {"is_saved": new_status}

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

@router.get("/posts/my-posts")
async def get_my_posts(
    user: TelegramUser = Depends(get_current_user)
):
    """Get all posts (including scheduled) for the current model."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Only models can access this")
    
    response = db.client.table("posts") \
        .select("*") \
        .eq("model_id", user.user_id) \
        .order("created_at", desc=True) \
        .execute()
    return response.data

@router.get("/feed")
async def get_feed(
    sort: str = "recent", 
    filter_type: str = "global",
    user: TelegramUser = Depends(get_current_user)
):
    """Get global feed with filters."""
    try:
        # Fetch posts with model info (including last_seen) and counts
        now = datetime.utcnow().isoformat()
        query = db.client.table("posts") \
            .select("*, models(username, full_name, artistic_name, avatar_url, is_verified, last_seen)") \
            .or_(f"status.eq.published,and(status.eq.scheduled,scheduled_at.lte.{now})")
        
        # Filter by following (if strictly requested)
        if filter_type == "following":
            client = db.client.table("clients").select("id").eq("telegram_id", user.id).maybe_single().execute()
            if client and hasattr(client, 'data') and client.data:
                following = db.client.table("followers").select("model_id").eq("client_id", client.data['id']).execute()
                model_ids = [f['model_id'] for f in following.data] if following and hasattr(following, 'data') else []
                if model_ids:
                    query = query.in_("model_id", model_ids)
                else:
                    return [] # Follows no one
            else:
                 return [] 

        # Sort
        if sort == "top":
            # Only order by likes_count if you are sure the column exists. 
            # If not, use created_at.
            try:
                query = query.order("likes_count", desc=True)
            except:
                query = query.order("created_at", desc=True)
        else: # recent
            query = query.order("created_at", desc=True)

        response = query.limit(50).execute()
        posts = response.data or []
        
        if not posts:
            return []

        # Enrich with 'is_liked' and 'is_online'
        post_ids = [p['id'] for p in posts]
        
        # Check likes by current user
        liked_posts = set()
        if post_ids:
            try:
                likes_res = db.client.table("interactions") \
                    .select("target_id") \
                    .eq("actor_id", user.user_id) \
                    .eq("action", "like") \
                    .in_("target_id", post_ids) \
                    .execute()
                liked_posts = {l['target_id'] for l in likes_res.data} if likes_res.data else set()
            except Exception as e:
                print(f"[Feed] Error checking likes: {e}")

        # Process posts
        enriched_posts = []
        for p in posts:
            # Check Online Status
            model = p.get('models') or {}
            is_online = calculate_is_online(model.get('last_seen')) if model else False
            
            enriched_posts.append({
                **p,
                "is_liked": p['id'] in liked_posts,
                "is_online": is_online,
                "likes_count": p.get("likes_count", 0),
                "comments_count": p.get("comments_count", 0),
                "tips_count": p.get("tips_count", 0)
            })

        return enriched_posts
    except Exception as e:
        print(f"Error in get_feed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/post/{post_id}")
async def get_post_detail(
    post_id: str,
    user: Optional[TelegramUser] = Depends(get_current_user_optional)
):
    """Get a single post by ID."""
    try:
        response = db.client.table("posts") \
            .select("*, models(id, username, full_name, artistic_name, avatar_url, is_verified, last_seen)") \
            .eq("id", post_id) \
            .single() \
            .execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Post not found")
        
        post = response.data

        # Enrich with is_online
        model_data = post.get('models') or {}
        post['is_online'] = calculate_is_online(model_data.get('last_seen')) if model_data else False
        
        # Check if current user liked it
        post['is_liked'] = False
        if user:
            like_res = db.client.table("interactions") \
                .select("id") \
                .eq("actor_id", user.user_id) \
                .eq("target_id", post_id) \
                .eq("action", "like") \
                .execute()
            post['is_liked'] = bool(like_res.data)
            
        return post
    except Exception as e:
        print(f"Error in get_post_detail: {e}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    reason: Optional[str] = Body(None, embed=True), # Optional reason for admin deletion
    user: TelegramUser = Depends(get_current_user)
):
    """Delete a post (author or admin)."""
    # 1. Check ownership or admin role
    post = db.client.table("posts").select("model_id, media_url").eq("id", post_id).single().execute()
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

    # 4. Delete associated media from Supabase Storage
    try:
        if post.data.get('media_url'):
            url_parts = post.data['media_url'].split('/')
            if 'posts' in url_parts:
                idx = url_parts.index('posts')
                relative_path = "/".join(url_parts[idx+1:])
                from src.services.storage import delete_file
                delete_file("posts", relative_path)
    except Exception as e:
        print(f"Error attempting to delete storage media for post {post_id}: {e}")

    # 5. Delete the post
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
