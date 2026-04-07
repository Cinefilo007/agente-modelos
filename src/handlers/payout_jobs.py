import logging
import os
from src.services.database import db
from src.services.payout_service import send_ton_payout
from telegram.ext import ContextTypes

logger = logging.getLogger("PayoutJobs")

PAYOUT_MNEMONIC = os.getenv("PAYOUT_WALLET_MNEMONIC")
# SEGURIDAD: Migrado de constante a variable de entorno
ADMIN_ID = int(os.getenv("ADMIN_TELEGRAM_ID", "1123020118"))

async def process_auto_payout(context: ContextTypes.DEFAULT_TYPE):
    """
    Job that runs automatically after 2 minutes to process a payout.
    """
    job = context.job
    tx_id = job.data.get("tx_id")
    
    logger.info(f"⏳ Running auto-payout job for TX {tx_id}")
    
    try:
        # 1. Fetch transaction status
        res = db.client.table("crypto_transactions").select("*").eq("id", tx_id).maybe_single().execute()
        
        if not res.data:
            logger.error(f"TX {tx_id} not found for auto-payout.")
            return

        tx = res.data
        if tx["status"] != "pending":
            logger.info(f"TX {tx_id} is no longer pending (Status: {tx['status']}). Skipping auto-payout.")
            return

        # 2. Check for mnemonic
        if not PAYOUT_MNEMONIC:
            logger.error("PAYOUT_WALLET_MNEMONIC not set. Cannot process auto-payout.")
            await context.bot.send_message(
                chat_id=ADMIN_ID,
                text=f"⚠️ *Error de Liquidación Automática*\n\nNo se ha configurado la frase mnemónica en las variables de entorno para la TX `{tx_id}`."
            )
            return

        # 3. Execute Payout
        dest_addr = tx.get("details", {}).get("destination")
        amount = float(tx["amount"])
        
        await context.bot.send_message(chat_id=ADMIN_ID, text=f"🤖 *Auto-Liquidador:* Procesando pago de {amount} USDT...")
        
        success, result = await send_ton_payout(dest_addr, amount, PAYOUT_MNEMONIC)
        
        if success:
            # Update DB
            db.client.table("crypto_transactions").update({
                "status": "completed",
                "tx_hash": result # Payout service should return hash if possible, or success msg
            }).eq("id", tx_id).execute()
            
            await context.bot.send_message(
                chat_id=ADMIN_ID, 
                text=f"✅ *Liquidación Automática Exitosa*\n\nSe enviaron {amount} USDT a `{dest_addr}`.\nTXID: `{tx_id}`"
            )
        else:
            # SEGURIDAD: Asegurar que el error de result no contenga la mnemónica
            error_msg = str(result).replace(str(PAYOUT_MNEMONIC), "***ID_REDACTED***") if PAYOUT_MNEMONIC else str(result)
            await context.bot.send_message(
                chat_id=ADMIN_ID,
                text=f"❌ *Fallo en Liquidación Automática*\n\nError: {error_msg}"
            )

    except Exception as e:
        logger.error(f"Error in auto-payout job: {e}")
