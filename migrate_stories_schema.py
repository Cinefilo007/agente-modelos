import asyncio
from src.services.database import db

def main():
    print("Por favor, ejecuta este query directamente en el Editor SQL de Supabase para evitar errores de permisos RPC/DDL vía cliente REST:")
    query = "ALTER TABLE stories ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT FALSE;"
    print("\n---\n")
    print(query)
    print("\n---\n")

if __name__ == "__main__":
    main()
