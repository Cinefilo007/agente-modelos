# Directivas: Sistema de Edición de Fotos con IA

Este documento establece las reglas de diseño y operación para la funcionalidad de edición de fotos mediante IA integrada con FAL AI.

## 1. Arquitectura y Lógica de Separación

El sistema sigue la lógica de **SOPs (Procedimientos Operativos Estándar) vs Ejecución**:

### Servicios (Lógica SOP)
- **`src/services/ai_editor.py`**: Contiene la lógica pura de interacción con FAL. No debe manejar permisos de usuario ni cobros; solo recibe una imagen/instrucción y retorna un resultado.

### Rutas (Controladores de Ejecución)
- **`src/api/routes/ai_editor.py`**: Orquesta el flujo:
  1. Validar identidad de la modelo.
  2. Verificar saldo de créditos.
  3. Llamar al servicio SOP.
  4. Descontar créditos si la operación es exitosa.
  5. Retornar imagen procesada.

## 2. Modelos de IA Utilizados

- **Retoque Corporal**: `fal-ai/fooocus/inpainting`.
  - *Prompt base*: "high quality skin retouch, remove blemishes, remove stretch marks, professional photography".
- **Cambio de Fondo**: `fal-ai/bria/background-removal` + `fal-ai/flux/schnell`.
  - El sistema debe permitir elegir entre fondos predefinidos (Lujo, Playa, Ciudad) o prompts personalizados.

## 3. Estrategia de Monetización

Para asegurar la rentabilidad y cubrir los costos de los créditos de FAL:
- **Costo Operativo**: Definido por el uso de API de FAL.
- **Costo Usuario**: 10 créditos por edición (aprox. $1 USD dependiendo de la tasa de cambio interna).
- **Consistencia**: No se inicia el proceso si el balance es menor al costo.

## 4. Guía para Mejoras Futuras

- **Mejora 1: Lote de Edición**: Permitir subir 5 fotos y que se editen automáticamente con el mismo fondo.
- **Mejora 2: Filtros Estilizados**: Implementar modelos de transferencia de estilo (estilo manga, cyberpunk, etc.).
- **Mejora 3: Video Retouching**: Explorar modelos como `fal-ai/stable-video-diffusion` para edición de clips cortos.

---
*Nota: Este documento debe ser consultado antes de cualquier modificación al sistema de IA.*
