"""
Nebula Coach — Rutas API
========================
Endpoints REST para el sistema de consejero IA de la plataforma.
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from src.services.database import db
from src.api.dependencies import get_current_user, TelegramUser
from src.services import coach_service

router = APIRouter()


# ================================================================
# SCHEMAS
# ================================================================

class FeedbackRequest(BaseModel):
    plan_id: str
    action_key: str
    action_category: str
    result: str  # "success" | "failure" | "pending"
    notes: Optional[str] = None


# ================================================================
# HELPERS
# ================================================================

def _get_model_id(user: TelegramUser) -> str:
    """Obtiene el UUID de la modelo desde su telegram_id."""
    res = db.client.table("models").select("id").eq(
        "telegram_id", user.id).maybe_single().execute()
    if not res.data:
        raise HTTPException(
            status_code=404,
            detail="Perfil de modelo no encontrado. Asegúrate de estar registrada como modelo."
        )
    return res.data["id"]


def _get_plan_id(model_id: str, mes: int, año: int) -> Optional[str]:
    """Obtiene el ID del plan del mes actual si existe."""
    res = db.client.table("coach_plans").select("id").eq(
        "model_id", model_id).eq("month", mes).eq("year", año).maybe_single().execute()
    return res.data["id"] if res.data else None


# ================================================================
# ENDPOINTS
# ================================================================

@router.get("/plan")
async def obtener_plan_mensual(
    mes: Optional[int] = None,
    año: Optional[int] = None,
    user: TelegramUser = Depends(get_current_user)
):
    """
    Obtiene el plan mensual del Coach para la modelo autenticada.
    Si no existe, lo genera automáticamente (puede tardar ~10-15 segundos).
    """
    if user.role != "model":
        raise HTTPException(status_code=403, detail="El Coach es exclusivo para modelos.")

    # Fecha por defecto: mes actual
    ahora = datetime.utcnow()
    mes = mes or ahora.month
    año = año or ahora.year

    if not (1 <= mes <= 12):
        raise HTTPException(status_code=400, detail="Mes inválido. Debe ser entre 1 y 12.")

    try:
        model_id = _get_model_id(user)
        print(f"[Coach] Solicitud de plan para modelo {model_id} — {mes}/{año}")

        resultado = coach_service.generar_plan_mensual(
            db=db,
            model_id=model_id,
            mes=mes,
            año=año,
            forzar=False
        )

        # Obtener el plan_id para el frontend (necesario para el feedback)
        plan_id = _get_plan_id(model_id, mes, año)

        return {
            **resultado,
            "plan_id": plan_id,
            "mes": mes,
            "año": año
        }
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[Coach] Error inesperado: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error generando el plan: {str(e)}")


@router.post("/plan/regenerar")
async def regenerar_plan_mensual(
    mes: Optional[int] = None,
    año: Optional[int] = None,
    user: TelegramUser = Depends(get_current_user)
):
    """
    Fuerza la regeneración del plan mensual.
    Cooldown: 7 días entre regeneraciones manuales.
    """
    if user.role != "model":
        raise HTTPException(status_code=403, detail="El Coach es exclusivo para modelos.")

    ahora = datetime.utcnow()
    mes = mes or ahora.month
    año = año or ahora.year

    try:
        model_id = _get_model_id(user)
        print(f"[Coach] Regeneración solicitada para modelo {model_id} — {mes}/{año}")

        resultado = coach_service.generar_plan_mensual(
            db=db,
            model_id=model_id,
            mes=mes,
            año=año,
            forzar=True
        )

        plan_id = _get_plan_id(model_id, mes, año)

        return {
            **resultado,
            "plan_id": plan_id,
            "mes": mes,
            "año": año,
            "mensaje": "✨ Tu plan ha sido actualizado con tus datos más recientes."
        }
    except ValueError as e:
        # Cooldown activo
        raise HTTPException(status_code=429, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[Coach] Error en regeneración: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error regenerando el plan: {str(e)}")


@router.post("/feedback")
async def registrar_feedback(
    data: FeedbackRequest,
    user: TelegramUser = Depends(get_current_user)
):
    """
    Registra el resultado de una acción del plan (éxito/fracaso).
    Alimenta el pool colectivo anónimo del ecosistema.
    """
    if user.role != "model":
        raise HTTPException(status_code=403, detail="El Coach es exclusivo para modelos.")

    if data.result not in ("success", "failure", "pending"):
        raise HTTPException(
            status_code=400,
            detail="El resultado debe ser 'success', 'failure' o 'pending'."
        )

    try:
        model_id = _get_model_id(user)

        resultado = coach_service.registrar_feedback(
            db=db,
            model_id=model_id,
            plan_id=data.plan_id,
            action_key=data.action_key,
            action_category=data.action_category,
            result=data.result,
            notes=data.notes
        )
        return resultado
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Coach] Error registrando feedback: {e}")
        raise HTTPException(status_code=500, detail=f"Error guardando el feedback: {str(e)}")


@router.get("/insights")
async def obtener_insights_colectivos(
    user: TelegramUser = Depends(get_current_user)
):
    """
    Retorna las insights colectivas anónimas del ecosistema.
    Muestra qué acciones tienen mayor tasa de éxito entre todas las modelos.
    """
    if user.role != "model":
        raise HTTPException(status_code=403, detail="El Coach es exclusivo para modelos.")

    try:
        insights = coach_service.obtener_insights_publicos(db)
        return {
            "insights": insights,
            "total": len(insights),
            "descripcion": "Estadísticas anónimas del ecosistema Nebula"
        }
    except Exception as e:
        print(f"[Coach] Error obteniendo insights: {e}")
        return {"insights": [], "total": 0}
