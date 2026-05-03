"""
Bot de Fans (Clientes) — Puerta de Entrada a NebulaStar
========================================================
Este bot es la experiencia principal del consumidor/fan.
Funcionalidades:
- Onboarding con verificación de blacklist
- Exploración del catálogo de modelos con paginación
- Sistema de reviews (⭐1-5 + comentario)
- Gestión de modelos favoritas
- Acceso directo a la WebApp
- Notificaciones push (nueva modelo, etc.)
"""
import os
import sys
import logging
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from telegram import Update
from telegram.ext import ApplicationBuilder, Application, MessageHandler, filters, ContextTypes

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

load_dotenv()

bot_clientes_app: Application = None


def build_app():
    global bot_clientes_app
    token = os.getenv("TELEGRAM_CLIENT_TOKEN")

    if not token:
        logger.warning("TELEGRAM_CLIENT_TOKEN not found in .env. El Bot de Fans NO se iniciará.")
        return None

    logger.info("Construyendo Bot de Fans (Clientes)...")

    bot_clientes_app = ApplicationBuilder().token(token).build()
    app = bot_clientes_app

    # === IMPORTS DE HANDLERS ===
    from src.handlers.fan_onboarding import fan_start_handler, open_webapp_handler, FAN_MENU_KEYBOARD
    from src.handlers.fan_explore import (
        explore_command_handler, buscar_command_handler,
        explore_page_callback_handler, explore_detail_callback_handler,
        noop_callback_handler, explorar_menu_handler
    )
    from src.handlers.fan_reviews import (
        review_conversation_handler, mis_reviews_handler,
        mis_reviews_command, review_start_command
    )
    from src.handlers.fan_favorites import (
        favoritas_command_handler,
        fav_add_callback_handler, fav_remove_callback_handler,
        favoritas_command
    )

    # === CONVERSATION HANDLERS (deben ir primero por prioridad) ===
    app.add_handler(review_conversation_handler)

    # === COMANDO /start ===
    app.add_handler(fan_start_handler)

    # === COMANDOS EXPLÍCITOS ===
    app.add_handler(explore_command_handler)
    app.add_handler(buscar_command_handler)
    app.add_handler(favoritas_command_handler)
    app.add_handler(mis_reviews_handler)

    # === CALLBACKS INLINE ===
    app.add_handler(fav_add_callback_handler)
    app.add_handler(fav_remove_callback_handler)
    app.add_handler(explore_page_callback_handler)
    app.add_handler(explore_detail_callback_handler)
    app.add_handler(noop_callback_handler)

    # === MENÚ DE TEXTO (ReplyKeyboard) ===
    async def menu_text_router(update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enruta los botones del menú persistente a los handlers correspondientes."""
        text = update.message.text.strip()

        if text == "🔍 Explorar":
            await explorar_menu_handler(update, context)
        elif text == "⭐ Favoritas":
            await favoritas_command(update, context)
        elif text == "📝 Dejar Review":
            await review_start_command(update, context)
        elif text == "📋 Mis Reviews":
            await mis_reviews_command(update, context)
        elif text == "🌐 Abrir NebulaStar":
            await open_webapp_handler(update, context)
        else:
            await update.message.reply_text(
                "🤖 Usa el menú de abajo o escribe /start para ver las opciones.",
                reply_markup=FAN_MENU_KEYBOARD
            )

    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, menu_text_router))

    # === CALLBACK NO MANEJADO (Fallback) ===
    from telegram.ext import CallbackQueryHandler

    async def _unhandled_callback(update, context):
        query = update.callback_query
        logger.warning(f"Callback no manejado (Fans): {query.data}")
        await query.answer()

    app.add_handler(CallbackQueryHandler(_unhandled_callback))

    return app


def main():
    app = build_app()
    if app:
        logger.info("Bot de Fans Iniciado. Escuchando...")
        app.run_polling(drop_pending_updates=True)


if __name__ == '__main__':
    main()
