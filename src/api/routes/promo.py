from fastapi import APIRouter, HTTPException, Depends, Query, Body
from pydantic import BaseModel
from typing import Optional, List
from src.services.database import db
import os
from datetime import datetime, timezone
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

class ProposeSFSReq(BaseModel):
    target_sfs_user_id: str       # A quién se le propone
    requester_channel_id: str     # Canal del que propone
    requester_template_id: str    # Template (post) del que propone
    duration_hours: int = 24      # Cuántas horas durará el post


@router.post("/auth")
async def authenticate_sfs_user(user: TelegramUserAuth):
    """Login desde la WebApp (Fricción cero). Retorna el usuario o lo crea si no existe."""
    try:
        res = db.client.table("sfs_users").select("*").eq("telegram_id", user.telegram_id).execute()
        if res.data:
            sfs_user = res.data[0]
            if sfs_user['username'] != user.username or sfs_user['full_name'] != user.full_name:
                updated = db.client.table("sfs_users").update({
                    "username": user.username,
                    "full_name": user.full_name
                }).eq("id", sfs_user["id"]).execute()
                return updated.data[0]
            return sfs_user

        is_agency_model = False
        model_res = db.client.table("models").select("id").eq("telegram_id", user.telegram_id).eq("status", "active").execute()
        if model_res.data:
            is_agency_model = True

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


@router.get("/channels/my/{channel_id}/history")
async def get_channel_history(channel_id: str, model_id: str = Query(...)):
    """
    Historial de métricas de un canal (para el gráfico de estadísticas).
    Lee de channel_metrics_history: followers, avg_views, engagement_rate, created_at.
    Devuelve también la última fecha de actualización.
    """
    try:
        owns = db.client.table("channels").select("id, name, followers, avg_views, engagement_rate, updated_at").eq("id", channel_id).eq("sfs_user_id", model_id).execute()
        if not owns.data:
            raise HTTPException(status_code=403, detail="No autorizado")

        channel_info = owns.data[0]

        res = db.service_client.table("channel_metrics_history").select(
            "id, followers, avg_views, engagement_rate, created_at"
        ).eq("channel_id", channel_id).order("created_at", desc=False).limit(30).execute()

        return {
            "channel": channel_info,
            "history": res.data or [],
            "last_updated": channel_info.get("updated_at")
        }
    except HTTPException:
        raise
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
    """Devuelve cuántos SFS le quedan hoy al usuario"""
    try:
        user_res = db.client.table("sfs_users").select("*").eq("id", sfs_user_id).execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        user = user_res.data[0]
        base_limit = 6 if user.get("is_agency_model") else 2
        total_limit = base_limit

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


@router.get("/templates/my")
async def get_my_templates(sfs_user_id: str = Query(...)):
    """Retorna los templates de post guardados por el usuario al reenviar mensajes al bot."""
    try:
        res = db.client.table("promo_templates").select(
            "id, created_at, content_data, telegram_message_id_origin"
        ).eq("sfs_user_id", sfs_user_id).order("created_at", desc=True).limit(10).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaigns")
