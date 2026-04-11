from fastapi import APIRouter
import os

router = APIRouter()

# --- Creator Bot (Default) ---
@router.get("/bot-username")
async def get_bot_username():
    bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "AgenteNebulaIA_bot")
    return {"username": bot_username}

@router.get("/bot-id")
async def get_bot_id():
    token = os.getenv("TELEGRAM_TOKEN", "")
    bot_id = token.split(":")[0] if ":" in token else os.getenv("TELEGRAM_BOT_ID", "")
    return {"bot_id": int(bot_id) if bot_id else None}

# --- Fan Bot (Specific) ---
@router.get("/fan-bot-username")
async def get_fan_bot_username():
    # El usuario dijo que lo creó como NebulaModels_bot (aunque el nombre sea confuso, es el de fans según su mensaje)
    # NOTA: El usuario puso https://t.me/NebulaModels_bot para el bot de fans.
    bot_username = os.getenv("CLIENT_BOT_USERNAME", "NebulaModels_bot")
    return {"username": bot_username}

@router.get("/fan-bot-id")
async def get_fan_bot_id():
    token = os.getenv("CLIENT_BOT_TOKEN", "")
    bot_id = token.split(":")[0] if ":" in token else os.getenv("CLIENT_BOT_ID", "")
    return {"bot_id": int(bot_id) if bot_id else None}
