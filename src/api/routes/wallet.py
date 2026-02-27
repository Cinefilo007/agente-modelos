import logging
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db
import os
import requests

logger = logging.getLogger(__name__)

# For sending notifications to admin
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
ADMIN_ID = 1123020118 # Based on src/handlers/admin.py

# Import bot_app for scheduling jobs
# Using import inside function to avoid circular dependencies if any
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
    details: Optional[dict] = None

def _get_user_display_name(db_client, user_id: str) -> str:
    try:
        res = db_client.table("models").select("full_name, artistic_name, username").eq("id", user_id).maybe_single().execute()
        data = res.data if res and hasattr(res, 'data') else None
        if not data:
            return "Usuario Anónimo"
        return data.get('artistic_name') or data.get('full_name') or data.get('username') or "Usuario Anónimo"
    except Exception as e:
        logger.error(f"[Wallet] Error getting name for {user_id}: {e}")
        return "Usuario"

@router.get("/balance", response_model=WalletBalanceResponse)
async def get_wallet_balance(user: TelegramUser = Depends(get_current_user)):
    """
    Get the current wallet balance for the authenticated user.
    Creates a wallet entry if it doesn't exist.
    """
    try:
        # Try to fetch wallet
        res = db.client.table("wallets").select("*").eq("user_id", user.user_id).execute()
        
        if not res.data:
            # Create wallet if not exists
            # Generate a simple memo based on UUID (first 8 chars)
            memo = f"user_{user.user_id.split('-')[0]}" 
            
            new_wallet = {
                "user_id": user.user_id,
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
        raise HTTPException(status_code=500, detail=f"Debug Error: {str(e)}")

@router.get("/deposit-info", response_model=DepositInfoResponse)
async def get_deposit_info(user: TelegramUser = Depends(get_current_user)):
    """
    Get the deposit instructions (Central Wallet Address + Unique Memo).
    """
    try:
        res = db.client.table("wallets").select("deposit_memo").eq("user_id", user.user_id).execute()
        
        if not res.data:
            # Should have been created by /balance or login, but just in case
            memo = f"user_{user.user_id.split('-')[0]}"
            db.client.table("wallets").insert({"user_id": user.user_id, "deposit_memo": memo}).execute()
        else:
            memo = res.data[0]["deposit_memo"]
            
        return {
            "wallet_address": CENTRAL_WALLET_ADDRESS,
            "memo": memo,
            "instructions": f"Envía USDT (Red TON) a la dirección {CENTRAL_WALLET_ADDRESS} e incluye OBLIGATORIAMENTE el comentario/memo: {memo}"
        }
        
    except Exception as e:
        print(f"Error fetching deposit info: {e}")
        raise HTTPException(status_code=500, detail=f"Debug Error: {str(e)}")

@router.get("/history")
async def get_transaction_history(
    page: int = 1,
    limit: int = 20,
    user: TelegramUser = Depends(get_current_user)
):
    """
    Get the paginated transaction history for the user.
    """
    try:
        # Get count
        count_res = db.client.table("crypto_transactions").select("id", count="exact").eq("user_id", user.user_id).execute()
        total_count = count_res.count if count_res and hasattr(count_res, 'count') and count_res.count is not None else 0
        
        offset = (page - 1) * limit
        
        res = db.client.table("crypto_transactions")\
            .select("*")\
            .eq("user_id", user.user_id)\
            .order("created_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
            
        total_pages = (total_count + limit - 1) // limit if total_count > 0 else 0
        
        return {
            "transactions": res.data if res and hasattr(res, 'data') else [],
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": total_pages
        }
        
    except Exception as e:
        print(f"Error fetching history: {e}")
        raise HTTPException(status_code=500, detail=f"Debug Error: {str(e)}")

class TipRequest(BaseModel):
    model_id: str
    amount: float = 0.05 # Lowered from 0.25 for testing
    post_id: Optional[str] = None

@router.post("/tip")
async def send_tip(request: TipRequest, user: TelegramUser = Depends(get_current_user)):
    """
    Send a fast tip ($0.25) to a model.
    """
    try:
        # 1. Check balance
        wallet_res = db.client.table("wallets").select("balance").eq("user_id", user.user_id).execute()
        if not wallet_res.data:
            raise HTTPException(status_code=404, detail="Wallet not found")
        
        balance = float(wallet_res.data[0]["balance"])
        if balance < request.amount:
            raise HTTPException(status_code=400, detail="Saldo insuficiente")
        
        # 2. Transfer funds (Atomic-ish)
        # Deduct from client
        db.client.table("wallets").update({"balance": balance - request.amount}).eq("user_id", user.user_id).execute()
        
        # Add to model
        model_wallet = db.client.table("wallets").select("balance").eq("user_id", request.model_id).execute()
        if not model_wallet.data:
            # Create wallet for model if it doesn't exist
            memo = f"user_{request.model_id.split('-')[0]}"
            db.client.table("wallets").insert({
                "user_id": request.model_id,
                "balance": request.amount,
                "locked_balance": 0.0,
                "deposit_memo": memo
            }).execute()
        else:
            new_model_balance = float(model_wallet.data[0]["balance"]) + request.amount
            db.client.table("wallets").update({"balance": new_model_balance}).eq("user_id", request.model_id).execute()
        
        # 3. Record Transactions (Client and Model)
        sender_name = _get_user_display_name(db.client, user.user_id)
        receiver_name = _get_user_display_name(db.client, request.model_id)
        
        # For the client (Debit/Sent)
        db.client.table("crypto_transactions").insert({
            "user_id": user.user_id,
            "type": "TIP",
            "amount": request.amount,
            "currency": "USDT",
            "status": "COMPLETED",
            "reference_id": request.post_id,
            "details": {"to_model": request.model_id, "to_name": receiver_name, "post_id": request.post_id}
        }).execute()

        # For the model (Credit/Received)
        db.client.table("crypto_transactions").insert({
            "user_id": request.model_id,
            "type": "TIP",
            "amount": request.amount,
            "currency": "USDT",
            "status": "COMPLETED",
            "reference_id": request.post_id,
            "details": {"from_user": user.user_id, "from_name": sender_name, "post_id": request.post_id}
        }).execute()
        
        # Note: The trigger 'trg_update_client_spending' will automatically 
        # update 'total_spent' in 'clients' table for the elite status.

        # 4. Create or update grouped notification
        try:
            # Don't notify if the model is tipping themselves (though unlikely)
            if str(request.model_id) != str(user.user_id):
                # Search for recent unread tip notification for this post from same actor
                # We look at any unread tip notification from this actor to this model for this post
                notif_res = db.service_client.table("notifications") \
                    .select("*") \
                    .eq("user_id", request.model_id) \
                    .eq("actor_id", user.user_id) \
                    .eq("type", "tip") \
                    .eq("target_id", request.post_id) \
                    .eq("is_read", False) \
                    .order("created_at", desc=True) \
                    .limit(1) \
                    .execute()
                
                if notif_res.data:
                    notif = notif_res.data[0]
                    # Update count
                    try:
                        current_count = int(notif.get('content') or 1)
                    except:
                        current_count = 1
                    
                    db.service_client.table("notifications") \
                        .update({
                            "content": str(current_count + 1),
                            "created_at": datetime.now().isoformat()
                        }) \
                        .eq("id", notif['id']) \
                        .execute()
                else:
                    # New notification
                    db.service_client.table("notifications").insert({
                        "user_id": request.model_id,
                        "actor_id": user.user_id,
                        "type": "tip",
                        "target_id": request.post_id,
                        "content": "1"
                    }).execute()
        except Exception as notif_err:
            logger.error(f"[Notifications] Error in tip notif: {notif_err}")

        return {"success": True, "new_balance": balance - request.amount}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error sending tip: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class GiftPurchaseRequest(BaseModel):
    gift_id: str
    model_id: str
    post_id: Optional[str] = None

@router.post("/gift/purchase")
async def purchase_gift(request: GiftPurchaseRequest, user: TelegramUser = Depends(get_current_user)):
    """
    Purchase a dynamic gift for a model.
    """
    try:
        # 1. Get Gift details
        # Using request.gift_id instead of request.id
        gift_res = db.client.table("gifts").select("*").eq("id", request.gift_id).maybe_single().execute()
        if not gift_res.data:
            raise HTTPException(status_code=404, detail="Regalo no encontrado")
        
        gift = gift_res.data
        amount = float(gift["price"])

        # 2. Check balance
        wallet_res = db.client.table("wallets").select("balance").eq("user_id", user.user_id).execute()
        balance = float(wallet_res.data[0]["balance"])
        
        if balance < amount:
            raise HTTPException(status_code=400, detail="Saldo insuficiente")

        # 3. Transfer
        db.client.table("wallets").update({"balance": balance - amount}).eq("user_id", user.user_id).execute()
        
        model_wallet = db.client.table("wallets").select("balance").eq("user_id", request.model_id).execute()
        if not model_wallet.data:
            # Create wallet for model if it doesn't exist
            memo = f"user_{request.model_id.split('-')[0]}"
            db.client.table("wallets").insert({
                "user_id": request.model_id,
                "balance": amount,
                "locked_balance": 0.0,
                "deposit_memo": memo
            }).execute()
        else:
            new_model_balance = float(model_wallet.data[0]["balance"]) + amount
            db.client.table("wallets").update({"balance": new_model_balance}).eq("user_id", request.model_id).execute()

        # 4. Record
        sender_name = _get_user_display_name(db.client, user.user_id)
        receiver_name = _get_user_display_name(db.client, request.model_id)

        # Record for client (Sent)
        db.client.table("crypto_transactions").insert({
            "user_id": user.user_id,
            "type": "GIFT",
            "amount": amount,
            "currency": "USDT",
            "status": "COMPLETED",
            "reference_id": request.post_id,
            "details": {"gift_name": gift["name"], "to_model": request.model_id, "to_name": receiver_name}
        }).execute()

        # Record for model (Received)
        db.client.table("crypto_transactions").insert({
            "user_id": request.model_id,
            "type": "GIFT",
            "amount": amount,
            "currency": "USDT",
            "status": "COMPLETED",
            "reference_id": request.post_id,
            "details": {"gift_name": gift["name"], "from_user": user.user_id, "from_name": sender_name}
        }).execute()

        # 5. Create notification
        try:
            if str(request.model_id) != str(user.user_id):
                db.service_client.table("notifications").insert({
                    "user_id": request.model_id,
                    "actor_id": user.user_id,
                    "type": "gift",
                    "target_id": request.post_id,
                    "content": gift["name"]
                }).execute()
        except Exception as notif_err:
            logger.error(f"[Notifications] Error in gift notif: {notif_err}")

        return {"success": True, "new_balance": balance - amount}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error purchasing gift: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        wallet_res = db.client.table("wallets").select("balance").eq("user_id", user.user_id).execute()
        if not wallet_res.data:
            raise HTTPException(status_code=404, detail="Wallet not found")
        
        current_balance = float(wallet_res.data[0]["balance"])
        
        if current_balance < request.amount:
            raise HTTPException(status_code=400, detail="Saldo insuficiente")
        
        # 2. Perform Deduction
        # TODO: Wrap in transaction or RPC for true safety. For MVP this is acceptable.
        new_balance = current_balance - request.amount
        db.client.table("wallets").update({"balance": new_balance}).eq("user_id", user.user_id).execute()
        
        # 3. Record Transaction
        tx_data = {
            "user_id": user.user_id,
            "type": "withdrawal",
            "amount": request.amount, # Store as positive, type implies direction
            "currency": "USDT",
            "status": "pending",
            "details": {"destination": request.wallet_address},
            "tx_hash": None
        }
        db.client.table("crypto_transactions").insert(tx_data).execute()
        # 4. Notify Admin via Telegram
        try:
            # We'll use a direct HTTP request to avoid dependency loops or thread issues
            # In a more complex app, we'd use a shared event bus.
            msg = (
                f"💰 *Nueva Solicitud de Retiro*\n\n"
                f"👤 *Usuario:* {user.username or user.user_id}\n"
                f"💵 *Monto:* {request.amount} USDT\n"
                f"🏦 *Wallet Destino:* `{request.wallet_address}`\n\n"
                f"⏳ *Auto-liquida en:* 2 minutos."
            )
            
            # Key: We encode the tx_id in the callback data
            # Format: 'payout_approve|tx_uuid'
            # (Note: We need the UUID from the inserted tx)
            inserted_tx = db.client.table("crypto_transactions").select("id").eq("user_id", user.user_id).order("created_at", desc=True).limit(1).execute()
            tx_id = inserted_tx.data[0]["id"]

            inline_kb = {
                "inline_keyboard": [
                    [
                        {"text": "✅ Liquidar Ya", "callback_data": f"payout_approve|{tx_id}"},
                        {"text": "❌ Rechazar", "callback_data": f"payout_reject|{tx_id}"}
                    ]
                ]
            }

            requests.post(
                f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
                json={
                    "chat_id": ADMIN_ID,
                    "text": msg,
                    "parse_mode": "Markdown",
                    "reply_markup": inline_kb
                }
            )
            
            # 5. Schedule Auto-Payout (2 minutes delay)
            try:
                from src.bot import bot_app
                if bot_app and bot_app.job_queue:
                    from src.handlers.payout_jobs import process_auto_payout
                    bot_app.job_queue.run_once(
                        process_auto_payout, 
                        when=120, # 2 minutes
                        data={"tx_id": tx_id},
                        name=f"payout_{tx_id}"
                    )
                    print(f"Auto-payout job scheduled for TX {tx_id}")
            except Exception as job_err:
                print(f"Error scheduling job: {job_err}")

        except Exception as notify_err:
            print(f"Error notifying admin: {notify_err}")

        return {"success": True, "message": "Retiro solicitado. Se procesará automáticamente en 2 min si no hay rechazo manual.", "new_balance": new_balance}

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error processing withdrawal: {e}")
        raise HTTPException(status_code=500, detail=f"Debug Error: {str(e)}")
