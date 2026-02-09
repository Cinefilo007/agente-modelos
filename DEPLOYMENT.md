# Guía de Despliegue en Railway 🚀

Sigue estos pasos para llevar tu aplicación a producción.

## 1. Preparación (Ya completado por mí)✅
He configurado tu proyecto para que funcione como un solo servicio unificado:
- **Frontend (React)**: Se compila y se sirve como archivos estáticos.
- **Backend (Python)**: Sirve la API y la página web.
- **Dockerfile**: Actualizado para construir ambos entornos automáticamente.

## 2. Subir Código a GitHub
Debes subir los cambios recientes a tu repositorio.
```bash
git add .
git commit -m "Preparación para despliegue Railway"
git push origin main
```

## 3. Crear Proyecto en Railway
1. Ve a [Railway.app](https://railway.app/).
2. Click en **"New Project"** -> **"Deploy from GitHub repo"**.
3. Selecciona tu repositorio `Agente-modelos`.
4. Click en **"Deploy Now"**.

## 4. Configurar Variables de Entorno
Una vez creado, ve a la pestaña **"Variables"** del servicio y agrega las siguientes (copialas de tu `.env` local):

| Variable | Descripción |
|----------|-------------|
| `SUPABASE_URL` | URL de tu proyecto Supabase |
| `SUPABASE_KEY` | Tu `service_role` o `anon` key |
| `TELEGRAM_TOKEN` | Token de tu Bot de Telegram |
| `OPENAI_API_KEY` | Tu llave de OpenAI |
| `PORT` | (Opcional, Railway lo pone solo, normalmente 8000) |

## 5. Verificar Despliegue
- Railway detectará el `Dockerfile` y comenzará el "Build".
- Verás los logs de construcción (instalará Node, compilará React, instalará Python).
- Al finalizar, te dará una URL pública (ej: `agente-modelos.up.railway.app`).
- Entra a esa URL: Deberías ver tu aplicación web funcionando.
- La API estará en `/api/...`.

> **Nota**: El Bot de Telegram también se iniciará automáticamente junto con la web.
