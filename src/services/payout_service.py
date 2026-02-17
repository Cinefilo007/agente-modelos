import os
import requests
import logging
import asyncio
from tonsdk.contract.wallet import Wallets, WalletVersionEnum
from tonsdk.utils import to_nano
from tonsdk.crypto import mnemonic_to_wallet_key

logger = logging.getLogger("PayoutService")

TONCENTER_URL = "https://toncenter.com/api/v2/sendBoc"
API_KEY = os.getenv("TON_API_KEY")

async def send_ton_payout(destination_address: str, amount_ton: float, mnemonic: str):
    """
    Sends TON from the payout wallet to a destination address.
    Returns (success, tx_hash or error_message)
    """
    try:
        # 1. Initialize Wallet from Mnemonic
        mnemo_list = mnemonic.split(" ")
        pub_k, priv_k = mnemonic_to_wallet_key(mnemo_list)
        
        # We use v4R2 by default as it's the most modern/common for personal wallets
        wallet = Wallets.create(WalletVersionEnum.v4r2, workchain=0, public_key=pub_k, private_key=priv_k)
        
        # 2. Get current seqno to prevent replay attacks (requires network call)
        # We'll use TonCenter to get it
        wallet_address = wallet.address.to_string(True, True, True)
        logger.info(f"Payout Wallet Address: {wallet_address}")
        
        get_addr_url = f"https://toncenter.com/api/v2/getAddressInformation?address={wallet_address}"
        if API_KEY: get_addr_url += f"&api_key={API_KEY}"
        
        # For simplicity in this script, using requests but in a loop or high performance we'd use aiohttp
        resp = requests.get(get_addr_url)
        if resp.status_code != 200:
            return False, f"Error getting wallet info: {resp.text}"
            
        data = resp.json()
        if not data.get("ok"):
            return False, f"TonCenter Error: {data}"
            
        # If it's a new wallet, seqno might be missing or 0
        seqno = data.get("result", {}).get("seqno", 0)
        if seqno is None: seqno = 0

        # 3. Create Transfer
        # to_nano(amount, 'ton')
        transfer_query = wallet.create_transfer_message(
            to_address=destination_address,
            amount=to_nano(amount_ton, 'ton'),
            seqno=int(seqno),
            payload="Retiro Agencia Modelos" # Comment
        )
        
        # 4. Send BOC (Bag of Cells)
        boc = transfer_query["boc"].to_boc(False)
        
        # Hex encode for TonCenter
        import binascii
        boc_hex = binascii.hexlify(boc).decode()
        
        send_url = TONCENTER_URL
        if API_KEY: send_url += f"?api_key={API_KEY}"
        
        post_data = {"boc": boc_hex}
        send_resp = requests.post(send_url, json=post_data)
        
        if send_resp.status_code != 200:
            return False, f"Error sending BOC: {send_resp.text}"
            
        send_result = send_resp.json()
        if not send_result.get("ok"):
            return False, f"TonCenter Send Error: {send_result}"
            
        logger.info(f"Payout sent! Amount: {amount_ton}, Dest: {destination_address}")
        return True, "Transacción enviada a la red TON"

    except Exception as e:
        logger.error(f"Payout exception: {str(e)}")
        return False, str(e)
