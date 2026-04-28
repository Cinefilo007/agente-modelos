from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
import hashlib
import hmac
import time
from datetime import date, datetime
from jose import jwt, jwk
from jose.utils import base64url_decode
from src.services.database import db
from urllib.parse import parse_qsl
import json
import httpx
from telegram import Bot

router = APIRouter()

CREATOR_BOT_TOKEN = os.getenv("TELEGRAM_CREATOR_TOKEN")  # Creator Bot
CLIENT_BOT_TOKEN = os.getenv("TELEGRAM_CLIENT_TOKEN")  # Fan Bot
JWT_SECRET = os.getenv("JWT_SECRET")

if not JWT_SECRET:
    raise RuntimeError("CRITICAL ERROR: JWT_SECRET not set in environment.")
ALGORITHM = "HS256"

# IDs numéricos de los bots
CREATOR_BOT_ID = CREATOR_BOT_TOKEN.split(":")[0] if CREATOR_BOT_TOKEN and ":" in CREATOR_BOT_TOKEN else None
CLIENT_BOT_ID = CLIENT_BOT_TOKEN.split(":")[0] if CLIENT_BOT_TOKEN and ":" in CLIENT_BOT_TOKEN else None

ADMIN_TELEGRAM_ID = os.getenv("ADMIN_TELEGRAM_ID")

# --- Cache para JWKS de Telegram ---
_telegram_jwks_cache = {"keys": None, "fetched_at": 0}
JWKS_CACHE_TTL = 3600  # 1 hora

async def get_telegram_jwks():
    """Descarga y cachea las claves públicas de Telegram."""
    now = time.time()
    if _telegram_jwks_cache["keys"] and (now - _telegram_jwks_cache["fetched_at"]) < JWKS_CACHE_TTL:
        return _telegram_jwks_cache["keys"]
    
    async with httpx.AsyncClient() as client:
        resp = await client.get("https://oauth.telegram.org/.well-known/jwks.json", timeout=10)
        resp.raise_for_status()
        jwks_data = resp.json()
        _telegram_jwks_cache["keys"] = jwks_data.get("keys", [])
        _telegram_jwks_cache["fetched_at"] = now
        return _telegram_jwks_cache["keys"]

