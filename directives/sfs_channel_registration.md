# Flujo de Registro y Aprobación de Canales en SFS

Este documento establece el Procedimiento Operativo Estándar (SOP) para que un usuario registre su canal en el ecosistema SFS, asegurando la calidad y los permisos técnicos requeridos.

## 1. Inicio de Sesión (Login) en la Mini App

Para garantizar una experiencia fluida e integrada:
- El inicio de sesión en la Mini App de SFS (Frontend React) se realizará **exclusivamente a través de Telegram**.
- Se utilizará Telegram WebApp SDK o el widget de Login de Telegram (`window.Telegram.WebApp.initDataUnsafe.user`) para autenticar automáticamente al usuario al abrir la MiniApp desde el bot.
- Esto vincula instantáneamente la sesión web con el `sfs_users.telegram_id` de la base de datos sin requerir contraseñas.

## 2. Flujo de Añadir un Canal (Paso a Paso)

Cuando un usuario presiona "Registrar Nuevo Canal" en la Mini App, el sistema lo guiará por un asistente paso a paso, con instrucciones **precisas y a prueba de errores**.

### Paso 1: Configurar el Bot como Administrador
La plataforma advertirá al usuario:
> "Para llevar las métricas de tu canal y automatizar las campañas, debes añadir a nuestro bot (`@AgenciaPromoBot`) como **Administrador** de tu canal."

**Permisos Obligatorios Solicitados:**
- [x] Enviar mensajes (Send messages)
- [x] Editar mensajes de otros (Edit messages of others) - *Clave para borrar posts viejos u ocultar SFS.*
- [x] Eliminar mensajes (Delete messages) - *Para finalizar el SFS o penalizar fraudes.*
- [x] Añadir a otros usuarios (Invite users via link) - *CRUCIAL para crear enlaces de invitación de un solo uso para llevar el conteo real.*

### Paso 2: Validación de Privacidad y Reenvío
El usuario debe reenviar cualquier mensaje de su canal al chat privado del Bot SFS.
**En backend, el Bot verifica:**
1. **Es Administrador:** Verifica si realmente tiene los permisos descritos arriba.
2. **Restricción de Reenvío (Forwarding Restrict):** 
   - Si el canal es **Privado**, el bot verifica si la opción *"Restringir guardar contenido"* (Restrict saving content) está activada.
   - Si está activada, el bot **RECHAZA** el registro temporalmente con el mensaje:
     > ❌ "Tu canal tiene bloqueado el reenvío de mensajes. Para usar SFS, debes desactivar esta opción en: Editar Canal > Tipo de Canal > Restringir guardar contenido. Desactívalo y vuelve a intentarlo."

### Paso 3: Categorización del Canal
Si el bot valida los permisos técnicos, pregunta al usuario por la categoría:
- Modelaje / OnlyFans
- Cine y Series (Ej. Cinéfilos)
- Memes / Humor
- Cripto / Finanzas
- Otro

*Esta categoría es vital para que al filtrar en el catálogo SFS, las modelos no terminen haciendo SFS con un canal de criptomonedas (salvo que así lo deseen).*

## 3. Aprobación Administrada (Admin Approval Flow)

No todos los canales entran automáticamente al catálogo público.

1. **Estado Pendiente:** Al terminar el Paso 3, el canal queda en la base de datos `channels` con estado `status = 'pending'`. Solo el dueño lo ve en su panel, pero no aparece en el catálogo global.
2. **Notificación al Administrador (Tú):**
   - El Bot principal (o un canal de logs privado para admins) te envía una alerta:
     > 🔔 **Nuevo Canal a SFS para Revisión**
     > **Dueño:** @username
     > **Canal:** Nombre del Canal (ID: -100XXXXX)
     > **Seguidores:** 4,500
     > **Categoría:** Cine y Series
     > 
     > 👉 **Analizar Contenido:** [Link de Invitación Temporal generado por el bot]
     > 
     > [ ✅ Aprobar ] | [ ❌ Rechazar ]
3. **Link de Inspección:** El bot usa su permiso de *Añadir Usuarios* para generarte un link de invitación temporal, para que puedas ver el canal incluso si es privado.
4. **Veredicto:** 
   - Si presionas **Aprobar**: `status` cambia a `active`. El usuario recibe un mensaje: *"🎉 Tu canal fue aprobado, ya estás en el catálogo SFS"*.
   - Si presionas **Rechazar**: Debes seleccionar una razón (Ej. "Temática no aceptada", "Contenido ilegal").

## 4. Incentivos: SFS Limitado vs SFS Ilimitado

Para forzar la adopción del bot IA principal (El Upsell) y crear una barrera de entrada para otros usuarios:

* **SFS Users (Hombres, Agencias locales, Canales normales):**
  - Si un usuario **NO** es una modelo oficial de la Agencia, tendrá su cuenta limitada a **2 campañas de SFS al día**.
  - Si desean hacer más SFS (o entrar a PXP), **deberán pagar** la suscripción Pro mensual ($9.99).

* **Modelos Oficiales de la Agencia:**
  - Si el usuario *ya existe* en la tabla `models` (aprobada en el Bot Principal de IA), su cuenta recibe un Upgrade: **6 campañas de SFS al día** (No infinito, para mantener el valor del servicio).
  - **Gamificación (Unlock SFS):** Para conseguir más SFS diarios gratuitos, las modelos deberán cumplir *Microtareas* dentro del Portal Principal, fomentando la retención y el uso de la IA. Ejemplos de misiones:
    1. Completar su perfil al 100% (+1 SFS diario).
    2. Publicar al menos 3 posts semanales en el Feed (+2 SFS diarios).
    3. Cerrar su primera venta usando el Bot IA (+5 SFS diarios).

## 5. Integración Financiera Global (Wallet)

El Bot SFS no tendrá un sistema de cobros / pasarela de pagos aislado. **Se integrará directamente con el ecosistema financiero "Wallet" del Portal Principal** (Base de Datos Centralizada).

- **Recargas:** Para pagar publicidad (PXP) o Suscripciones PRO, los usuarios (sean Modelos o SFS Users) deberán iniciar sesión en la MiniApp y añadir saldo a su **Wallet Global**, depositando Cripto o usando los métodos de pago habituales de la agencia.
- **Pagos de Campañas (PXP):** 
  1. Si un canal cobra $20 por PXP, el sistema debita $20 USD de la *Wallet* del comprador.
  2. El dinero queda en estado `held` (Escrow).
  3. Al finalizar el PXP, el Bot SFS transfiere $17 USD (85%) a la *Wallet* del vendedor y la Agencia retiene $3 USD (15% Comisión).
- **Consolidación:** Esto unifica las métricas financieras de la compañía (Ventas IA + Ventas SFS) en un solo dashboard de ingresos.
