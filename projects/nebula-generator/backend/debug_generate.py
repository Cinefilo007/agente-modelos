import asyncio
import os
from dotenv import load_dotenv
from services.fal_service import FalService

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

async def debug_generate():
    print("Testing generation with FalService...")
    try:
        # Usamos un prompt simple para descartar filtros primero
        url = await FalService.generate_model_image("a beautiful woman in a garden")
        print(f"SUCCESS: Image generated at {url}")
    except Exception as e:
        print(f"FAILED: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_generate())
