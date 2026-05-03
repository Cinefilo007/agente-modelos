"""
Servicio de Notificaciones Push para el Bot de Fans.
Envía alertas automáticas a todos los clientes registrados.
"""
import os
import asyncio
import logging
from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.constants import ParseMode
from src.services.database import db

logger = logging.getLogger(__name__)


class FanNotificationService:
    def __init__(self):
        self.client_token = os.getenv("TELEGRAM_CLIENT_TOKEN")

    def _get_bot(self):
        """Obtiene instancia del bot de fans."""
        if self.client_token:
            return Bot(token=self.client_token)
        return None

    async def notify_new_model(self, model_data: dict, bot=None):
        """
        Notifica a TODOS los clientes que hay una nueva modelo verificada.
        Solo envía si la modelo tiene avatar_url configurado.
        
        Args:
            model_data: dict con datos de la modelo (de la tabla models)
            bot: instancia de Bot opcional (para usar la del loop principal)
        """
        avatar_url = model_data.get("avatar_url")
        if not avatar_url:
            logger.info(f"[FanNotif] Modelo {model_data.get('id')} sin avatar. Notificación pospuesta.")
            return 0

        bot_to_use = bot or self._get_bot()
        if not bot_to_use:
            logger.error("[FanNotif] No se pudo obtener instancia del bot de fans.")
            return 0

        # Construir mensaje
        name = model_data.get("artistic_name") or "Nueva Creadora"
        bio = model_data.get("bio_short") or ""
        if len(bio) > 120:
            bio = bio[:120] + "..."

        base_url = os.getenv("LANDING_URL", "https://nebulastar.app/landing").replace("/landing", "")
        # No exponer username de Telegram, solo link de plataforma
        model_id = model_data.get("id")
        profile_url = f"{base_url}/profile/{model_id}"
        # Si tiene username, usarlo para URL más bonita
        if model_data.get("username"):
            profile_url = f"{base_url}/{model_data['username']}"

        caption = (
            f"🌟 <b>¡Nueva Creadora en NebulaStar!</b>\n\n"
            f"✨ <b>{name}</b>\n"
        )
        if bio:
            caption += f"📝 {bio}\n"
        caption += (
            f"\n🔥 Descúbrela ahora en la plataforma."
        )

        buttons = [
            [InlineKeyboardButton("👀 Ver Perfil", url=profile_url)],
            [InlineKeyboardButton("❤️ Añadir a Favoritas", callback_data=f"fav_add|{model_id}")]
        ]
        markup = InlineKeyboardMarkup(buttons)

        # Obtener todos los clientes
        clients = db.get_all_clients_for_broadcast()
        enviados = 0
        fallidos = 0

        for client in clients:
            tg_id = client.get("telegram_id")
            if not tg_id:
                continue
            try:
                await bot_to_use.send_photo(
                    chat_id=tg_id,
                    photo=avatar_url,
                    caption=caption,
                    parse_mode=ParseMode.HTML,
                    reply_markup=markup
                )
                enviados += 1
            except Exception as e:
                fallidos += 1
                logger.warning(f"[FanNotif] Error enviando a {tg_id}: {e}")

            # Rate limiting
            await asyncio.sleep(0.05)

        logger.info(f"[FanNotif] Nueva modelo '{name}': {enviados} enviados, {fallidos} fallidos")
        return enviados

    async def broadcast_to_fans(self, text: str, photo_url: str = None, bot=None):
        """
        Difusión masiva de un mensaje a todos los fans/clientes.
        
        Args:
            text: Texto del mensaje (HTML)
            photo_url: URL de foto opcional
            bot: instancia de Bot
        """
        bot_to_use = bot or self._get_bot()
        if not bot_to_use:
            logger.error("[FanNotif] No bot instance available.")
            return 0

        clients = db.get_all_clients_for_broadcast()
        enviados = 0

        for client in clients:
            tg_id = client.get("telegram_id")
            if not tg_id:
                continue
            try:
                if photo_url:
                    await bot_to_use.send_photo(
                        chat_id=tg_id, photo=photo_url,
                        caption=text, parse_mode=ParseMode.HTML
                    )
                else:
                    await bot_to_use.send_message(
                        chat_id=tg_id, text=text,
                        parse_mode=ParseMode.HTML
                    )
                enviados += 1
            except Exception as e:
                logger.warning(f"[FanBroadcast] Error enviando a {tg_id}: {e}")
            await asyncio.sleep(0.05)

        logger.info(f"[FanBroadcast] {enviados}/{len(clients)} enviados")
        return enviados


# Singleton global
fan_notifier = FanNotificationService()
