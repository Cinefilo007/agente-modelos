"""
Handler de Exploración para el Bot de Fans.
Comando /explorar y /buscar — Catálogo de modelos con paginación inline.
"""
import os
import logging
import html as html_lib
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, CommandHandler, CallbackQueryHandler
from src.services.database import db

logger = logging.getLogger(__name__)

WEBAPP_URL = os.getenv("LANDING_URL", "https://nebulastar.app/landing").replace("/landing", "")
MODELS_PER_PAGE = 1


def e(text):
    """Escapar HTML para Telegram."""
    return html_lib.escape(str(text or ""))


def rating_stars(score):
    """Convierte score decimal a formato numérico base 5."""
    if not score or score == 0:
        return "0/5"
    if score == int(score):
        return f"{int(score)}/5"
    return f"{score:.1f}/5"


async def explorar_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /explorar — Muestra la primera página de modelos."""
    await send_explore_page(update.message, context, page=1)


async def explorar_menu_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler para el botón del menú '🔍 Explorar'."""
    await send_explore_page(update.message, context, page=1)


async def send_explore_page(message, context, page: int):
    """Envía una página del catálogo de modelos (1 modelo por página)."""
    models = db.get_verified_models_paginated(page=page, limit=MODELS_PER_PAGE)
    total = db.count_verified_models()
    total_pages = max(1, (total + MODELS_PER_PAGE - 1) // MODELS_PER_PAGE)

    if not models:
        await message.reply_text(
            "🔍 No hay modelos disponibles en este momento.\n"
            "¡Vuelve pronto!"
        )
        return

    for model in models:
        name = e(model.get("artistic_name") or "Modelo")
        bio = e(model.get("bio_short") or "Sin descripción")
        if len(bio) > 100:
            bio = bio[:100] + "..."
        rating = rating_stars(model.get("reputation_score"))
        followers = model.get("followers_count", 0)
        model_id = model["id"]
        avatar_url = model.get("avatar_url")
        username = model.get("username")

        # Extraer servicios
        services = model.get("services") or []
        if isinstance(services, list):
            services_text = ", ".join(services) if services else "Sin servicios especificados"
        else:
            services_text = str(services)

        caption = (
            f"✨ <b>{name}</b>\n\n"
            f"📝 {bio}\n\n"
            f"⭐ <b>Rating:</b> {rating}\n"
            f"💼 <b>Servicios:</b> {services_text}\n"
            f"👥 {followers:,} seguidores"
        )

        # Botones por modelo
        buttons = [
            [
                InlineKeyboardButton("❤️ Favorita", callback_data=f"fav_add|{model_id}"),
                InlineKeyboardButton("📝 Review", callback_data=f"review_start|{model_id}|{name[:20]}"),
            ],
            [
                InlineKeyboardButton(
                    "🌐 Ver Perfil",
                    url=f"https://nebulastar.app/{username}" if username else f"https://nebulastar.app/profile/{model_id}"
                )
            ]
        ]
        
        # Botones de paginación adjuntos a la tarjeta para que sea intuitivo
        nav_buttons = []
        if page > 1:
            nav_buttons.append(InlineKeyboardButton("◀️ Anterior", callback_data=f"explore_page|{page - 1}"))
        nav_buttons.append(InlineKeyboardButton(f"📄 {page}/{total_pages}", callback_data="noop"))
        if page < total_pages:
            nav_buttons.append(InlineKeyboardButton("▶️ Siguiente", callback_data=f"explore_page|{page + 1}"))

        if nav_buttons:
            buttons.append(nav_buttons)

        markup = InlineKeyboardMarkup(buttons)

        # Enviar con foto si tiene avatar
        if avatar_url:
            try:
                await context.bot.send_photo(
                    chat_id=message.chat_id,
                    photo=avatar_url,
                    caption=caption,
                    parse_mode="HTML",
                    reply_markup=markup
                )
                continue
            except Exception as photo_err:
                logger.warning(f"Error enviando foto de modelo {model_id}: {photo_err}")

        # Fallback: solo texto
        await context.bot.send_message(
            chat_id=message.chat_id,
            text=caption,
            parse_mode="HTML",
            reply_markup=markup
        )


async def explore_page_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Callback para cambio de página en exploración."""
    query = update.callback_query
    await query.answer()

    _, page_str = query.data.split("|", 1)
    page = int(page_str)

    # Simplemente enviamos la nueva página.
    await send_explore_page(query.message, context, page=page)


async def noop_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Callback vacío para botones informativos."""
    await update.callback_query.answer()


async def buscar_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Comando /buscar <nombre> — Busca modelos por nombre artístico."""
    if not context.args:
        await update.message.reply_text(
            "🔍 Uso: /buscar <nombre>\n"
            "Ejemplo: /buscar valentina"
        )
        return

    query = " ".join(context.args)
    models = db.search_models_by_name(query, limit=10)

    if not models:
        await update.message.reply_text(
            f"🔍 No se encontraron modelos con el nombre '<b>{e(query)}</b>'.",
            parse_mode="HTML"
        )
        return

    text = f"🔍 Resultados para '<b>{e(query)}</b>':\n\n"
    buttons = []
    for m in models:
        name = e(m.get("artistic_name") or "Modelo")
        rating = m.get("reputation_score", 0)
        text += f"✨ <b>{name}</b> — ⭐ {rating:.1f}/5\n"
        buttons.append([
            InlineKeyboardButton(f"👀 {name}", callback_data=f"explore_detail|{m['id']}"),
            InlineKeyboardButton("❤️", callback_data=f"fav_add|{m['id']}")
        ])

    await update.message.reply_text(
        text,
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(buttons) if buttons else None
    )


async def explore_detail_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Muestra el detalle de una modelo al hacer clic en búsqueda."""
    query = update.callback_query
    await query.answer()

    _, model_id = query.data.split("|", 1)
    model = db.get_model_by_uuid(model_id)

    if not model:
        await query.message.reply_text("❌ Modelo no encontrada.")
        return

    name = e(model.get("artistic_name") or model.get("full_name") or "Modelo")
    bio = e(model.get("bio_short") or "Sin descripción")
    rating = rating_stars(model.get("reputation_score"))
    followers = model.get("followers_count", 0)
    avatar_url = model.get("avatar_url")
    username = model.get("username")

    # Extraer servicios
    services = model.get("services") or []
    if isinstance(services, list):
        services_text = ", ".join(services) if services else "Sin servicios especificados"
    else:
        services_text = str(services)

    caption = (
        f"✨ <b>{name}</b>\n\n"
        f"📝 {bio}\n\n"
        f"⭐ <b>Rating:</b> {rating}\n"
        f"💼 <b>Servicios:</b> {services_text}\n"
        f"👥 {followers:,} seguidores"
    )

    buttons = [
        [
            InlineKeyboardButton("❤️ Favorita", callback_data=f"fav_add|{model_id}"),
            InlineKeyboardButton("📝 Review", callback_data=f"review_start|{model_id}|{name[:20]}"),
        ],
        [
            InlineKeyboardButton(
                "🌐 Ver Perfil",
                url=f"https://nebulastar.app/{username}" if username else f"https://nebulastar.app/profile/{model_id}"
            )
        ]
    ]

    if avatar_url:
        try:
            await query.message.reply_photo(
                photo=avatar_url,
                caption=caption,
                parse_mode="HTML",
                reply_markup=InlineKeyboardMarkup(buttons)
            )
            return
        except Exception:
            pass

    await query.message.reply_text(
        caption,
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(buttons)
    )


# Handlers exportables
explore_command_handler = CommandHandler("explorar", explorar_command)
buscar_command_handler = CommandHandler("buscar", buscar_command)
explore_page_callback_handler = CallbackQueryHandler(explore_page_callback, pattern=r"^explore_page\|")
explore_detail_callback_handler = CallbackQueryHandler(explore_detail_callback, pattern=r"^explore_detail\|")
noop_callback_handler = CallbackQueryHandler(noop_callback, pattern=r"^noop$")
