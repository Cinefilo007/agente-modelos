import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CommandHandler, CallbackQueryHandler, ConversationHandler, MessageHandler, filters
from src.services.database import db
from src.handlers.admin import ADMIN_ID

logger = logging.getLogger(__name__)

async def list_packages(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /recargar: Lista paquetes de créditos."""
    try:
        # Obtener paquetes activos desde DB
        response = db.client.table("credit_packages").select("*").eq("is_active", True).order("price").execute()
        packages = response.data
        
        if not packages:
            await update.message.reply_text("⚠️ No hay paquetes de créditos disponibles en este momento.")
            return

        keyboard = []
        text = "💎 **Recarga de Créditos**\n\nSelecciona un paquete para solicitar una recarga:\n"
        
        for pkg in packages:
            btn_text = f"{pkg['name']} - {pkg['credits']} 💎 (${pkg['price']})"
            keyboard.append([InlineKeyboardButton(btn_text, callback_data=f"buy_credit|{pkg['id']}")])
            text += f"\n- *{pkg['name']}*: {pkg['credits']} créditos por ${pkg['price']}"

        await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="Markdown")

    except Exception as e:
        logger.error(f"Error listing packages: {e}")
        await update.message.reply_text("Error consultando paquetes.")

async def credit_purchase_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja la selección de un paquete."""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    _, package_id = data.split("|")
    user = update.effective_user
    
    try:
        # Get Package Info
        pkg_resp = db.client.table("credit_packages").select("*").eq("id", package_id).single().execute()
        pkg = pkg_resp.data
        
        if not pkg:
            await query.edit_message_text("❌ Paquete no encontrado.")
            return

        # Notify Admin
        admin_text = (
            f"🛒 <b>SOLICITUD DE RECARGA</b>\n\n"
            f"👤 <b>Modelo</b>: <a href='tg://user?id={user.id}'>{user.full_name}</a> (@{user.username or 'SinUser'})\n"
            f"📦 <b>Paquete</b>: {pkg['name']}\n"
            f"💎 <b>Créditos</b>: {pkg['credits']}\n"
            f"💵 <b>Precio</b>: ${pkg['price']}\n\n"
            f"Por favor gestiona el pago con la modelo y luego aprueba."
        )
        
        keyboard = [
            [InlineKeyboardButton("✅ Aprobar Recarga", callback_data=f"approve_credit|{user.id}|{pkg['credits']}|{pkg['price']}")]
        ]
        
        await context.bot.send_message(
            chat_id=ADMIN_ID,
            text=admin_text,
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode="HTML"
        )
        
        await query.edit_message_text(
            f"✅ **Solicitud Enviada**\n\nHas solicitado el **{pkg['name']}**.\n"
            f"El administrador te contactará para el pago.\n"
            f"Una vez confirmado, tus créditos se acreditarán automáticamente.",
            parse_mode="Markdown"
        )
        
    except Exception as e:
        logger.error(f"Error creating purchase request: {e}")
        await query.edit_message_text("❌ Error procesando solicitud.")

async def admin_credit_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja la aprobación de recargas por parte del Admin."""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    try:
        # approve_credit|user_id|credits|amount
        parts = data.split("|")
        user_id = int(parts[1])
        credits = int(parts[2])
        amount = int(parts[3])
        
        # 1. Update Balance
        model = db.get_model(user_id)
        if not model:
            await query.edit_message_text("❌ Error: Modelo no encontrada.")
            return
            
        new_balance = model.get('credits_balance', 0) + credits
        db.update_model(user_id, {"credits_balance": new_balance})
        
        # 2. Log Transaction
        # TODO: Add proper transaction log if needed
        
        # 3. Notify Model
        await context.bot.send_message(
            chat_id=user_id,
            text=f"💎 **¡Recarga Exitosa!**\n\nSe han acreditado +{credits} créditos a tu cuenta.\n💰 Balance actual: `{new_balance}`",
            parse_mode="Markdown"
        )
        
        await query.edit_message_text(f"✅ Recarga aprobada para {user_id}. (+{credits} diamantes)")
        
    except Exception as e:
        logger.error(f"Error approving credit: {e}")
        await query.edit_message_text(f"❌ Error interno: {e}")

    except ValueError:
        await update.message.reply_text("❌ Error: ID y Cantidad deben ser números.")

# --- ADMIN PACKAGE MANAGEMENT ---

async def admin_add_credits_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando Admin: /dar_creditos [user_id] [cantidad]"""
    user = update.effective_user
    if user.id != ADMIN_ID:
        return # Ignore non-admins
        
    args = context.args
    if len(args) != 2:
        await update.message.reply_text("Uso: /dar_creditos [id_telegram] [cantidad]")
        return
        
    try:
        target_id = int(args[0])
        amount = int(args[1])
        
        model = db.get_model(target_id)
        if not model:
            await update.message.reply_text("❌ Modelo no encontrada.")
            return

        new_balance = model.get('credits_balance', 0) + amount
        db.update_model(target_id, {"credits_balance": new_balance})
        
        await update.message.reply_text(f"✅ Recarga manual exitosa. Nuevo balance de {target_id}: {new_balance}")
        
        try:
            await context.bot.send_message(
                chat_id=target_id,
                text=f"🎁 **¡Has recibido un bono!**\n\nEl admin te ha enviado +{amount} créditos.\n💰 Balance actual: `{new_balance}`",
                parse_mode="Markdown"
            )
        except:
            await update.message.reply_text("⚠️ No pude notificar a la modelo (quizás bloqueó el bot), pero el saldo se actualizó.")
            
    except ValueError:
        await update.message.reply_text("❌ Error: ID y Cantidad deben ser números.")

PKG_NAME, PKG_CREDITS, PKG_PRICE = range(3)

async def admin_list_packages(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /paquetes: Gestión de paquetes."""
    user = update.effective_user
    if user.id != ADMIN_ID: return

    response = db.client.table("credit_packages").select("*").order("price").execute()
    packages = response.data

    text = "📦 **Gestión de Paquetes**\n\n"
    keyboard = []

    for pkg in packages:
        status = "✅" if pkg['is_active'] else "🔴"
        btn_text = f"{status} {pkg['name']} (${pkg['price']})"
        # Action to toggle/edit
        keyboard.append([InlineKeyboardButton(btn_text, callback_data=f"adm_pkg_view|{pkg['id']}")])
        text += f"{status} *{pkg['name']}* ({pkg['credits']} cr) - ${pkg['price']}\n"

    keyboard.append([InlineKeyboardButton("➕ Nuevo Paquete", callback_data="adm_pkg_new")])
    
    # Support for both Command and Callback
    if update.callback_query:
        await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="Markdown")
    else:
        await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="Markdown")

async def admin_pkg_view_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ver detalles y acciones de un paquete."""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    _, pkg_id = data.split("|")
    
    pkg = db.client.table("credit_packages").select("*").eq("id", pkg_id).single().execute().data
    if not pkg:
        await query.edit_message_text("❌ Paquete no encontrado.")
        return

    status = "Activo" if pkg['is_active'] else "Inactivo"
    toggle_btn = "🔴 Desactivar" if pkg['is_active'] else "✅ Activar"
    
    text = (
        f"📦 **{pkg['name']}**\n"
        f"💎 Créditos: `{pkg['credits']}`\n"
        f"💵 Precio: `${pkg['price']}`\n"
        f"Estado: {status}"
    )
    
    keyboard = [
        [InlineKeyboardButton("✏️ Editar", callback_data=f"adm_pkg_edit|{pkg['id']}")],
        [InlineKeyboardButton(toggle_btn, callback_data=f"adm_pkg_toggle|{pkg['id']}")],
        [InlineKeyboardButton("🗑️ Eliminar (Soft)", callback_data=f"adm_pkg_toggle|{pkg['id']}")],
        [InlineKeyboardButton("↩️ Volver", callback_data="adm_pkg_list")]
    ]
    
    await query.edit_message_text(text, parse_mode="Markdown", reply_markup=InlineKeyboardMarkup(keyboard))

async def admin_pkg_action_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Toggle status or list."""
    query = update.callback_query
    await query.answer()
    data = query.data
    
    if data == "adm_pkg_list":
        # Navegación corregida: Volver a lista editando el mensaje
        await admin_list_packages(update, context) # Pasamos update directo
        return

    action, pkg_id = data.split("|")
    
    if action == "adm_pkg_toggle":
        # Get current
        pkg = db.client.table("credit_packages").select("is_active").eq("id", pkg_id).single().execute().data
        new_status = not pkg['is_active']
        db.client.table("credit_packages").update({"is_active": new_status}).eq("id", pkg_id).execute()
        
        # Refresh View
        await admin_pkg_view_callback(update, context) # Reuse view logic passing the same ID in query.data (hacky but works if ID is there)
        # Actually query.data is 'adm_pkg_toggle|ID', view expects 'adm_pkg_view|ID'
        # Let's just fix the call:
        query.data = f"adm_pkg_view|{pkg_id}"
        await admin_pkg_view_callback(update, context)

# --- CREATE PACKAGE CONVERSATION ---

async def create_pkg_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    await query.message.reply_text("➕ **Nuevo Paquete**\n\n1️⃣ Escribe el **Nombre** del paquete (Ej: Super Pack):")
    return PKG_NAME

async def create_pkg_name(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data['new_pkg_name'] = update.message.text
    await update.message.reply_text("2️⃣ Escribe la cantidad de **Créditos** (Número):")
    return PKG_CREDITS

async def create_pkg_credits(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message.text.isdigit():
        await update.message.reply_text("⚠️ Debe ser un número.")
        return PKG_CREDITS
    context.user_data['new_pkg_credits'] = int(update.message.text)
    await update.message.reply_text("3️⃣ Escribe el **Precio** en USD (Número):")
    return PKG_PRICE

async def create_pkg_price(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message.text.isdigit():
        await update.message.reply_text("⚠️ Debe ser un número.")
        return PKG_PRICE
        
    price = int(update.message.text)
    name = context.user_data['new_pkg_name']
    credits = context.user_data['new_pkg_credits']
    
    # Insert DB
    db.client.table("credit_packages").insert({
        "name": name,
        "credits": credits,
        "price": price,
        "is_active": True
    }).execute()
    
    await update.message.reply_text(f"✅ Paquete **{name}** creado con éxito.\nUsa /paquetes para ver.")
    return ConversationHandler.END

async def cancel_create(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Creación cancelada.")
    return ConversationHandler.END

# --- EDIT PACKAGE CONVERSATION ---

EDIT_PKG_NAME, EDIT_PKG_CREDITS, EDIT_PKG_PRICE = range(3, 6)

async def edit_pkg_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Inicio del flujo de edición."""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    _, pkg_id = data.split("|")
    context.user_data['edit_pkg_id'] = pkg_id
    
    # Fetch current
    pkg = db.client.table("credit_packages").select("*").eq("id", pkg_id).single().execute().data
    context.user_data['edit_pkg_cache'] = pkg
    
    await query.message.reply_text(
        f"✏️ **Editando: {pkg['name']}**\n\n"
        f"Envía el nuevo **NOMBRE** (o escribe `-` para mantener `{pkg['name']}`):"
    )
    return EDIT_PKG_NAME

async def edit_pkg_name_step(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    if text != "-":
        context.user_data['edit_pkg_cache']['name'] = text
        
    current_cr = context.user_data['edit_pkg_cache']['credits']
    await update.message.reply_text(f"Envía los nuevos **CRÉDITOS** (o `-` para `{current_cr}`):")
    return EDIT_PKG_CREDITS

async def edit_pkg_credits_step(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    if text != "-":
        if not text.isdigit():
            await update.message.reply_text("⚠️ Debe ser un número.")
            return EDIT_PKG_CREDITS
        context.user_data['edit_pkg_cache']['credits'] = int(text)

    current_price = context.user_data['edit_pkg_cache']['price']
    await update.message.reply_text(f"Envía el nuevo **PRECIO** (o `-` para `${current_price}`):")
    return EDIT_PKG_PRICE

async def edit_pkg_price_step(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    if text != "-":
        if not text.isdigit():
            await update.message.reply_text("⚠️ Debe ser un número.")
            return EDIT_PKG_PRICE
        context.user_data['edit_pkg_cache']['price'] = int(text)
        
    # Save
    pkg = context.user_data['edit_pkg_cache']
    pkg_id = context.user_data['edit_pkg_id']
    
    db.client.table("credit_packages").update({
        "name": pkg['name'],
        "credits": pkg['credits'],
        "price": pkg['price']
    }).eq("id", pkg_id).execute()
    
    await update.message.reply_text(f"✅ Paquete actualizado correctamente.\nUsa /paquetes para ver.")
    return ConversationHandler.END

edit_pkg_handler = ConversationHandler(
    per_message=False,
    entry_points=[CallbackQueryHandler(edit_pkg_start, pattern="^adm_pkg_edit")],
    states={
        EDIT_PKG_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, edit_pkg_name_step)],
        EDIT_PKG_CREDITS: [MessageHandler(filters.TEXT & ~filters.COMMAND, edit_pkg_credits_step)],
        EDIT_PKG_PRICE: [MessageHandler(filters.TEXT & ~filters.COMMAND, edit_pkg_price_step)],
    },
    fallbacks=[CommandHandler("cancel", cancel_create)]
)

create_pkg_handler = ConversationHandler(
    per_message=False,
    entry_points=[CallbackQueryHandler(create_pkg_start, pattern="^adm_pkg_new")],
    states={
        PKG_NAME: [MessageHandler(filters.TEXT & ~filters.COMMAND, create_pkg_name)],
        PKG_CREDITS: [MessageHandler(filters.TEXT & ~filters.COMMAND, create_pkg_credits)],
        PKG_PRICE: [MessageHandler(filters.TEXT & ~filters.COMMAND, create_pkg_price)],
    },
    fallbacks=[CommandHandler("cancel", cancel_create)]
)
