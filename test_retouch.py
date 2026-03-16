import os
import asyncio
import fal_client
from dotenv import load_dotenv

load_dotenv()
FAL_KEY = os.getenv("FAL_AI_KEY")
os.environ["FAL_KEY"] = FAL_KEY

# A simple and accessible image URL
dummy_url = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600"

async def test_retouch():
    print("Testing fal-ai/image-editing/retouch...")
    try:
        res = await fal_client.subscribe_async(
            "fal-ai/image-editing/retouch",
            arguments={
                "image_url": dummy_url,
                "prompt": "remove acne, stretch marks, scars, perfectly clear skin, photography"
            }
        )
        print("Retouch Success!", res)
    except Exception as e:
        print("Retouch Error:", e)

    print("\nTesting fal-ai/fooocus for image-to-image...")
    try:
        res2 = await fal_client.subscribe_async(
            "fal-ai/fooocus",
            arguments={
                "prompt": "professional photography, flawless smooth skin, no acne, no stretch marks, no scars, high resolution, highly detailed",
                "image_url": dummy_url,
                "image_weight": 0.85,
                "performance": "Quality"
            }
        )
        print("Fooocus Success!", res2)
    except Exception as e:
        print("Fooocus Error:", e)

if __name__ == "__main__":
    asyncio.run(test_retouch())
