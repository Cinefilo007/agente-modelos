import os
import sys
import logging
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from telegram.ext import ApplicationBuilder, Application

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

load_dotenv()

bot_ia_app: Application = None

def build_app():
    global bot_ia_app
    token = os.getenv("TELEGRAM_TOKEN")
    if not token:
        logger.error("TELEGRAM_TOKEN not found in .env (for IA Bot)")
        return None

    logger.info("Construyendo Bot de IA (Telegram Business)...")
    
    bot_ia_app = ApplicationBuilder().token(token).build()
    app = bot_ia_app

    # Solo handlers relacionados a la IA y Telegram Business
    from src.handlers.business_chat import business_handler, reset_chat_handler, business_connection_handler, check_stories_permissions
    from telegram.ext import CommandHandler

    app.add_handler(business_handler)   # Telegram Business Messages
    app.add_handler(business_connection_handler) # Business Connections
    app.add_handler(CommandHandler("reset", reset_chat_handler))
    app.add_handler(CommandHandler("check_stories", check_stories_permissions))
    
    return app

def main():
    app = build_app()
    if app:
        logger.info("Bot IA Iniciado. Escuchando...")
        app.run_polling(drop_pending_updates=True)

if __name__ == '__main__':
    main()
