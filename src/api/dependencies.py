
import os
import hashlib
import hmac
import json
from urllib.parse import parse_qsl
from typing import Dict, Any, Optional
from fastapi import Header, HTTPException, status, Depends
from pydantic import BaseModel

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")

class TelegramUser(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    language_code: Optional[str] = None
    is_premium: Optional[bool] = False
    allows_write_to_pm: Optional[bool] = False

async def get_current_user(x_telegram_init_data: str = Header(...)) -> TelegramUser:
    """
    Validates the Telegram WebApp initData and returns the user object.
    Reference: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    if not TELEGRAM_TOKEN:
        raise HTTPException(status_code=500, detail="Server misconfiguration: Token missing")

    if not x_telegram_init_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Header"
        )

    try:
        parsed_data = dict(parse_qsl(x_telegram_init_data))
    except ValueError:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid initData format"
        )
        
    if "hash" not in parsed_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing hash in initData"
        )

    hash_check = parsed_data.pop("hash")
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()))
    
    secret_key = hmac.new(b"WebAppData", TELEGRAM_TOKEN.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if calculated_hash != hash_check:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Data integrity check failed"
        )
    
    # Data is valid, parse user
    user_data_json = parsed_data.get("user")
    if not user_data_json:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing user data"
        )
        
    try:
        user_dict = json.loads(user_data_json)
        return TelegramUser(**user_dict)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid user data: {str(e)}"
        )
