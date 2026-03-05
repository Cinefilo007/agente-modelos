from fastapi import APIRouter, HTTPException, Depends, Query, Body
from pydantic import BaseModel
from typing import Optional, List
from src.services.database import db
import os
import logging
from datetime import datetime, timezone
from telegram import Bot

router = APIRouter()
logger = logging.getLogger(__name__)

_SFS_BOT_TOKEN = os.getenv("PROMO_TELEGRAM_TOKEN") or os.getenv("SFS_BOT_TOKEN") or os.getenv("TELEGRAM_BOT_TOKEN")

async def notify_sfs_user(telegram_id: int, text: str) -> None:
    """Envía una notificación por Telegram al usuario SFS. Falla silenciosamente."""
    if not _SFS_BOT_TOKEN or not telegram_id:
        return
    try:
        bot = Bot(token=_SFS_BOT_TOKEN)
        await bot.send_message(chat_id=telegram_id, text=text, parse_mode="HTML")
    except Exception as e:
        logger.warning(f"[notify_sfs] No se pudo notificar a {telegram_id}: {e}")

def _contract_label(camp: dict) -> str:
    """Texto legible del tipo de contrato."""
    t = camp.get("type", "")
    if t == "SFS_VIEWS":
        return f"Por Vistas ({camp.get('views_target', '?'):,} vistas)"
    if t == "SFS_TIME":
        return f"Por Tiempo ({camp.get('duration_hours', '?')}h)"
    if t == "SFS_FOLLOWERS":
        return f"Por Subs ({camp.get('followers_target', '?'):,} subs)"
    return t

class TelegramUserAuth(BaseModel):
    telegram_id: int
    username: Optional[str] = ""
    full_name: Optional[str] = ""

class UpdateChannelReq(BaseModel):
    category: Optional[str] = None
    mode: Optional[str] = None                          # 'sfs', 'pxp', 'both'
    accepted_contract_types: Optional[List[str]] = None # ['SFS_VIEWS', 'SFS_TIME', 'SFS_FOLLOWERS']
    min_partner_followers: Optional[int] = None
    min_views_target: Optional[int] = None
    bio: Optional[str] = None

class ReviewReq(BaseModel):
    promo_campaign_id: str
    target_id: str
    rating: int
    comment: Optional[str] = ""

class ProposeSFSReq(BaseModel):
    target_sfs_user_id: str
    requester_channel_id: str
    requester_template_id: str
    contract_type: str = "SFS_VIEWS"  # SFS_VIEWS | SFS_TIME | SFS_FOLLOWERS
    views_target: Optional[int] = None
    duration_hours: Optional[int] = None
    followers_target: Optional[int] = None

class UpdateProfileReq(BaseModel):
    payout_address: Optional[str] = None
    bio: Optional[str] = None
    full_name: Optional[str] = None


@router.post("/auth")
async def authenticate_sfs_user(user: TelegramUserAuth):
    """Login desde la WebApp. Retorna el usuario o lo crea si no existe."""
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