async def propose_sfs(req: ProposeSFSReq, requester_id: str = Query(...)):
    """
    Crea una propuesta de campaña SFS. Estado inicial: 'pending' (esperando aceptación del target).
    """
    try:
        # Validar que el canal pertenece al requester
        ch_res = db.client.table("channels").select("id").eq("id", req.requester_channel_id).eq("sfs_user_id", requester_id).eq("status", "active").execute()
        if not ch_res.data:
            raise HTTPException(status_code=404, detail="Canal no encontrado o no activo")

        # Validar que el template pertenece al requester
        tpl_res = db.client.table("promo_templates").select("id").eq("id", req.requester_template_id).eq("sfs_user_id", requester_id).execute()
        if not tpl_res.data:
            raise HTTPException(status_code=404, detail="Template no encontrado")

        # Validar límite diario
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        limits_res = db.client.table("promo_campaigns").select("id", count="exact").eq("requester_id", requester_id).gte("created_at", today).execute()
        used = limits_res.count or 0

        user_res = db.client.table("sfs_users").select("is_agency_model").eq("id", requester_id).execute()
        base_limit = 6 if (user_res.data and user_res.data[0].get("is_agency_model")) else 2
        if used >= base_limit:
            raise HTTPException(status_code=429, detail=f"Límite diario alcanzado ({base_limit} SFS/día)")

        # Verificar que no haya una propuesta pendiente entre los mismos usuarios
        existing = db.client.table("promo_campaigns").select("id").eq("requester_id", requester_id).eq("target_id", req.target_sfs_user_id).in_("status", ["pending", "accepted", "active"]).execute()
        if existing.data:
            raise HTTPException(status_code=409, detail="Ya tienes una campaña activa o pendiente con este anunciante")

        # Buscar el canal activo del target
        target_ch_res = db.client.table("channels").select("id").eq("sfs_user_id", req.target_sfs_user_id).eq("status", "active").limit(1).execute()
        target_channel_id = target_ch_res.data[0]["id"] if target_ch_res.data else None

        # Crear campaña
        campaign = db.service_client.table("promo_campaigns").insert({
            "requester_id": requester_id,
            "target_id": req.target_sfs_user_id,
            "requester_channel_id": req.requester_channel_id,
            "target_channel_id": target_channel_id,
            "requester_template_id": req.requester_template_id,
            "status": "pending",
            "type": "SFS_TIME",
            "duration_hours": req.duration_hours
        }).execute()

        return campaign.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/sent")
async def get_sent_campaigns(model_id: str = Query(...)):
    """Campañas enviadas por el usuario"""
    try:
        res = db.client.table("promo_campaigns").select(
            "*, target:sfs_users!target_id(username, full_name, trust_score)"
        ).eq("requester_id", model_id).order("created_at", desc=True).limit(20).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/received")
async def get_received_campaigns(model_id: str = Query(...)):
    """Campañas recibidas por el usuario"""
    try:
        res = db.client.table("promo_campaigns").select(
            "*, requester:sfs_users!requester_id(username, full_name, trust_score)"
        ).eq("target_id", model_id).order("created_at", desc=True).limit(20).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reviews")
async def submit_review(req: ReviewReq, sfs_user_id: str = Query(...)):
    """Permite enviar una calificación post-SFS a la otra parte"""
    try:
        existing = db.client.table("sfs_reviews").select("id").eq("promo_campaign_id", req.promo_campaign_id).eq("reviewer_id", sfs_user_id).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Ya enviaste una calificación para esta campaña.")

        db.client.table("sfs_reviews").insert({
            "promo_campaign_id": req.promo_campaign_id,
            "reviewer_id": sfs_user_id,
            "target_id": req.target_id,
            "rating": req.rating,
            "comment": req.comment
        }).execute()

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


@router.get("/advertiser/{user_id}")
async def get_advertiser_profile(user_id: str):
    """Perfil público de un anunciante SFS."""
    try:
        user_res = db.client.table("sfs_users").select(
            "id, username, full_name, trust_score, is_agency_model, created_at"
        ).eq("id", user_id).execute()

        if not user_res.data:
            raise HTTPException(status_code=404, detail="Anunciante no encontrado")

        user = user_res.data[0]

        channels_res = db.client.table("channels").select(
            "id, name, followers, avg_views, engagement_rate, category, is_verified, status"
        ).eq("sfs_user_id", user_id).eq("status", "active").order("followers", desc=True).execute()

        reviews_res = db.service_client.table("sfs_reviews").select(
            "id, rating, comment, created_at, reviewer_id"
        ).eq("target_id", user_id).order("created_at", desc=True).limit(20).execute()

        reviews = reviews_res.data or []
        for review in reviews:
            reviewer_res = db.client.table("sfs_users").select("username").eq("id", review["reviewer_id"]).execute()
            review["reviewer_username"] = reviewer_res.data[0]["username"] if reviewer_res.data else "Anónimo"

        return {
            **user,
            "channels": channels_res.data or [],
            "reviews": reviews
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
