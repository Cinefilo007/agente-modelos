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

from src.services.ton_monitor import start_monitor

def main():
    enable_api = os.getenv("ENABLE_API", "true").lower() == "true"
    enable_bot = os.getenv("ENABLE_BOT", "true").lower() == "true"
    enable_monitor = os.getenv("ENABLE_MONITOR", "true").lower() == "true"

    if enable_api:
        logger.info("Starting API thread...")
        t = threading.Thread(target=run_api, daemon=True)
        t.start()
    else:
        logger.info("API is disabled (ENABLE_API=false)")
    
    if enable_monitor:
        logger.info("Starting TON Monitor thread...")
        tm = threading.Thread(target=start_monitor, daemon=True)
        tm.start()
    else:
        logger.info("TON Monitor is disabled (ENABLE_MONITOR=false)")

    if enable_bot:
        logger.info("Starting Telegram Bot...")
        start_bot_polling()
    else:
        logger.info("Bot is disabled (ENABLE_BOT=false)")
        # If API is running, we need to keep the main thread alive.
        if enable_api:
            # Keep main thread alive while API thread runs
            while True:
                import time
                time.sleep(10)
        else:
            logger.info("Nothing to run. Exiting.")

if __name__ == "__main__":
    main()
