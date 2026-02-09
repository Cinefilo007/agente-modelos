import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler
from src.services.database import db

logger = logging.getLogger(__name__)

# Estados de Callback
ACTION_APPROVE = "admin_approve"
ACTION_REJECT = "admin_reject"
ACTION_REPEAT = "admin_repeat"

ADMIN_ID = 1123020118

async def admin_callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja las acciones de los botones del Admin."""
    query = update.callback_query
    await query.answer() # Ack

    data = query.data
    # data format: "action|telegram_id"
    try:
        action, model_id_str = data.split("|")
        model_id = int(model_id_str)
    except ValueError:
        logger.error(f"Invalid callback data: {data}")
        return

    model = db.get_model(model_id)
    if not model:
        await query.answer("❌ Error: Modelo no encontrada en DB.", show_alert=True)
        return

    async def update_message(text):
        """Helper para editar texto o caption según el tipo de mensaje."""
        try:
            if query.message.photo:
                await query.edit_message_caption(caption=text)
            else:
                await query.edit_message_text(text=text)
        except Exception as e:
            logger.error(f"Error editing message: {e}")

    if action == ACTION_APPROVE:
        # 1. Update DB
        db.update_model(model_id, {"is_verified": True, "status": "verifying"})
        
        # 2. Notify Model
        try:
            await context.bot.send_message(
                chat_id=model_id,
                text="✅ *¡Verificación Aprobada!*\n\nTu perfil ha sido validado.\nAhora necesitamos configurar tu asistente.\n\nPor favor escribe */setup* para comenzar.",
                parse_mode="Markdown"
            )
            # Safe update for admin
            safe_user = model.get('username', 'Unknown').replace("<", "&lt;")
            await update_message(f"✅ Aprobada: {safe_user} ({model_id})")
        except Exception as e:
            logger.error(f"Error notifying model: {e}")
            await query.answer(f"⚠️ Error notificando: {e}", show_alert=True)

    elif action == ACTION_REJECT:
        db.update_model(model_id, {"status": "rejected"})
        try:
            await context.bot.send_message(
                chat_id=model_id,
                text="❌ *Verificación Rechazada*\n\nTu perfil no cumple con nuestros requisitos."
            )
            safe_user = model.get('username', 'Unknown').replace("<", "&lt;")
            await update_message(f"❌ Rechazada: {safe_user} ({model_id})")
        except:
            pass

    elif action == ACTION_REPEAT:
        # Update Status to trigger auto-flow
        db.update_model(model_id, {"status": "retry_needed"})
        try:
            await context.bot.send_message(
                chat_id=model_id,
                text="🔁 *Repetir Verificación*\n\nEl administrador ha marcado tu verificación como ilegible o incompleta.\nPor favor responde con 'Hola' para reiniciar el proceso."
            )
            safe_user = model.get('username', 'Unknown').replace("<", "&lt;")
            await update_message(f"🔁 Solicitado repetir a: {safe_user}")
        except:
            pass

def get_admin_keyboard(model_id):
    """Genera el teclado para el mensaje de verificación."""
    keyboard = [
        [
            InlineKeyboardButton("✅ Aprobar", callback_data=f"{ACTION_APPROVE}|{model_id}"),
            InlineKeyboardButton("🔁 Repetir", callback_data=f"{ACTION_REPEAT}|{model_id}"),
        ],
        [
            InlineKeyboardButton("❌ Rechazar", callback_data=f"{ACTION_REJECT}|{model_id}")
        ]
    ]
    return InlineKeyboardMarkup(keyboard)
