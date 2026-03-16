import os
import asyncio
import fal_client
from dotenv import load_dotenv

load_dotenv()
FAL_KEY = os.getenv("FAL_AI_KEY")
os.environ["FAL_KEY"] = FAL_KEY

nsfw_url = "https://raw.githubusercontent.com/EBazarov/nsfw_data_scrapper/master/raw_data/hentai/4Z6s0b2v.jpg" # Using a known NSFW test dataset image or similar
output_file = "bg_debug.log"

def log(msg):
    print(msg)
    with open(output_file, "a", encoding="utf-8") as f:
        f.write(str(msg) + "\n")

async def test_remove_nsfw():
    log("Testing fal-ai/bria/background/remove with NSFW...")
    try:
        res = await fal_client.subscribe_async(
            "fal-ai/bria/background/remove",
            arguments={
                "image_url": nsfw_url
            }
        )
        log("Remove success: " + str(res))
    except Exception as e:
        log("Error remove NSFW: " + str(e))
        if hasattr(e, 'response') and e.response:
            log("Response: " + str(e.response.text))

if __name__ == "__main__":
    if os.path.exists(output_file):
        os.remove(output_file)
    asyncio.run(test_remove_nsfw())
