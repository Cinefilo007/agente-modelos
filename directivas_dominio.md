# Directiva de Configuración de Dominio: Nebulastar.app

Esta directiva documenta el proceso completo para migrar y configurar el nuevo dominio `nebulastar.app` en la infraestructura actual (Railway + Porkbun + Telegram Bots).

## 1. Configuración en Railway
Para que Railway acepte peticiones desde el nuevo dominio:
1.  Ir al panel de **Railway** -> Proyecto -> Servicio de Aplicación.
2.  Pestaña **Settings** -> Sección **Networking**.
3.  Hacer clic en **"Custom Domains"**.
4.  Ingresar `nebulastar.app` y `www.nebulastar.app`.
5.  Railway proporcionará los registros DNS necesarios (usualmente un registro `ALIAS` o `ANAME` para el dominio raíz y un `CNAME` para `www`).

## 2. Configuración en Porkbun (DNS)
Acceder al panel de administración de Porkbun para `nebulastar.app` e ingresar lo siguiente:
-   **Tipo ALIAS (o ANAME)**: Punto de origen `@`, apuntando al host que indique Railway (ej: `agente-modelos-production.up.railway.app`).
-   **Tipo CNAME**: Nombre `www`, apuntando al mismo host anterior.

## 3. Configuración de Telegram Login Widget
Dado que el sistema utiliza el Widget de Login de Telegram, es obligatorio actualizar el dominio permitido en el BotFather para que el botón de inicio de sesión funcione:
1.  Hablar con [@BotFather](https://t.me/BotFather).
2.  Seleccionar el bot (ej: `AgenteNebulaIA_bot` y `NebulaModels_bot`).
3.  Ir a **Bot Settings** -> **Domain**.
4.  Ingresar el nuevo dominio: `nebulastar.app`.
5.  Repetir para todos los bots involucrados en el login.

## 4. Actualización de Variables de Entorno (Railway Vars)
Es crítico actualizar las siguientes variables en el panel de Railway para que las redirecciones y enlaces en mensajes de Telegram funcionen correctamente:
-   `LANDING_URL`: `https://nebulastar.app/promotions` (Usada en el Bot de Promociones).
-   Cualquier otra variable que referencie explícitamente el dominio antiguo.

## 5. Referencias en el Código (Pendientes de Refactorizar)
Existen URLs hardcodeadas que deben ser reemplazadas por variables de entorno para evitar fallos en el futuro:
-   `src/promo_bot.py`: Línea 79.
-   `src/services/promo_jobs.py`: Líneas 224, 302, 359.
-   `src/api/routes/promo.py`: Líneas 224, 444, 547, 567.

---
*Esta guía debe seguirse rigurosamente cada vez que se realice un cambio de dominio principal.*
