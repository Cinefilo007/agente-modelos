from fastapi import APIRouter, Depends, HTTPException, status, Body
from pydantic import BaseModel
from typing import Optional, Dict, List
from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db
from datetime import datetime
import uuid

router = APIRouter()

class ServiceOption(BaseModel):
    label: str
    price: float
    unit: Optional[str] = None
    unit_value: Optional[int] = None

class ServiceCreate(BaseModel):
    category: str
    title: str
    description: Optional[str] = ""
    rules: List[str] = []
    benefits: List[str] = []
    options: List[ServiceOption]

class OrderCreate(BaseModel):
    model_id: str
    service_id: str
    option_id: str
    payment_method: str # 'platform' or 'direct'

@router.get("/shop/{username}")
async def get_model_shop(username: str):
    """Get all active services and options for a model by username."""
    try:
        # 1. Get model id
        model_res = db.client.table("models").select("id").eq("username", username).maybe_single().execute()
        if not model_res.data:
             raise HTTPException(status_code=404, detail="Modelo no encontrada")
        
        model_id = model_res.data['id']
        
        # 2. Get services with their options
        services_res = db.client.table("model_services") \
            .select("*, model_service_options(*)") \
            .eq("model_id", model_id) \
            .eq("is_active", True) \
            .execute()
            
        return services_res.data or []
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Shop] Error fetching shop for {username}: {e}")
        return []

@router.get("/services/{service_id}")
async def get_service_detail(service_id: str):
    """Get detailed info for a single service, including options and model data."""
    try:
        res = db.client.table("model_services") \
            .select("*, model_service_options(*), models(id, username, artistic_name, avatar_url)") \
            .eq("id", service_id) \
            .single().execute()
            
        if not res.data:
            raise HTTPException(status_code=404, detail="Servicio no encontrado")
            
        return res.data
    except Exception as e:
        print(f"[Shop] Error fetching service {service_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my")
async def get_my_services(user: TelegramUser = Depends(get_current_user)):
    """Get all services and options for the logged-in model."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    try:
        # Get model id
        model_res = db.client.table("models").select("id").eq("telegram_id", user.id).single().execute()
        model_id = model_res.data['id']
        
        # Get all services (even inactive ones if desired, or just active)
        services_res = db.client.table("model_services") \
            .select("*, model_service_options(*)") \
            .eq("model_id", model_id) \
            .order("created_at", desc=True) \
            .execute()
            
        return services_res.data or []
    except Exception as e:
        print(f"[Shop] Error fetching my services: {e}")
        return []

@router.post("/services")
async def create_or_update_service(
    service_data: ServiceCreate,
    user: TelegramUser = Depends(get_current_user)
):
    """Create a new service with its options (Model only)."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Solo las modelos pueden gestionar su tienda")

    try:
        # Get model internal UUID
        model_res = db.client.table("models").select("id").eq("telegram_id", user.id).single().execute()
        model_id = model_res.data['id']

        # 1. Insert Service
        service_payload = {
            "model_id": model_id,
            "category": service_data.category,
            "title": service_data.title,
            "description": service_data.description,
            "rules": service_data.rules,
            "benefits": service_data.benefits
        }
        
        res = db.client.table("model_services").insert(service_payload).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Error al crear el servicio")
        
        service_id = res.data[0]['id']

        # 2. Insert Options
        options_payload = []
        for opt in service_data.options:
            options_payload.append({
                "service_id": service_id,
                "label": opt.label,
                "price": opt.price,
                "unit": opt.unit,
                "unit_value": opt.unit_value
            })
            
        db.client.table("model_service_options").insert(options_payload).execute()

        return {"status": "success", "service_id": service_id}
    except Exception as e:
        print(f"[Shop] Error creating service: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/services/{service_id}")
async def delete_service(
    service_id: str,
    user: TelegramUser = Depends(get_current_user)
):
    """Inactivate a service (Model only)."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="No autorizado")

    try:
        # Verificar que la modelo sea la dueña
        model_res = db.client.table("models").select("id").eq("telegram_id", user.id).single().execute()
        model_id = model_res.data['id']
        
        # Soft delete (is_active = false)
        db.client.table("model_services") \
            .update({"is_active": False}) \
            .eq("id", service_id) \
            .eq("model_id", model_id) \
            .execute()
            
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/order")
async def create_service_order(
    order_data: OrderCreate,
    user: TelegramUser = Depends(get_current_user)
):
    """Create a new service order (Client only)."""
    if user.role != "client":
        raise HTTPException(status_code=403, detail="Las modelos no pueden comprar servicios")

    try:
        # 1. Get client UUID
        client_res = db.client.table("clients").select("id").eq("telegram_id", user.id).single().execute()
        client_id = client_res.data['id']

        # 2. Get option price and service details
        opt_res = db.client.table("model_service_options") \
            .select("price, model_services(title)") \
            .eq("id", order_data.option_id) \
            .single().execute()
        
        if not opt_res.data:
            raise HTTPException(status_code=404, detail="Opción de servicio no válida")

        price = opt_res.data['price']
        description = f"Servicio: {opt_res.data['model_services']['title']}"

        # 3. Create order
        order_payload = {
            "client_id": client_id,
            "model_id": order_data.model_id,
            "service_id": order_data.service_id,
            "option_id": order_data.option_id,
            "amount": price,
            "description": description,
            "payment_method": order_data.payment_method,
            "status": "pending"
        }

        res = db.client.table("orders").insert(order_payload).execute()
        return res.data[0] if res.data else {}
    except Exception as e:
        print(f"[Shop] Error creating order: {e}")
        raise HTTPException(status_code=500, detail=str(e))
