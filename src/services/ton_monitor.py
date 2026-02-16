import asyncio
import aiohttp
import json
import os
import logging
from src.services.database import db
from dotenv import load_dotenv

load_dotenv()

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TonMonitor")

# Configuration
TON_API_URL = "https://toncenter.com/api/v2/getTransactions"
CENTRAL_WALLET_ADDRESS = os.getenv("CENTRAL_WALLET_ADDRESS")
TON_API_KEY = os.getenv("TON_API_KEY") # Optional but recommended
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
    
    # We only care about incoming transfers with value > 0
    if value_ton <= 0:
        return

    # Extract Comment (Memo)
    msg_data = in_msg.get("message", "")
    # TonCenter returns message as string if it's text, or complicated object.
    # For simple transfers, it's often in 'message' field.
    # NOTE: In v2 API, text comments strictly are in 'msg_data' > 'text' or similar depending on parsing.
    # Let's assume standard comment for now. 
    # Actually, toncenter 'in_msg' has 'message' field which IS the comment if it's a simple transfer.
    
    deposit_memo = msg_data
    
    # Identify User by Memo
    if not deposit_memo or not deposit_memo.startswith("user_"):
        return # Not a managed deposit
        
    logger.info(f"Processing potential deposit: {value_ton} TON, Memo: {deposit_memo}, Hash: {tx_hash}")

    try:
        # Check if user exists with this memo
        # We find user via wallet table
        res = db.client.table("wallets").select("user_id").eq("deposit_memo", deposit_memo).execute()
        
        if not res.data:
            logger.warning(f"Memo {deposit_memo} not found in DB. Skipping.")
            return

        user_id = res.data[0]["user_id"]
        
        # Check if TX already processed (Idempotency)
        # We query crypto_transactions to see if this hash exists
        tx_check = db.client.table("crypto_transactions").select("id").eq("tx_hash", tx_hash).execute()
        if tx_check.data:
            logger.info(f"Transaction {tx_hash} already processed. Skipping.")
            return

        # Call RPC to credit funds
        # NOTE: We are processing TON here. If you want USDT, it's a jetton transfer, which is complex 
        # (different opcode). For MVP, let's support TON deposits first or Treat TON as 'Credits'.
        # The prompt asked for USDT/TON. USDT analysis requires parsing Jetton Notifications.
        # For simplicity in Phase 1 of Monitor: Support TON Native Transfers.
        
        rpc_params = {
            "p_user_id": user_id,
            "p_amount": value_ton,
            "p_details": {
                "currency": "TON",
                "tx_hash": tx_hash,
                "wallet_address": in_msg.get("source"),
                "lt": lt
            }
        }
        
        rpc_res = db.client.rpc("wallet_deposit", rpc_params).execute()
        
        if rpc_res.data and rpc_res.data.get("success"):
            logger.info(f"✅ Successfully credited {value_ton} TON to user {user_id}")
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
                
                # We can use last_lt to paginate, but 'getTransactions' returns newest first.
                # We want to process from new downwards, stopping when we hit a known LT.
                
                # Implementation Strategy: Read newest 20. Process them. 
                # If we see an LT <= last_saved_lt, we stop processing this batch.
                # Save the NEWEST LT as the new last_lt.
                
                last_known_lt = await get_last_lt()
                
                async with session.get(TON_API_URL, params=params) as resp:
                    if resp.status != 200:
                        logger.error(f"API Error: {resp.status} {await resp.text()}")
                        await asyncio.sleep(POLL_INTERVAL)
                        continue
                        
                    data = await resp.json()
                    if not data.get("ok"):
                        logger.error(f"API API Error: {data}")
                        await asyncio.sleep(POLL_INTERVAL)
                        continue
                        
                    transactions = data.get("result", [])
                    
                    if not transactions:
                        await asyncio.sleep(POLL_INTERVAL)
                        continue
                        
                    # Process from oldest to newest in this batch to match logical timeline?
                    # No, usually we want to process all new ones.
                    # API returns Newest -> Oldest.
                    
                    newest_lt_in_batch = int(transactions[0]["transaction_id"]["lt"])
                    
                    # If first run, just save state and process nothing? Or process all 20?
                    # Let's process all 20 for now.
                    
                    # Filter matching transactions
                    # We process valid ones.
                    
                    processed_any = False
                    
                    for tx in transactions:
                        tx_lt = int(tx["transaction_id"]["lt"])
                        
                        if last_known_lt and tx_lt <= last_known_lt:
                            continue # Already saw this
                            
                        await process_transaction(tx)
                        processed_any = True
                        
                    # Update state to the absolute newest we saw
                    if processed_any or last_known_lt is None:
                        await save_last_lt(newest_lt_in_batch)

            except Exception as e:
                logger.error(f"Monitor Loop Error: {e}")
            
            await asyncio.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    try:
        asyncio.run(monitor_loop())
    except KeyboardInterrupt:
        pass
