import os
import asyncio
from telegram import Bot
from telegram.constants import ParseMode
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.token = os.getenv("TELEGRAM_TOKEN")
        self.bot = Bot(token=self.token) if self.token else None

    async def send_notification(self, chat_id, text, parse_mode=ParseMode.HTML):
        if not self.bot:
            logger.error("Bot not initialized. Check TELEGRAM_TOKEN.")
            return False
            
        try:
            await self.bot.send_message(chat_id=chat_id, text=text, parse_mode=parse_mode)
            return True
        except Exception as e:
            logger.error(f"Error sending Telegram notification: {e}")
            return False

# Global instance
notifications = NotificationService()
