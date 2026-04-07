import asyncio
import os
import sys
from dotenv import load_dotenv

# Añadir el directorio actual al path para importar servicios
sys.path.append(os.path.dirname(__file__))

from services.fal_service import FalService

load_dotenv(os.path.join(os.path.dirname(__file__), "../../../../.env"))

async def verify_nebula_v2():
    print("--- VERIFICACIÓN NEBULA V2 (REALISMO + TRADUCCIÓN) ---")
    prompt_es = "una mujer hermosa con cabello largo y rizado, pecas, mirando a la cámara, luz natural de sol, realismo extremo, foto 8k"
    
    try:
        url = await FalService.generate_model_image(prompt_es)
        print(f"\nÉXITO: Imagen generada con éxito.")
        print(f"URL de la imagen: {url}")
        print("\nVerifica manualmente que la imagen sea fotorealista y coincida con el prompt traducido.")
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify_nebula_v2())