@router.get("/profile/me")
async def get_my_profile(sfs_user_id: str = Query(...)):
    """Perfil propio del usuario SFS con balance y estadísticas."""
    try:
        user_res = db.service_client.table("sfs_users").select("*").eq("id", sfs_user_id).execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        user = user_res.data[0]

        # Canales activos del usuario
        channels_res = db.client.table("channels").select(
            "id, name, followers, avg_views, engagement_rate, category, status, mode, is_verified"
        ).eq("sfs_user_id", sfs_user_id).execute()

        # Campañas completadas (como métrica de experiencia)
        completed_res = db.service_client.table("promo_campaigns").select(
            "id", count="exact"
        ).or_(f"requester_id.eq.{sfs_user_id},target_id.eq.{sfs_user_id}").eq(
            "status", "completed"
        ).execute()

        return {
            **user,
            "channels": channels_res.data or [],
            "completed_campaigns": completed_res.count or 0
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/profile/me")
async def update_my_profile(req: UpdateProfileReq, sfs_user_id: str = Query(...)):
    """Actualiza payout_address, bio o nombre del usuario SFS."""
    try:
        update_data = {k: v for k, v in req.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No hay datos para actualizar")
        res = db.service_client.table("sfs_users").update(update_data).eq("id", sfs_user_id).execute()
        return res.data[0] if res.data else {}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/profile/withdraw")
async def request_withdrawal(
    sfs_user_id: str = Query(...),
    amount: float = Body(...),
    wallet_address: str = Body(...)
):
    """Solicita un retiro del balance SFS."""
    try:
        user_res = db.service_client.table("sfs_users").select("wallet_balance, payout_address").eq("id", sfs_user_id).execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        balance = float(user_res.data[0].get("wallet_balance") or 0)
        if amount <= 0 or amount > balance:
            raise HTTPException(status_code=400, detail="Monto inválido o saldo insuficiente")

        # Crear solicitud de retiro
        db.service_client.table("sfs_withdrawals").insert({
            "sfs_user_id": sfs_user_id,
            "amount": amount,
            "wallet_address": wallet_address,
            "status": "pending"
        }).execute()

        # Retener fondos
        new_balance = balance - amount
        db.service_client.table("sfs_users").update({"wallet_balance": new_balance}).eq("id", sfs_user_id).execute()

        return {"status": "success", "new_balance": new_balance}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/channels/catalog")
async def get_channel_catalog(
    category: Optional[str] = None,
    mode: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    """Catálogo público de canales."""
    try:
        offset = (page - 1) * limit
        query = db.client.table("channels").select("*, sfs_users(username, trust_score)").eq("status", "active")
        if category:
            query = query.eq("category", category)
        if mode and mode != 'all':
            query = query.in_("mode", [mode, "both"])
        res = query.order("engagement_rate", desc=True).range(offset, offset + limit - 1).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/channels/my")
async def get_my_channels(sfs_user_id: str = Query(...)):
    """Canales registrados por el usuario."""
    try:
        res = db.client.table("channels").select("*").eq("sfs_user_id", sfs_user_id).order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/channels/my/{channel_id}/history")
async def get_channel_history(channel_id: str, model_id: str = Query(...)):
    """Historial de métricas de un canal desde channel_metrics_history."""
    try:
        owns = db.client.table("channels").select(
            "id, name, followers, avg_views, engagement_rate, updated_at"
        ).eq("id", channel_id).eq("sfs_user_id", model_id).execute()
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
    """Actualizar configuración de un canal propio."""
    try:
        existing = db.client.table("channels").select("id").eq("id", channel_id).eq("sfs_user_id", sfs_user_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Canal no encontrado o no autorizado")

        update_data = {k: v for k, v in req.dict().items() if v is not None}
        if not update_data:
            raise HTTPException(status_code=400, detail="No hay datos para actualizar")

        res = db.client.table("channels").update(update_data).eq("id", channel_id).execute()
        return res.data[0] if res.data else None
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.delete("/channels/my/{channel_id}")
async def delete_channel(channel_id: str, model_id: str = Query(...)):
    """Elimina un canal propio."""
    try:
        existing = db.client.table("channels").select("id").eq("id", channel_id).eq("sfs_user_id", model_id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Canal no encontrado o no autorizado")
        db.client.table("channels").delete().eq("id", channel_id).execute()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/limits")
async def check_user_limits(sfs_user_id: str = Query(...)):
    """Devuelve cuántos SFS le quedan hoy al usuario."""
    try:
        user_res = db.client.table("sfs_users").select("*").eq("id", sfs_user_id).execute()
        if not user_res.data:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        user = user_res.data[0]
        base_limit = 6 if user.get("is_agency_model") else 2
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        count_res = db.client.table("promo_campaigns").select("id", count="exact").eq("requester_id", sfs_user_id).gte("created_at", today).execute()
        used = count_res.count or 0
        return {
            "limit": base_limit,
            "used": used,
            "remaining": max(0, base_limit - used),
            "is_pro": user.get("subscription_tier") != 'basic'
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates/my")
async def get_my_templates(sfs_user_id: str = Query(...)):
    """Templates de post guardados por el bot."""
    try:
        res = db.client.table("promo_templates").select(
            "id, created_at, title, content_data, telegram_message_id_origin"
        ).eq("sfs_user_id", sfs_user_id).order("created_at", desc=True).limit(10).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



class UpdateTemplateReq(BaseModel):
    title: Optional[str] = None


@router.put("/templates/{template_id}")
async def update_template(template_id: str, req: UpdateTemplateReq, sfs_user_id: str = Query(...)):
    """Actualiza el título de un template de post."""
    try:
        # Verificar propiedad
        check = db.client.table("promo_templates").select("id").eq("id", template_id).eq("sfs_user_id", sfs_user_id).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="Template no encontrado")
        update_data = {}
        if req.title is not None:
            update_data["title"] = req.title.strip() or None
        if not update_data:
            raise HTTPException(status_code=400, detail="Sin campos para actualizar")
        db.client.table("promo_templates").update(update_data).eq("id", template_id).execute()
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaigns")
async def propose_sfs(req: ProposeSFSReq, requester_id: str = Query(...)):
    """Crea una propuesta de campaña SFS."""
    try:
        # Validar tipo de contrato
        valid_types = ["SFS_VIEWS", "SFS_TIME", "SFS_FOLLOWERS"]
        if req.contract_type not in valid_types:
            raise HTTPException(status_code=400, detail=f"Tipo de contrato inválido. Usa: {valid_types}")

        # Validar campo correspondiente al tipo
        if req.contract_type == "SFS_VIEWS" and not req.views_target:
            raise HTTPException(status_code=400, detail="Se requiere views_target para SFS_VIEWS")
        if req.contract_type == "SFS_TIME" and not req.duration_hours:
            raise HTTPException(status_code=400, detail="Se requiere duration_hours para SFS_TIME")
        if req.contract_type == "SFS_FOLLOWERS" and not req.followers_target:
            raise HTTPException(status_code=400, detail="Se requiere followers_target para SFS_FOLLOWERS")

        # Validar canal del requester
        ch_res = db.client.table("channels").select("id").eq("id", req.requester_channel_id).eq("sfs_user_id", requester_id).eq("status", "active").execute()
        if not ch_res.data:
            raise HTTPException(status_code=404, detail="Canal no encontrado o no activo")

        # Validar template
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

        # Verificar duplicados
        existing = db.client.table("promo_campaigns").select("id").eq("requester_id", requester_id).eq("target_id", req.target_sfs_user_id).in_("status", ["pending", "accepted", "active"]).execute()
        if existing.data:
            raise HTTPException(status_code=409, detail="Ya tienes una campaña activa o pendiente con este anunciante")

        # Canal activo del target
        target_ch_res = db.client.table("channels").select("id").eq("sfs_user_id", req.target_sfs_user_id).eq("status", "active").limit(1).execute()
        target_channel_id = target_ch_res.data[0]["id"] if target_ch_res.data else None

        campaign = db.service_client.table("promo_campaigns").insert({
            "requester_id": requester_id,
            "target_id": req.target_sfs_user_id,
            "requester_channel_id": req.requester_channel_id,
            "target_channel_id": target_channel_id,
            "requester_template_id": req.requester_template_id,
            "status": "pending",
            "type": req.contract_type,
            "views_target": req.views_target,
            "duration_hours": req.duration_hours,
            "followers_target": req.followers_target,
        }).execute()

        camp_data = campaign.data[0]

        # ── Notificación al TARGET: nueva propuesta recibida ──
        target_res = db.service_client.table("sfs_users").select(
            "telegram_id, username"
        ).eq("id", req.target_sfs_user_id).execute()
        requester_res = db.service_client.table("sfs_users").select(
            "username, full_name"
        ).eq("id", requester_id).execute()

        if target_res.data and requester_res.data:
            tg_target = target_res.data[0].get("telegram_id")
            req_name = requester_res.data[0].get("username") or requester_res.data[0].get("full_name") or "?"
            label = _contract_label(camp_data)
            await notify_sfs_user(
                tg_target,
                f"📨 <b>Nueva propuesta SFS</b> de @{req_name}\n"
                f"📋 Tipo: <b>{label}</b>\n\n"
                f"Entra al <a href='https://agente-modelos-production.up.railway.app/promotions'>Promo Center</a> para aceptar o rechazar."
            )

        return camp_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/sent")
async def get_sent_campaigns(model_id: str = Query(...)):
    """Campañas enviadas por el usuario."""
    try:
        res = db.client.table("promo_campaigns").select(
            "*, target:sfs_users!target_id(username, full_name, trust_score)"
        ).eq("requester_id", model_id).order("created_at", desc=True).limit(20).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/received")
async def get_received_campaigns(model_id: str = Query(...)):
    """Campañas recibidas por el usuario."""
    try:
        res = db.client.table("promo_campaigns").select(
            "*, requester:sfs_users!requester_id(username, full_name, trust_score)"
        ).eq("target_id", model_id).order("created_at", desc=True).limit(20).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/campaigns/{campaign_id}")
async def respond_to_campaign(
    campaign_id: str,
    sfs_user_id: str = Query(...),
    action: str = Query(...),   # "accept" | "reject"
):
    """El destinatario acepta o rechaza una propuesta SFS pendiente."""
    try:
        # Verificar que el usuario es el target
        camp_res = db.service_client.table("promo_campaigns").select(
            "id, status, target_id"
        ).eq("id", campaign_id).execute()

        if not camp_res.data:
            raise HTTPException(status_code=404, detail="Campaña no encontrada")

        camp = camp_res.data[0]
        if camp["target_id"] != sfs_user_id:
            raise HTTPException(status_code=403, detail="No autorizado")
        if camp["status"] != "pending":
            raise HTTPException(status_code=400, detail="La campaña ya no está en estado pendiente")

        # Cargar datos completos de la campaña para notificaciones
        camp_full = db.service_client.table("promo_campaigns").select(
            "*, requester:sfs_users!requester_id(telegram_id, username, full_name),"
            " target:sfs_users!target_id(telegram_id, username, full_name)"
        ).eq("id", campaign_id).execute()
        camp_full_data = camp_full.data[0] if camp_full.data else camp

        if action == "accept":
            new_status = "accepted"
            # Establecer start_time = ahora para que el job de publicación lo tome
            update_payload = {
                "status": new_status,
                "start_time": datetime.now(timezone.utc).isoformat()
            }
        elif action == "reject":
            new_status = "cancelled"
            update_payload = {"status": new_status}
        else:
            raise HTTPException(status_code=400, detail="action debe ser 'accept' o 'reject'")

        db.service_client.table("promo_campaigns").update(update_payload).eq("id", campaign_id).execute()

        # ── Notificaciones ──
        requester_tg = camp_full_data.get("requester", {}).get("telegram_id")
        target_tg    = camp_full_data.get("target",    {}).get("telegram_id")
        target_name  = camp_full_data.get("target",    {}).get("username") or "?"
        label = _contract_label(camp_full_data)
        promo_url = "https://agente-modelos-production.up.railway.app/promotions"

        if action == "accept":
            # Notificar al REQUESTER: su propuesta fue aceptada
            await notify_sfs_user(
                requester_tg,
                f"✅ <b>@{target_name} aceptó tu propuesta SFS</b>\n"
                f"📋 {label}\n"
                f"🤖 El bot publicará los posts cruzados en breve."
            )
            # Notificar al TARGET: recordatorio de que aceptó
            await notify_sfs_user(
                target_tg,
                f"✅ <b>Aceptaste la propuesta SFS</b>\n"
                f"📋 {label}\n"
                f"🤖 El bot publicará los posts cruzados en breve. Entra al <a href='{promo_url}'>Promo Center</a> para ver el seguimiento."
            )
        else:
            # Notificar al REQUESTER: su propuesta fue rechazada
            await notify_sfs_user(
                requester_tg,
                f"❌ <b>@{target_name} rechazó tu propuesta SFS</b>\n"
                f"📋 {label}\n"
                f"Puedes enviar una nueva propuesta a otro canal desde el <a href='{promo_url}'>Promo Center</a>."
            )

        return {"ok": True, "status": new_status}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reviews")
async def submit_review(req: ReviewReq, sfs_user_id: str = Query(...)):
    """Envía una calificación post-SFS."""
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
            "id, name, followers, avg_views, engagement_rate, category, is_verified, status, mode, bio"
        ).eq("sfs_user_id", user_id).eq("status", "active").order("followers", desc=True).execute()

        reviews_res = db.service_client.table("sfs_reviews").select(
            "id, rating, comment, created_at, reviewer_id"
        ).eq("target_id", user_id).order("created_at", desc=True).limit(20).execute()

        reviews = reviews_res.data or []
        for review in reviews:
            reviewer_res = db.client.table("sfs_users").select("username").eq("id", review["reviewer_id"]).execute()
            review["reviewer_username"] = reviewer_res.data[0]["username"] if reviewer_res.data else "Anónimo"

        return {**user, "channels": channels_res.data or [], "reviews": reviews}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/{campaign_id}/posts")
async def get_campaign_posts(campaign_id: str, sfs_user_id: str = Query(...)):
    """Retorna los posts publicados de una campaña activa con sus vistas actuales."""
    try:
        # Verificar que el usuario es parte de la campaña
        camp_res = db.service_client.table("promo_campaigns").select(
            "id, requester_id, target_id, type, views_target, duration_hours, followers_target, status"
        ).eq("id", campaign_id).execute()

        if not camp_res.data:
            raise HTTPException(status_code=404, detail="Campaña no encontrada")
        camp = camp_res.data[0]
        if sfs_user_id not in [camp["requester_id"], camp["target_id"]]:
            raise HTTPException(status_code=403, detail="No autorizado")

        posts_res = db.service_client.table("promo_posts").select(
            "*, channel:channels!channel_id(id, name, telegram_chat_id)"
        ).eq("campaign_id", campaign_id).execute()

        return {
            "campaign": camp,
            "posts": posts_res.data or []
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
