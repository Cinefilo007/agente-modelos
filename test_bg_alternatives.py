import os
import asyncio
import fal_client
from dotenv import load_dotenv

load_dotenv()
FAL_KEY = os.getenv("FAL_AI_KEY")
os.environ["FAL_KEY"] = FAL_KEY

dummy_url = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600"

async def test_bg_alternatives():
    print("Testing fal-ai/bria/background/remove...")
    try:
        # Step 1: Remove background
        res_bg = await fal_client.subscribe_async(
            "fal-ai/bria/background/remove",
            arguments={"image_url": dummy_url}
        )
        bg_removed_url = res_bg.get("image", {}).get("url")
        print("BG Removal Success:", bg_removed_url)

        if bg_removed_url:
            print("\nTesting fal-ai/fooocus for compositing and lighting...")
            res_comp = await fal_client.subscribe_async(
                "fal-ai/fooocus",
                arguments={
                    "prompt": "person on a beach at sunset, cinematic lighting, perfectly matched lighting, raw photo, ultra-realistic",
                    "image_url": bg_removed_url,
                    "image_weight": 0.85, # high weight to preserve subject
                    "sync_mode": True,
                    "enable_safety_checker": False
                }
            )
            print("Compositing Success:", res_comp)
    except Exception as e:
        print("Error:", e)
        if hasattr(e, 'response'):
            print(e.response.text)

if __name__ == "__main__":
    asyncio.run(test_bg_alternatives())
