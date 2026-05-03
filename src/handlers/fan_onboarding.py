"""
Handler de Onboarding para el Bot de Fans.
/start → Registro/verificación de blacklist → Menú principal
"""
import os
import logging
from telegram import (
    Update, ReplyKeyboardMarkup, KeyboardButton,
    InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
)
from telegram.ext import ContextTypes, CommandHandler
from src.services.database import db

logger = logging.getLogger(__name__)

# URL de la WebApp
WEBAPP_URL = os.getenv("LANDING_URL", "https://nebulastar.app/landing").replace("/landing", "")

# Menú persistente del bot de fans
FAN_MENU_KEYBOARD = ReplyKeyboardMarkup(
    [
        [KeyboardButton("🔍 Explorar"), KeyboardButton("⭐ Favoritas")],
        [KeyboardButton("📝 Dejar Review"), KeyboardButton("📋 Mis Reviews")],
        [KeyboardButton("🌐 Abrir NebulaStar")]
    ],
    resize_keyboard=True,
    is_persistent=True
)


async def start_fan(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler del comando /start para clientes/fans."""
    user = update.effective_user
    logger.info(f"Fan {user.id} ({user.username}) inició el bot de fans.")

    # 1. Verificar blacklist global
    blacklisted = db.check_blacklist(user.id)
    if blacklisted:
        await update.message.reply_text(
            "⛔ Tu cuenta ha sido suspendida de la plataforma.\n\n"
            "Si crees que es un error, contacta al soporte.",
        )
        return

    # 2. Crear o recuperar cliente
    client = db.get_client(user.id)
    if not client:
        client = db.create_client_user(user.id, user.username or "fan_anon")
        is_new = True
    else:
        is_new = False

    # 3. Verificar si ya está marcado como blacklisted en clients
    if client and client.get("is_blacklisted"):
        await update.message.reply_text(
            "⛔ Tu cuenta ha sido suspendida de la plataforma.",
        )
        return

    # 4. Mensaje de bienvenida
    if is_new:
        welcome_text = (
            f"🌟 <b>¡Bienvenido a NebulaStar, {user.first_name}!</b>\n\n"
            "Soy tu asistente en la plataforma. Desde aquí podrás:\n\n"
            "🔍 <b>Explorar</b> — Descubrir creadoras verificadas\n"
            "⭐ <b>Favoritas</b> — Guardar las modelos que más te gusten\n"
            "📝 <b>Reviews</b> — Compartir tu experiencia con las creadoras\n"
            "🌐 <b>NebulaStar</b> — Acceder a la plataforma completa\n\n"
            "Usa el menú de abajo para navegar. ¡Disfruta! 🚀"
        )
    else:
        welcome_text = (
            f"👋 <b>¡Hola de nuevo, {user.first_name}!</b>\n\n"
            "Usa el menú de abajo para explorar, revisar tus favoritas o dejar reviews."
        )

    await update.message.reply_text(
        welcome_text,
        parse_mode="HTML",
        reply_markup=FAN_MENU_KEYBOARD
    )


async def open_webapp_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Abre la WebApp de NebulaStar."""
    keyboard = [
        [InlineKeyboardButton("🌐 Abrir NebulaStar", web_app=WebAppInfo(url=WEBAPP_URL))]
    ]
    await update.message.reply_text(
        "🌐 Haz clic en el botón para acceder a la plataforma completa:",
        reply_markup=InlineKeyboardMarkup(keyboard)
    )


# Handler exportable
fan_start_handler = CommandHandler("start", start_fan)
