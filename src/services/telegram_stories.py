import logging
import asyncio
import httpx
import os
from telegram import Bot
from src.services.database import db

logger = logging.getLogger(__name__)

async def post_to_telegram_story(model_id: str, media_url: str, media_type: str, caption: str = None):
    """
    Publica una historia en la cuenta de Telegram Business de la modelo.
    """
    try:
        # 1. Obtener datos de la modelo
        model = db.get_model_by_uuid(model_id)
        if not model:
            logger.error(f"Modelo {model_id} no encontrada para publicar historia.")
            return

        business_conn_id = model.get('business_connection_id')
        if not business_conn_id:
            logger.info(f"Modelo {model_id} no tiene business_connection_id. Saltando historia.")
            return

        # 2. Preparar el Bot
        token = os.getenv("TELEGRAM_TOKEN")
        bot = Bot(token)

        # 3. Preparar el pie de foto
        profile_link = f"{os.getenv('LANDING_URL', '')}/{model.get('username', '')}"
        final_caption = caption or model.get('story_caption_template', 'Mira mi nuevo post! {profile_link}')
        final_caption = final_caption.replace("{profile_link}", profile_link)

        # 4. Publicar Historia
        # Nota: Usamos la API de Telegram directamente via httpx si el wrapper no tiene postStory exacto
        # o intentamos via bot.post_story si PTB 21.1+ lo soporta.
        
        logger.info(f"Intentando publicar historia para modelo {model_id} (Connection: {business_conn_id})")
        
        # Formatear la llamada segun la API de Telegram para Business Stories
        url = f"https://api.telegram.org/bot{token}/postStory"
        
        data = {
            "business_connection_id": business_conn_id,
            "caption": final_caption
        }
        
        if media_type == "video":
            data["video"] = media_url
        else:
            data["photo"] = media_url

        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data)
            res_json = response.json()
            
            if not res_json.get("ok"):
                error_msg = res_json.get("description", "Unknown error")
                logger.error(f"Error publicando historia en Telegram: {error_msg}")
                # Aquí capturamos errores como "Premium required" o "Limit exceeded"
                return False
            
            logger.info(f"Historia publicada exitosamente para modelo {model_id}")
            return True

    except Exception as e:
        logger.error(f"Excepción en post_to_telegram_story: {e}")
        return False
