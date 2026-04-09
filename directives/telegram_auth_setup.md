# Configuración de Autenticación de Telegram

Esta directiva explica cómo solucionar el error **"origin required"** y cómo configurar correctamente el dominio para el login nativo de Telegram.

## Error: "origin required"

Este error es devuelto por los servidores de Telegram cuando se intenta iniciar un flujo de autenticación desde un dominio que no ha sido autorizado previamente para el Bot.

### Solución Paso a Paso

1. **Abrir Telegram** y buscar el bot oficial `@BotFather`.
2. Enviar el comando `/mybots`.
3. Seleccionar el bot correspondiente (Ej: `@AgenteNebulaIA_bot`).
4. Ir a **Bot Settings**.
5. Ir a **Domain**.
6. Enviar el dominio de producción **sin protocolo ni rutas** (Ej: `nebulaespace.site`).
7. Confirmar el cambio.

> [!IMPORTANT]
> El dominio debe coincidir exactamente con el host desde el cual el usuario accede al portal. Si usas subdominios (ej. `app.nebulaespace.site`), debes registrar el subdominio específico.

## Flujo de Autenticación OIDC (OpenID Connect)

El sistema utiliza la librería oficial de Telegram para un login nativo sin iframes.

### Requisitos Técnicos
- El dominio debe estar servido obligatoriamente por **HTTPS**.
- El `client_id` enviado desde el frontend debe ser el ID numérico del bot (obtenido automáticamente desde `/config/bot-id`).

### Validación en Backend
El portal envía los datos recibidos (o el `id_token`) al endpoint `/auth/telegram-oidc`. El servidor valida la firma usando las claves públicas de Telegram (JWKS) o el `BOT_TOKEN` secreto.

---
*Última actualización: 2026-04-09*
