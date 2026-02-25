"""
promo.py — Endpoints de la API para el sistema SFS/Promo.
Cubre: Canales de modelos, plantillas, campañas y acciones de administrador.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from src.services.database import db
import os
from telegram import Bot

router = APIRouter()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
PROMO_BOT_TOKEN = os.getenv("PROMO_TELEGRAM_TOKEN")


# ─────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────

class ChannelVerifyRequest(BaseModel):
    """El frontend envía el identificador del canal (username, ID o link)."""
    model_id: str
    channel_identifier: str  # @username | -1001234 | t.me/+xyz


class ChannelActionRequest(BaseModel):
    action: str  # 'approve' o 'reject'
    reason: Optional[str] = None


# ─────────────────────────────────────────────
# CANALES — MODELO
# ─────────────────────────────────────────────

@router.get("/channels/catalog")
async def get_channel_catalog(
    page: int = Query(1, ge=1),
    limit: int = Query(5, ge=1, le=20)
):
    """
    Catálogo público de canales activos con paginación.
    Solo retorna canales con status='active'.
    """
    try:
        offset = (page - 1) * limit

        # Total para la paginación
        count_res = db.client.table("channels") \
            .select("id", count="exact") \
            .eq("status", "active") \
            .execute()
        total = count_res.count or 0

        # Datos paginados con join a models para obtener el trust_score y badges
        res = db.client.table("channels") \
            .select("*, models(trust_score, badges, username)") \
            .eq("status", "active") \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()

        channels = []
        for ch in (res.data or []):
            model_info = ch.get("models") or {}
            channels.append({
                "id": ch["id"],
                "name": ch["name"],
                "telegram_chat_id": ch["telegram_chat_id"],
                "followers": ch.get("followers_count", 0),
                "avg_views": ch.get("avg_views", 0),
                "er": round(ch.get("avg_views", 0) / max(ch.get("followers_count", 1), 1) * 100, 1),
                "trust_score": model_info.get("trust_score", 50),
                "badges": model_info.get("badges") or [],
                "model_username": model_info.get("username", ""),
            })

        return {
            "data": channels,
            "total": total,
            "page": page,
            "total_pages": max(1, -(-total // limit))  # ceil division
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/channels/verify")
async def verify_and_register_channel(req: ChannelVerifyRequest):
    """
    Verifica que el bot sea administrador del canal indicado.
    Guarda el canal con status='pending_approval' si la verificación pasa.
    Acepta @username, ID numérico (-100xxx) o link de invitación (t.me/+xxx).
    """
    if not PROMO_BOT_TOKEN:
        raise HTTPException(status_code=500, detail="PROMO_TELEGRAM_TOKEN no configurado en el servidor.")

    bot = Bot(token=PROMO_BOT_TOKEN)
    identifier = req.channel_identifier.strip()

    try:
        # Resolver el chat
        chat = await bot.get_chat(identifier)
        chat_id = chat.id
        chat_title = chat.title or identifier

        # Verificar que el bot sea administrador
        admins = await bot.get_chat_administrators(chat_id)
        bot_user = await bot.get_me()
        is_admin = any(a.user.id == bot_user.id for a in admins)

        if not is_admin:
            raise HTTPException(
                status_code=400,
                detail="El bot @Nebula_sfs_bot no es administrador de ese canal. Añádelo primero con permisos de publicar y borrar mensajes."
            )

        # Guardar el canal en la BD con status pending_approval
        existing = db.client.table("channels") \
            .select("id, status") \
            .eq("model_id", req.model_id) \
            .eq("telegram_chat_id", str(chat_id)) \
            .execute()

        if existing.data:
            ch = existing.data[0]
            if ch["status"] == "active":
                return {"status": "already_active", "message": "Este canal ya está aprobado en el catálogo."}
            elif ch["status"] == "pending_approval":
                return {"status": "pending", "message": "Este canal ya está en revisión. Te notificaremos cuando sea aprobado."}
            else:
                # Reactivar si fue rechazado
                db.client.table("channels").update({
                    "status": "pending_approval",
                    "name": chat_title
                }).eq("id", ch["id"]).execute()
        else:
            db.client.table("channels").insert({
                "model_id": req.model_id,
                "telegram_chat_id": str(chat_id),
                "name": chat_title,
                "status": "pending_approval",
                "followers_count": chat.member_count or 0,
            }).execute()

        return {
            "status": "success",
            "message": f"Canal '{chat_title}' registrado exitosamente. Quedará en revisión hasta que nuestro equipo lo apruebe."
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"No se pudo acceder al canal: {str(e)}. Verifica que el identificador sea correcto y que el bot sea administrador.")


@router.get("/channels/my")
async def get_my_channels(model_id: str = Query(...)):
    """Retorna los canales registrados por una modelo específica."""
    try:
        res = db.client.table("channels") \
            .select("*") \
            .eq("model_id", model_id) \
            .order("created_at", desc=True) \
            .execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# CAMPAÑAS — MODELO
# ─────────────────────────────────────────────

@router.get("/campaigns/sent")
async def get_sent_campaigns(model_id: str = Query(...)):
    """Campañas enviadas por la modelo (como requester)."""
    try:
        res = db.client.table("promo_campaigns") \
            .select("*, channels!requester_channel_id(name), channels!target_channel_id(name)") \
            .eq("requester_model_id", model_id) \
            .order("created_at", desc=True) \
            .execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/received")
async def get_received_campaigns(model_id: str = Query(...)):
    """Campañas recibidas por la modelo (como target)."""
    try:
        res = db.client.table("promo_campaigns") \
            .select("*, channels!requester_channel_id(name), channels!target_channel_id(name)") \
            .eq("target_model_id", model_id) \
            .order("created_at", desc=True) \
            .execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# ADMIN — PANEL SFS
# ─────────────────────────────────────────────

@router.get("/admin/channels/pending")
async def get_pending_channels():
    """Lista canales con status='pending_approval' para revisión del admin."""
    try:
        res = db.client.table("channels") \
            .select("*, models(username, full_name, telegram_id)") \
            .eq("status", "pending_approval") \
            .order("created_at", desc=True) \
            .execute()

        channels = []
        for ch in (res.data or []):
            model_info = ch.get("models") or {}
            channels.append({
                "id": ch["id"],
                "name": ch["name"],
                "telegram_chat_id": ch["telegram_chat_id"],
                "followers": ch.get("followers_count", 0),
                "model_id": ch["model_id"],
                "model_username": model_info.get("username", ""),
                "model_full_name": model_info.get("full_name", ""),
                "model_telegram_id": model_info.get("telegram_id"),
                "created_at": ch["created_at"],
            })
        return channels
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/channels/{channel_id}/action")
async def admin_channel_action(channel_id: str, req: ChannelActionRequest):
    """Aprobar o rechazar un canal. Notifica a la modelo por Telegram."""
    try:
        new_status = "active" if req.action == "approve" else "rejected"
        db.client.table("channels").update({"status": new_status}).eq("id", channel_id).execute()

        # Obtener datos del canal y la modelo para notificar
        ch_res = db.client.table("channels") \
            .select("name, model_id, models(telegram_id, username)") \
            .eq("id", channel_id) \
            .single() \
            .execute()

        if ch_res.data and TELEGRAM_TOKEN:
            model_info = ch_res.data.get("models") or {}
            telegram_id = model_info.get("telegram_id")
            ch_name = ch_res.data.get("name", "tu canal")

            if telegram_id:
                bot = Bot(token=TELEGRAM_TOKEN)
                try:
                    msg = (
                        f"✅ *¡Tu canal '{ch_name}' ha sido aprobado!*\n\nYa aparece en el catálogo SFS. Ahora puedes recibir propuestas de colaboración."
                        if req.action == "approve" else
                        f"❌ *Canal rechazado*\n\nLamentablemente, el canal '{ch_name}' no fue aprobado. Motivo: {req.reason or 'No cumple los requisitos mínimos.'}"
                    )
                    await bot.send_message(chat_id=telegram_id, text=msg, parse_mode="Markdown")
                except Exception as notify_err:
                    print(f"[Promo Admin] Error notificando al modelo: {notify_err}")

        return {"status": "success", "new_status": new_status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/campaigns/active")
async def get_active_campaigns():
    """Campañas activas en tiempo real para el admin."""
    try:
        res = db.client.table("promo_campaigns") \
            .select("*, models!requester_model_id(username), models!target_model_id(username)") \
            .eq("status", "active") \
            .order("start_time", desc=True) \
            .execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/campaigns/fraud")
async def get_fraud_campaigns():
    """Campañas marcadas como fraude."""
    try:
        res = db.client.table("promo_campaigns") \
            .select("*, models!requester_model_id(username), models!target_model_id(username)") \
            .eq("status", "cancelled_fraud") \
            .order("updated_at", desc=True) \
            .execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/trust/ranking")
async def get_trust_ranking():
    """Ranking de modelos por Trust Score."""
    try:
        res = db.client.table("models") \
            .select("id, username, full_name, trust_score, badges, status") \
            .eq("status", "active") \
            .order("trust_score", desc=True) \
            .limit(50) \
            .execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
