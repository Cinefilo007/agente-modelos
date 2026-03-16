import os
import asyncio
import fal_client
from dotenv import load_dotenv

load_dotenv()
FAL_KEY = os.getenv("FAL_AI_KEY")
os.environ["FAL_KEY"] = FAL_KEY

# A dummy URL that might trigger NSFW filter
dummy_url = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600" # fallback

async def test_nsfw():
    print("Testing fal-ai/image-editing/retouch with sync options to see exact error...")
    try:
        res = await fal_client.subscribe_async(
            "fal-ai/image-editing/retouch",
            arguments={
                "image_url": dummy_url,
                "prompt": "remove acne, stretch marks, scars, perfectly clear skin",
                "sync_mode": True # If it supports any option to debug
            }
        )
        print("Retouch Success!", res)
    except Exception as e:
        print("Retouch Error:", e)
        if hasattr(e, 'response'):
            print(e.response.text)

if __name__ == "__main__":
    asyncio.run(test_nsfw())
