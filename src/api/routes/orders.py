from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db

router = APIRouter()

@router.get("/my-purchases")
async def get_my_purchases(user: TelegramUser = Depends(get_current_user)):
    """Get all orders where the user is the client."""
    try:
        res = db.client.table("orders") \
            .select("*, models(username, artistic_name, avatar_url), model_services(title)") \
            .eq("client_id", user.user_id) \
            .order("created_at", desc=True) \
            .execute()
        return res.data or []
    except Exception as e:
        print(f"[Orders] Error fetching purchases (User {user.user_id}): {e}")
        raise HTTPException(status_code=500, detail="Error al recuperar compras")

@router.get("/my-sales")
async def get_my_sales(user: TelegramUser = Depends(get_current_user)):
    """Get all orders where the user is the model."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Solo las modelos pueden ver sus ventas")
    
    try:
        # En el sistema Nebula, si el rol es 'model', user.user_id es el UUID de la tabla models
        res = db.client.table("orders") \
            .select("*, clients(username, avatar_url), model_services(title)") \
            .eq("model_id", user.user_id) \
            .order("created_at", desc=True) \
            .execute()
        return res.data or []
    except Exception as e:
        print(f"[Orders] Error fetching sales (Model {user.user_id}): {e}")
        raise HTTPException(status_code=500, detail="Error al recuperar ventas")

@router.get("/{order_id}")
async def get_order_details(order_id: str, user: TelegramUser = Depends(get_current_user)):
    """Get full details of a specific order (Digital Delivery Note)."""
    try:
        res = db.client.table("orders") \
            .select("*, models(id, username, artistic_name, avatar_url, telegram_id), clients(id, username, avatar_url, telegram_id), model_services(*), model_service_options(*)") \
            .eq("id", order_id) \
            .single().execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Orden no encontrada")
        
        order = res.data

        # SEGURIDAD: Verificar que el usuario sea parte de esta orden o sea admin
        is_client_of_order = str(order.get('client_id')) == str(user.user_id)
        is_model_of_order = str(order.get('model_id')) == str(user.user_id)
        is_admin = user.role == 'admin'

        if not (is_client_of_order or is_model_of_order or is_admin):
            raise HTTPException(status_code=403, detail="No tienes acceso a esta orden")
        
        return order
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Orders] Error fetching order {order_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al recuperar detalles de la orden")

@router.post("/{order_id}/mark-shipped")
async def mark_order_shipped(order_id: str, user: TelegramUser = Depends(get_current_user)):
    """Model marks the order as shipped/performed."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Solo modelos pueden marcar envío")
        
    try:
        # SEGURIDAD: Verificar que la modelo sea dueña de esta orden
        order_res = db.client.table("orders").select("model_id, client_id, model_services(title)").eq("id", order_id).single().execute()
        if not order_res.data:
            raise HTTPException(status_code=404, detail="Orden no encontrada")

        if str(order_res.data['model_id']) != str(user.user_id):
            raise HTTPException(status_code=403, detail="No puedes modificar órdenes de otras modelos")

        # Update delivery_status
        db.client.table("orders").update({"delivery_status": "shipped"}).eq("id", order_id).execute()
        
        # Notify Client
        client_id = order_res.data['client_id']
        service_name = order_res.data['model_services']['title']
        msg = f"✅ <b>¡Servicio Realizado!</b>\n\nTu servicio <b>{service_name}</b> ha sido marcado como realizado por la modelo.\n\nPor favor, verifica el resultado y libera los fondos desde tu perfil."
        
        from src.services import notifications
        import asyncio
        # Get client telegram_id
        client_info = db.client.table("clients").select("telegram_id").eq("id", client_id).single().execute()
        if client_info.data:
            asyncio.create_task(notifications.send_notification(client_info.data['telegram_id'], msg))

        return {"status": "success", "message": "Orden marcada como realizada"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{order_id}/release")
async def release_order_funds(order_id: str, user: TelegramUser = Depends(get_current_user)):
    """Client releases funds for an escrow order."""
    try:
        # 1. Get Order
        order_res = db.client.table("orders").select("*, models(telegram_id), model_services(title)").eq("id", order_id).single().execute()
        if not order_res.data:
            raise HTTPException(status_code=404, detail="Orden no encontrada")
        
        order = order_res.data
        if order['client_id'] != user.user_id:
            raise HTTPException(status_code=403, detail="No tienes permiso para liberar estos fondos")
        
        if order['payment_method'] != 'escrow':
            raise HTTPException(status_code=400, detail="Esta orden no es de tipo Escrow")
        
        if order['status'] == 'COMPLETED':
             return {"status": "success", "message": "Los fondos ya fueron liberados"}

        # 2. RPC Release Funds
        release_res = db.client.rpc("wallet_release_funds", {"p_escrow_id": order_id}).execute()
        
        if not release_res.data or not release_res.data.get("success"):
            raise HTTPException(status_code=400, detail=release_res.data.get("error", "Error al liberar fondos"))

        # 3. Update Order Status
        db.client.table("orders").update({"status": "COMPLETED", "delivery_status": "delivered"}).eq("id", order_id).execute()

        # 4. Notify Model
        from src.services import notifications
        import asyncio
        model_tid = order['models']['telegram_id']
        service_name = order['model_services']['title']
        msg = f"💰 <b>¡Fondos Liberados!</b>\n\nEl cliente ha liberado los fondos por el servicio: <b>{service_name}</b>\nEl monto ha sido acreditado a tu billetera."
        asyncio.create_task(notifications.send_notification(model_tid, msg))

        return {"status": "success", "message": "Fondos liberados con éxito"}

    except Exception as e:
        print(f"[Orders] Error releasing funds: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/review")
async def submit_order_review(request: dict, user: TelegramUser = Depends(get_current_user)):
    """Submit a review for a completed order."""
    try:
        order_id = request.get("order_id")
        rating = request.get("rating")
        comment = request.get("comment")

        order_res = db.client.table("orders").select("client_id, model_id, status").eq("id", order_id).single().execute()
        if not order_res.data:
            raise HTTPException(status_code=404, detail="Orden no encontrada")
        
        if order_res.data['client_id'] != user.user_id:
            raise HTTPException(status_code=403, detail="No puedes calificar esta orden")
        
        # Insert review
        db.client.table("order_reviews").insert({
            "order_id": order_id,
            "client_id": user.user_id,
            "model_id": order_res.data['model_id'],
            "rating": rating,
            "comment": comment
        }).execute()

        # Update model reputation
        stats = db.client.table("order_reviews").select("rating").eq("model_id", order_res.data['model_id']).execute()
        if stats.data:
            ratings = [r['rating'] for r in stats.data]
            avg_score = sum(ratings) / len(ratings)
            db.client.table("models").update({"reputation_score": avg_score}).eq("id", order_res.data['model_id']).execute()

        return {"status": "success", "message": "Reseña guardada"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{order_id}/complete-direct")
async def complete_direct_order(order_id: str, user: TelegramUser = Depends(get_current_user)):
    """Client marks a direct payment order as completed."""
    try:
        # 1. Get Order
        order_res = db.client.table("orders").select("client_id, payment_method, status").eq("id", order_id).single().execute()
        if not order_res.data:
            raise HTTPException(status_code=404, detail="Orden no encontrada")
        
        order = order_res.data
        if order['client_id'] != user.user_id:
            raise HTTPException(status_code=403, detail="No tienes permiso para completar esta orden")    
        if order['payment_method'] != 'direct':
            raise HTTPException(status_code=400, detail="Este endpoint es solo para pagos directos")
        if order['status'] == 'COMPLETED':
             return {"status": "success", "message": "La orden ya estaba completada"}

        # 2. Update Order Status
        db.client.table("orders").update({"status": "COMPLETED", "delivery_status": "delivered"}).eq("id", order_id).execute()

        return {"status": "success", "message": "Orden marcada como completada"}

    except Exception as e:
        print(f"[Orders] Error completing direct order {order_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
