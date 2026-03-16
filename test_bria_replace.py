import os
import asyncio
import fal_client
from dotenv import load_dotenv

load_dotenv()
FAL_KEY = os.getenv("FAL_AI_KEY")
os.environ["FAL_KEY"] = FAL_KEY

dummy_url = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600"

async def test_bria_replace():
    print("Testing fal-ai/bria/background/replace...")
    try:
        res = await fal_client.subscribe_async(
            "fal-ai/bria/background/replace",
            arguments={
                "image_url": dummy_url,
                "prompt": "sitting on the beach sand at sunset",
                "sync_mode": True,
                "enable_safety_checker": False
            }
        )
        print("Success:", res)
    except Exception as e:
        print("Error:", e)
        if hasattr(e, 'response') and e.response:
            print("Response:", e.response.text)

if __name__ == "__main__":
    asyncio.run(test_bria_replace())
