from fastapi import APIRouter
import os

router = APIRouter()

@router.get("/bot-username")
async def get_bot_username():
    # Prioridad: Variable de entorno directa
    # Esto permite al usuario cambiar el bot en Railway sin tocar el código
    bot_username = os.getenv("TELEGRAM_BOT_USERNAME", "AgenteNebulaIA_bot")
    return {"username": bot_username}
