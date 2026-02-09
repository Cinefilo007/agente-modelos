from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from src.services.database import db

router = APIRouter()

# --- Schemas ---
class ClientCreate(BaseModel):
    telegram_id: int
    username: str
    country_code: Optional[str] = None

class WalletTopUp(BaseModel):
    client_id: str
    amount: float

class OrderCreate(BaseModel):
    client_id: str
    model_id: str
    amount: float
    description: str

class DisputeCreate(BaseModel):
    order_id: str
    evidence: str

# --- Routes ---

# CLIENT PROFILE
@router.get("/{telegram_id}")
async def get_client_profile(telegram_id: int):
    """Obtiene el perfil del cliente por ID de Telegram."""
    client = db.get_client(telegram_id)
    if not client:
        # Create on the fly (mock auth flow)
        client = db.create_client_user(telegram_id, f"User_{telegram_id}")
    
    # Get Reviews
    reviews = db.get_client_reviews(client['id'])
    client['reviews'] = reviews
    return client

@router.post("/topup")
async def topup_wallet(item: WalletTopUp):
    """Recarga la wallet simulada."""
    result = db.update_client_wallet(item.client_id, item.amount)
    if not result:
        raise HTTPException(status_code=500, detail="Error updating wallet")
    return {"status": "success", "new_balance": result}

# ORDERS (P2P)
@router.post("/orders")
async def create_order(item: OrderCreate):
    """Crea una nueva orden P2P."""
    order = db.create_order(item.client_id, item.model_id, item.amount, item.description)
    if not order:
         raise HTTPException(status_code=500, detail="Error creating order")
    return order

@router.get("/{client_id}/orders")
async def get_my_orders(client_id: str):
    """Obtiene las órdenes del cliente."""
    return db.get_user_orders(client_id, role="client")

@router.post("/orders/{order_id}/confirm")
async def confirm_delivery(order_id: str):
    """Cliente confirma la entrega, libera fondos."""
    result = db.update_order_status(order_id, "released")
    if not result:
        raise HTTPException(status_code=500, detail="Error confirming order")
    return {"status": "success", "state": "released"}

@router.post("/orders/dispute")
async def create_dispute(item: DisputeCreate):
    """Cliente inicia disputa."""
    dispute = db.create_dispute(item.order_id, item.evidence)
    if not dispute:
        raise HTTPException(status_code=500, detail="Error creating dispute")
    return dispute
