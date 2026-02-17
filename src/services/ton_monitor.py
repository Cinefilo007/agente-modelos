import asyncio
import aiohttp
import json
import os
import logging
from src.services.database import db
from src.services.currency_service import get_ton_usd_price
from dotenv import load_dotenv

load_dotenv()

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TonMonitor")

# Configuration
TON_API_URL = "https://toncenter.com/api/v2/getTransactions"
CENTRAL_WALLET_ADDRESS = os.getenv("CENTRAL_WALLET_ADDRESS")
TON_API_KEY = os.getenv("TON_API_KEY") 
POLL_INTERVAL = 10 # Seconds

STATE_FILE = "monitor_state.json"

async def get_last_lt():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                data = json.load(f)
                return data.get("last_lt")
        except:
            return None
    return None

async def save_last_lt(lt):
    with open(STATE_FILE, "w") as f:
        json.dump({"last_lt": lt}, f)

async def process_transaction(tx):
    # Extract relevant data
    tx_hash = tx.get("transaction_id", {}).get("hash")
    lt = tx.get("transaction_id", {}).get("lt")
    in_msg = tx.get("in_msg", {})
    
    if not in_msg:
        return
        
    value_nano = int(in_msg.get("value", 0))
    value_ton = value_nano / 1e9
    
    # Identify Memo (Comment)
    # TonCenter v2 provides 'message' for plain text comments.
    deposit_memo = in_msg.get("message", "").strip() or in_msg.get("msg_data", {}).get("text", "").strip()
    
    if not deposit_memo or not deposit_memo.startswith("user_"):
        return # Not a managed deposit

    # --- MONEDA Y MONTO ---
    currency = "TON"
    amount = 0.0

    # Heurística mejorada: 
    # Un envío de Jetton (USDT) suele quemar entre 0.03 y 0.04 TON de gas.
    # Un depósito de TON real suele ser >= 0.05 TON o mayor.
    if value_ton >= 0.045:
        # Depósito de TON nativo
        currency = "TON"
        amount = value_ton
        logger.info(f"Detected TON deposit: {amount} TON, Memo: {deposit_memo}")
    else:
        # Probable notificación de USDT (Jetton)
        # El 'value' es gas (ej. 0.035). 
        currency = "USDT"
        # TODO: Para USDT real necesitaríamos parsear el cuerpo del mensaje o usar GetJettonTransfers.
        # Por ahora lo marcamos como USDT con monto 0 para revisión o placeholder.
        # Si el usuario mandó USDT, el TonMonitor actual no puede 'leer' el monto interno 
        # sin decodificar el BOC.
        amount = 0.0 
        logger.warning(f"Detected USDT potential notification for {deposit_memo}. Gas: {value_ton}. Amount needs manual credit or V3 API.")
        return # Skip auto-credit for USDT until parser is ready

    if amount <= 0 and currency == "TON":
        return

    logger.info(f"Processing confirmed {currency} deposit: {amount}, Memo: {deposit_memo}, Hash: {tx_hash}")

    try:
        # Check if user exists with this memo
        res = db.client.table("wallets").select("user_id").eq("deposit_memo", deposit_memo).execute()
        
        if not res.data:
            logger.warning(f"Memo {deposit_memo} not found in DB. Skipping.")
            return

        user_id = res.data[0]["user_id"]
        
        # Check if TX already processed
        tx_check = db.client.table("crypto_transactions").select("id").eq("tx_hash", tx_hash).execute()
        if tx_check.data:
            logger.info(f"Transaction {tx_hash} already processed. Skipping.")
            return

        # DYNAMIC CONVERSION: If it's TON, we multiply by the market price
        final_amount = amount
        if currency == "TON":
            price = await get_ton_usd_price()
            final_amount = round(amount * price, 2)
            logger.info(f"Converting {amount} TON to {final_amount} Credits (Price: ${price})")

        rpc_params = {
            "p_user_id": user_id,
            "p_amount": final_amount,
            "p_details": {
                "currency": currency,
                "tx_hash": tx_hash,
                "wallet_address": in_msg.get("source"),
                "lt": lt,
                "original_amount": amount if currency == "TON" else None,
                "ton_price": price if currency == "TON" else None,
                "manual_review": True if (currency == "USDT" and amount == 0) else False
            }
        }
        
        rpc_res = db.client.rpc("wallet_deposit", rpc_params).execute()
        
        if rpc_res.data and rpc_res.data.get("success"):
            logger.info(f"✅ Successfully credited {final_amount} {currency} credits to user {user_id}")
        else:
            logger.error(f"❌ RPC failed: {rpc_res.data}")

    except Exception as e:
        logger.error(f"Error processing tx {tx_hash}: {e}")

async def monitor_loop():
    if not CENTRAL_WALLET_ADDRESS:
        logger.error("CENTRAL_WALLET_ADDRESS not set. Exiting.")
        return

    logger.info(f"Started TON Monitor for {CENTRAL_WALLET_ADDRESS}")
    
    async with aiohttp.ClientSession() as session:
        while True:
            try:
                params = {
                    "address": CENTRAL_WALLET_ADDRESS,
                    "limit": 20,
                    "archival": "true" 
                }
                if TON_API_KEY:
                    params["api_key"] = TON_API_KEY
                
                last_known_lt = await get_last_lt()
                
                async with session.get(TON_API_URL, params=params) as resp:
                    if resp.status != 200:
                        logger.error(f"API Error: {resp.status}")
                        await asyncio.sleep(POLL_INTERVAL)
                        continue
                        
                    data = await resp.json()
                    if not data.get("ok"):
                        await asyncio.sleep(POLL_INTERVAL)
                        continue
                        
                    transactions = data.get("result", [])
                    if not transactions:
                        await asyncio.sleep(POLL_INTERVAL)
                        continue
                        
                    newest_lt_in_batch = int(transactions[0]["transaction_id"]["lt"])
                    
                    processed_any = False
                    for tx in transactions:
                        tx_lt = int(tx["transaction_id"]["lt"])
                        if last_known_lt and tx_lt <= last_known_lt:
                            continue
                            
                        await process_transaction(tx)
                        processed_any = True
                        
                    if processed_any or last_known_lt is None:
                        await save_last_lt(newest_lt_in_batch)

            except Exception as e:
                logger.error(f"Monitor Loop Error: {e}")
            
            await asyncio.sleep(POLL_INTERVAL)

def start_monitor():
    """Entry point for threading"""
    asyncio.run(monitor_loop())

if __name__ == "__main__":
    start_monitor()
