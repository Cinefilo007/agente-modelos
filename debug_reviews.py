
import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

async def main():
    supabase: Client = create_client(url, key)
    
    # 1. Get a model id to test (any model)
    model_res = supabase.table("models").select("id").limit(1).execute()
    if not model_res.data:
        print("No models found.")
        return
        
    model_id = model_res.data[0]['id']
    print(f"Testing reviews for model_id: {model_id}")

    # 2. Add a dummy review if none
    try:
        reviews_check = supabase.table("reviews").select("*").eq("model_id", model_id).execute()
        if not reviews_check.data:
            print("No reviews found for this model, query might return empty list which is fine.")
        else:
            print(f"Found {len(reviews_check.data)} reviews.")
            
    except Exception as e:
        print(f"Basic select failed: {e}")

    # 3. Test the JOIN query
    print("Testing JOIN query: select('*, clients(username, avatar_url)')")
    try:
        response = supabase.table("reviews") \
            .select("*, clients(username, avatar_url)") \
            .eq("model_id", model_id) \
            .execute()
        print("✅ JOIN Query Success!")
        print(response.data)
    except Exception as e:
        print(f"❌ JOIN Query Failed: {e}")
        # Try a different syntax or explore relationships
        # Maybe 'client:clients(...)' ?
        try:
           print("Retrying with 'client:clients(...)' ...")
           response = supabase.table("reviews") \
                .select("*, client:clients(username, avatar_url)") \
                .eq("model_id", model_id) \
                .execute()
           print("✅ Retry Success!")
        except Exception as e2:
           print(f"❌ Retry Failed: {e2}")

if __name__ == "__main__":
    asyncio.run(main())
