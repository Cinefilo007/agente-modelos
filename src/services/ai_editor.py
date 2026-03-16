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
        Realiza un retoque general para eliminar imperfecciones.
        Usa Fooocus Inpainting con un prompt de mejora de piel.
        """
        # Nota: En una implementación real, podríamos necesitar una máscara.
        # Por ahora, Fooocus puede intentar mejorar la imagen completa o 
        # podemos usar un modelo de 'image-to-image' con bajo denoising.
        
        # Ejemplo con Fooocus (ajustar según disponibilidad de modelos en FAL)
        result = await fal_client.subscribe_async(
            "fal-ai/fooocus",
            arguments={
                "input_image_url": image_url,
                "prompt": "extreme high quality, professional skin retouch, flawless skin, remove blemishes and marks, 8k resolution",
                "negative_prompt": "blurry, low quality, distorted, extra limbs, bad anatomy",
                "performance": "Quality",
                "style_selections": ["Professional Photo"]
            }
        )
        # Fooocus retorna una lista de imágenes
        if result and "images" in result and len(result["images"]) > 0:
            return result["images"][0]["url"]
        return None

    async def change_background(self, image_url: str, background_prompt: str) -> str:
        """
        Remueve el fondo actual y genera uno nuevo basado en el prompt,
        manteniendo a la persona u objeto principal intacto en la composición.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            # Usar directamente el modelo de reemplazo de fondo de FAL
            result = await fal_client.subscribe_async(
                "fal-ai/image-editing/background-change",
                arguments={
                    "image_url": image_url,
                    "prompt": background_prompt
                }
            )
            
            if result and "images" in result and len(result["images"]) > 0:
                return result["images"][0]["url"]
                
            return None

        except Exception as e:
            logger.error(f"Error calling fal-ai background-change: {e}")
            return None

ai_editor = AIEditorService()
