
import io
import os
from PIL import Image
from src.services.image_processing import apply_image_watermark

def test_image_watermark():
    print("Testing Image Watermark...")
    # Create a dummy image
    img = Image.new('RGB', (800, 600), color=(73, 109, 137))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    img_bytes = img_byte_arr.getvalue()
    
    # Apply watermark
    watermarked_bytes = apply_image_watermark(img_bytes, "nebulaespace.site/testuser")
    
    # Save result
    with open("test_watermarked.jpg", "wb") as f:
        f.write(watermarked_bytes)
    
    print("✅ Result saved to test_watermarked.jpg")

if __name__ == "__main__":
    test_image_watermark()
