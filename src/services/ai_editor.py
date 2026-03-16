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
            # PASO 1: Usar el modelo de retoque avanzado y proveerle prompts rigurosos 
            # para limpieza de imperfecciones corporales completas
            logger.info("Iniciando Paso 1: Retoque Mágico")
            res_retouch = await fal_client.subscribe_async(
                "fal-ai/image-editing/retouch",
                arguments={
                    "image_url": image_url,
                    "prompt": "perfect flawless cinematic skin, remove all acne, remove all stretch marks, remove all body and face scars, remove dark circles under eyes, high end beauty retouching, highly detailed skin texture, preserve original facial identity perfectly",
                    "sync_mode": True,
                    "enable_safety_checker": False
                }
            )
            
            retouched_url = None
            if res_retouch and "images" in res_retouch and len(res_retouch["images"]) > 0:
                retouched_url = res_retouch["images"][0]["url"]
            
            if not retouched_url:
                logger.error("Error en Paso 1: No se generó imagen retocada")
                return None

            # PASO 2: Usar CCSR para escalar y recuperar todos los pixeles del fondo
            # CCSR es excelente para restaurar rostros, texturas y subir la resolución final 2x
            logger.info("Iniciando Paso 2: Mejora de Resolución con CCSR")
            try:
                res_upscale = await fal_client.subscribe_async(
                    "fal-ai/ccsr",
                    arguments={
                        "image_url": retouched_url,
                        "sync_mode": True,
                        "enable_safety_checker": False # Desactiva filtros obstructivos
                    }
                )
                
                if res_upscale and "image" in res_upscale:
                    return res_upscale["image"]["url"]
            except Exception as upscale_e:
                logger.error(f"Error procesando Upscale CCSR, retornando paso 1 como fallback: {upscale_e}")
                # Fallback: si falla el upscaler por algo imprevisto, retorna al menos la foto retocada
                return retouched_url
                
            return retouched_url

        except Exception as e:
            logger.error(f"Error calling fal-ai face-enhancement pipeline: {e}")
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
