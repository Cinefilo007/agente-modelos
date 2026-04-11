# Directivas del Sistema: Agencia Modelos

## 1. Arquitectura y Autenticación
- **Frontend**: React + Vite (en la carpeta `web`).
- **Autenticación (Nativo Telegram)**: Utilizamos `telegram-login.js` de Telegram para un flujo OIDC moderno. Dado un bug existente en Telegram Web que omite el parámetro `origin` causando el error "origin required" en la vista de PC, el inicio de sesión (`LandingPage.jsx`) ha sido modificado para invocar manualmente un popup de OAuth2 pasando explícitamente los parámetros `client_id`, `redirect_uri` y `origin`. Al recibir un `postMessage` de `oauth.telegram.org` con el `id_token`, delegamos el payload a `AuthContext.jsx`.
- **Diferencia de Entornos**: Si se ejecuta dentro de un Mini App de Telegram (`Telegram.WebApp`), el login extrae el `initData` internamente y envía la sesión silenciosamente. En plataformas externas (Navegador Desktop/PC), forzamos manualmente el popup de OIDC o el Widget heredado.

## 2. Experiencia de Usuario (UI/UX)
- **Barra de Navegación Inferior (BottomNav)**: Está controlada dinámicamente y se oculta automáticamente en rutas propensas a colisiones de diseño o que requieren pantalla máxima (ej. `/create-post`, `/create-story`, `/edit-profile`). Esto se gestiona en `Layout.jsx` a través del prop y el check de URL.
- **Creación de Publicaciones (Create Post)**: Mantiene un enfoque libre de fricción. Al añadir enlaces (links) no hay botones requeridos redundantes (e.g. presionar `+`), el sistema autocaptura el texto del input activo directamente al momento de hacer submit. 

## 3. Próximas Mejoras (Guía Visual)
- Mantener siempre la estética separada en módulos.
- Validar siempre las sesiones de localStorage frente a los endpoints del servidor para prevenir estados zombis en clientes que revivieron el navegador. 

*(Estas directivas deben ser consultadas siempre antes de realizar nuevas intervenciones arquitectónicas).*
