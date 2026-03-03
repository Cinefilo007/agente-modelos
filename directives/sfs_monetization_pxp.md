# Estrategia de Monetización y Análisis Financiero del Bot SFS

## 1. Análisis de Costos (Railway)

Para mantener el Bot de SFS operativo y escalable, se utilizará Railway.
Dado que este bot maneja Webhooks/Polling, Base de Datos (Supabase externa, sin costo extra en Railway), y Tareas en Segundo Plano (Cron jobs para verificar vistas de posts), el consumo es predecible.

### Estimación Mensual Promedio (MVP a Escala Media):
1. **Container del Bot (Python/Node.js):** 
   - RAM: 512MB - 1GB (Suficiente para manejar la API de Telegram y Jobs de verificación).
   - CPU: 0.5 - 1 vCPU.
   - **Costo estimado:** ~$2 a $5 USD / mes.
2. **Frontend (React Mini App):**
   - Alojado como sitio estático en Vercel o Netlify (Tier Gratuito) = $0 USD.
   - Si se aloja en Railway (Nginx/Node): ~$1 a $2 USD / mes.
3. **Servicios Externos (Supabase):**
   - Tier Gratuito cubre 500MB de base de datos y 2GB de ancho de banda (Suficiente para miles de usuarios).

**Costo total operativo estimado:** **~$5 a $8 USD mensuales.** (Extremadamente bajo y fácil de recuperar).

---

## 2. Modelos de Monetización del Bot SFS

Para hacer de este servicio un negocio altamente rentable, se atacarán múltiples vías de monetización:

### A. Publicidad Pagada (PXP - Estilo Telega.io)
Si un dueño de canal no quiere intercambiar publicidad (SFS) porque su canal es mucho más grande, puede ofrecer su espacio publicitario por dinero.
- **Funcionamiento:** El creador establece un tarifario (ej. $10 por 24 horas, $20 por 48 horas sin borrar).
- **El Escrow:** El comprador (otra modelo o usuario) paga el monto dentro de la Mini App. El sistema retiene el dinero (Escrow).
- **Ejecución Automatizada:** El bot publica el anuncio en el canal del vendedor. 
- **Verificación:** El bot verifica que el post se mantuvo el tiempo acordado.
- **Liberación y Comisión (Monetización):** Al cumplirse el plazo, el sistema libera los fondos a la billetera virtual del vendedor, **cobrando un fee de plataforma del 15% al 20%**.

### B. Sistema de Membresías y Suscripciones (Tiers)
- **Free:** Permite 2 SFS por día. Sin métricas avanzadas. No permite participar en PXP como vendedor (solo comprador).
- **Pro ($9.99/mes):** SFS ilimitados, analíticas de eficiencia de otros usuarios (ver cuántos clics reales generan), historial y acceso a vender en el catálogo de PXP.
- **Agency ($29.99/mes):** Vinculación de hasta 10 canales, auto-respuestas para SFS, y posicionamiento destacado en el catálogo.

### C. Sistema de "Boost" (Visibilidad)
- Los canales que quieran recibir más solicitudes de SFS o PXP pueden pagar micro-transacciones (ej. $2 USD o "Créditos") para aparecer fijados en el Top del Catálogo durante 24-48 horas, asegurando exposición masiva ante otros creadores.

### D. Upsell a la Agencia (El Valor Real Oculto)
- **Monetización Indirecta:** Cada modelo que entra buscando SFS gratis es un "Lead Caliente". Convertirla a la Agencia Principal (donde el Bot IA automatiza sus ventas de OnlyFans/Fansly y cobra un fee) puede representar cientos o miles de dólares mensuales en ingresos compartidos, haciendo que el Bot SFS pague su operación solo por existir.

---

## 3. Seguimiento de Efectividad de Campaña (Conversión Exacta)

Para resolver el problema del "lado oscuro" de los SFS (no saber si realmente funcionó), el bot medirán **exactamente cuántos usuarios se unieron de cada lado**.

### Arquitectura Técnica del Rastreo (Chat Invite Links API)
Telegram permite a los bots crear "Enlaces de Invitación de un Solo Uso" o "Enlaces con Seguimiento" (`chat_invite_link`).

**El Flujo SFS de Alta Precisión:**
1. **Acuerdo:** Canal A y Canal B aceptan el SFS.
2. **Generación de Links únicos (Bot):** 
   - El bot crea un nuevo enlace de invitación en el Canal A específico para esta campaña (Ej. `t.me/CanalA?start=SFS_B`).
   - El bot crea un nuevo enlace de invitación en el Canal B (Ej. `t.me/CanalB?start=SFS_A`).
3. **Publicación Cruzada:** 
   - El post programado para publicarse en el Canal B dirá: "Únete al Canal A aquí: [Link Único del Bot]".
   - Lo inverso ocurrirá en el Canal A.
4. **Validación de Solicitudes de Ingreso (`chat_join_request`):**
   - *(Requisito: Los canales deben tener activada la opción "Aprobar Nuevos Miembros" o el bot debe inspeccionar los eventos de entrada del link).*
   - La API de Telegram notifica al Bot cuando un usuario usa ESE link específico.
   - El Bot incrementa el contador `hired_users_count` en la base de datos para esa campaña.
5. **Reporte Frontend:** 
   - En la Mini App, ambas partes verán un Dashboard en tiempo real:
     - "Tú enviaste: 45 leads."
     - "Tú recibiste: 32 leads."
   - Esto expone a canales engañosos (que tienen bots que "ven" los mensajes pero no se unen) y refuerza la calidad del ecosistema en el *Trust Score*.

## 4. Gestión de Casos Borde y Variantes

1. **Borrado Manual Prematuro (SFS Fraudulento):**
   - *Riesgo:* Modelo A publica, obtiene beneficio y borra el post de Modelo B antes de tiempo.
   - *Solución:* El bot monitorea constantemente (Jobs). Si el post no está y no se cumplió la métrica, **penaliza** el Trust Score severamente (ej. -50 puntos). Si llega a 0, baneo de la plataforma. La Modelo B es notificada inmediatamente para que (si no es automatizado) pueda deshacer el favor.
2. **Fraude de Vistas con Bots en SFS/PXP:**
   - *Riesgo:* Comprar vistas falsas para llegar rápido a la meta pactada de un SFS.
   - *Solución:* Ahora, con el seguimiento de *Conversión Exacta* (Links únicos), las vistas no importan tanto como **las uniones reales**. Si un post marca 10k vistas pero generó 0 uniones, el algoritmo levanta un "Flag de Riesgo" en el canal, advirtiendo a futuros compradores.
3. **Disputas en PXP (Pay by Post):**
   - *Riesgo:* El vendedor alega que cumplió pero un bug de Telegram ocultó el post.
   - *Solución:* Modulo de disputas nativo. Los fondos se congelan 48h tras la campaña. Un administrador (Humano) revisa el log de la API del bot antes de dictaminar si se libera el dinero o se reembolsa.

---
## 5. Actualizaciones de Esquema (Data SOP)

Para soportar estas lógicas, se extenderá la tabla `promo_campaigns` definida en `promo_sfs_system.md`:
- Añadir campo `has_premium_tracking` (Boolean): Si el bot usa links especiales para contar conversiones exactas.
- Añadir campos `requester_joined_count` y `target_joined_count` (Integer): Contadores de métricas de conversión.
- Convertir `type` a ENUM: `('sfs_time', 'sfs_views', 'pxp')`.
- Añadir `price` (Decimal) y `escrow_status` (String) si tipo es `pxp`.
