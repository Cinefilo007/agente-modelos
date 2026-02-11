# Directiva Actualizada: Autenticación Estricta

## 1. Visión General
El sistema de autenticación es determinista y seguro. Se basa exclusivamente en Telegram y valida el estado del usuario contra el backend en cada carga de la aplicación para evitar "usuarios fantasma".

## 2. Flujo de Validación de Sesión (Frontend)
1. **Detección de Token**: Al cargar la aplicación, se busca un token en `localStorage`.
2. **Validación Bloqueante**: Si existe un token, se realiza una llamada síncrona a `GET /api/profile/me`.
   - La aplicación muestra un loader y **no permite el acceso** hasta recibir respuesta del servidor.
3. **Sincronización de Estado**:
   - **Éxito**: Se actualiza el estado del usuario con los datos más recientes de la DB.
   - **Fallo (401/404)**: Se ejecuta `logout()` inmediatamente, eliminando datos locales y redirigiendo a `/landing`.

## 3. Flujo de Onboarding (Registro Obligatorio)
Cualquier usuario autenticado pero con perfil incompleto es redirigido automáticamente a `/onboarding`.

### Requisitos para Acceso al Feed:
- `birth_date`: Debe estar presente (formato YYYY-MM-DD).
- `terms_accepted`: Debe ser `TRUE`.
- **Edad mínima**: 18 años (validado tanto en frontend como en backend).

## 4. Auditoría y Logs (Consola Web)
Se han implementado logs prefijados con `[Auth]` o `[Router]` para facilitar la depuración:
- `[Auth] Iniciando verificación de sesión...`: Al cargar la app.
- `[Auth] Sesión validada por servidor para: [usuario]`: Confirmación de identidad.
- `[Router] Perfil incompleto (Falta Edad o T&C), redirigiendo a onboarding`: Bloqueo preventivo.

## 5. Mantenimiento y Escalabilidad
- Todas las reglas de acceso se centralizan en la función `ProtectedRoute` de `App.jsx`.
- El registro automático de clientes en `auth.py` inicializa `terms_accepted: False` por defecto.
