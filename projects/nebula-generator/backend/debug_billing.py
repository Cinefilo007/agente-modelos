import os
import requests
from dotenv import load_dotenv

load_dotenv()
FAL_KEY = os.getenv("FAL_AI_KEY")

def debug_billing():
    url = "https://api.fal.ai/v1/account/billing"
    headers = {"Authorization": f"Key {FAL_KEY}"}
    params = {"expand": "credits"}
    
    print(f"Checking URL: {url}")
    response = requests.get(url, headers=headers, params=params)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Response JSON:")
        print(response.json())
    else:
        print(f"Error Response: {response.text}")

if __name__ == "__main__":
    debug_billing()
