import asyncio
import uvicorn
import logging
import os
import threading
from src.bot import build_app as build_main_bot
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
    """Ejecuta los dos bots (Principal y SFS) en el mismo loop de eventos principal"""
    apps_running = []
    
    # 1. Bot Principal
    main_bot = build_main_bot()
    if main_bot:
        await main_bot.initialize()
        # Limpiar cualquier webhook previo que esté causando el Conflict
        await main_bot.bot.delete_webhook(drop_pending_updates=True)
        await main_bot.start()
        await main_bot.updater.start_polling(drop_pending_updates=True)
        apps_running.append(main_bot)
        logger.info("Bot Principal iniciado correctamente.")
        
    # 2. Promo Bot (SFS)
    promo_bot = build_promo_bot()
    if promo_bot:
        await promo_bot.initialize()
        # Limpiar cualquier webhook previo que esté causando el Conflict
        await promo_bot.bot.delete_webhook(drop_pending_updates=True)
        await promo_bot.start()
        await promo_bot.updater.start_polling(drop_pending_updates=True)
        apps_running.append(promo_bot)
        logger.info("Promo Bot (SFS) iniciado correctamente.")
        # Inicializar jobs programados (estadísticas cada 6h, publicaciones, etc.)
        init_scheduler(promo_bot.bot)
        logger.info("Scheduler de Promo Bot iniciado.")
        
    # Mantener el loop vivo indefinidamente si hay apps corriendo
    if apps_running:
        logger.info("Todos los bots en ejecución. Manteniendo el loop...")
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
    enable_api = True
    enable_bot = False  # DESACTIVADO POR DIAGNÓSTICO
    enable_monitor = False # DESACTIVADO POR DIAGNÓSTICO

    # API en hilo secundario (Uvicorn crea su propio loop internamente)
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

    # Bots Telegram en el hilo principal (requieren control del event loop)
    if enable_bot:
        logger.info("Starting Telegram Bots orchestration...")
        import time
        # Delay extendido para asegurar que Railway resetee conexiones
        time.sleep(10)
        run_bots()
    else:
        logger.info("Bots are disabled (ENABLE_BOT=false)")
        # Bloquear hilo principal si solo corre la API
        if enable_api:
            while True:
                import time
                time.sleep(10)

if __name__ == "__main__":
    main()
