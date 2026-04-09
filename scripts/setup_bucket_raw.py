
import requests
import os
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

def ensure_bucket():
    if not url or not key:
        print("Missing credentials")
        return

    bucket_name = "temp_ai"
    endpoint = f"{url}/storage/v1/bucket"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    
    # Try to get bucket first
    res = requests.get(f"{endpoint}/{bucket_name}", headers=headers)
    if res.status_code == 200:
        print(f"Bucket {bucket_name} already exists. Ensuring it's public...")
        requests.put(f"{endpoint}/{bucket_name}", headers=headers, json={"public": True})
        print("Done.")
    else:
        print(f"Bucket {bucket_name} not found. Creating...")
        res = requests.post(endpoint, headers=headers, json={
            "name": bucket_name,
            "id": bucket_name,
            "public": True
        })
        if res.status_code == 200:
            print(f"Successfully created public bucket {bucket_name}")
        else:
            print(f"Failed to create bucket: {res.status_code} {res.text}")

if __name__ == "__main__":
    ensure_bucket()
