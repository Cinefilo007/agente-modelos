from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
import hashlib
import hmac
import time
from datetime import date, datetime
from jose import jwt
from src.services.database import db

router = APIRouter()

BOT_TOKEN = os.getenv("TELEGRAM_TOKEN")
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-me")
ALGORITHM = "HS256"

class TelegramAuthData(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str

def verify_telegram_data(data: TelegramAuthData):
    if not BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Server configuration error: TELEGRAM_TOKEN not set")
    
    # Check auth_date for freshness (e.g. within 24 hours)
    # Note: Telegram auth_date is unix timestamp
    if time.time() - data.auth_date > 86400:
        raise HTTPException(status_code=400, detail="Auth data is outdated")

    data_check_arr = []
    # Convert pydantic model to dict, exclude hash, sort keys
    d = data.dict(exclude={'hash'}, exclude_none=True)
    for k in sorted(d.keys()):
        data_check_arr.append(f"{k}={d[k]}")
    
    data_check_string = "\n".join(data_check_arr)
    
    secret_key = hashlib.sha256(BOT_TOKEN.encode()).digest()
    hash_check = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    
    if hash_check != data.hash:
        raise HTTPException(status_code=403, detail="Invalid Telegram hash")
    return True

@router.post("/telegram")
async def telegram_login(auth_data: TelegramAuthData):
    """
    Verifica los datos de login de Telegram y devuelve un JWT.
    También verifica si el usuario es menor de edad o está en la lista negra.
    """
    verify_telegram_data(auth_data)
    
    telegram_id = auth_data.id
    
    user_role = "unknown"
    user_data = None
    
    # 1. Buscar en Models
    try:
        model = db.client.table("models").select("*").eq("telegram_id", telegram_id).maybe_single().execute()
        if model.data:
            user_role = "model"
            user_data = model.data
            if user_data.get('status') == 'rejected':
                 raise HTTPException(status_code=403, detail="Tu cuenta de modelo ha sido rechazada.")
    except Exception as e:
        print(f"Error checking models: {e}")

    # 2. Si no es modelo, buscar en Clients
    if not user_data:
        try:
            client = db.client.table("clients").select("*").eq("telegram_id", telegram_id).maybe_single().execute()
            if client.data:
                user_role = "client"
                user_data = client.data
                if user_data.get('is_blacklisted'):
                    raise HTTPException(status_code=403, detail="Acceso denegado por políticas de la comunidad.")
            else:
                # 3. Usuario Nuevo -> Crear Cliente
                user_role = "client"
                new_client = {
                    "telegram_id": telegram_id,
                    "username": auth_data.username,
                    # "name": auth_data.first_name, # Schema might not have name, just username
                    "avatar_url": auth_data.photo_url
                }
                # Intentar insertar. Si falla por falta de columnas (migration not ran), log error.
                try:
                    res = db.client.table("clients").insert(new_client).execute()
                    if res.data:
                        user_data = res.data[0]
                    else:
                        raise HTTPException(status_code=500, detail="Error creating user")
                except Exception as e:
                     raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
        except Exception as e:
             raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")

    # 4. Verificación de Edad (Si existe birth_date)
    birth_date_str = user_data.get('birth_date')
    if birth_date_str:
        try:
            birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d").date()
            today = date.today()
            age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            if age < 18:
                raise HTTPException(status_code=403, detail="Debes ser mayor de edad para ingresar.")
        except ValueError:
            pass # Invalid date format in DB, skip check or enforce? Skip for now.
    
    # 5. Actualizar last_login_at (Si existe la columna)
    try:
        table = "models" if user_role == "model" else "clients"
        db.client.table(table).update({"last_login_at": datetime.now().isoformat()}).eq("id", user_data['id']).execute()
    except:
        pass # Ignore if column doesn't exist yet

    # 6. Crear Session Token
    token_data = {
        "sub": str(telegram_id),
        "role": user_role,
        "user_id": user_data['id'],
        "username": user_data.get('username'),
        "iat": datetime.utcnow()
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm=ALGORITHM)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_data,
        "role": user_role
    }
