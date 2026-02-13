
import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

async def main():
    if not url or not key:
        print("Missing SUPABASE_URL or SUPABASE_KEY")
        return

    supabase: Client = create_client(url, key)
    
    print("Checking 'posts' table schema...")
    try:
        # Try selecting thumbnail_url specifically
        try:
            response = supabase.table("posts").select("id, thumbnail_url").limit(1).execute()
            print("✅ Column 'thumbnail_url' EXISTS in 'posts' table.")
            if response.data:
                print(f"Sample data: {response.data[0]}")
        except Exception as e:
            if "column \"thumbnail_url\" does not exist" in str(e).lower():
                print("❌ Column 'thumbnail_url' DOES NOT EXIST in 'posts' table.")
            else:
                print(f"Error checking column: {e}")

        # Print all columns for context
        res = supabase.table("posts").select("*").limit(1).execute()
        if res.data:
            print(f"All columns in 'posts': {list(res.data[0].keys())}")
        else:
            print("Table 'posts' is empty.")

    except Exception as e:
        print(f"General error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
