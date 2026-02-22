
import os
import requests
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("TELEGRAM_TOKEN")

if not token:
    print("TELEGRAM_TOKEN not found in environment.")
else:
    try:
        url = f"https://api.telegram.org/bot{token}/getMe"
        res = requests.get(url).json()
        if res.get("ok"):
            bot_info = res["result"]
            print(f"Bot info found:")
            print(f"ID: {bot_info['id']}")
            print(f"Username: @{bot_info['username']}")
            print(f"First Name: {bot_info['first_name']}")
        else:
            print(f"Error getting bot info: {res.get('description')}")
    except Exception as e:
        print(f"Request error: {e}")
