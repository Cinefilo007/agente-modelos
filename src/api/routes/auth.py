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
from urllib.parse import parse_qsl
import json

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

class WebAppAuthData(BaseModel):
    init_data: str

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

def verify_webapp_data(init_data: str):
    if not BOT_TOKEN:
         raise HTTPException(status_code=500, detail="Server configuration error: TELEGRAM_TOKEN not set")

    try:
        parsed_data = dict(parse_qsl(init_data))
    except ValueError:
         raise HTTPException(status_code=400, detail="Invalid init_data format")
    
    if "hash" not in parsed_data:
        raise HTTPException(status_code=400, detail="Missing hash in init_data")

    hash_received = parsed_data.pop("hash")
    
    # Sort keys alphabetically
    data_check_arr = []
    for k in sorted(parsed_data.keys()):
        # Values in init_data are strings, no encoding needed for value part in check string
        data_check_arr.append(f"{k}={parsed_data[k]}")
    
    data_check_string = "\n".join(data_check_arr)
    
    # HMAC-SHA256 signature
    secret_key = hmac.new("WebAppData".encode(), BOT_TOKEN.encode(), hashlib.sha256).digest()
    hash_check = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    
    if hash_check != hash_received:
        raise HTTPException(status_code=403, detail="Invalid WebApp hash")
        
    # Check auth_date
    if "auth_date" in parsed_data:
        if time.time() - int(parsed_data["auth_date"]) > 86400:
             raise HTTPException(status_code=400, detail="WebApp auth data is outdated")
    
    return json.loads(parsed_data["user"])

async def process_login(telegram_id: int, username: str = None, photo_url: str = None):
    """
    Shared logic for login processing
    """
    user_role = "unknown"
    user_data = None
    
    # 1. Models
    try:
        model_res = db.client.table("models").select("*").eq("telegram_id", telegram_id).maybe_single().execute()
        if model_res is not None and hasattr(model_res, 'data') and model_res.data:
            user_role = "model"
            user_data = model_res.data
            if user_data.get('status') == 'rejected':
                 raise HTTPException(status_code=403, detail="Tu cuenta de modelo ha sido rechazada.")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Backend Auth] Error checking models for {telegram_id}: {str(e)}")

    # 2. Clients
    if not user_data:
        try:
            client_res = db.client.table("clients").select("*").eq("telegram_id", telegram_id).maybe_single().execute()
            if client_res is not None and hasattr(client_res, 'data') and client_res.data:
                user_role = "client"
                user_data = client_res.data
                if user_data.get('is_blacklisted'):
                    raise HTTPException(status_code=403, detail="Acceso denegado por políticas de la comunidad.")
            else:
                user_role = "client"
                new_client = {
                    "telegram_id": telegram_id,
                    "username": username,
                    "avatar_url": photo_url,
                    "terms_accepted": False
                }
                try:
                    res = db.client.table("clients").insert(new_client).execute()
                    if res is not None and hasattr(res, 'data') and res.data and len(res.data) > 0:
                        user_data = res.data[0]
                    else:
                        print(f"[Backend Auth] Insertion failed or returned no data for {telegram_id}. Response: {res}")
                        # Last ditch effort: try to select again in case it was created but returning nothing
                        retry_res = db.client.table("clients").select("*").eq("telegram_id", telegram_id).maybe_single().execute()
                        if retry_res and retry_res.data:
                            user_data = retry_res.data
                        else:
                            raise HTTPException(status_code=500, detail="Error crítico al crear el usuario. Intenta de nuevo.")
                except HTTPException:
                    raise
                except Exception as e:
                     print(f"[Backend Auth] Database Error during insert for {telegram_id}: {str(e)}")
                     raise HTTPException(status_code=500, detail="Error de base de datos al registrar usuario.")
        except HTTPException:
            raise
        except Exception as e:
             print(f"[Backend Auth] Database Error checking clients for {telegram_id}: {str(e)}")
             raise HTTPException(status_code=500, detail="Error al buscar perfil en la base de datos.")

    # Age check
    birth_date_str = user_data.get('birth_date')
    if birth_date_str:
        try:
            birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d").date()
            today = date.today()
            age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            if age < 18:
                raise HTTPException(status_code=403, detail="Debes ser mayor de edad para ingresar.")
        except:
            pass

    # Update login
    try:
        table = "models" if user_role == "model" else "clients"
        db.client.table(table).update({"last_login_at": datetime.now().isoformat()}).eq("id", user_data['id']).execute()
    except:
        pass

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

@router.post("/telegram")
async def telegram_login(auth_data: TelegramAuthData):
    """
    Widget Login
    """
    verify_telegram_data(auth_data)
    return await process_login(auth_data.id, auth_data.username, auth_data.photo_url)

@router.post("/webapp")
async def webapp_login(data: WebAppAuthData):
    """
    WebApp Auto-Login
    """
    user_info = verify_webapp_data(data.init_data)
    # telegram_id is int in user_info
    return await process_login(user_info['id'], user_info.get('username'), user_info.get('photo_url'))
