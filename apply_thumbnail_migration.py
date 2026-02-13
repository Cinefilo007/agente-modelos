
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
    
    migration_file = "db/011_add_thumbnail_url.sql"
    with open(migration_file, "r") as f:
        sql = f.read()
        print(f"Executing SQL migration from {migration_file}...")
        cur.execute(sql)
        conn.commit()
        print("Migration executed successfully.")

    cur.close()
    conn.close()

except Exception as e:
    print(f"Error running migration: {e}")
    exit(1)
