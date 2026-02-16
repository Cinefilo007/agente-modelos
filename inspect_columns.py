import asyncio
import json
from src.services.database import db

async def list_columns():
    print("--- Explorando Columnas de 'models' ---")
    try:
        # Fetch one record
        res = db.client.table("models").select("*").limit(1).execute()
        if res.data and len(res.data) > 0:
            row = res.data[0]
            print("Columnas encontradas:")
            for key in row.keys():
                print(f" - {key}: {type(row[key])}")
                
            # Check specifically for config columns
            print("\nVerificando campos 'config':")
            config_cols = [k for k in row.keys() if 'config' in k]
            print(config_cols if config_cols else "Ninguna columna 'config' encontrada.")
            
        else:
            print("No se encontraron registros en 'models' para inspeccionar.")
            # Try inserting a dummy verify/rollback if needed? No, too risky.
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(list_columns())
