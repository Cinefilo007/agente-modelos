# Documentación Técnica del Sistema (SOP & Arquitectura)

Este documento sirve como la guía definitiva para el desarrollo, mantenimiento y escalabilidad del ecosistema de la Agencia de Modelos. Cualquier modificación futura debe respetar los principios aquí descritos.

## 1. Arquitectura General
El sistema opera como una aplicación monolítica modular en Python (Backend) con un Frontend desacoplado en React (SPA).

-   **Backend**: FastAPI (`src/api`) + Python-Telegram-Bot (`src/bot`). Ambas instancias corren en el mismo contenedor/proceso o de forma concurrente mediante `asyncio`.
-   **Frontend**: React + Vite (`web/src`). Se comunica con el Backend vía REST API.
-   **Base de Datos**: Supabase (PostgreSQL). Gestiona la persistencia de datos relacionales y autenticación (Row Level Security opcional).
-   **Storage**: Supabase Storage. Almacena multimedia (fotos, videos).
-   **IA Provider**: OpenRouter.

## 2. Autenticación y Seguridad (SOP-AUTH)
El flujo de autenticación es crítico y no debe ser modificado sin una revisión exhaustiva.

### 2.1 Flujo de Telegram (TMA)
1.  **Frontend**: Obtiene `initData` de Telegram WebApp.
2.  **Login**: Envía `initData` al endpoint `POST /api/auth/login`.
3.  **Backend**:
    -   Valida la firma criptográfica de `initData` usando el Token del Bot.
    -   Extrae `telegram_id`, `username`, `first_name`.
    -   **Verificación de Rol**: Consulta la tabla `admins` y `models` para determinar el rol (`admin`, `model`, `client`).
    -   **Generación de Token**: Crea un JWT firmado con `SECRET_KEY`.
4.  **Frontend**:
    -   Almacena JWT en `localStorage`.
    -   **Validación de Perfil**: Middleware `ProtectedRoute` verifica claims del token y estado del perfil (Edad, T&C).

### 2.2 Roles y Permisos
-   **Admin**:
    -   Origen: Tabla `admins`.
    -   Permisos: Acceso total, Moderación de Feed (Borrar), Gestión de Usuarios, Verificación.
-   **Model (Creador)**:
    -   Origen: Tabla `models`.
    -   Permisos: Crear Posts/Stories, Editar Perfil, Ver Estadísticas.
-   **Client (Fan)**:
    -   Origen: Tabla `clients`.
    -   Permisos: Ver Feed, Interactuar (Like/Comment), Ver Perfiles Públicos.

## 3. Base de Datos (SOP-DB)
El esquema evoluciona mediante migraciones SQL numeradas en la carpeta `/db`. **Regla de Oro**: Nunca modificar el esquema manualmente en producción; siempre crear un script de migración.

### Tablas Principales
-   `users` (Implícita/Legacy): Referencia base.
-   `admins` (`telegram_id`, `role`, `permissions`): Gestión de staff.
-   `models`: Perfil completo de creador, estado (`verifying`, `active`), contadores.
-   `clients`: Perfil de usuario fan.
-   `posts`: Contenido multimedia del feed (`media_url`, `media_type`).
-   `stories`: Contenido efímero (24h).
-   `verifications`: Registro de evidencia de identidad.

### Buckets de Storage
-   `verifications`: Privado/Público (temporal). Fotos de DNI+Selfie.
-   `posts`: Público. Contenido del feed.
-   `stories`: Público.
-   `profiles` / `avatars`: Fotos de perfil.

## 4. Frontend (SOP-FRONT)
El frontend debe ser "Mobile First" y estéticamente premium.

### Estructura de Directorios (`web/src`)
-   `/components`:
    -   `/ui`: Componentes base (Botones, Inputs, Avatares).
    -   `/feed`: Tarjetas de posts, filtros.
    -   `/layout`: Layout principal, navegación condicional.
-   `/pages`: Vistas principales (`Feed`, `Profile`, `PostDetail`, `Onboarding`, `Explore`).
-   `/context`:
    -   `AuthContext`: Estado global de sesión y usuario.
    -   `ThemeContext`: Gestión de temas dinámicos.

### Reglas de Desarrollo UI
1.  **Navegación Condicional**: `Navigation.jsx` debe renderizar opciones basadas estrictamente en `user.role`.
2.  **Manejo de Errores**: Usar `try-catch` en llamadas API y mostrar feedback visual (Toast/Alert) al usuario.
3.  **Performance**: Lazy loading de imágenes y virtualización para listas largas (Feed).

## 5. Backend (SOP-BACK)
El backend expone una API RESTful documentada automáticamente en `/docs`.

### Rutas (`src/api/routes`)
-   `auth.py`: Login y validación.
-   `profile.py`: Gestión de perfil, onboarding (`/apply-model`), subida de avatares.
-   `content.py`: CRUD de Posts y Stories. Endpoint especial de borrado para admin.
-   `client.py`: Gestión de perfil de cliente/fan, wallet (recargas simuladas), y sistema de órdenes P2P (crear, confirmar, disputar).
-   `admin.py`: Herramientas de dashboard (estadísticas, aprobación masiva).

### Manejo de Errores y Logs
-   Todo endpoint crítico debe tener `try-except`.
-   **Logging**: Imprimir logs con prefijo claro (e.g., `[Auth]`, `[Storage]`) para facilitar el rastreo en Railway.
-   **Storage Fallback**: Si un bucket falta, el código debe intentar crearlo (`storage.create_bucket`) antes de fallar.

## 6. Guía de Despliegue (SOP-DEPLOY)
1.  **Commit**: Asegurar mensaje convencional (`feat:`, `fix:`).
2.  **Push**: `git push origin main`.
3.  **Railway**: Detecta el push y construye la imagen Docker.
4.  **Verificación**: Revisar logs de Railway para confirmar arranque exitoso de `uvicorn` y `python-telegram-bot`.

> [!CAUTION]
> **CONFLICTO DE INSTANCIAS**: Dado que el bot se despliega en Railway, **NUNCA** mantener una instancia local del bot (`python src/main.py`) corriendo simultáneamente. Esto causa conflictos de `getUpdates` con Telegram. Si es necesario probar localmente, detener inmediatamente el proceso al finalizar.

---
*Última Actualización: 11 de Febrero de 2026*
