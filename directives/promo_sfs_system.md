# Directiva: Sistema de Promoción Cruzada (SFS / PXP)

## 1. Objetivo del Sistema
Permitir a las modelos del ecosistema gestionar acuerdos de publicidad cruzada (SFS - Shoutout for Shoutout) y publicidad pagada (PXP - Pay by Post) en sus canales de Telegram (públicos y privados), basándose en métricas reales de *engagement* (vistas, interacciones) y no solo en número de seguidores, eliminando el problema de los canales inflados con bots.

## 2. Recomendación de Arquitectura: ¿Mismo Bot o Bot Nuevo?

**Recomendación:** Crear un **NUEVO BOT independiente** (ej. `@AgencyPromoBot`).

**Justificación (Separación de Preocupaciones / SOPs):**
1. **Seguridad y Rate Limits:** Publicar contenido y monitorear múltiples canales consume muchos recursos de la API de Telegram y puede exponer al bot a bloqueos por *Spam*. Si el bot principal de ventas/onboarding es bloqueado, se cae todo el negocio. Un bot secundario aísla este riesgo.
2. **Permisos Claros:** El bot promocional requiere permisos de `Administrador` en los canales (para leer estadísticas, publicar, editar y eliminar). Es mejor no darle estos permisos al bot de ventas de cara al cliente.
3. **Especialización:** El bot principal se mantiene enfocado en interactuar con leads (Fase B). El bot promocional interactúa con la API de canales y ejecuta tareas programadas (Jobs).

Ambos bots compartirán la misma base de datos Supabase, por lo que la Mini App (React) podrá leer y controlar los datos generados por ambos de forma centralizada.

## 3. Funcionamiento de la Evaluación de Métricas (Calidad del Canal)

Cuando una modelo añade el Promo Bot a su canal como Administrador:
1. El bot registra el `chat_id` en la base de datos vinculado a la modelo.
2. Comienza un periodo de "Escucha Activa": por cada post reciente, el bot lee la cantidad de vistas (`views`) y reacciones pasadas 24/48 horas.
3. El sistema calcula el **Engagement Rate (ER)**: `(Vistas Reales Promedio / Número de Seguidores) * 100`.
4. El canal recibe una "Calificación de Calidad" (Ej. A, B, C) visible en el panel.

## 3.1. Sistema de Reputación P2P ("Trust Score" y Reseñas)

El valor más grande de este ecosistema es la confianza. Para evitar estafadores o canales que no cumplen lo pactado (SFS o PXP), se implementa un **Sistema de Reseñas P2P (Peer-to-Peer)**:

1. **Calificación Post-Campaña:**
   - Una vez que el bot finaliza automáticamente una campaña SFS o PXP (por tiempo o vistas alcanzadas), se habilita un periodo de 48 horas para que ambos creadores se califiquen mutuamente.
   - Si no se califican, el sistema asigna una calificación neutral por defecto (5 estrellas, sin comentario).
2. **Escala de Reseñas (1 a 5 Estrellas):**
   - El usuario califica la experiencia y el bot le pide un breve comentario obligatorio si la calificación es menor a 4 estrellas.
   - *Ejemplo de uso:* "Me hizo borrar el post a los 10 minutos" (1 Estrella) o "Manda excelente tráfico, súper recomendado" (5 Estrellas).
3. **Impacto en el Catálogo:**
   - Estas reseñas alimentan el puntaje promedio visible en el Catálogo de Promociones (`trust_score`).
   - Los usuarios con menos de 3.5 estrellas en sus últimas 5 campañas son **ocultados automáticamente** del catálogo público. Si llegan a 2.0, el sistema los banea permanentemente.
4. **Reportes Automáticos de Incumplimiento:**
   - Independiente a las reseñas humanas, si el bot detecta que una usuaria borró un post antes de tiempo para engañar a la otra, automáticamente crea una reseña negativa a nombre del sistema en la tabla `sfs_reviews` con un comentario: "⚠️ [Alerta Automatizada] Este usuario eliminó prematuramente la publicación de su campaña".

## 4. Flujo de Acuerdo y Publicación (SFS / PXP)

1. **Dashboard de Promociones (Mini App):** 
   - Una nueva vista en el panel de administrador de la modelo (`/promociones`).
   - Se muestra un catálogo de canales verificados del ecosistema.
   - Filtros: Rango de ER, Temática, Tipo de acuerdo aceptado (SFS por Vistas, SFS por Tiempo, PXP), y *Trust Score*.
2. **Creación del Contenido (Reenvío desde Telegram):**
   - Para evitar un editor complejo en la Mini App, las modelos **reenviarán** su post promocional ya armado (texto, foto, video, y emojis premium) directamente al chat privado del Promo Bot.
   - El bot guardará temporalmente ese post, preservando su estructura (incluyendo *custom emojis* si aplican).
   - El bot inyectará **obligatoriamente** al final del texto un enlace predefinido al perfil de la modelo en el portal (`https://portal.com/modelo/username`).
3. **Generación del Acuerdo:**
   - La Modelo A envía una propuesta a la Modelo B (Selecciona objetivo de vistas o duración, y elige uno de los posts guardados).
   - La Modelo B recibe una notificación en el Bot Principal de que tiene una propuesta. Entra a la Mini App, revisa la vista previa del post, y acepta.
