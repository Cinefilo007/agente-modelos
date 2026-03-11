from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Optional
from pydantic import BaseModel
from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db
from src.services.notifications import notifications
import uuid

router = APIRouter()

class CreateEscrowRequest(BaseModel):
    model_id: str
    service_id: str
    amount: float

class ReleaseEscrowRequest(BaseModel):
    escrow_id: str

class DisputeEscrowRequest(BaseModel):
    escrow_id: str
    reason: str

class ReviewRequest(BaseModel):
    escrow_id: str
    rating: int # 1-5
    comment: Optional[str] = None

@router.post("/create")
async def create_escrow_order(
    request: CreateEscrowRequest,
    user: TelegramUser = Depends(get_current_user)
):
    """
    Lock funds and create an escrow order for a service.
    Uses RPC 'wallet_lock_funds' for atomicity.
    """
    try:
        # Call RPC
        rpc_params = {
            "p_user_id": user.user_id,
            "p_amount": request.amount,
            "p_service_id": request.service_id,
            "p_model_id": request.model_id
        }
        
        res = db.client.rpc("wallet_lock_funds", rpc_params).execute()
        
        # Check result
        # RPC returns {success: bool, escrow_id: uuid, error: str}
        # Supabase-py returns data directly or wrapper depending on version. 
        # Usually res.data is the JSON return.
        
        if not res.data:
             raise HTTPException(status_code=500, detail="RPC returned no data")
             
        result = res.data
        
        if not result.get("success"):
            error_msg = result.get("error", "Unknown error")
            if "Insufficient funds" in error_msg:
                 raise HTTPException(status_code=402, detail="Saldo insuficiente. Por favor recarga tu billetera.")
            raise HTTPException(status_code=400, detail=f"Error creando orden: {error_msg}")

        escrow_id = result.get("escrow_id")

        # --- Notify Model via Telegram ---
        try:
            # Get model telegram_id and service name
            model_info = db.client.table("models").select("telegram_id").eq("id", request.model_id).single().execute()
            service_info = db.client.table("model_services").select("title").eq("id", request.service_id).single().execute()
            
            if model_info.data and service_info.data:
                model_tid = model_info.data['telegram_id']
                service_name = service_info.data['title']
                
                msg = (
                    f"💰 <b>¡Nueva Venta Realizada!</b>\n\n"
                    f"Se ha creado una orden de Escrow por el servicio: <b>{service_name}</b>\n"
                    f"Monto: <b>${request.amount:.2f} USDT</b>\n"
                    f"Cliente: <b>@{user.username or user.id}</b>\n\n"
                    f"🛡️ Los fondos están en custodia. Por favor contacta al cliente para iniciar el servicio."
                )
                import asyncio
                asyncio.create_task(notifications.send_notification(model_tid, msg))
        except Exception as e:
            print(f"[Escrow] Notification error: {e}")

        return {
            "success": True,
            "escrow_id": escrow_id,
            "message": "Fondos congelados y servicio iniciado."
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error creating escrow: {e}")
        raise HTTPException(status_code=500, detail="Error interno al procesar pago")

@router.post("/release")
async def release_escrow_funds(
    request: ReleaseEscrowRequest,
    user: TelegramUser = Depends(get_current_user)
):
    """
    Release funds to the model.
    Typically called by the client (Happy path) or automatically by system.
    If called by client, we must verify ownership.
    """
    try:
        # 1. Verify ownership (The caller must be the client of the order)
        # We could move this check inside RPC, but good to check here cheaply.
        order_res = db.client.table("orders").select("client_id, status").eq("id", request.escrow_id).execute()
        
        if not order_res.data:
            raise HTTPException(status_code=404, detail="Orden no encontrada")
            
        order = order_res.data[0]
        
        # Determine if user is allowed to release
        # Client can release anytime.
        # Model CANNOT release (conflict of interest), unless auto-release logic triggers (cron).
        # Admin can release.
        
        if order["client_id"] != user.user_id and user.role != "admin":
             raise HTTPException(status_code=403, detail="No tienes permiso para liberar estos fondos")

        if order["status"] != "HELD":
             raise HTTPException(status_code=400, detail=f"La orden no está en custodia (Estado: {order['status']})")

        # 2. Call RPC
        rpc_params = {
            "p_escrow_id": request.escrow_id
        }
        
        res = db.client.rpc("wallet_release_funds", rpc_params).execute()
        result = res.data
        
        if not result.get("success"):
             raise HTTPException(status_code=400, detail=result.get("error"))
             
        return {
            "success": True,
            "payout_amount": result.get("payout"),
            "fee": result.get("fee"),
            "message": "Fondos liberados exitosamente."
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error releasing funds: {e}")
        raise HTTPException(status_code=500, detail="Error liberando fondos")

@router.post("/review")
async def submit_escrow_review(
    request: ReviewRequest,
    user: TelegramUser = Depends(get_current_user)
):
    """
    Submit a review for a completed escrow service.
    Updates the model's reputation score.
    """
    try:
        # 1. Verify order status is COMPLETED
        order_res = db.client.table("orders").select("model_id, client_id, status").eq("id", request.escrow_id).single().execute()
        if not order_res.data:
            raise HTTPException(status_code=404, detail="Orden no encontrada")
        
        order = order_res.data
        if order["client_id"] != user.user_id:
            raise HTTPException(status_code=403, detail="No puedes calificar una orden que no te pertenece")
        
        if order["status"] != "COMPLETED":
            raise HTTPException(status_code=400, detail="Debes liberar los fondos antes de dejar una reseña")

        # 2. Insert Review
        review_data = {
            "order_id": request.escrow_id,
            "client_id": user.user_id,
            "model_id": order["model_id"],
            "rating": request.rating,
            "comment": request.comment
        }
        
        # Check if already reviewed
        existing = db.client.table("order_reviews").select("id").eq("order_id", request.escrow_id).maybe_single().execute()
        if existing.data:
            # Update existing? No, typically one per order.
             raise HTTPException(status_code=400, detail="Ya has dejado una reseña para esta orden")

        db.client.table("order_reviews").insert(review_data).execute()

        # 3. Update Model reputation (Average)
        # We can do this via an RPC or a simple query/update
        # For now, let's keep it simple: Select avg(rating) from order_reviews where model_id = ...
        stats = db.client.table("order_reviews").select("rating").eq("model_id", order["model_id"]).execute()
        if stats.data:
            ratings = [r['rating'] for r in stats.data]
            avg_score = sum(ratings) / len(ratings)
            db.client.table("models").update({"reputation_score": avg_score}).eq("id", order["model_id"]).execute()

        return {"success": True, "message": "Reseña guardada. ¡Gracias por tu feedback!"}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"[Review] Error: {e}")
        raise HTTPException(status_code=500, detail="Error al procesar la reseña")
