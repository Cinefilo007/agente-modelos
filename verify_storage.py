
import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

def main():
    supabase: Client = create_client(url, key)
    
    print("--- Listing Buckets ---")
    try:
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        print(f"Buckets found: {bucket_names}")
        
        required_buckets = ["posts", "stories"]
        for b in required_buckets:
            if b not in bucket_names:
                print(f"❌ Bucket '{b}' is MISSING.")
                # Optional: Try to create it? (Usually needs API admin role or dashboard)
                # supabase.storage.create_bucket(b, options={"public": True})
            else:
                print(f"✅ Bucket '{b}' EXISTS.")
                
    except Exception as e:
        print(f"Error listing buckets: {e}")

if __name__ == "__main__":
    main()
