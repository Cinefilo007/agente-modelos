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
    # Obtener el UUID de la modelo (added_by es FK a models.id, no telegram_id)
    reporter_model = db.get_model(update.effective_user.id)
    added_by = reporter_model['id'] if reporter_model else None

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

# ============================================================
# CONSULTA RÁPIDA DE LISTA NEGRA POR REENVÍO DE MENSAJE
# La modelo simplemente reenvía un mensaje de un usuario
# sospechoso y el bot responde con su estado y reputación.
# ============================================================

def _resolve_added_by(added_by_uuid):
    """Resuelve el UUID de added_by al nombre/username de la modelo que reportó."""
    if not added_by_uuid:
        return "Sistema / Admin"
    try:
        model = db.get_model_by_uuid(added_by_uuid)
        if model:
            name = model.get('artistic_name') or model.get('full_name') or model.get('username', 'Desconocido')
            username = model.get('username', '')
            return f"{name} (@{username})" if username else name
        return "Modelo eliminada"
    except Exception:
        return "No disponible"

def _severity_display(severity: str) -> str:
    """Convierte el código de severidad a texto visual."""
    mapping = {
        "high": "🔴 ALTA — Peligro confirmado",
        "medium": "🟡 MEDIA — Comportamiento sospechoso",
    }
    return mapping.get(severity, f"⚪ {severity.upper() if severity else 'N/A'}")

def _build_reputation_card(target_id: int, display_name: str):
    """Construye la tarjeta de consulta de reputación para un usuario dado."""
    blacklist_entry = db.check_blacklist(target_id)
    client_data = db.get_client_reputation(target_id)
    report_count = db.count_blacklist_reports(target_id)
    
    if blacklist_entry:
        motivo = blacklist_entry.get('reason', 'No especificado')
        severidad = blacklist_entry.get('severity', 'N/A')
        fecha_bl = blacklist_entry.get('created_at', '')[:10]
        added_by = _resolve_added_by(blacklist_entry.get('added_by'))
        
        status_icon = "🚫"
        status_text = "EN LISTA NEGRA"
        status_detail = (
            f"⚠️ <b>Motivo:</b> {motivo}\n"
            f"{_severity_display(severidad)}\n"
            f"📅 <b>Desde:</b> {fecha_bl}\n"
            f"👮 <b>Reportado por:</b> {added_by}"
        )
    else:
        status_icon = "✅"
        status_text = "NO está en Lista Negra"
        status_detail = ""
    
    # Reputación del cliente (si existe en el sistema)
    if client_data:
        reputation = client_data.get('global_reputation', 100)
        is_bl_flag = client_data.get('is_blacklisted', False)
        
        if reputation >= 80:
            rep_emoji = "🟢"
        elif reputation >= 50:
            rep_emoji = "🟡"
        else:
            rep_emoji = "🔴"
        
        rep_section = (
            f"\n{rep_emoji} <b>Reputación:</b> {reputation}/100\n"
            f"📊 <b>Reportes previos:</b> {report_count}"
        )
        if is_bl_flag:
            rep_section += "\n⛔ <b>Flag interno:</b> Marcado como bloqueado en su perfil de cliente"
        
        system_status = "Cliente registrado en NebulaStar"
    else:
        rep_section = (
            f"\n📊 <b>Reportes previos:</b> {report_count}\n"
            "🔍 <i>Este usuario no está registrado como cliente en NebulaStar.</i>"
        )
        system_status = "Sin perfil en el sistema"
    
    card = (
        f"{status_icon} <b>CONSULTA DE REPUTACIÓN</b>\n"
        f"{'━' * 28}\n\n"
        f"👤 <b>{display_name}</b>\n"
        f"🆔 <code>{target_id}</code>\n"
        f"📋 {system_status}\n\n"
        f"<b>Lista Negra:</b> {status_text}\n"
        f"{status_detail}"
        f"{rep_section}"
    )
    
    return card, blacklist_entry

async def blacklist_check_forward(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler que intercepta mensajes reenviados para consultar estado de lista negra."""
    msg = update.message
    
    if not msg or not msg.forward_origin:
        return
    
    forward_type = getattr(msg.forward_origin, 'type', None)
    
    if forward_type == 'user':
        target_user = msg.forward_origin.sender_user
        target_id = target_user.id
        target_username = target_user.username or ""
        target_name = target_user.first_name or target_username or "Desconocido"
    elif forward_type == 'hidden_user':
        await msg.reply_text(
            "⚠️ <b>Privacidad Activada</b>\n\n"
            "Este usuario tiene la privacidad de reenvío activada en Telegram y no se puede identificar.\n\n"
            "Para consultar manualmente, usa:\n"
            "<code>/consultarbl 123456789</code> (con el ID numérico del usuario)",
            parse_mode="HTML"
        )
        return
    else:
        await msg.reply_text("❌ No se pudo identificar al usuario de ese mensaje reenviado.")
        return
    
    display_name = f"@{target_username}" if target_username else target_name
    card, blacklist_entry = _build_reputation_card(target_id, display_name)
    
    if not blacklist_entry:
        keyboard = [[InlineKeyboardButton("🛡️ Reportar a Lista Negra", callback_data=f"bl_quick_{target_id}_{target_username}")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await msg.reply_text(card, parse_mode="HTML", reply_markup=reply_markup)
    else:
        await msg.reply_text(card, parse_mode="HTML")

async def blacklist_quick_report_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Callback del botón 'Reportar a Lista Negra' desde la tarjeta de consulta."""
    query = update.callback_query
    await query.answer()
    
    parts = query.data.split("_", 3)
    if len(parts) < 3:
        await query.edit_message_text("❌ Error procesando la solicitud.")
        return
    
    target_id = parts[2]
    target_username = parts[3] if len(parts) > 3 else ""
    
    await query.edit_message_text(
        f"🛡️ <b>Iniciar Reporte de Lista Negra</b>\n\n"
        f"Para reportar al usuario <code>{target_id}</code>"
        f"{' (@' + target_username + ')' if target_username else ''}, "
        f"usa el comando:\n\n"
        f"/listanegra\n\n"
        f"Y cuando te pida el ID, envía: <code>{target_id}</code>",
        parse_mode="HTML"
    )

async def blacklist_check_by_id(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /consultarbl para consultar por ID numérico (cuando el forward tiene privacidad)."""
    if not context.args or not context.args[0].isdigit():
        await update.message.reply_text(
            "📖 <b>Uso:</b> <code>/consultarbl 123456789</code>\n\n"
            "Envía el ID numérico de Telegram del usuario que deseas consultar.",
            parse_mode="HTML"
        )
        return
    
    target_id = int(context.args[0])
    
    # Intentar obtener username del sistema si existe
    client_data = db.get_client_reputation(target_id)
    username_display = client_data.get('username', '') if client_data else ''
    display_name = f"@{username_display}" if username_display else f"ID {target_id}"
    
    card, blacklist_entry = _build_reputation_card(target_id, display_name)
    
    if not blacklist_entry:
        keyboard = [[InlineKeyboardButton("🛡️ Reportar a Lista Negra", callback_data=f"bl_quick_{target_id}_{username_display}")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(card, parse_mode="HTML", reply_markup=reply_markup)
    else:
        await update.message.reply_text(card, parse_mode="HTML")

# Handler de reenvío (se registra por separado en bot_creadoras.py)
blacklist_forward_check_handler = MessageHandler(filters.FORWARDED & ~filters.COMMAND, blacklist_check_forward)
blacklist_quick_report_handler = CallbackQueryHandler(blacklist_quick_report_callback, pattern="^bl_quick_")

