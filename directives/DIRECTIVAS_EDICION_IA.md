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

- **Retoque Corporal**: `fal-ai/image-editing/retouch`.
  - *Prompt base*: "perfect flawless cinematic skin, remove all acne, remove all stretch marks, professional photography".
  - *Optimización*: Se ha eliminado el post-procesamiento CCSR para reducir costos y uso de créditos FAL.
- **Cambio de Fondo**: `fal-ai/bria/background/replace`.
  - El sistema permite elegir entre fondos predefinidos traducidos automáticamente al inglés.

## 3. Estrategia de Monetización

Para asegurar la rentabilidad y cubrir los costos de los créditos de FAL:
- **Costo Operativo**: Optimizado eliminando modelos secundarios (Upscalers).
- **Costo Usuario**: 1 Crédito por Retoque, 2 Créditos por Fondo.
- **Consistencia**: No se inicia el proceso si el balance es menor al costo.

## 4. Frontend y Estabilidad

- **Preview Seguro**: El componente `AIPhotoEditor` gestiona `URL.createObjectURL` mediante `useEffect` para evitar fugas de memoria y errores de carga.
- **Soporte de Formatos**: Acepta tanto objetos `File` (nuevos posts) como URLs directas (edición futura).

---
*Nota: Este documento debe ser consultado antes de cualquier modificación al sistema de IA.*
