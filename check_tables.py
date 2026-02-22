
import os
from dotenv import load_dotenv
from supabase import create_client, Client
import json

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

tables_to_check = ["wallets", "crypto_transactions"]

print("Checking table data...")
for table in tables_to_check:
    try:
        res = supabase.table(table).select("*").limit(1).execute()
        if res.data:
            print(f"\nTable '{table}' COLUMNS:")
            print(list(res.data[0].keys()))
            print("Sample Row Keys/Values:")
            for k, v in res.data[0].items():
                print(f"  {k}: {type(v).__name__}")
        else:
            print(f"\nTable '{table}' exists but is EMPTY.")
    except Exception as e:
        print(f"Table '{table}' Error: {e}")
