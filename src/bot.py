import os
import sys
import logging
from dotenv import load_dotenv

# Permitir ejecutar como script directo (python src/bot.py)
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from telegram.ext import ApplicationBuilder, Application, CallbackQueryHandler

# Configurar Logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Cargar variables
load_dotenv()

def main():
    token = os.getenv("TELEGRAM_TOKEN")
    if not token:
        logger.error("TELEGRAM_TOKEN not found in .env")
        return

    logger.info("Iniciando Bot...")
    
    # Construir App
    app = ApplicationBuilder().token(token).build()

    # Handlers
    # Handlers
    from src.handlers.onboarding import onboarding_handler
    from src.handlers.admin import admin_callback_handler
    from src.handlers.profile import show_profile, profile_handler
    from src.handlers.credits import (
        list_packages, credit_purchase_callback, admin_credit_callback, admin_add_credits_command,
        admin_list_packages, admin_pkg_view_callback, admin_pkg_action_callback, create_pkg_handler,
        edit_pkg_handler
    )
    from src.handlers.admin_models import (
        admin_list_models, admin_model_view_callback, admin_model_action_callback, edit_model_handler
    )
    from telegram.ext import CommandHandler
    
    # 1. Conversation Handlers (High Priority)
    app.add_handler(onboarding_handler)
    app.add_handler(profile_handler)
    app.add_handler(create_pkg_handler)
    app.add_handler(edit_pkg_handler)   # Edit Package
    app.add_handler(edit_model_handler) # Edit Model Credits

    # 2. Command Handlers
    app.add_handler(CommandHandler("perfil", show_profile))
    app.add_handler(CommandHandler("recargar", list_packages))
    app.add_handler(CommandHandler("dar_creditos", admin_add_credits_command))
    app.add_handler(CommandHandler("paquetes", admin_list_packages))
    app.add_handler(CommandHandler("modelos", admin_list_models))

    # 3. Specific Callback Handlers
    app.add_handler(CallbackQueryHandler(credit_purchase_callback, pattern="^buy_credit"))
    app.add_handler(CallbackQueryHandler(admin_credit_callback, pattern="^approve_credit"))
    
    # Admin Package Management
    app.add_handler(CallbackQueryHandler(admin_pkg_view_callback, pattern="^adm_pkg_view"))
    app.add_handler(CallbackQueryHandler(admin_pkg_action_callback, pattern="^(adm_pkg_toggle|adm_pkg_list)"))

    # Admin Model Management
    app.add_handler(CallbackQueryHandler(admin_model_view_callback, pattern="^adm_mod_view"))
    app.add_handler(CallbackQueryHandler(admin_model_action_callback, pattern="^adm_mod_(delete|list)"))
    # edit_status hook not implemented yet, simple stub? handled in action or separate?
    # For now regex matches list/delete. View is separate.
    
    # 4. Generic Admin Callback (Catch-all for admin actions)
    app.add_handler(CallbackQueryHandler(admin_callback_handler))

    # Catch-all para mensajes que no son comandos (Debug/Help)
    from telegram.ext import MessageHandler, filters
    async def help_handler(update, context):
        await update.message.reply_text("🤖 Soy AgencyBot.\n\nPor favor escribe **/start** para comenzar el proceso de registro.")
    
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, help_handler))
    
    logger.info("Bot Iniciado. Escuchando...")
    app.run_polling()

if __name__ == '__main__':
    main()