4. **Ejecución Automatizada:**
   - Al aceptar, el **Promo Bot** publica los posts correspondientes en ambos canales.
   - Envía un mensaje de éxito a ambas modelos ("Campaña SFS iniciada").
4. **Monitoreo en Tiempo Real (Live Tracking):**
   - El bot monitorea constantemente (mediante Jobs) el `message_id` de cada post publicado.
   - **Detección de Vistas:** El bot lee el número de vistas actuales de los posts. Si el acuerdo era por cantidad de visualizaciones (ej. 5k vistas), el bot registrará cuándo se alcanza la meta.
   - **Detección de Borrado Prematuro:** Si la API devuelve que el mensaje ya no existe (eliminado manualmente por la modelo) ANTES de cumplirse la meta de vistas o la duración pactada, el bot cancelará la campaña. Se le restarán puntos al infractor y se notificará a la otra parte para que pueda borrar su parte del acuerdo.
5. **Finalización Automatizada:**
   - Alcanzada la meta (cantidad de vistas o duración pactada), el Promo Bot elimina los mensajes promocionales de ambos canales.
   - Envía notificación de finalización con el reporte de vistas alcanzadas e incrementa el *Trust Score*.

## 5. Monetización del Sistema SFS

Para solventar los costos del Promo Bot y generar ingresos adicionales, se implementarán los siguientes modelos de negocio:

### 5.1. Sistema de Suscripción (Tiers)
- **Plan Básico (Free):** Permite un máximo de 2 SFS por día. Límite de 1 canal vinculado. No muestra analíticas avanzadas de otros canales.
- **Plan Pro (Suscripción Mensual):** Permite hasta 10 SFS por día. Hasta 3 canales vinculados. Muestra el *Engagement Rate* y *Trust Score* detallado del catálogo.
- **Plan Elite/Agency:** SFS ilimitados, canales ilimitados, alertas instantáneas de nuevas propuestas.

### 5.2. Opciones de Monetización Adicionales
- **Catalogo "Boosted" (Destacados):** Las modelos pueden pagar con "Créditos" (Diamantes) para que su canal aparezca de primero en el catálogo de SFS durante 24 horas.
- **Comisión por PXP (Pay by Post):** Cuando un acuerdo es estrictamente pagado (PXP), la plataforma retiene el pago en *Escrow* y cobra un **fee del 10% al 15%** al liberar los fondos tras publicarse el post exitosamente.

## 6. Experiencia de Usuario (UX) y Onboarding

Para asegurar que las modelos usen la herramienta correctamente sin sentirse abrumadas, la Mini App incluirá:
1. **Tour Guiado de Bienvenida (Intro):** Al primer ingreso a `/promociones`, se activa un tour (vía `react-joyride`) que explica paso a paso:
   * **Bienvenida**: Introducción al SFS Automatizado y PXP.
   * **Catálogo Real**: Cómo leer el ER, seguidores y vistas promedio garantizadas.
   * **Trust Score**: Sistema de reputación P2P y penalizaciones automáticas por fraude.
   * **Límites y Plan**: Diferencia entre planes gratuitos y de agencia.
   * **Navegación**: Gestión de propuestas enviadas y recibidas.
   * **Monitoreo Live**: Seguimiento de campañas activas en tiempo real.
   * **Billetera y Perfil**: Gestión de créditos, ingresos y configuración de canales.
   * **Instrucción final Bot**: Recordatorio de reenviar el post al bot de Telegram para empezar.
2. **Estados Vacíos (Empty States) Educativos:** Si no han reenviado ningún post al bot, la pantalla no dirá solo "Vacío", sino que mostrará un GIF o video corto explicando: *"Ve a Telegram, reenvíale tu mejor foto al @AgenciaPromoBot y vuelve aquí"*.
3. **Indicadores de Progreso:** Al enviar una propuesta, verán una barra de estado clara: `Enviado -> Esperando Respuesta -> Activo -> Completado`.

## 7. Cambios Requeridos en Base de Datos (Supabase)

Se requerirán las siguientes tablas/campos nuevos (Ver `sfs_funnel_strategy.md` para la separación de usuarios):
- `sfs_users`: (Nueva) Registro de Creadores o Modelos usando la app de promoción separada de la agencia. (`trust_score`, `badges`, `subscription_tier`).
- `channels`: Registro de canales integrados (`id`, `sfs_user_id`, `telegram_chat_id`, `name`, `followers`, `avg_views`, `engagement_rate`, `status`).
- `promo_templates`: Textos/Media reenviados listos para usar (`id`, `sfs_user_id`, `telegram_message_id_origin`, `content_data` [JSON]).
- `promo_campaigns`: Registro de acuerdos (`id`, `requester_id`, `target_id`, `type`, `target_views`, `duration_hours`, `status`, `start_time`, `requester_template_id`, `target_template_id`) (Mismos IDs ligados a `sfs_users`).
- `promo_posts`: Contenido individual a publicar relacionado a la campaña.

## 8. Siguientes Pasos
1. Crear bot en BotFather exclusivo para Promo.
2. Crear esquema SQL en Supabase (Tablas de Canales, Campañas, y Suscripciones).
3. Desarrollar el servicio en Python (`promo_bot.py`).
4. Desarrollar la UI en React (`/promotions`) con `react-joyride` para el tour guiado.
