
import os
import psycopg2
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

# Get DB URL (postgres://...)
db_url = os.environ.get("DATABASE_URL")

if not db_url:
    print("DATABASE_URL not found. Trying to construct from SUPABASE_URL/KEY is hard for direct SQL.")
    # Assuming user has a specialized connection string or we try the Supabase Management API via HTTP if supported.
    # Check if we have a direct connection string in .env
    # Usually Supabase gives a connection string like: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
    pass

try:
    if db_url:
        print(f"Connecting to DB...")
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        sql = "ALTER TABLE crypto_transactions ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb;"
        cur.execute(sql)
        conn.commit()
        print("Success: Column 'details' added.")
        cur.close()
        conn.close()
    else:
        print("Skipping direct SQL execution (No DATABASE_URL).")
        print("Falling back to manual instruction if needed.")

except Exception as e:
    print(f"Migration Error: {e}")
