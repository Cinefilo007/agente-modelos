import os
import asyncio
import fal_client
from dotenv import load_dotenv

load_dotenv()
FAL_KEY = os.getenv("FAL_AI_KEY")
os.environ["FAL_KEY"] = FAL_KEY

# A dummy URL
dummy_url = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600" # fallback

async def test_bg_nsfw():
    print("Testing fal-ai/image-editing/background-change with safety disabled...")
    try:
        res = await fal_client.subscribe_async(
            "fal-ai/image-editing/background-change",
            arguments={
                "image_url": dummy_url,
                "prompt": "beach at sunset",
                "sync_mode": True,
                "enable_safety_checker": False
            }
        )
        print("Success!", res.keys() if isinstance(res, dict) else res)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test_bg_nsfw())
