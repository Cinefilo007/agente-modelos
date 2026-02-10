import os
import uuid
from fastapi import UploadFile, HTTPException
from src.services.database import db

async def upload_file(file: UploadFile, bucket_name: str, folder: str = "uploads") -> str:
    """
    Sube un archivo a Supabase Storage y retorna la URL pública.
    """
    try:
        # Generar nombre único
        file_ext = file.filename.split(".")[-1]
        filename = f"{folder}/{uuid.uuid4()}.{file_ext}"
        
        # Leer contenido
        file_content = await file.read()
        
        # Subir usando Cliente Supabase
        res = db.client.storage.from_(bucket_name).upload(
            path=filename,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        # Obtener URL Pública
        public_url = db.client.storage.from_(bucket_name).get_public_url(filename)
        
        return public_url
    except Exception as e:
        print(f"Error de subida: {e}")
        raise HTTPException(status_code=500, detail=f"Error al subir archivo: {str(e)}")
