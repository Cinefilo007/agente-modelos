from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body, BackgroundTasks
from typing import List, Optional
from pydantic import BaseModel
from src.api.dependencies import get_current_user, get_current_user_optional, TelegramUser
from src.services.database import db
from src.services.storage import upload_file
from src.services.telegram_stories import post_to_telegram_story
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

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
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    thumbnail: Optional[UploadFile] = File(None),
    caption: Optional[str] = Form(None),
    external_links: str = Form("[]"),
    scheduled_at: Optional[str] = Form(None),
    start_time: float = Form(0),
    end_time: Optional[float] = Form(None),
    thumbnail_time: float = Form(0.1),
    publish_to_story: bool = Form(False),
    user: TelegramUser = Depends(get_current_user)
):
    """Create a new post with file upload, now supporting links and scheduling."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Only models can create posts")

    # 1. Determine media type and read content
    media_type = "video" if file.content_type.startswith("video") else "image"
    file_content = await file.read()
    
    # 1.b Aplicar Marca de Agua (Watermark) e importar validadores
    from src.services.image_processing import apply_image_watermark, apply_video_watermark, get_video_duration
    watermark_text = f"nebulaespace.site/{user.username}" if user.username else "nebulaespace.site"
    
    if media_type == "image":
        print(f"[Watermark] Aplicando marca de agua a imagen de {user.username}")
        file_content = apply_image_watermark(file_content, watermark_text)
    else:
        print(f"[Watermark] Aplicando marca de agua a video de {user.username}")
        # El procesamiento de video puede ser pesado, pero el usuario lo espera al crear el post
        file_content = await apply_video_watermark(file_content, watermark_text)

    public_url = None
    thumbnail_url = None

    # 2. Process Media
    if media_type == "video":
        # Handle Trimming if requested
        if end_time is not None and end_time > start_time:
            # Server-side security check for trim range
            if (end_time - start_time) > 20.5:
                raise HTTPException(status_code=400, detail="El recorte excede los 20 segundos permitidos.")

            print(f"[Video Editor] Trimming video: {start_time}s to {end_time}s")
            file_content = await trim_video(file_content, start_time, end_time)
            thumbnail_time = max(0.1, min(thumbnail_time - start_time, (end_time - start_time) / 2))
        
        # Validar duración real post-recorte
        actual_duration = get_video_duration(file_content)
        if actual_duration > 20.5:
            logger.warning(f"Video reject: duration {actual_duration}s exceeds limit from user {user.username}")
            raise HTTPException(status_code=400, detail="El video excede la duración máxima de 20 segundos.")
        
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
        file_ext = "jpg" # Siempre guardamos como jpg procesado para consistencia
        filename = f"uploads/{unique_id}.{file_ext}"
        
        try:
            db.service_client.storage.from_("posts").upload(
                path=filename,
                file=file_content,
                file_options={"content-type": "image/jpeg"}
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
    except Exception as e:
        print(f"[DEBUG] Error parsing links: {e}")
        links_data = []
    
    print(f"[DEBUG] Post creation links_data: {links_data}")

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
    
    try:
        print(f"[DEBUG] Full Post Data: {data}")
        response = db.client.table("posts").insert(data).execute()
        print(f"[DEBUG] Post insertion response: {response.data}")
        post_data = response.data[0]
        
        # Publicar en historias de Telegram si se solicita
        if publish_to_story:
            background_tasks.add_task(
                post_to_telegram_story,
                model_id=str(user.user_id),
                media_url=public_url,
                media_type=media_type,
                caption=caption # Se usa el pie de foto original, el servicio añadirá el link del perfil
            )
            
        return post_data
    except Exception as e:
        logger.error(f"Error crítico insertando post: {e}")
        # Intentar fallback solo si el error parece ser por columnas faltantes
        if "external_links" in str(e) or "scheduled_at" in str(e):
            logger.warning("Reintentando inserción sin nuevas columnas (external_links/scheduled_at)")
            base_data = {
                "model_id": user.user_id,
            "media_url": public_url,
            "media_type": media_type,
            "caption": caption,
            "thumbnail_url": thumbnail_url
        }
        response = db.client.table("posts").insert(base_data).execute()
        post_data = response.data[0]
        
        if publish_to_story:
            background_tasks.add_task(
                post_to_telegram_story,
                model_id=str(user.user_id),
                media_url=public_url,
                media_type=media_type,
                caption=caption
            )
            
        return post_data

@router.get("/posts/my-posts")
async def get_my_posts(
    user: TelegramUser = Depends(get_current_user)
):
    """Get all posts (including scheduled) for the current model."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Only models can access this")
    
    try:
        # Detailed logging for debugging 500
        logger.info(f"Fetching my-posts for user_id: {user.user_id}")
        
        response = db.client.table("posts") \
            .select("*") \
            .eq("model_id", user.user_id) \
            .order("created_at", desc=True) \
            .execute()
        
        if response is None:
            logger.debug("Supabase response data is empty or None for get_my_posts")
            return []
            
        return response.data or []
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        logger.error(f"Error in get_my_posts for user {user.user_id}: {str(e)}\n{error_detail}")
        # Basic fallback: return empty list instead of crashing
        return []

