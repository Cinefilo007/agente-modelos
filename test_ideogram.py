import os
import asyncio
import fal_client
from dotenv import load_dotenv

load_dotenv()
FAL_KEY = os.getenv("FAL_AI_KEY")
os.environ["FAL_KEY"] = FAL_KEY

dummy_url = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600"

async def test_ideogram():
    print("Testing fal-ai/ideogram/v2/edit...")
    try:
        # Step 1: Remove background to get mask
        res_bg = await fal_client.subscribe_async(
            "fal-ai/bria/background/remove",
            arguments={"image_url": dummy_url}
        )
        bg_removed_url = res_bg.get("image", {}).get("url")
        print("BG Removal Success:", bg_removed_url)
        
        # Ideogram is not on api.fal.ai but let's check what background replacement is available.
        # How about fal-ai/flux-general/image-to-image ?
        # Wait, what if we use fal-ai/image-editing/background-change but with a different parameter? No.
        # Let's test fal-ai/flux-subject-reference ?
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test_ideogram())
