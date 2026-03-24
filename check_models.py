from supabase import create_client, Client
import os
from dotenv import load_dotenv
load_dotenv()
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(url, key)
response = supabase.table('models').select('id, telegram_id, business_connection_id').not_.is_('business_connection_id', 'null').execute()
print(response.data)
