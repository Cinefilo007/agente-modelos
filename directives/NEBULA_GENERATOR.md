# 🌌 DIRECTIVA: Generador Nebula (IA Model Generator)

Esta directiva establece las bases técnicas y operativas para el laboratorio de generación de modelos artificiales.

## 1. SOP: Propósito y Ética de Generación
El objetivo es crear activos visuales de alta conversión para atraer público masculino.
- **Enfoque**: Realismo fotográfico (fotorealismo).
- **Estilo**: Sensual, sugerente (NSFW permitido).
- **Consistencia**: Uso de LoRAs para mantener rasgos físicos consistentes si se requiere.

## 2. Pila Tecnológica (Tech Stack)
- **Motor de IA**: `fal-ai/flux-lora` o `fal-ai/flux-pro`.
- **Backend**: Python 3.10+ (aislado en `projects/nebula-generator/backend`).
- **Frontend**: React + Vite (aislado en `projects/nebula-generator/frontend`).
- **Base de Datos**: Supabase (opcional para persistencia).

## 3. Configuración de IA (fal.ai)
Para permitir contenido sensual, se deben seguir estas reglas en el código:
- `enable_safety_checker`: Debe establecerse en `False` (cuando el endpoint lo permita).
- `guidance_scale`: Recomendado entre 3.5 y 5.0 para Flux.
- `num_inference_steps`: 28-50 para alta calidad.

## 4. Estándar de Diseño (Aesthetics)
Siguiendo la **Directiva Maestra**, la interfaz debe ser premium:
- **Colores**: Deep Purple / Electric Blue / Carbon Black.
- **Efectos**: Glassmorphism, gradientes suaves.
- **Tipografía**: Outfit o Inter.

## 5. Workflow de Desarrollo
1. **Investigación de Prompts**: Probar combinaciones de keywords para realismo y sensualidad.
2. **Selección de LoRAs**: Identificar LoRAs de CivitAI compatibles con SDXL/Flux que estén disponibles en `fal.ai`.
3. **Prototipado de UI**: Crear una interfaz intuitiva para "jugar" con los parámetros.
4. **Validación**: Generar 10-20 muestras de alta calidad antes de proponer integración masiva.

---
*Última Actualización: 5 de Abril de 2026*
