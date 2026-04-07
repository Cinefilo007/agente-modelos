# Directiva Actualizada: Autenticación Estricta v2

> **Última actualización:** 2026-04-07 (Post-Auditoría de Seguridad)

## 1. Visión General
El sistema de autenticación es determinista y seguro. Se basa exclusivamente en Telegram y valida el estado del usuario contra el backend en cada carga de la aplicación para evitar "usuarios fantasma".

**Incidente de referencia:** 2026-04-06 — modelo no verificada (Maggie, `07d7cced-...`) accedió al portal y creó una publicación debido a 3 vulnerabilidades simultáneas. Todas corregidas en esta versión.

---

## 2. Flujo de Validación de Sesión (Frontend)
1. **Detección de Token**: Al cargar la aplicación, se busca un token en `localStorage`.
2. **Validación Bloqueante**: Si existe un token, se realiza una llamada síncrona a `GET /api/profile/me`.
   - La aplicación muestra un loader y **no permite el acceso** hasta recibir respuesta del servidor.
3. **Sincronización de Estado**:
   - **Éxito**: Se actualiza el estado del usuario con los datos más recientes de la DB.
   - **Fallo (401/404)**: Se ejecuta `logout()` inmediatamente, eliminando datos locales y redirigiendo a `/landing`.

---

## 3. Reglas de Acceso por Rol

### Modelos (`role: model`)
Para que una modelo reciba `role: model` en su JWT, deben cumplirse **TODAS** estas condiciones:

| Condición | Campo DB | Verificado en | Acción si falla |
|-----------|----------|--------------|-----------------|
| Existe en tabla `models` | `telegram_id` | `auth.py` | Tratar como cliente |
| Status no es `rejected` | `status != 'rejected'` | `auth.py` | HTTP 403 |
| Status no es `verifying`/`prospect` | `status` | `auth.py` | Tratar como anónimo |
| **Verificada por admin** | **`is_verified = TRUE`** | **`auth.py` [NUEVO]** | **HTTP 403** |

### Clientes (`role: client`)
- Cualquier usuario de Telegram que no esté en `models` se crea como cliente.
- Verificación de `terms_accepted` y `birth_date` antes de acceder al feed (onboarding).
- Blacklist (`is_blacklisted = TRUE`) → HTTP 403.

### Admin (`role: admin`)
- Se determina por `ADMIN_TELEGRAM_ID` en variables de entorno (máxima prioridad).
- Fallback: tabla `admins` en DB.

---

## 4. Guard de Seguridad en Frontend (`ProtectedRoute`)

```jsx
// App.jsx — orden de verificación
1. loading → mostrar spinner
2. !user → redirect /landing
3. isModel && !user.is_verified → mostrar pantalla "Verificación Pendiente" [NUEVO]
4. isClient && needsOnboarding → redirect /onboarding
5. isAdmin en / → redirect /admin
6. Permitir acceso
```

---

## 5. Endpoints de Admin — Protección Obligatoria

**TODOS** los endpoints bajo `/api/admin/` requieren:
```python
user: TelegramUser = Depends(get_current_user)
# + verificación explícita:
if user.role != "admin":
    raise HTTPException(status_code=403, detail="Acceso restringido a administradores")
```

Endpoints protegidos a partir de 2026-04-07:
- `GET /admin/blacklist` ✅
- `POST /admin/blacklist` ✅
- `DELETE /admin/blacklist/{id}` ✅
- `GET /admin/disputes` ✅
- `POST /admin/disputes/{id}/resolve` ✅
- `GET /admin/verifications` ✅ (ya tenía auth implícita vía FastAPI)
- `POST /admin/verify/{model_id}` ✅

---

## 6. Reglas de Integridad de Datos del Perfil

**Métricas reales siempre:**
- `followers_count` → mostrar `0` si null o 0 (NO placeholders)
- `total_likes` → mostrar `0` si null o 0 (NO placeholders)
- `reputation_score` → mostrar `0.0` si null o 0 (NO placeholders)
- `bio_short` → mostrar vacío si null (NO bio de demo)
- `social_links` → mostrar "Sin redes sociales" si array vacío (NO íconos demo)

---

## 7. Variables de Entorno Críticas de Seguridad

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `JWT_SECRET` | **SÍ — Obligatoria** | Firma de tokens JWT. Si no está, el sistema usa fallback inseguro y lanza warning CRÍTICO en logs. |
| `ADMIN_TELEGRAM_ID` | SÍ | ID del admin. Si no está, nadie tiene role=admin. |
| `TELEGRAM_TOKEN` | SÍ | Para validar HMAC de WebApp y Widget. |
| `SUPABASE_SERVICE_ROLE_KEY` | SÍ | Para operaciones de escritura seguras. |

---

## 8. Auditoría y Logs (Consola Backend/Frontend)

**Frontend:**
- `[Auth] Iniciando verificación de sesión...`
- `[Auth] Sesión validada por servidor para: [usuario]`
- `[Router] Perfil incompleto (Falta Edad o T&C), redirigiendo a onboarding`
- `[Router] Modelo detectada sin verificar, bloqueando acceso.` **[NUEVO]**

**Backend:**
- `[Backend Auth] Error checking models for {id}: {error}`
- `[Auth] Admin reconocido por ADMIN_TELEGRAM_ID: {id}`
- `[SEGURIDAD] JWT_SECRET no configurado...` **[NUEVO — CRÍTICO]**

---

## 9. Mantenimiento y Escalabilidad
- Todas las reglas de acceso se centralizan en la función `ProtectedRoute` de `App.jsx`.
- El registro automático de clientes en `auth.py` inicializa `terms_accepted: False` por defecto.
- Las trasferencias de wallet deben usar RPCs atómicas de Supabase para evitar race conditions.
- Los modelos rechazados (`status='rejected'`) no pueden re-aplicar sin contactar al admin.

*Versión 2.0 — Post auditoría 2026-04-07*
