import asyncio
import os
import fal_client
import requests
from PIL import Image
from io import BytesIO
from dotenv import load_dotenv

# Cargar .env desde la raíz del workspace (3 niveles arriba de projects/nebula-generator/backend/)
dotenv_path = os.path.normpath(os.path.join(os.path.dirname(__file__), "../../../.env"))
load_dotenv(dotenv_path)

async def test_nsfw_no_black():
    fal_key = os.getenv("FAL_AI_KEY")
    if not fal_key:
        fal_key = os.getenv("FAL_KEY")
    
    if not fal_key:
        print("ERROR: No hay FAL_KEY ni FAL_AI_KEY")
        return

    # Sincronizar FAL_KEY en env por si el cliente lo requiere
    os.environ["FAL_KEY"] = fal_key

    # Usamos un prompt NSFW similar al del usuario para la prueba
    prompt = "rating_explicit, a beautiful redhead woman lying on her bed, showing her huge breasts, cinematic lighting, photoreal"
    
    print(f"Probando generacin NSFW con prompt: {prompt}")
    
    try:
        handler = await fal_client.submit_async(
            "fal-ai/fast-sdxl",
            arguments={
                "prompt": prompt,
                "negative_prompt": "(cartoon, anime, 3d, cg, render, drawing, painting, illustration, artwork:1.4), (worst quality, low quality, normal quality:1.2), lowres, monochrome, grayscale, watermark, signature, text, blurry, deformed face, distorted features, plastic, fake, doll",
                "image_size": {"width": 896, "height": 1120},
                "num_inference_steps": 10,
                "guidance_scale": 2.0,
                "model_name": "https://civitai.com/api/download/models/344487?type=Model&format=SafeTensor&size=pruned&fp=fp16",
                "loras": [],
                "clip_skip": 1,
                "scheduler": "Euler A",
                "enable_safety_checker": False
            },
        )
        
        result = await handler.get()
        image_url = result["images"][0]["url"]
        print(f"Imagen generada: {image_url}")
        
        # Descargar la imagen y verificar si es negra
        response = requests.get(image_url)
        img = Image.open(BytesIO(response.content))
        
        # Verificar si la imagen es slida negra
        extrema = img.convert("L").getextrema()
        if extrema == (0, 0):
            print("FALLO: La imagen es TOTALMENTE NEGRA.")
        elif extrema[0] == extrema[1]:
            print(f"ADVERTENCIA: La imagen es de un solo color: {extrema}")
        else:
            print(f"XITO: La imagen es vlida (Rango de grises: {extrema})")
            
    except Exception as e:
        print(f"Error durante la prueba: {e}")

if __name__ == "__main__":
    asyncio.run(test_nsfw_no_black())
