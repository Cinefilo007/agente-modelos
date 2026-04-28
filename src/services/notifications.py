import os
import asyncio
from telegram import Bot
from telegram.constants import ParseMode
import logging
from src.services.database import db

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.creator_token = os.getenv("TELEGRAM_CREATOR_TOKEN")
        self.creator_bot = Bot(token=self.creator_token) if self.creator_token else None

    async def send_notification(self, chat_id, text, parse_mode=ParseMode.HTML):
        # Mantenemos este para retrocompatibilidad general si se usa, pero preferible usar específicos
        try:
            creator_bot_to_use = self.creator_bot or Bot(token=os.getenv("TELEGRAM_CREATOR_TOKEN"))
            await creator_bot_to_use.send_message(chat_id=chat_id, text=text, parse_mode=parse_mode)
            return True
        except Exception as e:
            logger.error(f"Error sending Telegram notification: {e}")
            return False

    async def notify_creator(self, user_id: str, notif_type: str, actor_id: str = None, content: str = None):
        """Envía notificación push por Telegram a la Creadora (excluye likes/vistas)"""
        if notif_type in ['like', 'view']:
            return False # El usuario solicitó omitir likes

        try:
            # 1. Obtener telegram_id de la creadora (user_id es el id UUID de supbase)
            res = db.service_client.table("models").select("telegram_id").eq("id", user_id).maybe_single().execute()
            if not res.data or not res.data.get("telegram_id"):
                return False
            
            chat_id = res.data["telegram_id"]

            # 2. Obtener info del actor (cliente)
            actor_name = "Un usuario"
            if actor_id:
                actor_res = db.service_client.table("clients").select("username").eq("id", actor_id).maybe_single().execute()
                if actor_res.data and actor_res.data.get("username"):
                    actor_name = f"@{actor_res.data['username']}"

            # 3. Construir mensaje según tipo
            msg = ""
            if notif_type == "follow":
                msg = f"🔔 <b>¡Nuevo Seguidor!</b>\n{actor_name} ha comenzado a seguirte."
            elif notif_type == "comment":
                msg = f"💬 <b>Nuevo Comentario</b>\n{actor_name} comentó en tu post:\n<i>\"{content}\"</i>"
            elif notif_type == "tip":
                msg = f"💸 <b>¡Propina Recibida!</b>\n{actor_name} te ha enviado propina (USDT)."
            elif notif_type == "gift":
                msg = f"🎁 <b>¡Regalo Recibido!</b>\n{actor_name} te regaló: <b>{content}</b>"
            else:
                return False

            creator_bot_to_use = self.creator_bot or Bot(token=os.getenv("TELEGRAM_CREATOR_TOKEN"))
            await creator_bot_to_use.send_message(chat_id=chat_id, text=msg, parse_mode=ParseMode.HTML)
            return True

        except Exception as e:
            logger.error(f"Error notifying creator {user_id}: {e}")
            return False

# Global instance
notifications = NotificationService()
