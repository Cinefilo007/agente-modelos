
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
