from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from src.api.dependencies import get_current_user, TelegramUser
from src.services.database import db
from src.services.ai_editor import ai_editor
from src.services.storage import upload_file
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Configuración de costos
COSTO_RETOQUE = 1.0  # 1 USDT (o Crédito)
COSTO_FONDO = 2.0    # 2 USDT (o Crédito)

@router.post("/touch-up")
async def ai_touch_up(
    image: UploadFile = File(...),
    user: TelegramUser = Depends(get_current_user)
):
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Solo las modelos pueden usar esta herramienta")

    # 1. Verificar balance
    wallet_res = db.client.table("wallets").select("balance").eq("user_id", user.user_id).single().execute()
    if not wallet_res.data:
        raise HTTPException(status_code=404, detail="Billetera no encontrada")
    
    balance = float(wallet_res.data["balance"])
    if balance < COSTO_RETOQUE:
        raise HTTPException(status_code=400, detail="Saldo insuficiente para el retoque")

    # 2. Subir imagen original temporalmente para FAL
    temp_url = await upload_file(image, bucket_name="temp_ai")

    try:
        # 3. Llamar al servicio de retoque
        processed_url = await ai_editor.retouch_image(temp_url)
        
        if not processed_url:
            raise HTTPException(status_code=500, detail="Error al procesar la imagen con IA")

        # 4. Descontar créditos
        db.client.table("wallets").update({"balance": balance - COSTO_RETOQUE}).eq("user_id", user.user_id).execute()
        
        # 5. Registrar transacción
        db.client.table("crypto_transactions").insert({
            "user_id": user.user_id,
            "type": "AI_EDIT",
            "amount": COSTO_RETOQUE,
            "currency": "USDT",
            "status": "COMPLETED",
            "details": {"action": "touch_up", "original": temp_url}
        }).execute()

        return {"processed_url": processed_url, "new_balance": balance - COSTO_RETOQUE}

    except Exception as e:
        logger.error(f"Error in AI Touch Up: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/change-background")
async def ai_change_background(
    background_prompt: str = Form(...),
    image: UploadFile = File(...),
    user: TelegramUser = Depends(get_current_user)
):
    if user.role != "model":
        raise HTTPException(status_code=403, detail="Solo las modelos pueden usar esta herramienta")

    # 1. Verificar balance
    wallet_res = db.client.table("wallets").select("balance").eq("user_id", user.user_id).single().execute()
    balance = float(wallet_res.data["balance"])
    
    if balance < COSTO_FONDO:
        raise HTTPException(status_code=400, detail="Saldo insuficiente para cambiar el fondo")

    # 2. Subir imagen original
    temp_url = await upload_file(image, bucket_name="temp_ai")

    try:
        # 3. Llamar al servicio de cambio de fondo
        processed_url = await ai_editor.change_background(temp_url, background_prompt)
        
        if not processed_url:
            raise HTTPException(status_code=500, detail="Error al procesar el fondo con IA")

        # 4. Descontar créditos
        db.client.table("wallets").update({"balance": balance - COSTO_FONDO}).eq("user_id", user.user_id).execute()
        
        # 5. Registrar transacción
        db.client.table("crypto_transactions").insert({
            "user_id": user.user_id,
            "type": "AI_EDIT",
            "amount": COSTO_FONDO,
            "currency": "USDT",
            "status": "COMPLETED",
            "details": {"action": "change_background", "prompt": background_prompt, "original": temp_url}
        }).execute()

        return {"processed_url": processed_url, "new_balance": balance - COSTO_FONDO}

    except Exception as e:
        logger.error(f"Error in AI Change Background: {e}")
        raise HTTPException(status_code=500, detail=str(e))
