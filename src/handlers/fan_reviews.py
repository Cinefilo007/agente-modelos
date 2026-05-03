"""
Handler de Reviews para el Bot de Fans.
ConversationHandler para dejar reviews + /misreviews.
"""
import logging
import html as html_lib
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    ContextTypes, CommandHandler, MessageHandler,
    CallbackQueryHandler, ConversationHandler, filters
)
from src.services.database import db

logger = logging.getLogger(__name__)

REVIEW_SELECT_MODEL = 0
REVIEW_RATING = 1
REVIEW_COMMENT = 2
REVIEW_CONFIRM = 3

def e(text):
    return html_lib.escape(str(text or ""))

async def review_start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    client = db.get_client(user.id)
    if not client:
        await update.message.reply_text("⚠️ Primero debes iniciar el bot con /start.")
        return ConversationHandler.END
    context.user_data["review_client_id"] = client["id"]
    models = db.get_verified_models_paginated(page=1, limit=10)
    if not models:
        await update.message.reply_text("🔍 No hay modelos disponibles para calificar.")
        return ConversationHandler.END
    buttons = []
    for m in models:
        name = e(m.get("artistic_name") or "Modelo")
        buttons.append([InlineKeyboardButton(f"✨ {name}", callback_data=f"review_pick|{m['id']}|{name[:20]}")])
    await update.message.reply_text(
        "📝 <b>Dejar Review</b>\n\nSelecciona la modelo:",
        parse_mode="HTML", reply_markup=InlineKeyboardMarkup(buttons)
    )
    return REVIEW_SELECT_MODEL

async def review_pick_model_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    parts = query.data.split("|")
    model_id = parts[1]
    model_name = parts[2] if len(parts) > 2 else "Modelo"
    user = update.effective_user
    client = db.get_client(user.id)
    if not client:
        await query.answer()
        await query.message.reply_text("⚠️ Usa /start primero.")
        return ConversationHandler.END
    if db.check_existing_review(client["id"], model_id):
        await query.answer(f"⚠️ Ya dejaste una review para {model_name}.", show_alert=True)
        await query.message.reply_text(f"⚠️ Ya dejaste una review para <b>{e(model_name)}</b>.", parse_mode="HTML")
        return ConversationHandler.END
    await query.answer()
    context.user_data.update({"review_client_id": client["id"], "review_model_id": model_id, "review_model_name": model_name})
    rating_buttons = [[
        InlineKeyboardButton(f"{'⭐'*i}", callback_data=f"review_rate|{i}") for i in range(1, 6)
    ]]
    await query.message.reply_text(
        f"📝 Review para: <b>{e(model_name)}</b>\n\n¿Calificación? (1-5)",
        parse_mode="HTML", reply_markup=InlineKeyboardMarkup(rating_buttons)
    )
    return REVIEW_RATING

async def review_rating_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    rating = int(query.data.split("|")[1])
    context.user_data["review_rating"] = rating
    model_name = context.user_data.get("review_model_name", "Modelo")
    await query.message.reply_text(
        f"📝 <b>{e(model_name)}</b> — {'⭐'*rating}\n\nEscribe tu comentario (5-500 chars).\n/cancelar para abortar.",
        parse_mode="HTML"
    )
    return REVIEW_COMMENT

async def review_comment_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    comment = update.message.text.strip()
    if len(comment) > 500:
        await update.message.reply_text("⚠️ Máximo 500 caracteres.")
        return REVIEW_COMMENT
    if len(comment) < 5:
        await update.message.reply_text("⚠️ Mínimo 5 caracteres.")
        return REVIEW_COMMENT
    context.user_data["review_comment"] = comment
    model_name = context.user_data.get("review_model_name", "Modelo")
    rating = context.user_data.get("review_rating", 0)
    confirm_buttons = [[
        InlineKeyboardButton("✅ Confirmar", callback_data="review_confirm|yes"),
        InlineKeyboardButton("❌ Cancelar", callback_data="review_confirm|no"),
    ]]
    await update.message.reply_text(
        f"📋 <b>Confirmar Review</b>\n\n🎯 {e(model_name)}\n⭐ {'⭐'*rating}\n💬 <i>{e(comment)}</i>\n\n¿Enviar?",
        parse_mode="HTML", reply_markup=InlineKeyboardMarkup(confirm_buttons)
    )
    return REVIEW_CONFIRM

async def review_confirm_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    if query.data.split("|")[1] == "no":
        await query.message.reply_text("❌ Review cancelada.")
        _cleanup(context)
        return ConversationHandler.END
    client_id = context.user_data.get("review_client_id")
    model_id = context.user_data.get("review_model_id")
    rating = context.user_data.get("review_rating")
    comment = context.user_data.get("review_comment")
    model_name = context.user_data.get("review_model_name", "Modelo")
    if not all([client_id, model_id, rating, comment]):
        await query.message.reply_text("❌ Datos incompletos. Intenta de nuevo.")
        _cleanup(context)
        return ConversationHandler.END
    result = db.add_fan_review(client_id, model_id, rating, comment)
    if result is None:
        await query.message.reply_text(f"⚠️ Ya existe una review tuya para <b>{e(model_name)}</b>.", parse_mode="HTML")
    else:
        await query.message.reply_text(
            f"✅ <b>¡Review enviada!</b>\n\n🎯 {e(model_name)} — {'⭐'*rating}\n💬 <i>{e(comment)}</i>\n\n¡Gracias!",
            parse_mode="HTML"
        )
    _cleanup(context)
    return ConversationHandler.END

async def mis_reviews_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    client = db.get_client(user.id)
    if not client:
        await update.message.reply_text("⚠️ Usa /start primero.")
        return
    reviews = db.get_fan_reviews_by_client(client["id"])
    if not reviews:
        await update.message.reply_text("📋 No has dejado ninguna review todavía.")
        return
    text = "📋 <b>Tus Reviews</b>\n\n"
    for r in reviews[:10]:
        mi = r.get("models") or {}
        name = e(mi.get("artistic_name") or "Modelo")
        text += f"✨ <b>{name}</b> — {'⭐'*r.get('rating',0)}\n💬 <i>{e(r.get('comment','')[:80])}</i>\n\n"
    await update.message.reply_text(text, parse_mode="HTML")

async def review_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    _cleanup(context)
    await update.message.reply_text("❌ Review cancelada.")
    return ConversationHandler.END

def _cleanup(context):
    for k in ["review_client_id","review_model_id","review_model_name","review_rating","review_comment"]:
        context.user_data.pop(k, None)

review_conversation_handler = ConversationHandler(
    entry_points=[
        CommandHandler("review", review_start_command),
        CallbackQueryHandler(review_pick_model_callback, pattern=r"^(review_pick|review_start)\|"),
    ],
    states={
        REVIEW_SELECT_MODEL: [CallbackQueryHandler(review_pick_model_callback, pattern=r"^review_pick\|")],
        REVIEW_RATING: [CallbackQueryHandler(review_rating_callback, pattern=r"^review_rate\|")],
        REVIEW_COMMENT: [MessageHandler(filters.TEXT & ~filters.COMMAND, review_comment_text)],
        REVIEW_CONFIRM: [CallbackQueryHandler(review_confirm_callback, pattern=r"^review_confirm\|")],
    },
    fallbacks=[CommandHandler("cancelar", review_cancel)],
    per_message=False,
)
mis_reviews_handler = CommandHandler("misreviews", mis_reviews_command)
