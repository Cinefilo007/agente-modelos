import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Supabase credentials not found.")
    exit(1)

async def main():
    supabase: Client = create_client(url, key)
    
    bucket_name = "profiles"
    
    print(f"Checking bucket '{bucket_name}'...")
    try:
        buckets = supabase.storage.list_buckets()
        existing = [b.name for b in buckets]
        
        if bucket_name not in existing:
            print(f"Bucket '{bucket_name}' not found. Creating...")
            supabase.storage.create_bucket(bucket_name, options={"public": True})
            print(f"Bucket '{bucket_name}' created successfully.")
        else:
            print(f"Bucket '{bucket_name}' already exists.")
            
        # Also ensure 'posts' and 'stories' exist just in case
        for b in ['posts', 'stories']:
            if b not in existing:
                print(f"Bucket '{b}' not found. Creating...")
                supabase.storage.create_bucket(b, options={"public": True})
                print(f"Bucket '{b}' created successfully.")

    except Exception as e:
        print(f"Error managing storage: {e}")

if __name__ == "__main__":
    asyncio.run(main())
