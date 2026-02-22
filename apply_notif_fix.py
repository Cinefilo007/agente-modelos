
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("Error: DATABASE_URL not found in .env")
    exit(1)

def apply_fix():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        with open("db/014_fix_notifications_constraint.sql", "r") as f:
            sql = f.read()
            print("Applying SQL fix for notifications...")
            cur.execute(sql)
            conn.commit()
            print("Fix applied successfully!")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error applying fix: {e}")
        exit(1)

if __name__ == "__main__":
    apply_fix()
