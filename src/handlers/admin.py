import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CallbackQueryHandler
from src.services.database import db

logger = logging.getLogger(__name__)

# Estados de Callback
ACTION_APPROVE = "admin_approve"
ACTION_REJECT = "admin_reject"
ACTION_REPEAT = "admin_repeat"
ACTION_PAYOUT_APPROVE = "payout_approve"
ACTION_PAYOUT_REJECT = "payout_reject"
ACTION_PENDING_VIEW = "peticion_view"

import os
# SEGURIDAD: Migrado de constante a variable de entorno
ADMIN_ID = int(os.getenv("ADMIN_TELEGRAM_ID", "1123020118"))

async def admin_callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja las acciones de los botones del Admin."""
    query = update.callback_query
    logger.info(f"Admin Callback: {query.data} from {update.effective_user.id}")

    data = query.data
    # data format: "action|id_or_uuid"
    parts = data.split("|")
    if len(parts) < 2:
        logger.error(f"Invalid callback data: {data}")
        await query.answer("❌ Datos inválidos.", show_alert=True)
        return
    
    action = parts[0]
    id_str = parts[1]

    # model_id es int para onboarding (telegram_id), pero id_str es uuid para payouts.
    model_id = None
    if action in [ACTION_APPROVE, ACTION_REJECT, ACTION_REPEAT, ACTION_PENDING_VIEW]:
        try:
            model_id = int(id_str)
        except ValueError:
            logger.error(f"Expected integer model_id for {action}, got {id_str}")
            await query.answer("❌ Error de ID.", show_alert=True)
            return

    # 1. Fetch Model (si aplica)
    model = None
    if model_id:
        model = db.get_model(model_id)
        if not model:
            await query.answer("❌ Modelo no encontrada en DB.", show_alert=True)
            return

    # ACK DESPUÉS de validaciones — solo se llama UNA vez
    await query.answer()

    async def update_message(text, parse_mode=None):
        """Helper para editar texto o caption según el tipo de mensaje."""
        try:
            if query.message and query.message.photo:
                await query.edit_message_caption(caption=text, parse_mode=parse_mode)
            else:
                await query.edit_message_text(text=text, parse_mode=parse_mode)
        except Exception as e:
            logger.error(f"Error editing message: {e}")

    if action == ACTION_APPROVE:
        # 1. Update DB
        db.update_model(model_id, {"status": "active", "credits_balance": 100})
        
        # 2. Notify Model (sin romper el handler si falla)
        notif_ok = True
        try:
            await context.bot.send_message(
                chat_id=model_id,
                text="✅ *¡Aprobada!*\n\nTu solicitud ha sido aprobada. 🎁 Te hemos otorgado **100 créditos** para probar el asistente.\n\nPara que la IA empiece a trabajar, sigue estos pasos:\n1️⃣ Configura tu perfil enviando el comando /setup\n2️⃣ Ve a los ajustes de tu cuenta de Telegram (Debes tener **Premium**).\n3️⃣ Entra en **Telegram Business** > **Chatbot**.\n4️⃣ Agrega este bot a tu cuenta.\n\nEscribe /setup para empezar.",
                parse_mode="Markdown"
            )
        except Exception as e:
            notif_ok = False
            logger.error(f"Error notifying model {model_id}: {e}")

        # 3. Safe update for admin
        safe_user = model.get('username', 'Unknown').replace("<", "&lt;")
        status_text = f"✅ Aprobada: {safe_user} ({model_id})"
        if not notif_ok:
            status_text += "\n⚠️ (No se pudo notificar a la modelo)"
        await update_message(status_text)

    elif action == ACTION_REJECT:
        db.update_model(model_id, {"status": "rejected"})
        notif_ok = True
        try:
            await context.bot.send_message(
                chat_id=model_id,
                text="❌ Tu solicitud de aprobación ha sido rechazada por el administrador."
            )
        except Exception as e:
            notif_ok = False
            logger.error(f"Error rejecting model {model_id}: {e}")
        
        safe_user = model.get('username', 'Unknown').replace("<", "&lt;")
        status_text = f"❌ Rechazada: {safe_user} ({model_id})"
        if not notif_ok:
            status_text += "\n⚠️ (No se pudo notificar)"
        await update_message(status_text)

    elif action == ACTION_REPEAT:
        db.update_model(model_id, {"status": "prospect"})
        safe_user = model.get('username', 'Unknown').replace("<", "&lt;")
        await update_message(f"🔄 Repetir charla con: {safe_user} ({model_id})")
        try:
            await context.bot.send_message(
                chat_id=model_id,
                text="🔄 El administrador ha solicitado un poco más de información. Cuéntame más sobre ti."
            )
        except Exception as e:
            logger.error(f"Error sending repeat to {model_id}: {e}")

    elif action == ACTION_PENDING_VIEW:
        # Mostrar el panel de aprobación para este telegram_id
        safe_name = model.get('full_name', 'Modelo').replace('<', '&lt;')
        safe_user = model.get('username') or 'SinUser'
        card_text = (
            f"🕵️ <b>DETALLE DE SOLICITUD PENDIENTE</b>\n\n"
            f"👤 <b>Nombre</b>: {safe_name}\n"
            f"🔗 <b>Alias</b>: @{safe_user}\n"
            f"🆔 <code>{model_id}</code>\n\n"
            f"¿Qué deseas hacer con esta solicitud?"
        )
        await update_message(card_text, parse_mode="HTML")
        # Reutilizamos el teclado estándar de admin
        try:
            await query.edit_message_reply_markup(reply_markup=get_admin_keyboard(model_id))
        except Exception as e:
            logger.error(f"Error setting keyboard for {model_id}: {e}")

    elif action == ACTION_PAYOUT_APPROVE:
        tx_id = id_str
        logger.info(f"Manual payout approval triggered for TX {tx_id}")
        
        from src.services.payout_service import send_ton_payout
        import os
        
        # 1. Fetch TX
        tx_res = db.client.table("crypto_transactions").select("*").eq("id", tx_id).maybe_single().execute()
        if not tx_res.data or tx_res.data["status"] != "pending":
            await update_message("⚠️ Transacción ya procesada o no encontrada.")
            return

        tx = tx_res.data
        mnemonic = os.getenv("PAYOUT_WALLET_MNEMONIC")
        if not mnemonic:
            await update_message("❌ Error: PAYOUT_WALLET_MNEMONIC no configurado.")
            return

        await update_message("⚙️ Procesando liquidación blockchain...")
        
        success, result = await send_ton_payout(tx["details"]["destination"], float(tx["amount"]), mnemonic)
        
        if success:
            db.client.table("crypto_transactions").update({"status": "completed", "tx_hash": result}).eq("id", tx_id).execute()
            await update_message(f"✅ ¡Liquidación Exitosa!\n\nMonto: {tx['amount']} USDT\nHash: `{result}`")
        else:
            await update_message(f"❌ Fallo en Liquidación:\n\n{result}")

    elif action == ACTION_PAYOUT_REJECT:
        tx_id = id_str
        # 1. Fetch TX
        tx_res = db.client.table("crypto_transactions").select("*").eq("id", tx_id).maybe_single().execute()
        if not tx_res.data or tx_res.data["status"] != "pending":
            await update_message("⚠️ Transacción ya procesada.")
            return

        tx = tx_res.data
        user_uuid = tx["user_id"]
        amount = float(tx["amount"])

        # 2. Refund Wallet
        wallet_res = db.client.table("wallets").select("balance").eq("user_id", user_uuid).maybe_single().execute()
        if wallet_res.data:
            new_balance = float(wallet_res.data["balance"]) + amount
            db.client.table("wallets").update({"balance": new_balance}).eq("user_id", user_uuid).execute()
        
        # 3. Mark TX as failed/rejected
        db.client.table("crypto_transactions").update({"status": "failed"}).eq("id", tx_id).execute()
        
        await update_message(f"❌ Retiro Rechazado.\n\nSe han reintegrado {amount} USDT al saldo de la modelo.")

async def admin_list_pending_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /solicitudes: Lista modelos en estado 'pending'."""
    if update.effective_user.id != ADMIN_ID: return

    try:
        pendings = db.get_pending_models()
        if not pendings:
            await update.message.reply_text("✅ No hay solicitudes pendientes de aprobación (IA ventas).")
            return

        text = f"📋 **Solicitudes Pendientes ({len(pendings)})**\n\nSelecciona una para gestionar:"
        keyboard = []
        for p in pendings:
            name = p.get('full_name', 'Modelo')
            btn_text = f"👤 {name[:15]} (@{p.get('username', '...')})"
            keyboard.append([InlineKeyboardButton(btn_text, callback_data=f"{ACTION_PENDING_VIEW}|{p['telegram_id']}")])

        await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="Markdown")
    except Exception as e:
        logger.error(f"Error listing pendings: {e}")
        await update.message.reply_text("❌ Error al cargar solicitudes.")

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


