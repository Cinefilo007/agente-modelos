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
        # Telegram Business requiere subir el archivo real como multipart/form-data para historias
        # Ref: https://core.telegram.org/bots/api#poststory
        url = f"https://api.telegram.org/bot{token}/postStory"
        
        async with httpx.AsyncClient() as client:
            # 1. Descargar la media de Supabase
            media_response = await client.get(media_url)
            if media_response.status_code != 200:
                logger.error(f"Error descargando media de Supabase: {media_response.status_code}")
                return False
            
            media_content = media_response.content
            filename = "story.mp4" if media_type == "video" else "story.jpg"
            mime_type = "video/mp4" if media_type == "video" else "image/jpeg"

            # 2. Preparar el payload multipart
            # Nota: 'content' debe ser un string JSON en multipart o campos separados segun la API
            # La API de postStory es especial: requiere business_connection_id y luego la media en el campo 'photo' o 'video'
            
            files = {
                media_type: (filename, media_content, mime_type)
            }
            
            data = {
                "business_connection_id": business_conn_id,
                "caption": final_caption,
                "parse_mode": "HTML"
            }

            response = await client.post(url, data=data, files=files)
            res_json = response.json()
            
            if not res_json.get("ok"):
                error_msg = res_json.get("description", "Unknown error")
                logger.error(f"Error publicando historia en Telegram: {error_msg}")
                return False
            
            logger.info(f"Historia publicada exitosamente para modelo {model_id}")
            return True

    except Exception as e:
        logger.error(f"Excepción en post_to_telegram_story: {e}")
        return False
