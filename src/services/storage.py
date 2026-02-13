import subprocess
import tempfile
from pathlib import Path

async def generate_video_thumbnail(video_content: bytes) -> bytes:
    """
    Genera una miniatura (frame 0.1s) de un video usando ffmpeg.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_video:
        temp_video.write(video_content)
        temp_video_path = temp_video.name

    temp_thumb_path = temp_video_path + ".jpg"
    
    try:
        # Extraer un frame a los 0.1 segundos
        cmd = [
            "ffmpeg", "-y", "-i", temp_video_path,
            "-ss", "00:00:00.100", "-vframes", "1",
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
        print(f"Error de subida: {e}")
        raise HTTPException(status_code=500, detail=f"Error al subir archivo: {str(e)}")