# ============================================================
# DIFUSIÓN MASIVA — Comando /difusion (Solo Admin)
# ============================================================
from telegram.ext import ConversationHandler, CommandHandler, MessageHandler, filters

# Estados del ConversationHandler de difusión
DIFUSION_CONTENT = 0
DIFUSION_CONFIRM = 1

async def difusion_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Paso 1: Admin envía /difusion → Bot pide el contenido."""
    if update.effective_user.id != ADMIN_ID:
        return ConversationHandler.END

    # Obtener cantidad de destinatarios
    models = db.get_all_models_for_broadcast()
    count = len(models) if models else 0

    await update.message.reply_text(
        f"📢 *DIFUSIÓN MASIVA*\n\n"
        f"Destinatarias: *{count} modelos* (prospect, pending, active)\n\n"
        f"Envía el mensaje que deseas difundir.\n"
        f"Puedes enviar:\n"
        f"• Texto solo\n"
        f"• Foto con caption\n"
        f"• Video con caption\n"
        f"• Documento con caption\n\n"
        f"Escribe /cancelar para cancelar.",
        parse_mode="Markdown"
    )
    return DIFUSION_CONTENT


async def difusion_receive_content(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Paso 2: Recibe el contenido y pide confirmación."""
    msg = update.message

    # Guardar contenido en contexto
    content = {}
    if msg.photo:
        content["type"] = "photo"
        content["file_id"] = msg.photo[-1].file_id  # Mejor calidad
        content["caption"] = msg.caption or ""
    elif msg.video:
        content["type"] = "video"
        content["file_id"] = msg.video.file_id
        content["caption"] = msg.caption or ""
    elif msg.document:
        content["type"] = "document"
        content["file_id"] = msg.document.file_id
        content["caption"] = msg.caption or ""
    elif msg.text:
        content["type"] = "text"
        content["text"] = msg.text
    else:
        await msg.reply_text("⚠️ Tipo de contenido no soportado. Envía texto, foto, video o documento.")
        return DIFUSION_CONTENT

    context.user_data["difusion_content"] = content

    # Mostrar preview + pedir confirmación
    models = db.get_all_models_for_broadcast()
    count = len(models) if models else 0
    
    # Escapar contenido del usuario para evitar errores de Markdown
    from telegram.helpers import escape_markdown
    
    if content["type"] == "text":
        safe_preview = escape_markdown(content['text'][:200], version=1)
        if len(content['text']) > 200:
            safe_preview += "..."
        content_line = f"📝 *Mensaje*:\n{safe_preview}\n"
    else:
        raw_caption = content.get('caption', '(sin caption)')[:150]
        safe_caption = escape_markdown(raw_caption, version=1)
        content_line = f"📝 *Caption*: {safe_caption}\n"

    preview_text = (
        f"📋 *CONFIRMACIÓN DE DIFUSIÓN*\n\n"
        f"📄 *Tipo*: {content['type'].upper()}\n"
        f"👥 *Destinatarias*: {count} modelos\n"
        f"{content_line}"
        f"\n¿Confirmar envío? Escribe *SI* para enviar o /cancelar para abortar."
    )
    
    await msg.reply_text(preview_text, parse_mode="Markdown")
    return DIFUSION_CONFIRM


