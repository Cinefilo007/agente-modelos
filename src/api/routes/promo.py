from fastapi import APIRouter, HTTPException, Depends, Query, Body
from pydantic import BaseModel
from typing import Optional, List
from src.services.database import db
import os
from telegram import Bot

router = APIRouter()

class TelegramUserAuth(BaseModel):
    telegram_id: int
    username: Optional[str] = ""
    full_name: Optional[str] = ""

class UpdateChannelReq(BaseModel):
    category: str

class ReviewReq(BaseModel):
    promo_campaign_id: str
    target_id: str
    rating: int
    comment: Optional[str] = ""

@router.post("/auth")
async def authenticate_sfs_user(user: TelegramUserAuth):
    """
    Login desde la WebApp (Fricción cero). Retorna el usuario o lo crea si no existe.
    """
    try:
        # Buscar en sfs_users
        res = db.client.table("sfs_users").select("*").eq("telegram_id", user.telegram_id).execute()
        if res.data:
            sfs_user = res.data[0]
            # Sincronizar info si cambió
            if sfs_user['username'] != user.username or sfs_user['full_name'] != user.full_name:
                updated = db.client.table("sfs_users").update({
                    "username": user.username,
                    "full_name": user.full_name
                }).eq("id", sfs_user["id"]).execute()
                return updated.data[0]
            return sfs_user
            
        # Check si es modelo activa
        is_agency_model = False
        model_res = db.client.table("models").select("id").eq("telegram_id", user.telegram_id).eq("status", "active").execute()
        if model_res.data:
            is_agency_model = True
            
        # Crear
        new_user = db.client.table("sfs_users").insert({
            "telegram_id": user.telegram_id,
            "username": user.username,
            "full_name": user.full_name,
            "is_agency_model": is_agency_model
        }).execute()
        
        return new_user.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/channels/catalog")
async def get_channel_catalog(
    category: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    """Catálogo público de canales filtrado por categoría o ER"""
    try:
        offset = (page - 1) * limit
        query = db.client.table("channels").select("*, sfs_users(username, trust_score)").eq("status", "active")
        
        if category:
            query = query.eq("category", category)
            
        res = query.order("engagement_rate", desc=True).range(offset, offset + limit - 1).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/channels/my")
async def get_my_channels(sfs_user_id: str = Query(...)):
    """Canales registrados por el usuario"""
    try:
        res = db.client.table("channels").select("*").eq("sfs_user_id", sfs_user_id).order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/channels/{channel_id}")
async def update_channel(channel_id: str, req: UpdateChannelReq, sfs_user_id: str = Query(...)):
    """Permite al usuario actualizar la categoría de su canal"""
    try:
        existing = db.client.table("channels").select("id").eq("id", channel_id).eq("sfs_user_id", sfs_user_id).execute()
        if not existing.data:
             raise HTTPException(status_code=404, detail="Canal no encontrado o no autorizado")
             
        res = db.client.table("channels").update({"category": req.category}).eq("id", channel_id).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/limits")
async def check_user_limits(sfs_user_id: str = Query(...)):
    """Devuelve cuántos SFS le quedan hoy al usuario, considerando si es modelo y sus misiones"""
    try:
        user_res = db.client.table("sfs_users").select("*").eq("id", sfs_user_id).execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        user = user_res.data[0]
        base_limit = 6 if user.get("is_agency_model") else 2
        
        # Misiones extras podrían calcularse aquí (ej. count en post, etc)
        # Para simplificar ahora retornamos el base_limit
        total_limit = base_limit 
        
        # Contar cuantas ha hecho hoy
        # Supabase API for "today": where created_at >= hoy
        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        
        count_res = db.client.table("promo_campaigns").select("id", count="exact").eq("requester_id", sfs_user_id).gte("created_at", today).execute()
        used = count_res.count or 0
        
        return {
            "limit": total_limit,
            "used": used,
            "remaining": max(0, total_limit - used),
            "is_pro": user.get("subscription_tier") != 'basic'
        }
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@router.post("/reviews")
async def submit_review(req: ReviewReq, sfs_user_id: str = Query(...)):
    """Permite enviar una calificación post-SFS a la otra parte"""
    try:
        # Validar si ya existe
        existing = db.client.table("sfs_reviews").select("id").eq("promo_campaign_id", req.promo_campaign_id).eq("reviewer_id", sfs_user_id).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Ya enviaste una calificación para esta campaña.")
            
        # Insertar
        db.client.table("sfs_reviews").insert({
            "promo_campaign_id": req.promo_campaign_id,
            "reviewer_id": sfs_user_id,
            "target_id": req.target_id,
            "rating": req.rating,
            "comment": req.comment
        }).execute()
        
        # Ajustar trust score heurísticamente (+5 por 5 estrellas, -5 por 1 estrella)
        target_res = db.client.table("sfs_users").select("trust_score").eq("id", req.target_id).execute()
        if target_res.data:
            current_score = target_res.data[0].get("trust_score", 100)
            adjustment = (req.rating - 3) * 5
            new_score = max(0, min(100, current_score + adjustment))
            
            db.service_client.table("sfs_users").update({"trust_score": new_score}).eq("id", req.target_id).execute()
            
        return {"status": "success", "message": "Calificación enviada correctamente."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
