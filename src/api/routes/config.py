from fastapi import APIRouter
import os

router = APIRouter()

@router.get("/bot-username")
async def get_bot_username():
    # Prioridad: Variable de entorno directa
    # Esto permite al usuario cambiar el bot en Railway sin tocar el código
    bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "AgenteNebulaIA_bot")
    return {"username": bot_username}


@router.get("/bot-id")
async def get_bot_id():
    """
    Devuelve el bot_id numérico necesario para Telegram.Login.auth().
    Se extrae automáticamente de la primera parte del TELEGRAM_TOKEN (antes del ':').
    """
    token = os.getenv("TELEGRAM_TOKEN", "")
    if ":" in token:
        bot_id = token.split(":")[0]
    else:
        bot_id = os.getenv("TELEGRAM_BOT_ID", "")
    
    if not bot_id:
        return {"bot_id": None, "error": "TELEGRAM_TOKEN no configurado"}
    
    return {"bot_id": int(bot_id)}
