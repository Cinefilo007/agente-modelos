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
    cur = conn.cursor()
    
    with open("db/007_artistic_name.sql", "r") as f:
        sql = f.read()
        print("Executing SQL migration...")
        cur.execute(sql)
        conn.commit()
        print("Migration 007_artistic_name.sql executed successfully.")

    cur.close()
    conn.close()

except Exception as e:
    print(f"Error running migration: {e}")
    exit(1)
