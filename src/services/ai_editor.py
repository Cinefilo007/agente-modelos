import os
import fal_client
from dotenv import load_dotenv

load_dotenv()

# Configuración de FAL AI
FAL_KEY = os.getenv("FAL_AI_KEY")
if FAL_KEY:
    os.environ["FAL_KEY"] = FAL_KEY

class AIEditorService:
    def __init__(self):
        self.key = FAL_KEY

    async def retouch_image(self, image_url: str) -> str:
        """
        Realiza un retoque general para eliminar imperfecciones y mejorar la piel.
        Utiliza el modelo especializado de FAL que preserva la identidad del sujeto.
        Este modelo es más seguro y no altera los rasgos distintivos.
        """
        import logging
        logger = logging.getLogger(__name__)

        try:
            # Usar el modelo de retoque avanzado y proveerle prompts rigurosos 
            # para limpieza de imperfecciones corporales completas
            result = await fal_client.subscribe_async(
                "fal-ai/image-editing/retouch",
                arguments={
                    "image_url": image_url,
                    "prompt": "perfect flawless cinematic skin, remove all acne, remove all stretch marks, remove all body and face scars, remove dark circles under eyes, high end beauty retouching, highly detailed skin texture, preserve original facial identity perfectly",
                    "sync_mode": True,
                    "enable_safety_checker": False
                }
            )
            
            if result and "images" in result and len(result["images"]) > 0:
                return result["images"][0]["url"]
            return None

        except Exception as e:
            logger.error(f"Error calling fal-ai face-enhancement: {e}")
            return None

    async def change_background(self, image_url: str, background_prompt: str) -> str:
        """
        Remueve el fondo actual y genera uno nuevo basado en el prompt,
        manteniendo a la persona u objeto principal intacto en la composición.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            # Traducir prompt a inglés para máxima precisión de la IA
            try:
                from deep_translator import GoogleTranslator
                english_prompt = GoogleTranslator(source='auto', target='en').translate(background_prompt)
                logger.info(f"Prompt traducido: '{background_prompt}' -> '{english_prompt}'")
            except Exception as e:
                logger.error(f"Error traduciendo prompt: {e}")
                english_prompt = background_prompt

            # Reemplazar fondo de manera profesional preservando al sujeto 100% exacto
            # Bria replace-background integra iluminación de la escena sin alterar el avatar
            res = await fal_client.subscribe_async(
                "fal-ai/bria/background/replace",
                arguments={
                    "image_url": image_url,
                    "prompt": english_prompt,
                    "sync_mode": True,
                    "enable_safety_checker": False
                }
            )
            
            if res and "images" in res and len(res["images"]) > 0:
                return res["images"][0]["url"]
                
            return None

        except Exception as e:
            logger.error(f"Error calling fal-ai background-change: {e}")
            return None

ai_editor = AIEditorService()
