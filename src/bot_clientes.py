import os
import sys
import logging
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from telegram import Update
from telegram.ext import ApplicationBuilder, Application, CommandHandler, MessageHandler, filters, ContextTypes

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

load_dotenv()

bot_clientes_app: Application = None

# Handlers Básicos para Clientes (Estructura inicial)
async def start_client(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    logger.info(f"Cliente {user.id} ({user.username}) inició el bot de clientes.")
    await update.message.reply_text(
        "👋 ¡Hola! Soy el bot para clientes de la Agencia.\n\n"
        "Desde aquí podrás explorar a nuestras creadoras, adquirir tickets y más funcionalidades exclusivas muy pronto.\n\n"
        "Opciones disponibles proximamente:\n"
        "🔍 /explorar - Ver creadoras destacadas\n"
        "💳 /recargar - Adquirir saldo/tickets"
    )

async def explorar_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("🚧 El catálogo de creadoras está en construcción. ¡Vuelve pronto!")

async def help_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("🤖 Escribe /start para ver las opciones disponibles.")

def build_app():
    global bot_clientes_app
    token = os.getenv("TELEGRAM_CLIENT_TOKEN")
    
    # Fallback si aún no existe el token de cliente para que no explote el loop general
    if not token:
        logger.warning("TELEGRAM_CLIENT_TOKEN not found in .env. El Bot de Clientes NO se iniciará.")
        return None

    logger.info("Construyendo Bot de Clientes...")
    
    bot_clientes_app = ApplicationBuilder().token(token).build()
    app = bot_clientes_app

    # Añadir handlers iniciales
    app.add_handler(CommandHandler("start", start_client))
    app.add_handler(CommandHandler("explorar", explorar_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, help_handler))
    
    return app

def main():
    app = build_app()
    if app:
        logger.info("Bot de Clientes Iniciado. Escuchando...")
        app.run_polling(drop_pending_updates=True)

if __name__ == '__main__':
    main()
