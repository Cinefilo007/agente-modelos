import logging
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ContextTypes, CommandHandler
from src.services.database import db

logger = logging.getLogger(__name__)

async def start_creator(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    
    # Asegurar que la modelo existe en BD (al menos un esqueleto)
    model = db.get_model(user.id)
    if not model:
        db.create_model(user.id, user.username or "Unknown", user.full_name)

    # URL de la aplicación
    landing_url = os.getenv("CREATOR_LANDING_URL", "https://nebulastar.app/creators")

    text = (
        f"🌟 <b>¡Bienvenida a NebulaStar, {user.first_name}!</b>\n\n"
        "Somos la <b>primera red social nativa en Telegram</b>, diseñada exclusivamente para "
        "creadoras de contenido y sus fans. Aquí publicas sin censura, sin miedo a baneos y escalas tu negocio.\n\n"
        "<b>Pasos para brillar:</b>\n"
        "1️⃣ <b>Crea tu perfil:</b> Haz clic en el botón de abajo para entrar a nuestra App y diseñar tu cuenta.\n"
        "2️⃣ <b>Verifícate:</b> Nuestro equipo revisará rápidamente tu perfil de identidad.\n"
        "3️⃣ <b>¡Haz tu primer post!</b> Empieza a recibir todo el tráfico y ventas directamente en tu chat privado.\n\n"
        "Toma el control de tu imperio. ¡Comienza ahora!"
    )

    keyboard = [
        [InlineKeyboardButton("✨ Entrar a NebulaStar", web_app=WebAppInfo(url=landing_url))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(text, parse_mode="HTML", reply_markup=reply_markup)

creator_onboarding_handler = CommandHandler("start", start_creator)
