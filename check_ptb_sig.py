import os
from telegram import Bot
import inspect

async def check():
    token = os.getenv("TELEGRAM_TOKEN", "fake_token")
    bot = Bot(token)
    try:
        # Intentar obtener la firma del método
        sig = inspect.signature(bot.post_story)
        print(f"Firma de post_story: {sig}")
    except Exception as e:
        print(f"Error inspeccionando: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(check())
