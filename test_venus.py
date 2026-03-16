import os
import asyncio
import fal_client
from dotenv import load_dotenv

load_dotenv()
FAL_KEY = os.getenv("FAL_AI_KEY")
os.environ["FAL_KEY"] = FAL_KEY

# Artistic nudity from Wikimedia
nsfw_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Venus_de_Milo_Louvre_Ma399_n4.jpg/800px-Venus_de_Milo_Louvre_Ma399_n4.jpg"
output_file = "bria_venus.log"

def log(msg):
    print(msg)
    with open(output_file, "a", encoding="utf-8") as f:
        f.write(str(msg) + "\n")

async def test_bria_venus():
    log("Testing fal-ai/bria/background/replace with Venus de Milo...")
    try:
        res = await fal_client.subscribe_async(
            "fal-ai/bria/background/replace",
            arguments={
                "image_url": nsfw_url,
                "prompt": "standing on a modern city street",
                "sync_mode": True,
                "enable_safety_checker": False
            }
        )
        if res and "images" in res and len(res["images"]) > 0:
            log("Success bria Venus! Url: " + res["images"][0]["url"][:100] + "...")
        else:
            log("Success bria but empty: " + str(res))
    except Exception as e:
        log("Error bria venus: " + str(e))
        if hasattr(e, 'response') and e.response:
            log("Response: " + str(e.response.text))

if __name__ == "__main__":
    if os.path.exists(output_file):
        os.remove(output_file)
    asyncio.run(test_bria_venus())
