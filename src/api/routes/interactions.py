
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Literal
from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db

router = APIRouter()

class InteractionCreate(BaseModel):
    target_id: str
    target_type: Literal['post', 'story', 'comment']
    action: Literal['like', 'view', 'comment']
    content: str = None

class CommentCreate(BaseModel):
    post_id: str
    content: str

class ReviewCreate(BaseModel):
    model_id: str
    rating: int
    comment: str

@router.post("/interact")
async def create_interaction(
    interaction: InteractionCreate,
    user: TelegramUser = Depends(get_current_user)
):
    """Record a like or view."""
    """Record a like or view."""
    
    actor_id = user.user_id
    actor_type = user.role
    
    if actor_type not in ["client", "model"]:
        # Fallback or error? For now allow, or maybe default to 'client' if role is 'user'
        # But our JWT issues 'model' or 'client'.
        # If 'user' role (from generic login), maybe assume client?
        pass

    if not actor_id:
        raise HTTPException(status_code=400, detail="User not registered in system")

    data = {
        "actor_id": actor_id,
        "actor_type": actor_type,
        "target_id": interaction.target_id,
        "target_type": interaction.target_type,
        "action": interaction.action
    }
    
    # Check for duplicates or toggle if it's a 'like'
    if interaction.action == 'like':
        existing = db.client.table("interactions") \
            .select("id") \
            .eq("actor_id", actor_id) \
            .eq("target_id", interaction.target_id) \
            .eq("action", "like") \
            .execute()
        
        if existing.data:
            # Already liked, perform UNLIKE (Toggle)
            interaction_id = existing.data[0]['id']
            db.client.table("interactions").delete().eq("id", interaction_id).execute()
            
            # Decrement counter (Handled by DB Trigger)
            return {"status": "unliked", "id": interaction_id}

    data = {
        "actor_id": actor_id,
        "actor_type": actor_type,
        "target_id": interaction.target_id,
        "target_type": interaction.target_type or 'post',
        "action": interaction.action,
        "content": interaction.content
    }
    
    # Insert interaction
    res = db.client.table("interactions").insert(data).execute()
    
    # Notify target user
    try:
        if interaction.action in ['like', 'comment']:
            # Get post owner
            post = db.client.table("posts").select("model_id").eq("id", interaction.target_id).maybe_single().execute()
            if post.data:
                target_user_id = post.data['model_id']
                print(f"[DEBUG] Notifying - Action: {interaction.action}, Actor: {actor_id}, Target Post Owner: {target_user_id}")
                
                if str(target_user_id) != str(actor_id): # Don't notify self
                    notif_data = {
                        "user_id": target_user_id,
                        "actor_id": actor_id,
                        "type": interaction.action,
                        "target_id": interaction.target_id,
                        "content": interaction.content if interaction.action == 'comment' else None
                    }
                    print(f"[DEBUG] Inserting Notification: {notif_data}")
                    notif_res = db.client.table("notifications").insert(notif_data).execute()
                    print(f"[DEBUG] Notification Insert Result: {notif_res.data}")
                else:
                    print("[DEBUG] Skipping notification: User interacted with their own post")
            else:
                print(f"[DEBUG] Target post {interaction.target_id} not found for notification")
    except Exception as e:
        print(f"[DEBUG] Error creating notification: {e}")
        import traceback
        traceback.print_exc()

    # Increment counters (Handled by DB Trigger)
    return res.data[0]

@router.post("/reviews")
async def create_review(
    review: ReviewCreate,
    user: TelegramUser = Depends(get_current_user)
):
    """Create a review for a model."""
    # Verify user is a client
    client_res = db.client.table("clients").select("id").eq("telegram_id", user.id).maybe_single().execute()
    if not client_res.data:
         raise HTTPException(status_code=403, detail="Only clients can leave reviews")

    data = {
        "model_id": review.model_id,
        "client_id": client_res.data['id'],
        "rating": review.rating,
        "comment": review.comment
    }
    
    res = db.client.table("reviews").insert(data).execute()
    return res.data[0]

class FollowCreate(BaseModel):
    model_id: str

