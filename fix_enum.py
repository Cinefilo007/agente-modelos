import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("Error: DATABASE_URL not found in .env")
    exit(1)

try:
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    
    print("Executing SQL to add AI_EDIT to transaction_type_enum...")
    cur.execute("ALTER TYPE transaction_type_enum ADD VALUE IF NOT EXISTS 'AI_EDIT';")
    print("Success: Added AI_EDIT to enum.")

    cur.close()
    conn.close()

except Exception as e:
    print(f"Error modifying enum: {e}")
    exit(1)
