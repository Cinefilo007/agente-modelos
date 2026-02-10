
import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from src.services.database import db # Uses our custom class which handles Service Role logic

load_dotenv()

async def main():
    print("--- Testing Storage Upload ---")
    
    # 1. Check if Service Role Key is detected
    if os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
        print("✅ SUPABASE_SERVICE_ROLE_KEY found in env.")
    else:
        print("⚠️ SUPABASE_SERVICE_ROLE_KEY NOT found. Testing with Anon Key (relies on 'anon' storage policy).")

    # 2. Try to populate db.service_client (logs will show if it worked)
    client = db.service_client
    
    # 3. Attempt Upload
    bucket = "posts"
    filename = "test_upload_file.txt"
    content = b"Hello World form Automation"
    
    try:
        print(f"Attempting to upload '{filename}' to '{bucket}'...")
        res = client.storage.from_(bucket).upload(
            path=filename,
            file=content,
            file_options={"content-type": "text/plain", "upsert": "true"}
        )
        
        # Get URL
        public_url = client.storage.from_(bucket).get_public_url(filename)
        print(f"✅ Upload SUCCESS! Public URL: {public_url}")
        
    except Exception as e:
        print(f"❌ Upload FAILED: {e}")
        print("\nDiagnosis:")
        if "violates row-level security" in str(e) or "403" in str(e):
             print("Permissions Error. If using Anon key, Bucket Policy must allow 'INSERT' for 'anon' role.")
        elif "Bucket not found" in str(e):
             print(f"Bucket '{bucket}' does not exist.")

if __name__ == "__main__":
    asyncio.run(main())
