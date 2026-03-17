import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ConversationHandler
from src.services.database import db

logger = logging.getLogger(__name__)

# States for editing
EDIT_FIELD = 10
EDIT_SAVE = 11

async def show_profile(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Muestra el perfil de la modelo."""
    user = update.effective_user
    model = db.get_model(user.id)
    
    if not model:
        await update.message.reply_text("❌ No tienes un perfil. Usa /start para registrarte.")
        return ConversationHandler.END

    # Layout del Perfil
    text = (
        f"👤 **PERFIL DE MODELO**\n\n"
        f"📛 **Nombre**: {model.get('full_name', 'N/A')}\n"
        f"🔢 **Edad**: {model.get('age', 'N/A')}\n"
        f"🌍 **País**: {model.get('country', 'N/A')}\n\n"
        f"💅 **Personalidad**: {model.get('config_persona', 'No definida')}\n"
        f"👙 **Físico**: {model.get('config_physique', 'No definido')}\n\n"
        f"💰 **Precios**: {model.get('config_prices', {}).get('raw_text', 'No definidos')}\n"
        f"💳 **Pagos**: {model.get('config_payments', {}).get('raw_text', 'No definidos')}\n"
        f"⏳ **Paciencia Bot**: `{model.get('config_patience', 10)} mensajes`\n\n"
        f"💎 **Créditos Disponibles**: `{model.get('credits_balance', 0)}`"
    )

    keyboard = [
        [InlineKeyboardButton("✏️ Editar Personalidad", callback_data="edit|config_persona")],
        [InlineKeyboardButton("✏️ Editar Físico", callback_data="edit|config_physique")],
        [InlineKeyboardButton("✏️ Editar Precios", callback_data="edit|config_prices")],
        [InlineKeyboardButton("✏️ Editar Métodos de Pago", callback_data="edit|config_payments")],
        [InlineKeyboardButton("⏳ Ajustar Paciencia Bot", callback_data="edit|config_patience")],
        [InlineKeyboardButton("💎 Recargar Créditos", callback_data="goto_credits")] # Hook to credits handler
    ]
    
    await update.message.reply_text(text, parse_mode="Markdown", reply_markup=InlineKeyboardMarkup(keyboard))
    return ConversationHandler.END

async def profile_edit_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Maneja los clics en editar."""
    query = update.callback_query
    await query.answer()
    
    data = query.data
    
    if data == "goto_credits":
        # Hack simple: le pedimos que use el comando
        await query.message.reply_text("🔹 Para recargar, usa el comando: /recargar")
        return ConversationHandler.END
        
    action, field = data.split("|")
    
    field_names = {
        "config_persona": "Personalidad",
        "config_physique": "Físico",
        "config_prices": "Lista de Precios",
        "config_payments": "Métodos de Pago",
        "config_patience": "Paciencia del Bot (Número de mensajes)"
    }
    
    readable_name = field_names.get(field, field)
    context.user_data['edit_field'] = field
    
    await query.message.reply_text(f"✏️ **Editando {readable_name}**\n\nPor favor envía el nuevo contenido:")
    return EDIT_SAVE

async def save_profile_edit(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Guarda el cambio."""
    user = update.effective_user
    new_text = update.message.text
    field = context.user_data.get('edit_field')
    
    if not field:
        await update.message.reply_text("❌ Error de estado. Intenta de nuevo.")
        return ConversationHandler.END

    updates = {}
    if field in ['config_prices', 'config_payments']:
        updates[field] = {"raw_text": new_text}
    elif field == 'config_patience':
        # Validar que sea un número
        try:
            updates[field] = int(re.sub(r'\D', '', new_text))
        except:
            await update.message.reply_text("❌ Por favor envía un número válido.")
            return ConversationHandler.END
    else:
        updates[field] = new_text
        
    db.update_model(user.id, updates)
    
    await update.message.reply_text("✅ **Cambio Guardado**\nUsa /perfil para ver los cambios.", parse_mode="Markdown")
    return ConversationHandler.END

async def cancel_edit(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Edición cancelada.")
    return ConversationHandler.END

# Handler para editar
profile_handler = ConversationHandler(
    per_message=False,
    entry_points=[CallbackQueryHandler(profile_edit_callback, pattern="^(edit\||goto_credits)")],
    states={
        EDIT_SAVE: [MessageHandler(filters.TEXT & ~filters.COMMAND, save_profile_edit)],
    },
    fallbacks=[CommandHandler("cancel", cancel_edit)]
)
