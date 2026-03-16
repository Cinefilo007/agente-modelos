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
            result = await fal_client.subscribe_async(
                "fal-ai/image-editing/face-enhancement",
                arguments={
                    "image_url": image_url
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
            # Usar directamente el modelo de reemplazo de fondo de FAL
            # Añadimos instrucciones rigurosas para blending e iluminación
            enhanced_prompt = f"{background_prompt}. The person must seamlessly blend into this environment. Match the lighting, shadows, color temperature, and cinematic color grading of that specific background onto the person perfectly."
            
            result = await fal_client.subscribe_async(
                "fal-ai/image-editing/background-change",
                arguments={
                    "image_url": image_url,
                    "prompt": enhanced_prompt
                }
            )
            
            if result and "images" in result and len(result["images"]) > 0:
                return result["images"][0]["url"]
                
            return None

        except Exception as e:
            logger.error(f"Error calling fal-ai background-change: {e}")
            return None

ai_editor = AIEditorService()
