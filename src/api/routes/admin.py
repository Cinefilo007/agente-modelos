from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from src.services.database import db
import os
from telegram import Bot

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")

router = APIRouter()

# --- Schemas ---
class BlacklistAddRequest(BaseModel):
    telegram_id: int
    username: str
    reason: str
    severity: str
    added_by: Optional[str] = None

class DisputeResolveRequest(BaseModel):
    resolution: str # client_win, model_win
    admin_notes: str

class VerificationAction(BaseModel):
    action: str # approve, reject

# --- Routes ---

# BLACKLIST
@router.get("/blacklist")
async def get_blacklist():
    """Obtiene la lista negra global."""
    return db.get_blacklist()

@router.post("/blacklist")
async def add_blacklist(item: BlacklistAddRequest):
    """Agrega un usuario a la lista negra."""
    result = db.add_to_blacklist(
        item.telegram_id, 
        item.username, 
        item.reason, 
        item.severity, 
        item.added_by
    )
    if not result:
        raise HTTPException(status_code=500, detail="Error adding to blacklist")
    return {"status": "success", "data": result}

@router.delete("/blacklist/{id}")
async def remove_blacklist(id: str):
    """Elimina un usuario de la lista negra."""
    success = db.remove_from_blacklist(id)
    if not success:
        raise HTTPException(status_code=500, detail="Error removing from blacklist")
    return {"status": "success"}

# DISPUTES
@router.get("/disputes")
async def get_disputes():
    """Obtiene disputas activas."""
    return db.get_active_disputes()

@router.post("/disputes/{id}/resolve")
async def resolve_dispute(id: str, item: DisputeResolveRequest):
    """Resuelve una disputa."""
    result = db.resolve_dispute(id, item.resolution, item.admin_notes)
    if not result:
        raise HTTPException(status_code=500, detail="Error resolving dispute")
    return {"status": "success", "data": result}

# DASHBOARD KPI (Mock for now, can be real later)
@router.get("/kpi")
async def get_dashboard_kpis():
    """Retorna KPIs globales."""
    # En el futuro, esto consultaría la BBDD real
    return {
        "credits": "1.2M"
    }

# VERIFICATIONS
@router.get("/verifications")
async def get_pending_verifications():
    """Obtiene modelos pendientes de verificación."""
    try:
        # Fetch models with status 'verifying'
        response = db.client.table("models").select("*").eq("status", "verifying").execute()
        return response.data if response.data else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/verify/{model_id}")
async def process_verification(model_id: str, body: VerificationAction):
    """Aprueba o rechaza una verificación."""
    try:
        new_status = "active" if body.action == "approve" else "rejected"
        is_verified = (body.action == "approve")
        
        # 1. Update DB
        if body.action == "approve":
            db.client.table("models").update({"status": "active", "is_verified": True}).eq("id", model_id).execute()
        else:
             db.client.table("models").update({"status": "rejected"}).eq("id", model_id).execute()

        # 2. Get Model to notify
        model = db.get_model_by_uuid(model_id)
        if not model:
             return {"status": "success", "message": "Updated but model not found for notification"}

        # 3. Notify via Telegram
        if TELEGRAM_TOKEN:
            bot = Bot(token=TELEGRAM_TOKEN)
            try:
                if body.action == "approve":
                    await bot.send_message(
                        chat_id=model['telegram_id'],
                        text="✅ *¡Felicidades! Tu cuenta ha sido verificada.*\n\nYa eres oficialmente un Creador. Accede al portal para configurar tus paquetes y empezar a ganar.",
                        parse_mode="Markdown"
                    )
                else:
                    await bot.send_message(
                        chat_id=model['telegram_id'],
                        text="❌ *Solicitud Rechazada*\n\nTu perfil no cumple con nuestros requisitos de verificación.",
                        parse_mode="Markdown"
                    )
            except Exception as e:
                print(f"Error notifying user {model['telegram_id']}: {e}")

        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
