import logging
import asyncio
import httpx
import os
import io
from telegram import Bot, InputStoryContentPhoto, InputStoryContentVideo
from src.services.database import db

logger = logging.getLogger(__name__)

async def post_to_telegram_story(model_id: str, media_url: str, media_type: str, caption: str = None):
    """
    Publica una historia en la cuenta de Telegram Business de la modelo usando PTB.
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

        # 4. Publicar Historia vía PTB (Internamente maneja multipart y InputStoryContent)
        logger.info(f"Intentando publicar historia nativa para modelo {model_id} (Conn: {business_conn_id})")
        
        async with httpx.AsyncClient() as client:
            media_response = await client.get(media_url)
            if media_response.status_code != 200:
                logger.error(f"Error descargando media: {media_response.status_code}")
                return False
            media_content = media_response.content

        # Convertir a objeto de archivo para PTB
        media_file = io.BytesIO(media_content)
        media_file.name = "story.mp4" if media_type == "video" else "story.jpg"

        if media_type == "video":
            content = InputStoryContentVideo(video=media_file)
        else:
            content = InputStoryContentPhoto(photo=media_file)

        # Usar el método nativo del bot con los parámetros correctos para PTB 21.1+
        # active_period: 86400 segundos = 24 horas (estándar de Telegram)
        result = await bot.post_story(
            business_connection_id=business_conn_id,
            content=content,
            active_period=86400,
            caption=final_caption,
            parse_mode="HTML"
        )

        if result:
            logger.info(f"Historia publicada exitosamente (ID: {result.id}) para modelo {model_id}")
            return True
        
        return False

    except Exception as e:
        logger.error(f"Error en post_to_telegram_story (PTB): {e}")
        return False
