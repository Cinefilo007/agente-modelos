# Directivas de Arquitectura de Bots: Agencia Modelos

Este documento define la arquitectura, la separación de responsabilidades (SOPs) y los límites lógicos de cada uno de los bots que componen el ecosistema en Telegram de la plataforma.

**Importante:** Cualquier nuevo endpoint, handler, o comando de interacción con Telegram debe ser clasificado e inyectado en el bot que corresponda según las reglas listadas a continuación.

---

## 1. Bot de Clientes (Consumer Bot)
**Variables de entorno asociadas:** `TELEGRAM_CLIENT_TOKEN`
**Archivo de entrada:** `src/bot_clientes.py`

**Propósito:** Es la **puerta de entrada** de los clientes/consumidores a la plataforma. Toda la experiencia de adquisición del usuario normal debe ocurrir aquí.

**Responsabilidades:**
- Onboarding, bienvenida y despliegue del menú interactivo (WebApp) para el perfil de "Cliente".
- Flujo de compra, recarga de saldo o adquisición de "tickets"/"créditos" a través del proveedor de pagos correspondiente.
- Exploración de Modelos (Catálogo, Sugerencias).
- Alertas para el cliente relacionadas a compras exitosas, fallidas o notificaciones administrativas push genéricas.

---

## 2. Bot de Creadoras (Creator Bot)
**Variables de entorno asociadas:** `TELEGRAM_CREATOR_TOKEN`
**Archivo de entrada:** `src/bot_creadoras.py`

**Propósito:** Es el **dashboard interactivo** rápido para las creadoras de contenido. Mantiene a la creadora aislada de la experiencia publicitaria para clientes, enfocándose en su métrica y seguridad.

**Responsabilidades:**
- Onboarding, bienvenida y despliegue del menú interactivo (WebApp) dirigido al dashboard personal (vista "/edit-profile", "ganancias").
- Notificaciones de transacciones: Nuevos clientes que compren su contenido, desbloqueos, contribuciones o propinas (tips).
- Notificaciones de solicitud/estado de Retiros de fondos (Withdrawals).
- Panel o comandos para añadir usuarios problemáticos a la Lista Negra (Blacklist/Bloqueo).
- Configuración y validaciones de accesos asociados a Telegram Stories o funciones exclusivas para creadoras.

---

## 3. Bot de Asistencia IA (Asistente/Business Chat Bot)
**Variables de entorno asociadas:** `TELEGRAM_TOKEN` (Legacy/Main token)
**Archivo de entrada:** `src/bot_ia.py` (Anteriormente `bot.py`)

**Propósito:** Está 100% dedicado a brindar soporte interactivo automatizado. Procesa los eventos entrantes del sistema y hace de middleware para la funcionalidad principal de **Telegram Business**.

**Responsabilidades:**
- Integración principal de la escucha e intercepciones de Telegram Business (`business_message`, `business_connection`).
- Funcionar como Asistente IA para simular, delegar o re-enrutar las conversaciones entre clientes y creadoras sin mezclar flujos de UI.
- No debe sobrecargar su loop con menús, webapps genéricas o gestión de perfiles.

---

## 4. Bot Promocional (SFS Bot)
**Variables de entorno asociadas:** `TELEGRAM_PROMO_TOKEN`
**Archivo de entrada:** `src/promo_bot.py`

**Propósito:** Bot dedicado netamente a las mecánicas de "SFS" (Shoutout for Shoutout) y a las promociones de marketing agresivas que impulsan tráfico entre distintas cuentas.

**Responsabilidades:**
- Gestión del programa SFS, cronjobs, difusiones y métricas de adquisición en paralelo a la plataforma core.

---

## Patrón de Orquestación

El archivo [`src/main.py`](src/main.py) se encarga de importar la función constructora (`build_app()`) de cada uno de estos 4 bots de manera independiente y ejecutarlos todos dentro de un único Event Loop asíncrono. Ningún bot debe intentar borrar un webhook global o gestionar configuraciones que interfieran con la red de solicitudes de los demás.

---

## Reglas de Datos Críticas

### Campo `username` (tabla `models`)
- **INMUTABLE después del onboarding.** El `username` siempre debe ser el username real de Telegram del usuario, asignado en `/apply-model`.
- **NUNCA** debe auto-generarse ni sobrescribirse desde campos como `artistic_name` o `full_name`.
- Este campo se usa para construir enlaces `https://t.me/{username}` que permiten a los clientes enviar mensajes privados. Si se corrompe, el chat con la creadora queda roto.

### Campo `artistic_name` vs `full_name`
- `artistic_name`: Nombre público visible para clientes. Se muestra en el perfil, feed y catálogo.
- `full_name`: Nombre real/civil. Solo visible para administración y en la notificación de verificación al admin.

### Verificación de Creadoras
- Una modelo con `is_verified = false` tiene su perfil en **Modo Curiosidad**: invisible para clientes, publicaciones y servicios bloqueados.
- El `VerificationRequiredModal` debe mostrarse cuando una modelo no verificada intente:
  - Crear un post (botón `+` en navbar, botón en perfil vacío)
  - Crear una historia (botón "Añadir" en stories, botón "+" en perfil)
  - Acceder al panel de admin
