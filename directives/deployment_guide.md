# Guía de Despliegue: Backend & Base de Datos

Este documento detalla los pasos para desplegar el Agente y la API en **Railway** y actualizar la base de datos en **Supabase**.

## 1. Prerrequisitos
-   Repositorio subido a **GitHub**.
-   Cuenta en [Railway](https://railway.app).
-   Proyecto en [Supabase](https://supabase.com).

## 2. Base de Datos (Supabase)
Antes de desplegar el código, debemos aseguranos de que la base de datos tenga las nuevas tablas.

1.  Ve a tu proyecto en Supabase -> **SQL Editor**.
2.  Abre el archivo local `db/003_social_network.sql`.
3.  Copia todo el contenido y pégalo en el editor SQL de Supabase.
4.  Ejecuta el script (**Run**).
    *   *Esto creará las tablas `posts`, `stories`, `reviews`, `interactions` y actualizará `models`.*

5.  **Storage (Almacenamiento)**:
    *   Ve a **Storage** -> **New Bucket**.
    *   Crea los siguientes buckets públicos (o privados según prefieras, para este MVP usaremos públicos para lectura):
        *   `avatars`
        *   `covers`
        *   `posts`
        *   `stories`
    *   **Políticas (Policies)**:
        *   Para cada bucket, añade una política para permitir `SELECT` (lectura) a `All Users` (Public).
        *   Añade una política para permitir `INSERT` (escritura) a `Authenticated` users (o gestionado por el Backend con la `SERVICE_ROLE_KEY` si prefieres máxima seguridad, pero por ahora nuestro bot usa la key normal con permisos).

## 3. Despliegue en Railway

1.  **Nuevo Proyecto**:
    *   En Railway, selecciona "New Project" -> "Deploy from GitHub repo".
    *   Busca y selecciona el repositorio `Agente-modelos`.
    *   Haz clic en "Deploy Now".

2.  **Configuración de Variables**:
    *   Inmediatamente después, ve a la pestaña **Settings** o **Variables** del servicio creado.
    *   Agrega las siguientes variables (copiadas de tu `.env`):
        *   `TELEGRAM_TOKEN`: El token de tu bot.
        *   `SUPABASE_URL`: URL de tu proyecto Supabase.
        *   `SUPABASE_KEY`: `anon` public key (o `service_role` si quieres saltarte RLS).
        *   `OPENAI_API_KEY`: Tu key de OpenRouter/OpenAI.
        *   `PORT`: (Opcional) Railway lo asigna solo, pero el código ya lo lee. No hace falta ponerlo.

3.  **Verificación**:
    *   Railway detectará el `Dockerfile` y comenzará el "Build".
    *   Si el Build es exitoso, comenzará el "Deploy".
    *   Ve a la pestaña **Logs** y verifica que diga:
        *   `INFO: Starting API on port ...`
        *   `INFO: Bot Iniciado. Escuchando...`

4.  **Dominio Público**:
    *   Ve a **Settings** -> **Networking**.
    *   Haz clic en "Generate Domain" (o añade uno custom).
    *   Copia la URL generada (ej: `https://agente-modelos-production.up.railway.app`).

## 4. Conexión con Telegram (Mini App)
Para que la Mini App funcione, Telegram necesita saber dónde está alojada.

1.  Abre **BotFather** en Telegram.
2.  Envía `/myapps`.
3.  Selecciona tu bot (o crea una nueva Web App vinculada).
4.  En **b Web App URL**, pega la URL de Railway que copiaste en el paso anterior.
    *   *Nota*: Si usas una ruta específica para la home de la app, añádela (ej: `https://.../` o `https://.../webapp`). Como usaremos React, será la raíz.
5.  Pon un nombre corto para el botón (ej: "Mi Perfil").

¡Listo! El backend está sirviendo la API y el Bot está escuchando comandos.
