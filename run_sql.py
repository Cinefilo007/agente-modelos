import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get('SUPABASE_DB_URL') or os.environ.get('DATABASE_URL')

if not url:
    print('No DB URL')
else:
    try:
        conn = psycopg2.connect(url)
        cur = conn.cursor()
        cur.execute('ALTER TABLE public.model_client_relations ADD COLUMN IF NOT EXISTS bot_muted_until TIMESTAMP WITH TIME ZONE;')
        conn.commit()
        print('Column added via psycopg2')
    except Exception as e:
        print('psycopg2 error:', e)
