import asyncio
import fal_client
import os
from dotenv import load_dotenv

load_dotenv()

FAL_KEY = os.getenv("FAL_AI_KEY")
if FAL_KEY:
    os.environ["FAL_KEY"] = FAL_KEY

async def test():
    endpoints = [
        ("fal-ai/image-editing/background-change", {"image_url": "https://picsum.photos/200/300", "prompt": "a beautiful beach at sunset"}),
        ("fal-ai/bria/replace-background", {"image_url": "https://picsum.photos/200/300", "prompt": "a beautiful beach at sunset"}),
        ("fal-ai/photoroom/background-replacement", {"image_url": "https://picsum.photos/200/300", "prompt": "a beautiful beach at sunset"}),
        ("fal-ai/bria/background/replace", {"image_url": "https://picsum.photos/200/300", "prompt": "a beautiful beach at sunset"})
    ]
    for ep, args in endpoints:
        print(f"Testing {ep}...")
        try:
            res = await fal_client.subscribe_async(ep, arguments=args)
            print(f"SUCCESS {ep}:", res)
            break
        except Exception as e:
            print(f"Error {ep}:", e)

if __name__ == "__main__":
    asyncio.run(test())
