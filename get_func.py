from src.services.database import db

try:
    res = db.client.rpc("exec_sql", {"sql": "SELECT pg_get_functiondef('wallet_lock_funds'::regproc);"}).execute()
    print("Function details:")
    print(res.data)
except Exception as e:
    print(f"Error calling exec_sql: {e}")
    # alternative: query information_schema or just recreate it based on memory.