async def difusion_confirm(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Paso 3: Confirma y ejecuta el envío masivo."""
    if update.message.text.strip().upper() != "SI":
        await update.message.reply_text("❌ Difusión cancelada.")
        return ConversationHandler.END

    content = context.user_data.get("difusion_content")
    if not content:
        await update.message.reply_text("❌ Error: No hay contenido guardado. Inicia de nuevo con /difusion.")
        return ConversationHandler.END

    models = db.get_all_models_for_broadcast()
    if not models:
        await update.message.reply_text("⚠️ No hay modelos registradas para enviar.")
        return ConversationHandler.END

    total = len(models)
    enviados = 0
    fallidos = 0
    errores_detalle = []

    status_msg = await update.message.reply_text(f"⏳ Enviando a {total} modelos... (0/{total})")

    import asyncio
    for i, model in enumerate(models):
        tg_id = model["telegram_id"]
        try:
            if content["type"] == "text":
                await context.bot.send_message(
                    chat_id=tg_id,
                    text=content["text"]
                )
            elif content["type"] == "photo":
                await context.bot.send_photo(
                    chat_id=tg_id,
                    photo=content["file_id"],
                    caption=content.get("caption", "")
                )
            elif content["type"] == "video":
                await context.bot.send_video(
                    chat_id=tg_id,
                    video=content["file_id"],
                    caption=content.get("caption", "")
                )
            elif content["type"] == "document":
                await context.bot.send_document(
                    chat_id=tg_id,
                    document=content["file_id"],
                    caption=content.get("caption", "")
                )
            enviados += 1
        except Exception as e:
            fallidos += 1
            username = model.get("username", "desconocido")
            errores_detalle.append(f"@{username} ({tg_id}): {str(e)[:50]}")
            logger.warning(f"Difusión falló para {tg_id}: {e}")

        # Actualizar progreso cada 5 envíos
        if (i + 1) % 5 == 0 or (i + 1) == total:
            try:
                await status_msg.edit_text(f"⏳ Enviando... ({i + 1}/{total})")
            except Exception:
                pass

        # Rate limiting de Telegram: ~30 msg/seg, esperamos 0.1s por seguridad
        await asyncio.sleep(0.1)

    # Reporte final (sin parse_mode para evitar errores con contenido de errores)
    report = (
        f"📢 DIFUSIÓN COMPLETADA\n\n"
        f"✅ Enviados: {enviados}/{total}\n"
        f"❌ Fallidos: {fallidos}\n"
    )
    if errores_detalle:
        report += f"\n⚠️ Detalle de errores:\n"
        for err in errores_detalle[:10]:  # Max 10 errores en el reporte
            report += f"• {err}\n"
        if len(errores_detalle) > 10:
            report += f"• ... y {len(errores_detalle) - 10} más\n"

    await status_msg.edit_text(report)
    
    # Limpiar contexto
    context.user_data.pop("difusion_content", None)
    return ConversationHandler.END


async def difusion_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Cancela la difusión."""
    context.user_data.pop("difusion_content", None)
    await update.message.reply_text("❌ Difusión cancelada.")
    return ConversationHandler.END


# ConversationHandler de Difusión
difusion_handler = ConversationHandler(
    entry_points=[CommandHandler("difusion", difusion_start)],
    states={
        DIFUSION_CONTENT: [
            MessageHandler(filters.PHOTO | filters.VIDEO | filters.Document.ALL | (filters.TEXT & ~filters.COMMAND), difusion_receive_content)
        ],
        DIFUSION_CONFIRM: [
            MessageHandler(filters.TEXT & ~filters.COMMAND, difusion_confirm)
        ],
    },
    fallbacks=[CommandHandler("cancelar", difusion_cancel)],
)