@router.post("/followers")
async def follow_model(
    follow: FollowCreate,
    user: TelegramUser = Depends(get_current_user)
):
    """Follow a model."""
    # Verify user is a client
    client_res = db.client.table("clients").select("id").eq("telegram_id", user.id).maybe_single().execute()
    if not client_res.data:
         raise HTTPException(status_code=403, detail="Only clients can follow models")

    data = {
        "client_id": client_res.data['id'],
        "model_id": follow.model_id
    }
    
    try:
        res = db.client.table("followers").insert(data).execute()
        
        # Notify model
        try:
            db.client.table("notifications").insert({
                "user_id": follow.model_id,
                "actor_id": client_res.data['id'],
                "type": "follow"
            }).execute()
        except Exception as notif_err:
            print(f"Error creating follow notification: {notif_err}")

        return res.data[0]
    except Exception as e:
        # Check for unique violation if needed, usually Supabase returns error
        raise HTTPException(status_code=400, detail="Already following or error")

@router.delete("/followers/{model_id}")
async def unfollow_model(
    model_id: str,
    user: TelegramUser = Depends(get_current_user)
):
    """Unfollow a model."""
    client_res = db.client.table("clients").select("id").eq("telegram_id", user.id).maybe_single().execute()
    if not client_res.data:
         raise HTTPException(status_code=403, detail="Only clients can unfollow")

    res = db.client.table("followers") \
        .delete() \
        .eq("client_id", client_res.data['id']) \
        .eq("model_id", model_id) \
        .execute()
        
    return {"message": "Unfollowed successfully"}

@router.get("/reviews/{model_id}")
async def get_model_reviews(model_id: str):
    """Get reviews for a specific model."""
    # Join with clients to get name and avatar? Supabase-py join syntax is specific.
    # We can fetch reviews and then keys, or use select string with relation if foreign keys conform.
    # Assuming standard relation "clients"
    
    response = db.client.table("reviews") \
        .select("*, clients(username)") \
        .eq("model_id", model_id) \
        .order("created_at", desc=True) \
        .execute()
        
    return response.data

@router.get("/followers/status/{model_id}")
async def check_follow_status(
    model_id: str,
    user: TelegramUser = Depends(get_current_user)
):
    """Check if current client follows the model."""
    client_res = db.client.table("clients").select("id").eq("telegram_id", user.id).maybe_single().execute()
    if not client_res.data:
         return {"is_following": False}

    count = db.client.table("followers") \
        .select("id", count="exact") \
        .eq("client_id", client_res.data['id']) \
        .eq("model_id", model_id) \
        .execute()
        
    return {"is_following": count.count > 0}

@router.get("/comments/{post_id}")
async def get_post_comments(post_id: str):
    """Get comments for a post, enriched with user details."""
    try:
        # 1. Fetch comments
        comments = db.client.table("interactions") \
            .select("*") \
            .eq("target_id", post_id) \
            .eq("target_type", "post") \
            .eq("action", "comment") \
            .order("created_at", desc=True) \
            .execute()
            
        data = comments.data
        if not data:
            return []

        # 2. Collect actor IDs
        actor_ids = list(set([c['actor_id'] for c in data]))
        
        # 3. Fetch details from Models and Clients
        # Supabase 'in' query for multiple IDs
        models = db.client.table("models").select("id, username, avatar_url").in_("id", actor_ids).execute()
        clients = db.client.table("clients").select("id, username").in_("id", actor_ids).execute()
        
        # 4. Create lookup map
        user_map = {}
        for m in models.data:
            user_map[m['id']] = { "username": m['username'], "avatar_url": m['avatar_url'], "type": "model" }
        for c in clients.data:
            user_map[c['id']] = { "username": c['username'], "avatar_url": None, "type": "client" }
            
        # 5. Attach user info
        enriched_comments = []
        for c in data:
            actor = user_map.get(c['actor_id'], {"username": "Unknown", "avatar_url": None})
            enriched_comments.append({
                **c,
                "username": actor['username'],
                "avatar_url": actor['avatar_url']
            })
            
        return enriched_comments

    except Exception as e:
        print(f"Error fetching comments: {e}")
        return []
