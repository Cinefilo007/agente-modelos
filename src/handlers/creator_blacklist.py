import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ConversationHandler
from src.services.database import db

logger = logging.getLogger(__name__)

ASK_USER, ASK_REASON, CONFIRM = range(3)

async def blacklist_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🛡️ <b>Lista Negra Global</b>\n\n"
        "Protege a toda la comunidad NebulaStar. Si bloqueas a un usuario aquí, se impedirá su interacción con la red.\n\n"
        "Por favor, envíame el <b>ID numérico</b> del usuario (ej. 123456789) O <b>reenvíame un mensaje directo</b> de esa persona.",
        parse_mode="HTML"
    )
    return ASK_USER

async def blacklist_get_user(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.message
    target_id = None
    target_username = ""

    # Detección de Forward (Reenvío)
    if msg.forward_origin:
        if getattr(msg.forward_origin, 'type', None) == 'user':
            target_id = msg.forward_origin.sender_user.id
            target_username = msg.forward_origin.sender_user.username or ""
        else:
            await update.message.reply_text("❌ No se pudo extraer el usuario de ese mensaje. Intenta enviar el ID numérico.")
            return ASK_USER
    else:
        # Detección de texto manual
        text = msg.text.strip()
        if text.isdigit():
            target_id = int(text)
        else:
            await update.message.reply_text("❌ Formato inválido. Por favor, envía un ID numérico o reenvía un mensaje del usuario.")
            return ASK_USER

    context.user_data['bl_target_id'] = target_id
    context.user_data['bl_target_username'] = target_username

    display_name = target_username if target_username else "Sin alias"
    await update.message.reply_text(
        f"✅ Usuario detectado:\n"
        f"🆔 <code>{target_id}</code> (@{display_name})\n\n"
        "Ahora, por favor, descríbeme el <b>motivo del bloqueo</b> (ej: Fraude, falta de respeto, spam...)",
        parse_mode="HTML"
    )
    return ASK_REASON

async def blacklist_get_reason(update: Update, context: ContextTypes.DEFAULT_TYPE):
    reason = update.message.text
    context.user_data['bl_reason'] = reason
    target_id = context.user_data['bl_target_id']

    keyboard = [
        [
            InlineKeyboardButton("✅ Confirmar Bloqueo", callback_data="bl_confirm"),
            InlineKeyboardButton("❌ Cancelar", callback_data="bl_cancel")
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(
        f"⚠️ <b>Confirmación de Lista Negra</b>\n\n"
        f"<b>ID Falso/Agresor:</b> <code>{target_id}</code>\n"
        f"<b>Motivo:</b> {reason}\n\n"
        "¿Estás 100% segura de añadir este perfil a la lista negra global de NebulaStar?",
        parse_mode="HTML",
        reply_markup=reply_markup
    )
    return CONFIRM

async def blacklist_confirm(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    if query.data == "bl_cancel":
        await query.edit_message_text("❌ Operación cancelada. El usuario NO fue añadido a la lista negra.")
        context.user_data.clear()
        return ConversationHandler.END

    target_id = context.user_data.get('bl_target_id')
    target_username = context.user_data.get('bl_target_username', '')
    reason = context.user_data.get('bl_reason', '')
    added_by = str(update.effective_user.id)

    if target_id and reason:
        db.add_to_blacklist(
            telegram_id=target_id,
            username=target_username,
            reason=reason,
            severity="high",
            added_by=added_by
        )
        await query.edit_message_text(
            "✅ <b>¡Bloqueo Exitoso!</b>\n\n"
            "El usuario ha sido añadido a la Lista Negra Global. Gracias por mantener segura a la comunidad.", 
            parse_mode="HTML"
        )
    else:
         await query.edit_message_text("❌ Error: Faltan datos para procesar el bloqueo.")
         
    context.user_data.clear()
    return ConversationHandler.END

async def blacklist_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Operación cancelada.")
    context.user_data.clear()
    return ConversationHandler.END

creator_blacklist_handler = ConversationHandler(
    entry_points=[CommandHandler("listanegra", blacklist_start)],
    states={
        ASK_USER: [MessageHandler(filters.TEXT | filters.FORWARDED, blacklist_get_user)],
        ASK_REASON: [MessageHandler(filters.TEXT & ~filters.COMMAND, blacklist_get_reason)],
        CONFIRM: [CallbackQueryHandler(blacklist_confirm, pattern="^bl_(confirm|cancel)$")]
    },
    fallbacks=[CommandHandler("cancel", blacklist_cancel)],
    per_message=False # Fix the warning about PTBUserWarning
)
