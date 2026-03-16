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
        Remueve el fondo actual y genera uno nuevo basado en el prompt.
        """
        # 1. Remover fondo con Bria
        removal_result = await fal_client.subscribe_async(
            "fal-ai/bria/background/remove",
            arguments={
                "image_url": image_url
            }
        )
        
        if not removal_result or "image" not in removal_result:
            return None
            
        fg_image_url = removal_result["image"]["url"]
        
        # 2. Componer con nuevo fondo usando Flux o similar
        # En FAL, algunos modelos permiten 'inpainting' o 'outpainting' para esto.
        # Usaremos Flux Realism para un fondo profesional.
        final_result = await fal_client.subscribe_async(
            "fal-ai/flux/schnell", # Usamos schnell por velocidad/costo
            arguments={
                "prompt": f"Professional photograph of a woman, {background_prompt}, high end lighting, bokeh, professional studio",
                "image_url": fg_image_url, # Algunos modelos usan esto como base
                # Nota: El flujo exacto puede variar según el modelo de composición en FAL
            }
        )
        
        if final_result and "images" in final_result and len(final_result["images"]) > 0:
            return final_result["images"][0]["url"]
            
        return fg_image_url # Retornar al menos sin fondo si falla la composición

ai_editor = AIEditorService()
