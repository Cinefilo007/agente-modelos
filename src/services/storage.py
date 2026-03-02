import os
import uuid
import subprocess
import tempfile
from pathlib import Path
from fastapi import UploadFile, HTTPException
from src.services.database import db

async def generate_video_thumbnail(video_content: bytes, ss: float = 0.1) -> bytes:
    """
    Genera una miniatura de un frame específico de un video usando ffmpeg.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video:
        temp_video.write(video_content)
        temp_video_path = temp_video.name

    temp_thumb_path = temp_video_path + ".jpg"
    
    try:
        # Extraer un frame en el tiempo indicado (segundos)
        cmd = [
            "ffmpeg", "-y", "-i", temp_video_path,
            "-ss", str(ss), "-vframes", "1",
            "-f", "image2", "-vcodec", "mjpeg",
            temp_thumb_path
        ]
        subprocess.run(cmd, check=True, capture_output=True)
        
        with open(temp_thumb_path, "rb") as f:
            thumb_content = f.read()
            
        return thumb_content
    finally:
        # Limpieza
        if os.path.exists(temp_video_path):
            os.remove(temp_video_path)
        if os.path.exists(temp_thumb_path):
            os.remove(temp_thumb_path)

async def trim_video(video_content: bytes, start_time: float, end_time: float) -> bytes:
    """
    Recorta un video usando ffmpeg.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_in:
        temp_in.write(video_content)
        temp_in_path = temp_in.name

    temp_out_path = temp_in_path + "_trimmed.mp4"
    
    try:
        # Recortar video: -ss inicio, -to fin (o -t duración)
        # Usamos -c copy si es posible para velocidad, o re-encodificamos para precisión
        cmd = [
            "ffmpeg", "-y", "-ss", str(start_time), "-i", temp_in_path,
            "-to", str(end_time - start_time), "-c:v", "libx264", "-c:a", "aac",
            "-strict", "experimental", temp_out_path
        ]
        # Nota: -to en algunas versiones es relativo al inicio con -ss antes de -i. 
        # Pero mejor usar -t para duración: end - start.
        duration = max(0.1, end_time - start_time)
        cmd = [
            "ffmpeg", "-y", "-ss", str(start_time), "-i", temp_in_path,
            "-t", str(duration), "-c:v", "libx264", "-c:a", "aac",
            "-pix_fmt", "yuv420p", # Compatibilidad amplia
            temp_out_path
        ]
        
        subprocess.run(cmd, check=True, capture_output=True)
        
        with open(temp_out_path, "rb") as f:
            trimmed_content = f.read()
            
        return trimmed_content
    finally:
        if os.path.exists(temp_in_path):
            os.remove(temp_in_path)
        if os.path.exists(temp_out_path):
            os.remove(temp_out_path)

async def upload_file(file: UploadFile, bucket_name: str, folder: str = "uploads") -> str:
    """
    Sube un archivo a Supabase Storage y retorna la URL pública.
    """
    try:
        # Generar nombre único
        file_ext = file.filename.split(".")[-1]
        unique_id = uuid.uuid4()
        filename = f"{folder}/{unique_id}.{file_ext}"
        
        # Leer contenido
        file_content = await file.read()
        
        # Subir usando Cliente Supabase (Service Role)
        db.service_client.storage.from_(bucket_name).upload(
            path=filename,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        # Obtener URL Pública
        public_url = db.service_client.storage.from_(bucket_name).get_public_url(filename)
        
        return public_url
    except Exception as e:
        print(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail="Error uploading file")

def delete_file(bucket_name: str, file_path: str) -> bool:
    """
    Elimina un archivo de Supabase Storage. (Síncrono/Wrappable)
    file_path debe ser la ruta relativa dentro del bucket (ej. 'uploads/xyz.jpg').
    Retorna True si fue exitoso o False si hubo un error (ya estaba borrado, etc).
    """
    try:
        db.service_client.storage.from_(bucket_name).remove([file_path])
        return True
    except Exception as e:
        print(f"[Storage] Error deleting {file_path} from {bucket_name}: {e}")
        return False
