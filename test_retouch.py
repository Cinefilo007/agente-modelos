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
        ("fal-ai/image-editing/face-enhancement", {"image_url": "https://picsum.photos/200/300"}),
        ("fal-ai/image-editing/retouch", {"image_url": "https://picsum.photos/200/300"})
    ]
    for ep, args in endpoints:
        print(f"Testing {ep}...")
        try:
            res = await fal_client.subscribe_async(ep, arguments=args)
            print(f"SUCCESS {ep}:", res)
        except Exception as e:
            print(f"Error {ep}:", e)

if __name__ == "__main__":
    asyncio.run(test())