@router.get("/posts/{user_id}")
async def get_user_posts(
    user_id: str,
    user: Optional[TelegramUser] = Depends(get_current_user_optional)
):
    """Get posts for a specific user (model) with visibility filters."""
    try:
        query = db.client.table("posts").select("*").eq("model_id", user_id)
        
        # Visibility logic: 
        # Only the author or admins can see 'scheduled' posts.
        is_owner = user and str(user.user_id) == str(user_id)
        is_admin = user and user.role == "admin"
        
        if not (is_owner or is_admin):
            now = datetime.utcnow().isoformat()
            try:
                query = query.or_(f"status.eq.published,and(status.eq.scheduled,scheduled_at.lte.{now})")
            except Exception as e:
                logger.warning(f"Visibility filter failed in get_user_posts (likely missing columns): {e}")
                pass

        response = query.order("created_at", desc=True).execute()
        return response.data or []
    except Exception as e:
        logger.error(f"Error in get_user_posts for user_id {user_id}: {e}")
        return []

@router.post("/stories")
async def create_story(
    file: UploadFile = File(...),
    user: TelegramUser = Depends(get_current_user)
):
    """Create a new story (expires in 24h)."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Only models can create stories")

    # 1. Procesar contenido y aplicar marca de agua
    media_type = "video" if file.content_type.startswith("video") else "image"
    file_content = await file.read()
    
    from src.services.image_processing import apply_image_watermark, apply_video_watermark
    watermark_text = f"nebulaespace.site/{user.username}" if user.username else "nebulaespace.site"
    
    if media_type == "image":
        file_content = apply_image_watermark(file_content, watermark_text)
        content_type = "image/jpeg"
        file_ext = "jpg"
    else:
        file_content = await apply_video_watermark(file_content, watermark_text)
        content_type = "video/mp4"
        file_ext = "mp4"

    # 2. Subir a Supabase Storage
    import uuid
    unique_id = uuid.uuid4()
    filename = f"uploads/{unique_id}.{file_ext}"
    
    try:
        db.service_client.storage.from_("stories").upload(
            path=filename,
            file=file_content,
            file_options={"content-type": content_type}
        )
        public_url = db.service_client.storage.from_("stories").get_public_url(filename)
    except Exception as e:
        logger.error(f"Error uploading story: {e}")
        raise HTTPException(status_code=500, detail="Error al subir historia")

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

@router.get("/feed")
async def get_feed(
    sort: str = "recent", 
    filter_type: str = "global",
    user: TelegramUser = Depends(get_current_user_optional)
):
    """Get global feed with filters."""
    try:
        now = datetime.utcnow().isoformat()
        query = db.client.table("posts") \
            .select("*, models(username, full_name, artistic_name, avatar_url, is_verified, last_seen)")
        
        # 1. Try to apply status filter (will fail if columns don't exist yet)
        try:
            # Only show published or scheduled (past) if the columns exist
            query = query.or_(f"status.eq.published,and(status.eq.scheduled,scheduled_at.lte.{now})")
        except Exception as e:
            logger.warning(f"Status filter columns or clause failed (likely missing columns): {e}")
            # Fallback: continue without status filter to show existing posts
        
        # 2. Filter by following (if requested and user is logged in)
        if filter_type == "following" and user:
            client_res = db.client.table("clients").select("id").eq("telegram_id", user.id).maybe_single().execute()
            if client_res.data:
                following = db.client.table("followers").select("model_id").eq("client_id", client_res.data['id']).execute()
                model_ids = [f['model_id'] for f in following.data] if following.data else []
                if model_ids:
                    query = query.in_("model_id", model_ids)
                else:
                    return [] # Follows no one
        
        # 3. Apply sorting
        if sort == "top":
            query = query.order("likes_count", desc=True)
        else: # recent
            query = query.order("created_at", desc=True)

        # 4. Execute query with limit
        response = query.limit(50).execute()
        posts = response.data or []
        
        if not posts:
            return []

        # 5. Hydrate/Enrich with 'is_liked' and 'is_online'
        post_ids = [p['id'] for p in posts]
        liked_posts = set()
        
        if user and post_ids:
            try:
                likes_res = db.client.table("interactions") \
                    .select("target_id") \
                    .eq("actor_id", user.user_id) \
                    .eq("action", "like") \
                    .in_("target_id", post_ids) \
                    .execute()
                liked_posts = {l['target_id'] for l in likes_res.data} if likes_res.data else set()
            except Exception as e:
                logger.error(f"[Feed] Error checking likes: {e}")

        enriched_posts = []
        for p in posts:
            # Calculate Online Status
            model = p.get('models') or {}
            last_seen = model.get('last_seen')
            is_online = calculate_is_online(last_seen) if last_seen else False
            
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
        logger.error(f"Critical error in get_feed: {e}")
        import traceback
        traceback.print_exc()
        return []

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

        # Visibility Protection
        is_scheduled = post.get('status') == 'scheduled'
        scheduled_at = post.get('scheduled_at')
        is_owner = user and str(user.user_id) == str(post.get('model_id'))
        is_admin = user and user.role == "admin"
        
        if is_scheduled and not (is_owner or is_admin):
            now = datetime.utcnow().isoformat()
            if not scheduled_at or scheduled_at > now:
                raise HTTPException(status_code=404, detail="Post not found")

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
