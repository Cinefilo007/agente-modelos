import os
import asyncio
import fal_client
from dotenv import load_dotenv

load_dotenv()
FAL_KEY = os.getenv("FAL_AI_KEY")
os.environ["FAL_KEY"] = FAL_KEY

dummy_url = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=600"
output_file = "bria_eval.log"

def log(msg):
    print(msg)
    with open(output_file, "a", encoding="utf-8") as f:
        f.write(str(msg) + "\n")

async def test_bria_bg():
    log("Testing fal-ai/bria/background/replace...")
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
        log("Success bria: " + str(res))
    except Exception as e:
        log("Error bria: " + str(e))
        if hasattr(e, 'response') and e.response:
            log("Response: " + str(e.response.text))

if __name__ == "__main__":
    if os.path.exists(output_file):
        os.remove(output_file)
    asyncio.run(test_bria_bg())
