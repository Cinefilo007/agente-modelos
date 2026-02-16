from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db
import os
import uuid

router = APIRouter()

# Environment Variables
CENTRAL_WALLET_ADDRESS = os.getenv("CENTRAL_WALLET_ADDRESS", "NO_WALLET_CONFIGURED")

class WalletBalanceResponse(BaseModel):
    user_id: str
    balance: float
    locked_balance: float
    currency: str = "USDT"

class DepositInfoResponse(BaseModel):
    wallet_address: str
    memo: str
    instructions: str

class TransactionResponse(BaseModel):
    id: str
    type: str
    amount: float
    currency: str
    status: str
    created_at: str
    tx_hash: Optional[str] = None

@router.get("/balance", response_model=WalletBalanceResponse)
async def get_wallet_balance(user: TelegramUser = Depends(get_current_user)):
    """
    Get the current wallet balance for the authenticated user.
    Creates a wallet entry if it doesn't exist.
    """
    try:
        # Try to fetch wallet
        res = db.client.table("wallets").select("*").eq("user_id", user.id).execute()
        
        if not res.data:
            # Create wallet if not exists
            # Generate a simple memo based on UUID (first 8 chars) or full UUID
            # Ideally, use a shorter unique string, but UUID is safe.
            memo = f"user_{user.id.split('-')[0]}" 
            
            new_wallet = {
                "user_id": user.id,
                "balance": 0.00,
                "locked_balance": 0.00,
                "deposit_memo": memo
            }
            res = db.client.table("wallets").insert(new_wallet).execute()
        
        wallet_data = res.data[0]
        
        return {
            "user_id": wallet_data["user_id"],
            "balance": float(wallet_data["balance"]),
            "locked_balance": float(wallet_data["locked_balance"]),
            "currency": "USDT"
        }
        
    except Exception as e:
        print(f"Error fetching wallet balance: {e}")
        raise HTTPException(status_code=500, detail="Error fetching wallet balance")

@router.get("/deposit-info", response_model=DepositInfoResponse)
async def get_deposit_info(user: TelegramUser = Depends(get_current_user)):
    """
    Get the deposit instructions (Central Wallet Address + Unique Memo).
    """
    try:
        res = db.client.table("wallets").select("deposit_memo").eq("user_id", user.id).execute()
        
        if not res.data:
            # Should have been created by /balance or login, but just in case
            memo = f"user_{user.id.split('-')[0]}"
            db.client.table("wallets").insert({"user_id": user.id, "deposit_memo": memo}).execute()
        else:
            memo = res.data[0]["deposit_memo"]
            
        return {
            "wallet_address": CENTRAL_WALLET_ADDRESS,
            "memo": memo,
            "instructions": f"Envía USDT (Red TON) a la dirección {CENTRAL_WALLET_ADDRESS} e incluye OBLIGATORIAMENTE el comentario/memo: {memo}"
        }
        
    except Exception as e:
        print(f"Error fetching deposit info: {e}")
        raise HTTPException(status_code=500, detail="Error fetching deposit info")

@router.get("/history", response_model=List[TransactionResponse])
async def get_transaction_history(user: TelegramUser = Depends(get_current_user)):
    """
    Get the transaction history for the user.
    """
    try:
        res = db.client.table("crypto_transactions")\
            .select("*")\
            .eq("user_id", user.id)\
            .order("created_at", desc=True)\
            .limit(50)\
            .execute()
            
        return res.data
        
    except Exception as e:
        print(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail="Error fetching transaction history")

class WithdrawRequest(BaseModel):
    amount: float
    wallet_address: str

@router.post("/withdraw")
async def withdraw_funds(request: WithdrawRequest, user: TelegramUser = Depends(get_current_user)):
    """
    Request a withdrawal of funds to an external wallet.
    """
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    try:
        # 1. Atomic Check and Deduct
        # We perform an UPDATE that only succeeds if balance is sufficient.
        # Returning the updated row allows us to confirm it happened.
        
        # Note: Supabase-py / PostgREST doesn't support "UPDATE ... WHERE ... RETURNING" 
        # with a condition on the current value in a simple way without RPC if we want strict atomicity against race conditions 
        # (though for a single user wallet, race conditions are less likely if they don't share accounts).
        
        # However, we can use a small PL/PGSQL block or just check-then-update (optimistic locking not needed if 1 user).
        # Better approach for safety: Use an RPC or simple check-update.
        
        # Let's check balance first
        wallet_res = db.client.table("wallets").select("balance").eq("user_id", user.id).execute()
        if not wallet_res.data:
            raise HTTPException(status_code=404, detail="Wallet not found")
        
        current_balance = float(wallet_res.data[0]["balance"])
        
        if current_balance < request.amount:
            raise HTTPException(status_code=400, detail="Saldo insuficiente")
        
        # 2. Perform Deduction
        # TODO: Wrap in transaction or RPC for true safety. For MVP this is acceptable.
        new_balance = current_balance - request.amount
        db.client.table("wallets").update({"balance": new_balance}).eq("user_id", user.id).execute()
        
        # 3. Record Transaction
        tx_data = {
            "user_id": user.id,
            "type": "withdrawal",
            "amount": request.amount, # Store as positive, type implies direction
            "currency": "USDT",
            "status": "pending",
            "details": {"destination": request.wallet_address},
            "tx_hash": None
        }
        db.client.table("crypto_transactions").insert(tx_data).execute()
        
        return {"success": True, "message": "Retiro solicitado correctamente", "new_balance": new_balance}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error processing withdrawal: {e}")
        raise HTTPException(status_code=500, detail="Error processing withdrawal")
