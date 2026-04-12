/**
 * Utilidad para optimizar imágenes usando el motor de transformación de Supabase
 */

const SUPABASE_PROJECT_ID = "vyvntwuxzskreghxidnd";
const STORAGE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1`;

export const getOptimizedUrl = (url, options = {}) => {
  if (!url || typeof url !== 'string') return url;

  // Si no es una URL de nuestro Supabase, devolver como está
  if (!url.includes(SUPABASE_PROJECT_ID)) return url;

  // Si ya tiene parámetros de transformación, no hacer nada
  if (url.includes('?width=') || url.includes('/render/image/')) return url;

  try {
    const {
      width = 500,
      quality = 80,
      format = 'webp', // webp es el formato más ligero
      resize = 'cover'
    } = options;

    // Convertir de endpoint 'object' a 'render/image'
    // De: /storage/v1/object/public/bucket/path
    // A:  /storage/v1/render/image/public/bucket/path?width=xx&quality=xx
    
    let optimizedUrl = url.replace('/object/public/', '/render/image/public/');
    
    // Añadir parámetros
    const params = new URLSearchParams();
    if (width) params.append('width', width);
    if (quality) params.append('quality', quality);
    if (format) params.append('format', format);
    if (resize) params.append('resize', resize);

    return `${optimizedUrl}?${params.toString()}`;
  } catch (e) {
    console.warn("[ImageOptimize] Error al optimizar URL:", e);
    return url;
  }
};

export const IMAGE_PRESETS = {
  AVATAR: { width: 200, quality: 80, format: 'webp' },
  COVER: { width: 800, quality: 70, format: 'webp' },
  FEED: { width: 500, quality: 80, format: 'webp' },
  THUMBNAIL: { width: 150, quality: 60, format: 'webp' }
};
