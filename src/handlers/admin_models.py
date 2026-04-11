import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ConversationHandler
from src.services.database import db
from src.handlers.admin import ADMIN_ID

logger = logging.getLogger(__name__)

# --- MODEL MANAGEMENT ---

async def admin_list_models(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /modelos: Listar modelos."""
    user = update.effective_user
    if user.id != ADMIN_ID: return
    
    try:
        # Simple limit 20 for now
        response = db.client.table("models").select("*").order("created_at", desc=True).limit(20).execute()
        models = response.data
        
        if not models:
            text = "No hay modelos registradas."
        else:
            text = "👩‍🎤 **Gestión de Modelos** (Últimas 20)\n\n"
            keyboard = []
            
            for m in models:
                name = m.get('full_name', 'Sin Nombre')
                username = f"@{m.get('username')}" if m.get('username') else "No User"
                status_icon = "✅" if m.get('is_verified') else "⏳"
                
                btn_text = f"{status_icon} {name[:15]} ({username})"
                keyboard.append([InlineKeyboardButton(btn_text, callback_data=f"adm_mod_view|{m['id']}")])
        
        # Send or Edit
        if update.callback_query:
            await update.callback_query.edit_message_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="Markdown")
        else:
            await update.message.reply_text(text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="Markdown")
        
    except Exception as e:
        logger.error(f"Error listing models: {e}")
        if update.callback_query:
            await update.callback_query.message.reply_text("Error al obtener modelos.")
        else:
            await update.message.reply_text("Error al obtener modelos.")

async def admin_model_view_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ver detalle de modelo."""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    _, model_id = data.split("|")
    
    # Get details
    model = db.get_model_by_uuid(model_id)
    if not model:
        await query.edit_message_text("❌ Modelo no encontrada.")
        return
        
    text = (
        f"👩‍🎤 **Detalle de Modelo**\n\n"
        f"🆔 UUID: `{model['id']}`\n"
        f"👤 Telegram ID: `{model['telegram_id']}`\n"
        f"📛 Nombre: {model.get('full_name')}\n"
        f"🔗 Usuario: @{model.get('username')}\n"
        f"🔢 Edad: {model.get('age')}\n"
        f"🌍 País: {model.get('country')}\n"
        f"💎 Créditos: `{model.get('credits_balance', 0)}`\n"
        f"📊 Estado: {model.get('status')}\n"
        f"✅ Verificada: {model.get('is_verified')}"
    )
    
    keyboard = [
        [InlineKeyboardButton("✏️ Editar Saldo", callback_data=f"adm_mod_edit_credits|{model_id}")],
        [InlineKeyboardButton("🗑️ Eliminar", callback_data=f"adm_mod_delete|{model_id}")],
        [InlineKeyboardButton("↩️ Volver", callback_data="adm_mod_list")]
    ]
    
    await query.edit_message_text(text, parse_mode="Markdown", reply_markup=InlineKeyboardMarkup(keyboard))

async def admin_model_action_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Acciones simples (eliminar, volver)."""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    action = data.split("|")[0]
    
    if action == "adm_mod_list":
        await admin_list_models(update, context) # Pass update directly (contains callback_query)
        return
        
    if action == "adm_mod_delete":
        model_id = data.split("|")[1]
        # Soft delete or Hard delete? DB schema doesn't have deleted_at, so hard delete for now? 
        # Or just set status to 'banned'. Safer.
        db.update_model_by_uuid(model_id, {"status": "banned"})
        await query.edit_message_text("🚫 Modelo baneada/eliminada logicamente.")
        return

# Conversation for Editing Credits manually via Button
EDIT_MOD_CREDITS = 20

async def edit_mod_credits_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    model_id = query.data.split("|")[1]
    context.user_data['edit_mod_id'] = model_id
    
    await query.message.reply_text("💰 Envía el **NUEVO BALANCE TOTAL** de créditos para esta modelo (Número):")
    return EDIT_MOD_CREDITS

async def edit_mod_credits_save(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    if not text.isdigit():
        await update.message.reply_text("⚠️ Debe ser número.")
        return EDIT_MOD_CREDITS
        
    new_balance = int(text)
    model_id = context.user_data['edit_mod_id']
    
    db.update_model_by_uuid(model_id, {"credits_balance": new_balance})
    
    await update.message.reply_text(f"✅ Balance actualizado a {new_balance}.\nUsa /modelos para volver.")
    return ConversationHandler.END

async def cancel_mod_edit(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Cancelado.")
    return ConversationHandler.END

edit_model_handler = ConversationHandler(
    per_message=False,
    entry_points=[CallbackQueryHandler(edit_mod_credits_start, pattern="^adm_mod_edit_credits")],
    states={
        EDIT_MOD_CREDITS: [MessageHandler(filters.TEXT & ~filters.COMMAND, edit_mod_credits_save)]
    },
    fallbacks=[CommandHandler("cancel", cancel_mod_edit)]
)

async def admin_verify_model_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Comando /verificar_modelo <username_o_id>
    Solo para admins. Marca a la modelo como verificada, activa y le suma 100 créditos.
    """
    user = update.effective_user
    if user.id != ADMIN_ID:
        return

    if not context.args:
        await update.message.reply_text("⚠️ Uso incorrecto. \nFormato: `/verificar_modelo <username_o_id_telegram>`", parse_mode="Markdown")
        return

    identifier = context.args[0]
    model = db.get_model_by_username_or_id(identifier)

    if not model:
        await update.message.reply_text(f"❌ No se encontró una modelo con el identificador `{identifier}`.", parse_mode="Markdown")
        return

    # Update model
    model_uuid = model['id']
    current_credits = model.get('credits_balance', 0)
    new_credits = current_credits + 100

    updates = {
        "status": "active",
        "is_verified": True,
        "credits_balance": new_credits
    }

    result = db.update_model_by_uuid(model_uuid, updates)

    if result:
        model_name = model.get('full_name', identifier)
        await update.message.reply_text(
            f"✅ **Modelo Verificada Exitosamente**\n\n"
            f"👩‍🎤 Modelo: {model_name}\n"
            f"📊 Nuevo Estado: `Activa`\n"
            f"✅ Verificada: `Sí`\n"
            f"💎 Créditos: `{new_credits}` (+100)",
            parse_mode="Markdown"
        )
        
        # Notificar a la modelo
        try:
            telegram_id = model['telegram_id']
            await context.bot.send_message(
                chat_id=telegram_id,
                text="🎉 **¡Felicidades! Tu cuenta ha sido verificada y activada.**\n\n"
                     "Te hemos regalado **100 créditos iniciales** para que pruebes nuestro sistema.\n"
                     "Si aún no lo has hecho, usa el comando /setup para configurar tus preferencias y tarifas.",
                parse_mode="Markdown"
            )
        except Exception as e:
            logger.error(f"Error notificando a la modelo {identifier}: {e}")
            await update.message.reply_text("⚠️ *Nota:* No se pudo enviar el mensaje automático a la modelo (puede haber bloqueado al bot).", parse_mode="Markdown")
            
    else:
        await update.message.reply_text("❌ Ocurrió un error al intentar actualizar la base de datos.")

