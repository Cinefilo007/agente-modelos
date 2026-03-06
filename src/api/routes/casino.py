from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Optional, Dict
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db
from src.services.casino_engine import casino_engine

router = APIRouter()

class PrizeCreate(BaseModel):
    prize_type: str
    prize_name: str
    prize_value_json: Dict
    probability: float

class BetRequest(BaseModel):
    model_id: str
    game_slug: str
    bet_amount: float

class SettingsUpdate(BaseModel):
    game_slug: str
    spin_price: float

@router.get("/games")
async def get_games():
    """List available casino games."""
    response = db.client.table("casino_games").select("*").eq("is_active", True).execute()
    return response.data

@router.get("/model/{model_id}/prizes")
async def get_model_prizes(model_id: str):
    """Get active prizes for a specific model."""
    response = db.client.table("model_casino_prizes") \
        .select("*") \
        .eq("model_id", model_id) \
        .eq("is_active", True) \
        .execute()
    return response.data

@router.post("/play")
async def play_game(
    bet: BetRequest,
    user: TelegramUser = Depends(get_current_user)
):
    """
    Execute a bet.
    1. Check user balance
    2. Get model prizes
    3. Run RNG
    4. Update balance
    5. Save bet record
    6. Award prize
    """
    if user.role != "client":
        raise HTTPException(status_code=403, detail="Only fans can play")

    # 1. Get Spin Price from Model Settings (Safe Fetch)
    try:
        price_res = db.client.table("model_casino_settings")\
            .select("spin_price")\
            .eq("model_id", str(bet.model_id))\
            .eq("game_slug", bet.game_slug)\
            .maybe_single().execute()
        bet_amount = float(price_res.data['spin_price']) if price_res.data else 10.0
    except Exception as e:
        print(f"Error fetching spin price, using default: {e}")
        bet_amount = 10.0

    # 2. Check user balance
    wallet_res = db.client.table("wallets").select("balance").eq("user_id", user.user_id).maybe_single().execute()
    if not wallet_res.data or float(wallet_res.data['balance']) < bet_amount:
        raise HTTPException(status_code=400, detail="Saldo insuficiente")
    
    current_balance = float(wallet_res.data['balance'])

    # 2. Get Game ID
    game_res = db.client.table("casino_games").select("id").eq("slug", bet.game_slug).single().execute()
    if not game_res.data:
        raise HTTPException(status_code=404, detail="Juego no encontrado")
    game_id = game_res.data['id']

    # 3. Get Model Prizes
    prizes_res = db.client.table("model_casino_prizes").select("*").eq("model_id", bet.model_id).eq("is_active", True).execute()
    won_prize = casino_engine.resolve_bet(prizes_res.data) if prizes_res.data else None

    # 4. Atomic Transactionish (manual flow for now)
    # Deduct bet amount
    new_balance = current_balance - bet_amount
    db.client.table("wallets").update({"balance": new_balance}).eq("user_id", user.user_id).execute()

    outcome = {"won": won_prize is not None}
    payout = 0

    if won_prize:
        outcome["prize_id"] = won_prize['id']
        outcome["prize_name"] = won_prize['prize_name']
        outcome["prize_type"] = won_prize['prize_type']
        
        # Handle specific rewards
        if won_prize['prize_type'] == "credit_bonus":
            bonus = won_prize['prize_value_json'].get('amount', 0)
            payout = bonus
            new_balance += bonus
            db.client.table("wallets").update({"balance": new_balance}).eq("user_id", user.user_id).execute()
        
        elif won_prize['prize_type'] == "unlock_post":
            # Logic to grant access
            pass

    # 5. Save Bet Record
    bet_data = {
        "user_id": user.user_id,
        "model_id": bet.model_id,
        "game_id": game_id,
        "bet_amount": bet_amount,
        "outcome_json": outcome,
        "payout_amount": payout
    }
    db.client.table("casino_bets").insert(bet_data).execute()

    return {
        "won": won_prize is not None,
        "prize": won_prize['prize_name'] if won_prize else None,
        "new_balance": new_balance,
        "outcome": outcome
    }

@router.get("/my-bets")
async def get_my_bets(user: TelegramUser = Depends(get_current_user)):
    """Get betting history for the current user."""
    response = db.client.table("casino_bets") \
        .select("*, casino_games(name), models(username)") \
        .eq("user_id", user.user_id) \
        .order("created_at", desc=True) \
        .limit(20) \
        .execute()
    return response.data

@router.post("/model/prizes")
async def create_prize(
    prize: PrizeCreate,
    user: TelegramUser = Depends(get_current_user)
):
    """Allow models to configure their prizes."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Only models can configure prizes")
    
    data = prize.dict()
    data["model_id"] = user.user_id
    
    # Check total probability doesn't exceed 1.0
    existing = db.client.table("model_casino_prizes").select("probability").eq("model_id", user.user_id).eq("is_active", True).execute()
    total_prob = sum(p['probability'] for p in existing.data) if existing.data else 0
    
    if total_prob + prize.probability > 1.0:
        raise HTTPException(status_code=400, detail="La probabilidad total no puede exceder 1.0 (100%)")

    response = db.client.table("model_casino_prizes").insert(data).execute()
    return response.data[0]
@router.get("/model/{model_id}/settings")
async def get_casino_settings(model_id: UUID):
    """Fetch spin prices for a specific model."""
    try:
        res = db.client.table("model_casino_settings").select("*").eq("model_id", str(model_id)).execute()
        return res.data
    except Exception as e:
        print(f"Table model_casino_settings missing: {e}")
        return []

@router.post("/settings")
async def update_casino_settings(
    settings: SettingsUpdate,
    user: TelegramUser = Depends(get_current_user)
):
    """Allow models to set their own spin prices."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Only models can change settings")
    
    data = {
        "model_id": user.user_id,
        "game_slug": settings.game_slug,
        "spin_price": settings.spin_price
    }

    try:
        res = db.client.table("model_casino_settings").upsert(data, on_conflict="model_id,game_slug").execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        print(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail="Error al guardar configuración. Verifique que la tabla 'model_casino_settings' exista.")

@router.delete("/prizes/{prize_id}")
async def delete_prize(
    prize_id: UUID,
    user: TelegramUser = Depends(get_current_user)
):
    """Allow models to deactivate their prizes."""
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Only models can manage prizes")
    
    # Verify ownership
    existing = db.client.table("model_casino_prizes").select("model_id").eq("id", str(prize_id)).maybe_single().execute()
    if not existing.data or existing.data['model_id'] != user.user_id:
        raise HTTPException(status_code=404, detail="Premio no encontrado o no autorizado")

    response = db.client.table("model_casino_prizes").update({"is_active": False}).eq("id", str(prize_id)).execute()
    return {"status": "success"}
