
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Literal
from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db

router = APIRouter()

class InteractionCreate(BaseModel):
    target_id: str
    target_type: Literal['post', 'story', 'comment']
    action: Literal['like', 'view']

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
    
    # Insert interaction
    res = db.client.table("interactions").insert(data).execute()
    
    # If like, increment counter (Optimistic or Trigger based on DB)
    if interaction.action == 'like' and interaction.target_type == 'post':
        # RPC call or direct update
        # db.client.rpc('increment_likes', {'post_id': interaction.target_id})
        pass
        
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
