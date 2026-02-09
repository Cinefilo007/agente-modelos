
import asyncio
import uvicorn
import logging
from src.bot import main as start_bot_polling
from src.api.main import app
import os
import threading

# Config logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_api():
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting API on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

async def main():
    # Option 1: Run API in a separate thread (Uvicorn blocking) and Bot in main thread (or async mix)
    # Since ptb bot.run_polling() is blocking, we should ideally use the async interface of PTB
    # But for simplicity in this script, we can run Uvicorn in a thread.
    
    t = threading.Thread(target=run_api)
    t.start()
    
    # Run Bot
    logger.info("Starting Telegram Bot...")
    # NOTE: We need to modify src/bot.py slightly if we want it to be purely async accessible, 
    # but run_polling() is fine directly here as it blocks the main thread, keeping the process alive.
    # The API thread will run in background.
    start_bot_polling()

if __name__ == "__main__":
    asyncio.run(main())
