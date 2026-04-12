import os
import hashlib
import hmac
import json
from urllib.parse import parse_qsl
from typing import Dict, Any, Optional
from fastapi import Header, HTTPException, status, Depends
from src.services.database import db
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import BaseModel

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError(
        "CRITICAL SECURITY ERROR: JWT_SECRET environment variable is NOT SET. "
        "The application cannot start without a secure secret key."
    )
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/telegram", auto_error=False)

class TelegramUser(BaseModel):
    id: int # Telegram ID
    user_id: str # UUID from DB
    username: Optional[str] = None
    role: str = "unknown"

async def get_current_user(token: str = Depends(oauth2_scheme)) -> TelegramUser:
    """
    Validates the JWT token and returns the user object.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        telegram_id: str = payload.get("sub")
        user_id: str = payload.get("user_id")
        role: str = payload.get("role")
        username: str = payload.get("username")
        
        if telegram_id is None or user_id is None:
            raise credentials_exception
            
        return TelegramUser(
            id=int(telegram_id), 
            user_id=user_id, 
            username=username, 
            role=role
        )
    except JWTError:
        raise credentials_exception

async def get_current_user_optional(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[TelegramUser]:
    # ... (existing code keeps the same)
    if not token:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        telegram_id: str = payload.get("sub")
        user_id: str = payload.get("user_id")
        role: str = payload.get("role")
        username: str = payload.get("username")
        
        if telegram_id is None or user_id is None:
            return None
            
        return TelegramUser(
            id=int(telegram_id), 
            user_id=user_id, 
            username=username, 
            role=role
        )
    except:
        return None

async def require_verified_model(user: TelegramUser = Depends(get_current_user)) -> TelegramUser:
    """
    Dependency to ensure the user is a model AND is verified in the database.
    Admins are always allowed.
    """
    if user.role == "admin":
        return user
        
    if user.role != "model":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta operación solo está disponible para modelos."
        )
    
    # Query DB to check verification status (don't trust token role/verified status entirely)
    try:
        res = db.client.table("models").select("is_verified").eq("id", user.user_id).maybe_single().execute()
        if not res or not res.data or not res.data.get('is_verified', False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tu cuenta de modelo aún no ha sido verificada por un administrador."
            )
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Security] Error validating model verification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al validar estado de verificación."
        )
        
    return user
