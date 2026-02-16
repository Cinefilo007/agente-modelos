from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Optional
from pydantic import BaseModel
from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db
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

        return {
            "success": True,
            "escrow_id": result.get("escrow_id"),
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
        order_res = db.client.table("escrow_orders").select("client_id, status").eq("id", request.escrow_id).execute()
        
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
