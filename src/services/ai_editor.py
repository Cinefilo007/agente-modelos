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
            # PASO 1: Remover fondo de manera segura preservando al sujeto
            # Bria background removal es permisivo y excelente extrayendo a la persona
            res_bg = await fal_client.subscribe_async(
                "fal-ai/bria/background/remove",
                arguments={"image_url": image_url}
            )
            
            bg_removed_url = None
            if res_bg and "image" in res_bg:
                bg_removed_url = res_bg["image"]["url"]
                
            if not bg_removed_url:
                logger.error("Failed to extract background")
                return None

            # PASO 2: Generar nuevo fondo e integrar iluminación (Compositing)
            # Fooocus Image-to-Image permite blending fotorealista y acepta desactivar el filtro NSFW
            enhanced_prompt = f"{background_prompt}, highly detailed background, cinematic lighting, perfectly matched lighting on the person, raw photography, 8k resolution, photorealistic"
            
            res_comp = await fal_client.subscribe_async(
                "fal-ai/fooocus",
                arguments={
                    "prompt": enhanced_prompt,
                    "image_url": bg_removed_url,
                    "image_weight": 0.85, # Alto para preservar la identidad 100%
                    "performance": "Quality",
                    "sync_mode": True,
                    "enable_safety_checker": False # Desactiva el filtro censurador
                }
            )
            
            if res_comp and "images" in res_comp and len(res_comp["images"]) > 0:
                return res_comp["images"][0]["url"]
                
            return None

        except Exception as e:
            logger.error(f"Error calling fal-ai background-change: {e}")
            return None

ai_editor = AIEditorService()
