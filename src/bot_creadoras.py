import os
import sys
import logging
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from telegram.ext import ApplicationBuilder, Application, CallbackQueryHandler, CommandHandler, MessageHandler, filters

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

load_dotenv()

bot_creadoras_app: Application = None

def build_app():
    global bot_creadoras_app
    token = os.getenv("TELEGRAM_CREATOR_TOKEN")
    if not token:
        logger.error("TELEGRAM_CREATOR_TOKEN not found in .env (for Creator Bot)")
        return None

    logger.info("Construyendo Bot de Creadoras...")
    
    bot_creadoras_app = ApplicationBuilder().token(token).build()
    app = bot_creadoras_app

    # Handlers para Creadoras y Configuración de Agencia
    from src.handlers.creator_onboarding import creator_onboarding_handler
    from src.handlers.creator_blacklist import creator_blacklist_handler, blacklist_forward_check_handler, blacklist_quick_report_handler, blacklist_check_by_id
    from src.handlers.admin import admin_callback_handler, admin_list_pending_command, difusion_handler
    from src.handlers.profile import show_profile, profile_handler
    from src.handlers.credits import (
        list_packages, credit_purchase_callback, admin_credit_callback, admin_add_credits_command,
        admin_list_packages, admin_pkg_view_callback, admin_pkg_action_callback, create_pkg_handler,
        edit_pkg_handler
    )
    from src.handlers.admin_models import (
        admin_list_models, admin_model_view_callback, admin_model_action_callback, edit_model_handler, admin_verify_model_command
    )

    # Administracion Critica
    app.add_handler(CallbackQueryHandler(admin_credit_callback, pattern="^approve_credit"))
    app.add_handler(CallbackQueryHandler(admin_callback_handler, pattern="^(admin_approve|admin_reject|admin_repeat|payout_approve|payout_reject|peticion_view)"))
    
    # Conversaciones y Flujos de la Creadora
    app.add_handler(creator_onboarding_handler)
    app.add_handler(creator_blacklist_handler)
    app.add_handler(profile_handler)
    app.add_handler(create_pkg_handler)
    app.add_handler(edit_pkg_handler)
    app.add_handler(edit_model_handler)
    app.add_handler(difusion_handler)

    # Comandos Perfil / Paquetes / Admin
    app.add_handler(CommandHandler("perfil", show_profile))
    app.add_handler(CommandHandler("recargar", list_packages))
    app.add_handler(CommandHandler("dar_creditos", admin_add_credits_command))
    app.add_handler(CommandHandler("paquetes", admin_list_packages))
    app.add_handler(CommandHandler("modelos", admin_list_models))
    app.add_handler(CommandHandler("verificar_modelo", admin_verify_model_command))
    app.add_handler(CommandHandler("solicitudes", admin_list_pending_command))
    app.add_handler(CommandHandler("consultarbl", blacklist_check_by_id))

    # Callbacks especificos de creadoras
    app.add_handler(CallbackQueryHandler(credit_purchase_callback, pattern="^buy_credit"))
    app.add_handler(CallbackQueryHandler(admin_pkg_view_callback, pattern="^adm_pkg_view"))
    app.add_handler(CallbackQueryHandler(admin_pkg_action_callback, pattern="^(adm_pkg_toggle|adm_pkg_list)"))
    app.add_handler(CallbackQueryHandler(admin_model_view_callback, pattern="^adm_mod_view"))
    app.add_handler(CallbackQueryHandler(admin_model_action_callback, pattern="^adm_mod_(delete|list)"))
    app.add_handler(blacklist_quick_report_handler)
    
    # Handler de reenvío para consulta de lista negra (antes del fallback genérico)
    app.add_handler(blacklist_forward_check_handler)

    # Fallbacks y Mensajes no procesados
    async def _unhandled_callback(update, context):
        query = update.callback_query
        logger.warning(f"Callback no manejado (Creadoras): {query.data}")
        await query.answer()
    app.add_handler(CallbackQueryHandler(_unhandled_callback))

    from src.handlers.creator_onboarding import CREATOR_MENU_KEYBOARD, start_creator
    from src.handlers.creator_blacklist import blacklist_start
    from src.handlers.profile import show_profile

    # === MENÚ DE TEXTO (ReplyKeyboard de Creadoras) ===
    async def creator_menu_router(update, context):
        text = update.message.text.strip()
        if text == "👤 Mi Perfil":
            await show_profile(update, context)
        elif text == "🛡️ Lista Negra":
            await blacklist_start(update, context)
        elif text == "🔍 Consultar ID":
            await update.message.reply_text(
                "🛡️ <b>Consulta por ID</b>\n\n"
                "Para consultar el estado de un usuario, envía:\n"
                "<code>/consultarbl 123456789</code>",
                parse_mode="HTML"
            )
        elif text == "✨ Entrar a NebulaStar":
            await start_creator(update, context)
        else:
            await update.message.reply_text(
                "✨ Usa el menú inferior o escribe /start para ver las opciones.",
                reply_markup=CREATOR_MENU_KEYBOARD
            )

    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, creator_menu_router))
    
    return app

def main():
    app = build_app()
    if app:
        logger.info("Bot de Creadoras Iniciado. Escuchando...")
        app.run_polling(drop_pending_updates=True)

if __name__ == '__main__':
    main()
