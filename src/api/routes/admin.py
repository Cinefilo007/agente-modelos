from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from src.services.database import db

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
        "revenue": "$45,230",
        "active_models": 124,
        "active_disputes": len(db.get_active_disputes()),
        "credits": "1.2M"
    }
