import asyncio
import fal_client
import os
from dotenv import load_dotenv

load_dotenv()

FAL_KEY = os.getenv("FAL_AI_KEY")
if FAL_KEY:
    os.environ["FAL_KEY"] = FAL_KEY

async def test():
    try:
        print("Testing fal-ai/fooocus...")
        res = await fal_client.subscribe_async(
            "fal-ai/fooocus",
            arguments={
                "input_image_url": "https://picsum.photos/200/300",
                "prompt": "extreme high quality, professional skin retouch, flawless skin, remove blemishes and marks, 8k resolution",
                "negative_prompt": "blurry, low quality, distorted, extra limbs, bad anatomy",
                "performance": "Quality",
                "style_selections": ["Professional Photo"]
            }
        )
        print("SUCCESS fal-ai/fooocus:", res)
    except Exception as e:
        print("Error fal-ai/fooocus:", e)

if __name__ == "__main__":
    asyncio.run(test())
