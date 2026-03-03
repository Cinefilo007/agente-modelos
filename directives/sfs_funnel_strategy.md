# Directiva: Estrategia de Embudo SFS (Hook) y Registro

## 1. Visión General
El Bot de SFS actuará como un "Lead Magnet" (gancho) de fricción cero. El objetivo es que cualquier dueño de canal (modelos, agencias y hombres dueños de canales) use la herramienta gratuita de SFS. Una vez dentro y viendo el valor del ecosistema, se les invita (Upsell) a las modelos a aplicar para entrar al sistema principal (Portal, Bot de Ventas de IA, Feed).

## 2. Separación de Datos (Data SOP)
Para no ensuciar la tabla `models` con usuarios que solo quieren SFS o que son hombres, se implementa una tabla separada.

### Tabla `sfs_users`
Todos los que entran al bot de SFS caen aquí.
- `id` (UUID)
- `telegram_id` (BIGINT, Unique)
- `username` / `full_name` (Text)
- `is_agency_model` (Boolean, Default: false) -> Referencia cruzada opcional al sistema principal.
- `created_at` (Timestamp)

Nota: La tabla `channels` y `promo_campaigns` definida en `promo_sfs_system.md` ahora deberá relacionarse con `sfs_users.id` en lugar de `models.id`.

## 3. Niveles de Acceso y Verificación

### Nivel 1: Usuario de SFS (Fricción Cero)
- **Registro:** Automático al iniciar el Bot de SFS (`/start`). No requiere revisión humana, ni fotos de verificación.
- **Acceso:** Limitado **estrictamente** a la MiniApp de SFS (Catálogo de canales, Métricas de ER, Crear/Aceptar Acuerdos).
- **Control de Calidad:** La calidad no se mide verificando a la persona, sino **evaluando el canal**. El sistema lee automáticamente el `Engagement Rate (ER)` del canal. Si el canal es de baja calidad o tiene métricas falsas, simplemente tendrá un ER bajo y nadie hará acuerdos con ellos.

### Nivel 2: "El Gancho" (Conversión a Modelo)
- **UI en SFS:** Dentro de la MiniApp de SFS, se colocará un banner persistente o sección exclusiva: *"🔥 Eres Creadora de Contenido? Automatiza tus ventas en DMs con nuestro Bot IA. [Aplica aquí]"*.
- **Transición:** Si una chica hace clic, el bot de SFS le enviará el link al bot oficial de la agencia, iniciando el flujo de *Onboarding* oficial detallado en `onboarding_flow.md` y cayendo ahora sí en la tabla `models` (Status: `prospect` -> `verifying`).

## 4. Beneficios de esta Arquitectura
1. **Escalabilidad:** Dueños de canales de memes, películas (como Cinéfilos) o agregadores de contenido pueden usar tu sistema de SFS. Esto inyecta tráfico masivo al catálogo SFS sin comprometer la exclusividad de las modelos de tu agencia.
2. **Base de Datos Limpia:** Tu tabla `models` se mantiene pura (solo chicas verificadas, listas para generar ventas con IA).
3. **Validación Previa:** Cuando una modelo del SFS aplique a tu agencia, ya tendrás un historial de la calidad de su canal (ER, Vistas) y su comportamiento (Trust Score), facilitando tu decisión de aprobarla.
