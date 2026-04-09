import os
import subprocess
import tempfile
import io
from PIL import Image, ImageDraw, ImageFont
import logging

logger = logging.getLogger(__name__)

def apply_image_watermark(image_content: bytes, text: str) -> bytes:
    """
    Añade una marca de agua de texto en la esquina inferior izquierda de una imagen.
    """
    try:
        # Abrir imagen desde bytes
        image = Image.open(io.BytesIO(image_content)).convert("RGBA")
        width, height = image.size
        
        # Crear una capa para el texto
        txt_layer = Image.new("RGBA", image.size, (255, 255, 255, 0))
        
        # Intentar cargar una fuente, si no cargar la default
        font_size = max(20, int(height * 0.03)) # Tamaño proporcional
        try:
            # Intentar rutas comunes en Linux/Unix o Windows
            font_paths = [
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "C:\\Windows\\Fonts\\arial.ttf"
            ]
            font = None
            for path in font_paths:
                if os.path.exists(path):
                    font = ImageFont.truetype(path, font_size)
                    break
            if not font:
                font = ImageFont.load_default()
        except:
            font = ImageFont.load_default()
            
        draw = ImageDraw.Draw(txt_layer)
        
        # Calcular posición (inferior izquierda)
        margin = 20
        # draw.textbbox is available in newer Pillow versions
        try:
            bbox = draw.textbbox((0, 0), text, font=font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        except AttributeError:
            # Fallback para versiones antiguas
            tw, th = draw.textsize(text, font=font)
            
        x = margin
        y = height - th - margin
        
        # Dibujar sombra para legibilidad (negro suave)
        draw.text((x+2, y+2), text, font=font, fill=(0, 0, 0, 100))
        # Dibujar texto principal (blanco semi-transparente)
        draw.text((x, y), text, font=font, fill=(255, 255, 255, 160))
        
        # Combinar capas
        watermarked = Image.alpha_composite(image, txt_layer)
        
        # Convertir de vuelta a RGB y bytes
        output = io.BytesIO()
        watermarked.convert("RGB").save(output, format="JPEG", quality=90)
        return output.getvalue()
    except Exception as e:
        logger.error(f"Error aplicando marca de agua a imagen: {e}")
        return image_content

async def apply_video_watermark(video_content: bytes, text: str) -> bytes:
    """
    Añade una marca de agua de texto en la esquina inferior izquierda de un video usando ffmpeg.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_in:
        temp_in.write(video_content)
        temp_in_path = temp_in.name

    temp_out_path = temp_in_path + "_wm.mp4"
    
    try:
        # Filtro drawtext de ffmpeg
        # x=20:y=h-th-20 posiciona en la esquina inferior izquierda con 20px de margen
        # box=1 añade un fondo sutil detrás del texto para legibilidad
        filter_str = (
            f"drawtext=text='{text}':fontcolor=white:fontsize=24:"
            f"box=1:boxcolor=black@0.3:boxborderw=5:x=20:y=h-th-20"
        )
        
        cmd = [
            "ffmpeg", "-y", "-i", temp_in_path,
            "-vf", filter_str,
            "-c:v", "libx264", "-crf", "23", "-preset", "veryfast",
            "-c:a", "copy", # Mantener audio original
            temp_out_path
        ]
        
        # Ejecutar ffmpeg de forma asíncrona (vía subprocess para simplicidad aquí)
        process = subprocess.run(cmd, capture_output=True, text=True)
        
        if process.returncode != 0:
            logger.error(f"FFmpeg error: {process.stderr}")
            return video_content
            
        with open(temp_out_path, "rb") as f:
            processed_content = f.read()
            
        return processed_content
    except Exception as e:
        logger.error(f"Error aplicando marca de agua a video: {e}")
        return video_content
    finally:
        if os.path.exists(temp_in_path):
            os.remove(temp_in_path)
        if os.path.exists(temp_out_path):
            os.remove(temp_out_path)