class TelegramAuthData(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str

class TelegramOIDCData(BaseModel):
    id_token: str

class WebAppAuthData(BaseModel):
    init_data: str

def verify_telegram_data(data: TelegramAuthData) -> str:
    """ Verifica el hash contra ambos bots. Retorna 'client' o 'model' """
    if not CREATOR_BOT_TOKEN:
        raise HTTPException(status_code=500, detail="Server configuration error: TELEGRAM_CREATOR_TOKEN not set")
    
    if time.time() - data.auth_date > 86400:
        raise HTTPException(status_code=400, detail="Auth data is outdated")

    data_check_arr = []
    d = data.dict(exclude={'hash'}, exclude_none=True)
    for k in sorted(d.keys()):
        data_check_arr.append(f"{k}={d[k]}")
    data_check_string = "\n".join(data_check_arr)
    
    # 1. Intentar validar como CLIENTE (Fan Bot)
    if CLIENT_BOT_TOKEN:
        secret_key_client = hashlib.sha256(CLIENT_BOT_TOKEN.encode()).digest()
        hash_check_client = hmac.new(secret_key_client, data_check_string.encode(), hashlib.sha256).hexdigest()
        if hash_check_client == data.hash:
            return "client"
            
    # 2. Intentar validar como CREADORA (Creator Bot)
    secret_key = hashlib.sha256(CREATOR_BOT_TOKEN.encode()).digest()
    hash_check = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if hash_check == data.hash:
        return "model"
    
    raise HTTPException(status_code=403, detail="Invalid Telegram hash")

def verify_webapp_data(init_data: str) -> tuple[dict, str]:
    """ Returns (user_info, role) """
    if not CREATOR_BOT_TOKEN:
         raise HTTPException(status_code=500, detail="Server configuration error: TELEGRAM_CREATOR_TOKEN not set")

    try:
        parsed_data = dict(parse_qsl(init_data))
    except ValueError:
         raise HTTPException(status_code=400, detail="Invalid init_data format")
    
    if "hash" not in parsed_data:
        raise HTTPException(status_code=400, detail="Missing hash in init_data")

    hash_received = parsed_data.pop("hash")
    
    data_check_arr = []
    for k in sorted(parsed_data.keys()):
        data_check_arr.append(f"{k}={parsed_data[k]}")
    data_check_string = "\n".join(data_check_arr)
    
    # Try Client Bot
    role = None
    if CLIENT_BOT_TOKEN:
        secret_key_client = hmac.new("WebAppData".encode(), CLIENT_BOT_TOKEN.encode(), hashlib.sha256).digest()
        if hmac.new(secret_key_client, data_check_string.encode(), hashlib.sha256).hexdigest() == hash_received:
            role = "client"
            
    # Try Creator Bot
    if not role:
        secret_key = hmac.new("WebAppData".encode(), CREATOR_BOT_TOKEN.encode(), hashlib.sha256).digest()
        if hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest() == hash_received:
            role = "model"

    if not role:
        raise HTTPException(status_code=403, detail="Invalid WebApp hash")
        
    if "auth_date" in parsed_data and time.time() - int(parsed_data["auth_date"]) > 86400:
         raise HTTPException(status_code=400, detail="WebApp auth data is outdated")
    
    return json.loads(parsed_data["user"]), role

async def process_login(telegram_id: int, username: str = None, photo_url: str = None, explicit_role: str = None):
    """
    Shared logic for login processing. Explicit role strictly defines where to look/insert.
    """
    user_role = explicit_role or "unknown"
    user_data = None
    
    # 1. Models (Only if explicitly intended or unknown)
    if user_role in ("model", "unknown"):
        try:
            model_res = db.client.table("models").select("*").eq("telegram_id", telegram_id).maybe_single().execute()
            if model_res is not None and hasattr(model_res, 'data') and model_res.data:
                model_data = model_res.data
                if model_data.get('status') == 'rejected':
                     raise HTTPException(status_code=403, detail="Tu cuenta de modelo ha sido rechazada.")
                
                # Permitimos el login incluso si no está verificada para que el frontend pueda
                # manejar la redirección al onboarding o mostrar el modal de bloqueo.
                user_role = "model"
                user_data = model_data
        except HTTPException:
            raise
        except Exception as e:
            print(f"[Backend Auth] Error checking models for {telegram_id}: {str(e)}")

    # 2. Clients (Only if explicitly intended or unknown/fallback)
    if not user_data and user_role in ("client", "unknown"):
        try:
            client_res = db.client.table("clients").select("*").eq("telegram_id", telegram_id).maybe_single().execute()
            if client_res is not None and hasattr(client_res, 'data') and client_res.data:
                user_role = "client"
                user_data = client_res.data
                if user_data.get('is_blacklisted'):
                    raise HTTPException(status_code=403, detail="Acceso denegado por políticas de la comunidad.")
            elif user_role == "client":
                # Create NEW client specifically because they entered via Client Bot
                user_role = "client"
                new_client = {
                    "telegram_id": telegram_id,
                    "username": username,
                    "avatar_url": photo_url,
                    "terms_accepted": False,
                    "global_reputation": 0
                }
                try:
                    res = db.client.table("clients").insert(new_client).execute()
                    if res is not None and hasattr(res, 'data') and res.data and len(res.data) > 0:
                        user_data = res.data[0]
                        # Notify Admin of NEW Fan
                        notify_token = CLIENT_BOT_TOKEN if CLIENT_BOT_TOKEN else CREATOR_BOT_TOKEN
                        if notify_token and ADMIN_TELEGRAM_ID:
                            try:
                                bot = Bot(token=notify_token)
                                bot_name = "Bot de Fans" if notify_token == CLIENT_BOT_TOKEN else "Agente Nebula"
                                msg = (
                                    f"🎯 <b>Nuevo Fan Entrando a Onboarding</b>\n"
                                    f"<i>Notificado via: {bot_name}</i>\n\n"
                                    f"👤 <b>Usuario:</b> @{username or 'Sin username'}\n"
                                    f"🆔 <b>ID Telegram:</b> <code>{telegram_id}</code>\n"
                                    f"📅 <b>Fecha:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                                )
                                await bot.send_message(chat_id=ADMIN_TELEGRAM_ID, text=msg, parse_mode="HTML")
                                print(f"[Auth] Admin notified of new fan via {bot_name}: {telegram_id}")
                            except Exception as notify_err:
                                print(f"[Auth] Notification failed: {notify_err}")
                    else:
                        retry_res = db.client.table("clients").select("*").eq("telegram_id", telegram_id).maybe_single().execute()
                        if retry_res and retry_res.data:
                            user_data = retry_res.data
                        else:
                            raise HTTPException(status_code=500, detail="Error al crear el perfil de usuario.")
                except HTTPException:
                    raise
                except Exception as e:
                     raise HTTPException(status_code=500, detail="Fallo en el registro del usuario.")
        except HTTPException:
            raise
        except Exception as e:
             raise HTTPException(status_code=500, detail="Error de comunicación con la base de datos.")

    if not user_data:
        if user_role == "model":
            # Si intentó entrar por el bot de Modelos y NO tiene registro, CREAMOS uno como 'prospect'
            try:
                new_model = {
                    "telegram_id": telegram_id,
                    "username": username or f"user_{telegram_id}",
                    "full_name": username or f"User {telegram_id}",
                    "status": "prospect"
                }
                res = db.client.table("models").insert(new_model).execute()
                if res is not None and hasattr(res, 'data') and res.data and len(res.data) > 0:
                    user_data = res.data[0]
                    # Notify Admin of NEW Prospect Model
                    if CREATOR_BOT_TOKEN and ADMIN_TELEGRAM_ID:
                        try:
                            bot = Bot(token=CREATOR_BOT_TOKEN)
                            msg = (
                                f"🌟 <b>Nueva Aspirante a Creadora</b>\n"
                                f"👤 <b>Usuario:</b> @{username or 'Sin username'}\n"
                                f"🆔 <b>ID Telegram:</b> <code>{telegram_id}</code>\n"
                                f"✨ <i>Entrando a completar su aplicación...</i>"
                            )
                            await bot.send_message(chat_id=ADMIN_TELEGRAM_ID, text=msg, parse_mode="HTML")
                        except: pass
                else:
                    raise HTTPException(status_code=500, detail="Error al crear perfil de prospecto.")
            except HTTPException: raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Fallo en el registro de modelo: {str(e)}")
        else:
            raise HTTPException(status_code=500, detail="No se pudo procesar la sesión del usuario.")

    # Age check (Only applies if user_data has birth_date)
    birth_date_str = user_data.get('birth_date')
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

    # 4. Verificar si es Admin — la variable de entorno tiene máxima prioridad
    final_role = user_role  # Parte de 'client' o 'model'
    
    if ADMIN_TELEGRAM_ID and str(telegram_id) == str(ADMIN_TELEGRAM_ID):
        # El ID de Telegram coincide con el admin configurado en el servidor
        final_role = "admin"
        print(f"[Auth] Admin reconocido por ADMIN_TELEGRAM_ID: {telegram_id}")
    else:
        # Fallback: verificar tabla 'admins' en la BD
        try:
            admin_record = db.client.table("admins").select("role").eq("telegram_id", telegram_id).maybe_single().execute()
            if admin_record and admin_record.data:
                final_role = "admin"
        except Exception as e:
            print(f"[Auth] Error checking admin role: {e}")

    token_data = {
        "sub": str(telegram_id),
        "role": final_role,
        "user_id": user_data['id'],
        "username": user_data.get('username'),
        "iat": datetime.utcnow()
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm=ALGORITHM)
    
    # Inject admin role in response too so frontend knows
    user_data_response = user_data.copy()
    if final_role == 'admin':
        user_data_response['role'] = 'admin'

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_data_response,
        "role": final_role
    }

@router.post("/telegram")
async def telegram_login(auth_data: TelegramAuthData):
    """
    Widget Login — Validación HMAC legacy.
    """
    role = verify_telegram_data(auth_data)
    return await process_login(auth_data.id, auth_data.username, auth_data.photo_url, explicit_role=role)

@router.post("/telegram-oidc")
async def telegram_oidc_login(data: TelegramOIDCData):
    """
    Login OIDC — Validación del id_token JWT firmado por Telegram.
    """
    if not CREATOR_BOT_ID:
        raise HTTPException(status_code=500, detail="CREATOR_BOT_ID no configurado en el servidor")
    
    try:
        # 1. Obtener claves públicas de Telegram
        jwks_keys = await get_telegram_jwks()
        if not jwks_keys:
            raise HTTPException(status_code=500, detail="No se pudieron obtener claves JWKS de Telegram")
        
        # 2. Decodificar el header del token para obtener el kid
        unverified_header = jwt.get_unverified_header(data.id_token)
        kid = unverified_header.get("kid")
        
        # 3. Encontrar la clave pública correspondiente
        rsa_key = None
        for key in jwks_keys:
            if key.get("kid") == kid:
                rsa_key = key
                break
        
        if not rsa_key:
            raise HTTPException(status_code=403, detail="Clave de firma no encontrada en JWKS de Telegram")
        
        # 4. Verificar y decodificar el token sin aud constraint yet
        payload = jwt.decode(
            data.id_token,
            rsa_key,
            algorithms=["RS256"],
            options={"verify_aud": False},
            issuer="https://oauth.telegram.org"
        )
        
        # Check audience manually against both bots
        aud = payload.get("aud")
        role = None
        if CLIENT_BOT_ID and str(aud) == str(CLIENT_BOT_ID):
            role = "client"
        elif CREATOR_BOT_ID and str(aud) == str(CREATOR_BOT_ID):
            role = "model"
            
        if not role:
             raise HTTPException(status_code=403, detail="Token no emitido por ninguno de nuestros bots")
             
        # 5. Extraer datos del usuario del payload OIDC
        telegram_id = payload.get("id") or int(payload.get("sub", "0"))
        username = payload.get("preferred_username")
        photo_url = payload.get("picture")
        
        if not telegram_id:
            raise HTTPException(status_code=400, detail="Token OIDC no contiene ID de usuario")
        
        print(f"[Auth OIDC] Login exitoso para telegram_id={telegram_id}, username={username}, bot_aud={aud}, role={role}")
        return await process_login(telegram_id, username, photo_url, explicit_role=role)
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="El token ha expirado")
    except jwt.JWTClaimsError as e:
        raise HTTPException(status_code=403, detail=f"Claims inválidos en el token: {str(e)}")
    except jwt.JWTError as e:
        print(f"[Auth OIDC] Error JWT: {str(e)}")
        raise HTTPException(status_code=403, detail="Token OIDC inválido")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Auth OIDC] Error inesperado: {str(e)}")
        raise HTTPException(status_code=500, detail="Error interno al procesar el login OIDC")

@router.post("/webapp")
async def webapp_login(data: WebAppAuthData):
    """
    WebApp Auto-Login
    """
    user_info, role = verify_webapp_data(data.init_data)
    return await process_login(user_info['id'], user_info.get('username'), user_info.get('photo_url'), explicit_role=role)

