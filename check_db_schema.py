
import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

async def main():
    supabase: Client = create_client(url, key)
    
    # Check if 'models' table has 'social_links' column
    # We can try to select it from a dummy query or check information schema if permissions allow
    # Or just select * from models limit 1 and print keys
    
    print("Checking 'models' table schema...")
    try:
        response = supabase.table("models").select("*").limit(1).execute()
        if response.data:
            model = response.data[0]
            print(f"Keys in 'models' table: {list(model.keys())}")
            if 'social_links' in model:
                print(f"✅ 'social_links' column EXISTS. Value sample: {model['social_links']}")
            else:
                print("❌ 'social_links' column DOES NOT EXIST in the response.")
        else:
            print("⚠️ Table 'models' is empty, cannot verify columns via select *. Trying information_schema logic if possible, or assume it exists if no error.")
            
            # Try inserting a dummy with social_links to see if it fails? No, that's improved.
            # Let's try selecting specifically that column
            try:
                supabase.table("models").select("social_links").limit(1).execute()
                print("✅ Select 'social_links' query executed without error (column likely exists).")
            except Exception as e:
                print(f"❌ Error selecting 'social_links': {e}")

    except Exception as e:
        print(f"Error connecting or querying: {e}")

if __name__ == "__main__":
    asyncio.run(main())
