
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

def main():
    supabase: Client = create_client(url, key)
    
    buckets_to_create = ["posts", "stories"]
    
    for bucket in buckets_to_create:
        print(f"Creating bucket: {bucket}")
        try:
            # Create public bucket
            supabase.storage.create_bucket(bucket, options={"public": True})
            print(f"✅ Bucket '{bucket}' created successfully.")
        except Exception as e:
            print(f"⚠️ Error creating bucket '{bucket}': {e}")
            # Check if it already exists (maybe created but list failed?)
            try:
                supabase.storage.get_bucket(bucket)
                print(f"   (Bucket '{bucket}' already exists)")
            except:
                pass

if __name__ == "__main__":
    main()
