import os
import subprocess
import tempfile
import io
from PIL import Image, ImageDraw, ImageFont
import logging

logger = logging.getLogger(__name__)

def apply_image_watermark(image_content: bytes, text: str) -> bytes:
    """
    Añade una marca de agua de texto con fondo desvanecido y fuente moderna.
    """
    try:
        # Abrir imagen desde bytes
        image = Image.open(io.BytesIO(image_content)).convert("RGBA")
        width, height = image.size
        
        # Tamaño de fuente proporcional
        font_size = max(24, int(height * 0.035))
        
        # Intentar cargar Roboto-Bold.ttf
        font_path = os.path.join(os.getcwd(), "src", "assets", "fonts", "Roboto-Bold.ttf")
        try:
            if os.path.exists(font_path):
                font = ImageFont.truetype(font_path, font_size)
            else:
                font = ImageFont.load_default()
        except:
            font = ImageFont.load_default()
            
        # Medimos el texto
        temp_img = Image.new("RGBA", (1, 1))
        temp_draw = ImageDraw.Draw(temp_img)
        try:
            bbox = temp_draw.textbbox((0, 0), text, font=font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        except AttributeError:
            tw, th = temp_draw.textsize(text, font=font)

        # Crear capa para el overlay
        overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
        
        margin = 30
        x = margin
        y = height - th - margin - 10
        
        # 1. Dibujar el fondo desvanecido (Glow)
        from PIL import ImageFilter
        bg_width = tw + 60
        bg_height = th + 40
        # Crear máscara de degradado radial/difuminado
        bg_mask = Image.new("L", (bg_width, bg_height), 0)
        bg_draw = ImageDraw.Draw(bg_mask)
        bg_draw.ellipse([10, 5, bg_width-10, bg_height-5], fill=180) # Ovalo central
        bg_mask = bg_mask.filter(ImageFilter.GaussianBlur(radius=12)) # Desvanecer mucho
        
        bg_color = Image.new("RGBA", (bg_width, bg_height), (0, 0, 0, 255))
        overlay.paste(bg_color, (x - 30, y - 15), mask=bg_mask)
        
        # 2. Dibujar el texto principal
        draw = ImageDraw.Draw(overlay)
        draw.text((x, y), text, font=font, fill=(255, 255, 255, 255))
        
        # Combinar
        watermarked = Image.alpha_composite(image, overlay)
        
        # Convertir a RGB y bytes
        output = io.BytesIO()
        watermarked.convert("RGB").save(output, format="JPEG", quality=95)
        return output.getvalue()
    except Exception as e:
        logger.error(f"Error aplicando marca de agua a imagen: {e}")
        return image_content

async def apply_video_watermark(video_content: bytes, text: str) -> bytes:
    """
    Añade una marca de agua de texto con fondo desvanecido en video usando ffmpeg.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_in:
        temp_in.write(video_content)
        temp_in_path = temp_in.name

    temp_out_path = temp_in_path + "_wm.mp4"
    font_path = os.path.join(os.getcwd(), "src", "assets", "fonts", "Roboto-Bold.ttf")
    
    # Escapar el path para ffmpeg (especialmente en Windows)
    font_path_esc = font_path.replace("\\", "/").replace(":", "\\:")
    
    try:
        # Filtro drawtext con fondo desvanecido (simulado con boxborderw y boxcolor)
        # box=1:boxcolor=black@0.4:boxborderw=20 crea un efecto de "glow" oscuro
        filter_str = (
            f"drawtext=fontfile='{font_path_esc}':text='{text}':fontcolor=white@0.9:fontsize=28:"
            f"box=1:boxcolor=black@0.4:boxborderw=15:x=30:y=h-th-30"
        )
        
        cmd = [
            "ffmpeg", "-y", "-i", temp_in_path,
            "-vf", filter_str,
            "-c:v", "libx264", "-crf", "23", "-preset", "veryfast",
            "-c:a", "copy",
            temp_out_path
        ]
        
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

def get_video_duration(video_content: bytes) -> float:
    """
    Obtiene la duración de un video usando ffprobe.
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp:
        temp.write(video_content)
        temp_path = temp.name
        
    try:
        cmd = [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", temp_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return float(result.stdout.strip())
        return 0.0
    except Exception as e:
        logger.error(f"Error getting video duration: {e}")
        return 0.0
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
