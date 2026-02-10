# Directiva: Autenticación con Telegram y Landing Page

## 1. Visión General
El sistema de autenticación debe ser **exclusivamente** a través de Telegram. Esto garantiza que todos los usuarios (Modelos y Clientes) estén verificados y vinculados a una cuenta de Telegram válida. Además, se implementa una "Landing Page" pública para captar usuarios que acceden desde fuera de Telegram.

## 2. Flujo de Acceso

### A. Acceso Externo (Navegador Web)
1.  **Usuario entra a `https://midominio.com`**:
2.  **Verificación de Sesión**: El sistema verifica si existe un token JWT válido o sesión activa.
3.  **Redirección (Si no hay sesión)**:
    -   El usuario es redirigido a la **Landing Page** (`/landing`).
    -   Esta página actúa como presentación del ecosistema ("Venta del servicio").
    -   Contiene un botón/widget de "Iniciar sesión con Telegram".
4.  **Login con Telegram**:
    -   El usuario usa el widget de Telegram Login.
    -   Telegram devuelve los datos del usuario (`id`, `first_name`, `username`, `photo_url`, `auth_date`, `hash`).
    -   El frontend envía estos datos al backend (`POST /api/auth/telegram`).
5.  **Validación y Acceso**:
    -   El backend valida el `hash`.
    -   Verifica las reglas de negocio (Edad, Blacklist).
    -   Devuelve un token de sesión.
    -   El frontend redirige al usuario al **Feed** (`/`).

### B. Acceso Interno (Telegram Mini App)
1.  **Usuario abre la Mini App desde Telegram**:
2.  **Extracción de Datos**: La Mini App lee `window.Telegram.WebApp.initData`.
3.  **Autenticación Silenciosa**:
    -   El frontend envía `initData` al backend.
    -   El backend valida y loguea al usuario automáticamente.
4.  **Acceso Directo**: El usuario entra directamente al **Feed** sin pasar por la Landing Page.

## 3. Reglas de Validación (Backend)

Al intentar iniciar sesión, el sistema debe ejecutar las siguientes verificaciones en orden:

### 1. Validación de Integridad
-   Verificar que el `hash` de los datos de Telegram sea válido usando el `BOT_TOKEN`.

### 2. Verificación de Usuario
-   Buscar el `telegram_id` en la tabla `models` O `clients`.
-   Si no existe:
    -   **Modelos**: Deben registrarse primero vía Bot (Fase A) o se crea un registro "prospecto" básico (dependiendo de la estrategia). *Por ahora, asumimos que se crea/actualiza el registro de Cliente automáticamente para visitantes.*
    -   **Clientes**: Se crea/actualiza el registro en `clients`.

### 3. Verificación de Blacklist
-   **Clientes**: Verificar si `is_blacklisted` es `TRUE`.
    -   Si es `TRUE` -> **Rechazar acceso** (Error: "Acceso denegado por políticas de la comunidad").
-   **Modelos**: Verificar si `status` es `rejected` o `paused`.
    -   Si es `rejected` -> **Rechazar acceso**.

### 4. Verificación de Edad
-   Verificar si el usuario tiene una `birth_date` registrada.
-   Si TIENE `birth_date`:
    -   Calcular edad actual.
    -   Si Edad < 18 -> **Rechazar acceso** (Error: "Debes ser mayor de edad para acceder").
-   Si NO TIENE `birth_date`:
    -   **Opción A**: Permitir acceso pero restringir contenido sensible.
    -   **Opción B**: Redirigir a un formulario de "Completar perfil" (solicitar fecha de nacimiento).
    -   *Decisión Actual*: Si es un usuario nuevo (Cliente) sin fecha, se permite el acceso inicial (o se asume >18 hasta que se verifique, o se pide en el primer login). **Para el requerimiento actual**: "Si tiene fecha registrada y es menor". Solo rechazamos si sabemos que es menor.

## 4. Landing Page
-   **Diseño**: Elegante, moderno, estilo "Glassmorphism" / Neon.
-   **Objetivo**: Motivar a unirse a la comunidad.
-   **Elementos**:
    -   Hero Section con propuesta de valor.
    -   Imágenes atractivas (sin copyright).
    -   **Call to Action**: Widget de Login Telegram.
    -   No debe mostrar contenido de la app (Feed) hasta loguearse.
