from supabase import create_client, Client
import os
from dotenv import load_dotenv
load_dotenv()
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(url, key)
response = supabase.table('model_client_relations').select('*').limit(1).execute()
print(response.data[0].keys() if response.data else 'No data')
