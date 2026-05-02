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
        "creadoras de contenido y sus fans. Sin censura, sin baneos, sin algoritmos que te escondan.\n\n"
        "━━━━━━━━━━━━━━━━\n"
        "🔥 <b>¿Por qué NebulaStar y no OnlyFans o Fansly?</b>\n\n"
        "En OnlyFans o Fansly, el feed solo muestra a las creadoras que ya sigues. "
        "Si eres nueva, <b>nadie te ve</b> y crecer es casi imposible sin traer toda tu audiencia.\n\n"
        "En NebulaStar es diferente: <b>nuestro feed muestra a TODAS las modelos</b>, "
        "sin importar si tienen 0 o 10.000 seguidores. Cada publicación que hagas llega a "
        "todos los usuarios de la plataforma desde el primer día. 🚀\n\n"
        "Además, los clientes pueden filtrar el feed por:\n"
        "📰 <b>Reciente</b> — Lo último publicado\n"
        "🔥 <b>Popular</b> — Lo más likeado\n"
        "💜 <b>Seguido</b> — Sus creadoras favoritas\n\n"
        "━━━━━━━━━━━━━━━━\n"
        "<b>Pasos para brillar:</b>\n"
        "1️⃣ <b>Crea tu perfil:</b> Haz clic en el botón de abajo para entrar a nuestra App.\n"
        "2️⃣ <b>Verifícate:</b> Nuestro equipo revisará rápidamente tu identidad.\n"
        "3️⃣ <b>¡Haz tu primer post!</b> Empieza a recibir tráfico y ventas directamente en tu chat privado.\n\n"
        "Toma el control de tu imperio. ¡Comienza ahora!"
    )

    keyboard = [
        [InlineKeyboardButton("✨ Entrar a NebulaStar", web_app=WebAppInfo(url=landing_url))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(text, parse_mode="HTML", reply_markup=reply_markup)

creator_onboarding_handler = CommandHandler("start", start_creator)
