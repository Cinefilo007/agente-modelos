import os
import fal_client
from dotenv import load_dotenv
from .translation_service import TranslationService

# Intentar cargar .env desde la raíz del proyecto (subiendo 4 niveles)
load_dotenv(os.path.join(os.path.dirname(__file__), "../../../../.env"))

FAL_KEY = os.getenv("FAL_AI_KEY")
if not FAL_KEY:
    FAL_KEY = os.getenv("FAL_KEY")

# Importante: fal_client busca específicamente "FAL_KEY" en el environment
if FAL_KEY:
    os.environ["FAL_KEY"] = FAL_KEY

# Configuración del Modelo RealVisXL V4.0 (V3 Realismo Extremo)
MODEL_URL = "https://civitai.com/api/download/models/344487?type=Model&format=SafeTensor&size=pruned&fp=fp16"
# LoRA genérico para "modelo hermosa/perfección" (ejemplo de Civitai compatible con SDXL)
GENERIC_LORA_URL = "https://civitai.com/api/download/models/135931" # "More Details" LoRA para SDXL

class FalService:
    @staticmethod
    async def generate_model_image(user_prompt: str, lora_url: str = None):
        """
        Genera una imagen de modelo femenina ultra-realista utilizando SDXL/Illustrious.
        """
        prompt_lora = lora_url if lora_url else GENERIC_LORA_URL
        
        # 1. Traducir el prompt del usuario a inglés para mejor interpretación por la IA
        english_prompt = TranslationService.translate_to_english(user_prompt)
        print(f"DEBUG - Original: {user_prompt} | Traducido: {english_prompt}")

        # 2. Inyección automática de prompts de fotorrealismo puro (DSLR Style)
        positive_prompt = (
            f"(highly detailed), (masterpiece:1.2), ultra-realistic raw photo of {english_prompt}, "
            "85mm f/1.8 sigma lens, dslr, cinematic lighting, sharp focus, skin pores, "
            "fine detail, subsurface scattering, fujicolor film style, realistic exposure, "
            "detailed background, (natural lighting:1.2)"
        )
        
        # Negative prompt reforzado para eliminar el look 'plástico' o 'anime'
        negative_prompt = "(cartoon, anime, 3d, cg, render, drawing, painting, illustration, artwork:1.4), (worst quality, low quality, normal quality:1.2), lowres, monochrome, grayscale, watermark, signature, text, blurry, deformed face, distorted features, plastic, fake, doll"

        handler = await fal_client.submit_async(
            "fal-ai/fast-sdxl",
            arguments={
                "prompt": positive_prompt,
                "negative_prompt": negative_prompt,
                "image_size": {"width": 896, "height": 1120}, # Formato nativo 4:5
                "num_inference_steps": 10, # Valor óptimo para nitidez sin artefactos
                "guidance_scale": 2.0, # Nivel de guía estable para modelos Lightning (evita NaNs)
                "model_name": MODEL_URL,
                "loras": [],
                "clip_skip": 1,
                "scheduler": "Euler A", # El más estable para evitar imágenes negras y caras borrosas
                "enable_safety_checker": False
            },
        )

        result = await handler.get()
        return result['images'][0]['url']
