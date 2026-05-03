"""
Handler de Favoritas para el Bot de Fans.
Gestión de modelos favoritas: añadir, eliminar, listar.
"""
import logging
import html as html_lib
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CommandHandler, CallbackQueryHandler
from src.services.database import db

logger = logging.getLogger(__name__)


def e(text):
    return html_lib.escape(str(text or ""))


async def favoritas_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /favoritas — Lista las modelos favoritas del fan."""
    user = update.effective_user
    client = db.get_client(user.id)

    if not client:
        await update.message.reply_text("⚠️ Primero debes iniciar el bot con /start.")
        return

    favorites = db.get_fan_favorites(client["id"])

    if not favorites:
        await update.message.reply_text(
            "⭐ <b>No tienes favoritas todavía</b>\n\n"
            "Usa 🔍 Explorar para descubrir modelos y añadirlas a tus favoritas.",
            parse_mode="HTML"
        )
        return

    text = "⭐ <b>Tus Modelos Favoritas</b>\n\n"
    buttons = []

    for fav in favorites[:15]:
        model_info = fav.get("models") or {}
        name = e(model_info.get("artistic_name") or "Modelo")
        rating = model_info.get("reputation_score", 0)
        model_id = fav.get("model_id")

        text += f"✨ <b>{name}</b> — ⭐ {rating:.1f}\n"
        buttons.append([
            InlineKeyboardButton(f"👀 {name}", callback_data=f"explore_detail|{model_id}"),
            InlineKeyboardButton("💔 Quitar", callback_data=f"fav_remove|{model_id}")
        ])

    await update.message.reply_text(
        text,
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(buttons) if buttons else None
    )


async def fav_add_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Callback para añadir una modelo a favoritas."""
    query = update.callback_query
    await query.answer()

    _, model_id = query.data.split("|", 1)

    user = update.effective_user
    client = db.get_client(user.id)
    if not client:
        await query.answer("⚠️ Usa /start primero.", show_alert=True)
        return

    # Verificar si ya es favorita
    if db.is_fan_favorite(client["id"], model_id):
        await query.answer("⭐ Ya está en tus favoritas", show_alert=True)
        return

    result = db.add_fan_favorite(client["id"], model_id)
    if result:
        await query.answer("❤️ ¡Añadida a favoritas!", show_alert=True)
    else:
        await query.answer("⚠️ No se pudo añadir. Intenta de nuevo.", show_alert=True)


async def fav_remove_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Callback para eliminar una modelo de favoritas."""
    query = update.callback_query
    await query.answer()

    _, model_id = query.data.split("|", 1)

    user = update.effective_user
    client = db.get_client(user.id)
    if not client:
        await query.answer("⚠️ Usa /start primero.", show_alert=True)
        return

    success = db.remove_fan_favorite(client["id"], model_id)
    if success:
        await query.answer("💔 Eliminada de favoritas", show_alert=True)
        # Intentar actualizar el mensaje (quitar la modelo eliminada)
        try:
            await query.edit_message_text(
                text=query.message.text + "\n\n✅ Lista actualizada. Usa /favoritas para ver.",
                parse_mode="HTML"
            )
        except Exception:
            pass
    else:
        await query.answer("⚠️ Error al eliminar.", show_alert=True)


# Handlers exportables
favoritas_command_handler = CommandHandler("favoritas", favoritas_command)
fav_add_callback_handler = CallbackQueryHandler(fav_add_callback, pattern=r"^fav_add\|")
fav_remove_callback_handler = CallbackQueryHandler(fav_remove_callback, pattern=r"^fav_remove\|")
