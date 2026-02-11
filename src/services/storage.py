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
        
        # Subir usando Cliente Supabase (Service Role)
        res = db.service_client.storage.from_(bucket_name).upload(
            path=filename,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        # Obtener URL Pública
        public_url = db.service_client.storage.from_(bucket_name).get_public_url(filename)
        
        return public_url
    except Exception as e:
        # Check if error is 'Bucket not found'
        error_str = str(e)
        if "Bucket not found" in error_str or "'statusCode': 404" in error_str or "404" in error_str: # Weak check but effective for now
            try:
                print(f"[Storage] Bucket '{bucket_name}' not found. Attempting to create...")
                # Create public bucket
                db.service_client.storage.create_bucket(bucket_name, options={"public": True})
                print(f"[Storage] Bucket '{bucket_name}' created. Retrying upload...")
                
                # Retry upload
                db.service_client.storage.from_(bucket_name).upload(
                    path=filename,
                    file=file_content,
                    file_options={"content-type": file.content_type}
                )
                public_url = db.service_client.storage.from_(bucket_name).get_public_url(filename)
                return public_url
            except Exception as create_error:
                 print(f"[Storage] Failed to create bucket/retry: {create_error}")
                 raise HTTPException(status_code=500, detail=f"Error creando bucket: {str(create_error)}")
        
        print(f"Error de subida: {e}")
        raise HTTPException(status_code=500, detail=f"Error al subir archivo: {str(e)}")
