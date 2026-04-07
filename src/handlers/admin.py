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
    await query.answer() # Ack

    data = query.data
    # data format: "action|id_or_uuid"
    parts = data.split("|")
    if len(parts) < 2:
        logger.error(f"Invalid callback data: {data}")
        return
    
    action = parts[0]
    id_str = parts[1]

    # model_id es int para onboarding (telegram_id), pero id_str es uuid para payouts.
    # Evitaremos el int() global si no es necesario todavía.
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
        db.update_model(model_id, {"status": "active", "credits_balance": 100})
        
        # 2. Notify Model
        try:
            await context.bot.send_message(
                chat_id=model_id,
                text="✅ *¡Aprobada!*\n\nTu solicitud ha sido aprobada. 🎁 Te hemos otorgado **100 créditos** para probar el asistente.\n\nPara que la IA empiece a trabajar, sigue estos pasos:\n1️⃣ Configura tu perfil enviando el comando /setup\n2️⃣ Ve a los ajustes de tu cuenta de Telegram (Debes tener **Premium**).\n3️⃣ Entra en **Telegram Business** > **Chatbot**.\n4️⃣ Agrega este bot a tu cuenta.\n\nEscribe /setup para empezar.",
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
                text="❌ Tu solicitud de aprobación ha sido rechazada por el administrador."
            )
            safe_user = model.get('username', 'Unknown').replace("<", "&lt;")
            await update_message(f"❌ Rechazada: {safe_user} ({model_id})")
        except Exception as e:
            logger.error(f"Error rejecting model {model_id}: {e}")
            await update_message(f"❌ Rechazada (pero no notificada): {model_id}")

    elif action == ACTION_REPEAT:
        # Poner de nuevo en prospect para que el Hunter pueda hablar con ella si quiere
        db.update_model(model_id, {"status": "prospect"})
        safe_user = model.get('username', 'Unknown').replace("<", "&lt;")
        await update_message(f"🔄 Repetir charla con: {safe_user} ({model_id})")
        await context.bot.send_message(
            chat_id=model_id,
            text="🔄 El administrador ha solicitado un poco más de información. Cuéntame más sobre ti."
        )

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
        await update_message(card_text)
        # Reutilizamos el teclado estándar de admin
        await query.edit_message_reply_markup(reply_markup=get_admin_keyboard(model_id))

    elif action == ACTION_PAYOUT_APPROVE:
        tx_id = id_str # Aquí id_str es el UUID de la transacción
        logger.info(f"Manual payout approval triggered for TX {tx_id}")
        
        # We'll use the job queue function directly to avoid code duplication
        # But we need to create a dummy context/job or just refactor.
        # Let's refactor the core logic into a service later, for now call directly.
        from src.handlers.payout_jobs import process_auto_payout
        
        # We need a context-like object for process_auto_payout if it sends messages
        # For manual click, we can just process it.
        # Actually, let's just use the service directly here.
        from src.services.payout_service import send_ton_payout
        import os
        
        # 1. Fetch TX
        tx_res = db.client.table("crypto_transactions").select("*").eq("id", tx_id).maybe_single().execute()
        if not tx_res.data or tx_res.data["status"] != "pending":
            await query.answer("⚠️ Transacción ya procesada o no encontrada.", show_alert=True)
            return

        tx = tx_res.data
        mnemonic = os.getenv("PAYOUT_WALLET_MNEMONIC")
        if not mnemonic:
            await query.answer("❌ Error: PAYOUT_WALLET_MNEMONIC no configurado.", show_alert=True)
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
            await query.answer("⚠️ Transacción ya procesada.", show_alert=True)
            return

        tx = tx_res.data
        user_uuid = tx["user_id"]
        amount = float(tx["amount"])

        # 2. Refund Wallet
        # We increment balance back
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
