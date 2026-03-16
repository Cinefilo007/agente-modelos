import asyncio
import os
import fal_client
from dotenv import load_dotenv

load_dotenv()
FAL_KEY = os.getenv("FAL_AI_KEY")
os.environ["FAL_KEY"] = FAL_KEY

nsfw_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Venus_de_Milo_Louvre_Ma399_n4.jpg/800px-Venus_de_Milo_Louvre_Ma399_n4.jpg"

async def test_upscaler():
    model = "fal-ai/esrgan" # General purpose upscaler, usually permissive
    try:
        res = await fal_client.subscribe_async(
            model,
            arguments={
                "image_url": nsfw_url,
                "scale": 2, # Upscale 2x
                "sync_mode": True,
            }
        )
        print("Success ESRGAN: " + str(res))
    except Exception as e:
        print("Error ESRGAN: " + str(e))

    model2 = "fal-ai/aura-sr" 
    try:
        res = await fal_client.subscribe_async(
            model2,
            arguments={
                "image_url": nsfw_url,
                "sync_mode": True,
            }
        )
        print("Success Aura-SR: " + str(res))
    except Exception as e:
        print("Error Aura-SR: " + str(e))

if __name__ == "__main__":
    asyncio.run(test_upscaler())
