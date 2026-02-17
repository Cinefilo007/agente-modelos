import aiohttp
import time
import logging

logger = logging.getLogger("CurrencyService")

# Simple in-memory cache
_cache = {
    "ton_price": 0.0,
    "last_update": 0
}

CACHE_TTL = 600 # 10 minutes

async def get_ton_usd_price():
    """
    Fetches the current TON price in USD from CoinGecko.
    Uses a 10-minute cache to avoid rate limits.
    """
    now = time.time()
    
    if _cache["ton_price"] > 0 and (now - _cache["last_update"]) < CACHE_TTL:
        return _cache["ton_price"]
    
    url = "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    price = data.get("the-open-network", {}).get("usd", 0.0)
                    if price > 0:
                        _cache["ton_price"] = price
                        _cache["last_update"] = now
                        logger.info(f"Updated TON price: ${price}")
                        return price
                else:
                    logger.error(f"CoinGecko API error: {resp.status}")
    except Exception as e:
        logger.error(f"Error fetching TON price: {e}")
        
    # Fallback to last known price or a safe default if everything fails
    return _cache["ton_price"] if _cache["ton_price"] > 0 else 5.0 # Safe default approx
