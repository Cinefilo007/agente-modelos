import os
import hashlib
import hmac
import json
from urllib.parse import parse_qsl
from typing import Dict, Any, Optional
from fastapi import Header, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import BaseModel

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-me")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/telegram")

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
