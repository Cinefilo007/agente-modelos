import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from telegram import Bot
from src.services.promo_jobs import evaluate_channels_quality

load_dotenv()
TOKEN = os.getenv("PROMO_TELEGRAM_TOKEN")

async def force_run():
    print("Forzando ejecución de evaluación de canales...")
    bot = Bot(token=TOKEN)
    await evaluate_channels_quality(bot)
    print("Ejecución finalizada con éxito.")

if __name__ == "__main__":
    asyncio.run(force_run())
