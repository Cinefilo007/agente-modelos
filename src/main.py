import asyncio
import uvicorn
import logging
import os
import threading
from src.bot_ia import build_app as build_ia_bot
from src.bot_creadoras import build_app as build_creator_bot
from src.bot_clientes import build_app as build_client_bot
from src.promo_bot import build_app as build_promo_bot
from src.api.main import app as fastapi_app
from src.services.ton_monitor import start_monitor
from src.services.promo_jobs import init_scheduler

# Config logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Silence noisy libraries
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("telegram.utils.request").setLevel(logging.WARNING)
logging.getLogger("telegram.ext.Application").setLevel(logging.WARNING)

def run_api():
    port = int(os.getenv("PORT", 8000))
    logger.info(f"Starting API on port {port}")
    uvicorn.run(fastapi_app, host="0.0.0.0", port=port)

async def _run_bots_concurrently():
    """Ejecuta los todos los bots en el mismo loop de eventos principal"""
    apps_running = []
    
    # 1. Bot Asistente IA (Business Chat)
    ia_bot = build_ia_bot()
    if ia_bot:
        await ia_bot.initialize()
        await ia_bot.bot.delete_webhook(drop_pending_updates=True)
        await ia_bot.start()
        await ia_bot.updater.start_polling(drop_pending_updates=True)
        apps_running.append(ia_bot)
        logger.info("Bot IA iniciado correctamente.")

    # 2. Bot de Creadoras
    creator_bot = build_creator_bot()
    if creator_bot:
        await creator_bot.initialize()
        await creator_bot.bot.delete_webhook(drop_pending_updates=True)
        await creator_bot.start()
        await creator_bot.updater.start_polling(drop_pending_updates=True)
        apps_running.append(creator_bot)
        logger.info("Bot de Creadoras iniciado correctamente.")

    # 3. Bot de Clientes
    client_bot = build_client_bot()
    if client_bot:
        await client_bot.initialize()
        await client_bot.bot.delete_webhook(drop_pending_updates=True)
        await client_bot.start()
        await client_bot.updater.start_polling(drop_pending_updates=True)
        apps_running.append(client_bot)
        logger.info("Bot de Clientes iniciado correctamente.")
        
    # 4. Promo Bot (SFS)
    promo_bot = build_promo_bot()
    if promo_bot:
        await promo_bot.initialize()
        await promo_bot.bot.delete_webhook(drop_pending_updates=True)
        await promo_bot.start()
        await promo_bot.updater.start_polling(drop_pending_updates=True)
        apps_running.append(promo_bot)
        logger.info("Promo Bot (SFS) iniciado correctamente.")
        init_scheduler(promo_bot.bot)
        logger.info("Scheduler de Promo Bot iniciado.")
        
    # Mantener el loop vivo indefinidamente si hay apps corriendo
    if apps_running:
        logger.info(f"{len(apps_running)} bots en ejecución. Manteniendo el loop...")
        stop_event = asyncio.Event()
        await stop_event.wait()
    else:
        logger.error("No se pudo iniciar ningún bot. Deteniendo loop.")

def run_bots():
    """Entry point síncrono para iniciar el loop de bots"""
    try:
        asyncio.run(_run_bots_concurrently())
    except KeyboardInterrupt:
        logger.info("Bots detenidos mediante interrupción de teclado.")

def main():
    enable_api = os.getenv("ENABLE_API", "true").lower() == "true"
    enable_bot = os.getenv("ENABLE_BOT", "true").lower() == "true"
    enable_monitor = os.getenv("ENABLE_MONITOR", "true").lower() == "true"

    # API en hilo secundario
    if enable_api:
        logger.info("Starting API thread...")
        t = threading.Thread(target=run_api, daemon=True)
        t.start()
    else:
        logger.info("API is disabled (ENABLE_API=false)")
    
    # Monitor de TON en hilo secundario
    if enable_monitor:
        logger.info("Starting TON Monitor thread...")
        tm = threading.Thread(target=start_monitor, daemon=True)
        tm.start()
    else:
        logger.info("TON Monitor is disabled (ENABLE_MONITOR=false)")

    # Bots Telegram en el hilo principal
    if enable_bot:
        logger.info("Starting Telegram Bots orchestration...")
        import time
        time.sleep(10)
        run_bots()
    else:
        logger.info("Bots are disabled (ENABLE_BOT=false)")
        if enable_api:
            while True:
                import time
                time.sleep(10)

if __name__ == "__main__":
    main()
