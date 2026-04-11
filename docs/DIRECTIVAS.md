# Directivas del Sistema Nebula

Este documento centraliza las reglas de arquitectura, lógica de negocio y guías de desarrollo para el ecosistema Nebula. **Debe consultarse antes de realizar cualquier modificación.**

## 1. Arquitectura de Doble Bot (Separación de Roles)

El sistema utiliza dos bots de Telegram independientes para segmentar la audiencia y evitar conflictos de sesión:

- **Bot de Fans (Clientes)**: `@NebulaModels_bot`. Utilizado para el descubrimiento de contenido, casino y consumo.
- **Bot de Creadoras (Agencia)**: `@AgenteNebulaIA_bot`. Utilizado para reclutamiento, gestión de perfil y ventas.

### Lógica de Autenticación
- El backend (`src/api/routes/auth.py`) detecta automáticamente el rol del usuario basándose en el **Bot Token** que firmó los datos de Telegram.
- Si la firma es válida para el `CLIENT_BOT_TOKEN`, el usuario es tratado como `client`.
- Si la firma es válida para el `TELEGRAM_TOKEN` (Agencia), el usuario es tratado como `model`.
- Si el usuario ya existe pero intenta entrar por el bot "equivocado", el sistema permite el login pero mantiene su rol original, a menos que el flujo de onboarding dicte lo contrario.

## 2. Flujo de Onboarding

El registro es automático y minimalista. No se debe preguntar el rol al usuario, ya que se infiere del bot de entrada.

- **Fans**: Solo se requiere fecha de nacimiento y aceptación de términos (+18 años).
- **Modelos**: Requiere aplicación manual con selfie de verificación y aprobación del admin.
- **Seguridad**: Si un usuario declara ser menor de 18 años, se bloquea el acceso permanentemente (is_restricted).

## 3. Interfaz y Experiencia de Usuario (UX)

- **Landing Pages**:
    - `/` (LandingPage): Selector de propósito.
    - `/fans` (FanLanding): Enfocada en consumo.
    - `/creators` (CreatorLanding): Enfocada en reclutamiento.
- **Navegación**: El menú inferior (`BottomNav`) debe ocultarse en pantallas de creación o edición crítico (`/create-post`, `/create-story`, `/edit-profile`) para evitar colisiones visuales.
- **Formularios**: Los campos de enlaces externos en la creación de posts deben guardarse automáticamente al publicar, sin obligar al usuario a interactuar con botones de "añadir" si solo hay uno.

## 4. Gestión de Estado y Sesiones

- Al cerrar sesión, se deben limpiar todos los tokens locales para evitar "sticky sessions" entre bots.
- El perfil del usuario en el frontend se mantiene actualizado mediante el `AuthContext`.

---
*Última actualización: 11 de Abril de 2026*
