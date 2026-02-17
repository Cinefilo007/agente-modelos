from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db

router = APIRouter()

class GiftBase(BaseModel):
    name: str
    price: float
    animation_id: Optional[str] = None
    theme: Optional[str] = "general"
    is_active: Optional[bool] = True

class GiftCreate(GiftBase):
    pass

class GiftResponse(GiftBase):
    id: str
    created_at: str

@router.get("/", response_model=List[GiftResponse])
async def list_gifts():
    """List all active gifts for the frontend."""
    res = db.client.table("gifts").select("*").eq("is_active", True).execute()
    return res.data

@router.get("/admin", response_model=List[GiftResponse])
async def list_all_gifts_admin(user: TelegramUser = Depends(get_current_user)):
    """List all gifts (including inactive) for admin panel."""
    # Strict admin check
    user_res = db.client.table("profiles").select("role").eq("id", user.user_id).single().execute()
    if user_res.data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden gestionar regalos")
    
    res = db.client.table("gifts").select("*").order("created_at", desc=True).execute()
    return res.data

@router.post("/", response_model=GiftResponse)
async def create_gift(gift: GiftCreate, user: TelegramUser = Depends(get_current_user)):
    """Create a new gift (Admin only)."""
    user_res = db.client.table("profiles").select("role").eq("id", user.user_id).single().execute()
    if user_res.data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    res = db.client.table("gifts").insert(gift.dict()).execute()
    return res.data[0]

@router.put("/{gift_id}", response_model=GiftResponse)
async def update_gift(gift_id: str, gift: GiftCreate, user: TelegramUser = Depends(get_current_user)):
    """Update an existing gift (Admin only)."""
    user_res = db.client.table("profiles").select("role").eq("id", user.user_id).single().execute()
    if user_res.data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    res = db.client.table("gifts").update(gift.dict()).eq("id", gift_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Regalo no encontrado")
    return res.data[0]

@router.delete("/{gift_id}")
async def delete_gift(gift_id: str, user: TelegramUser = Depends(get_current_user)):
    """Delete or deactivate a gift (Admin only)."""
    user_res = db.client.table("profiles").select("role").eq("id", user.user_id).single().execute()
    if user_res.data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    db.client.table("gifts").delete().eq("id", gift_id).execute()
    return {"success": True}
