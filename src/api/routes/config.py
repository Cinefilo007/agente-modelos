from fastapi import APIRouter
import os

router = APIRouter()

# --- Creator Bot (Usado en el login de creadoras) ---
@router.get("/bot-username")
async def get_bot_username():
    bot_username = os.getenv("TELEGRAM_CREATOR_USERNAME", "NebulaCreators_bot")
    return {"username": bot_username}

@router.get("/bot-id")
async def get_bot_id():
    token = os.getenv("TELEGRAM_CREATOR_TOKEN", "")
    bot_id = token.split(":")[0] if ":" in token else os.getenv("TELEGRAM_CREATOR_BOT_ID", "")
    return {"bot_id": int(bot_id) if bot_id else None}

# --- Client Bot (Usado en el login de fans/clientes) ---
@router.get("/fan-bot-username")
async def get_fan_bot_username():
    bot_username = os.getenv("TELEGRAM_CLIENT_USERNAME", "NebulaModels_bot")
    return {"username": bot_username}

@router.get("/fan-bot-id")
async def get_fan_bot_id():
    token = os.getenv("TELEGRAM_CLIENT_TOKEN", "")
    bot_id = token.split(":")[0] if ":" in token else os.getenv("TELEGRAM_CLIENT_BOT_ID", "")
    return {"bot_id": int(bot_id) if bot_id else None}
