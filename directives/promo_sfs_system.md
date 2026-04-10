# Directiva: Sistema de Promoción Cruzada (SFS)

## 1. Objetivo del Sistema
Permitir a las modelos del ecosistema gestionar acuerdos de publicidad cruzada (SFS - Shoutout for Shoutout) en sus canales de Telegram (públicos y privados) y perfiles personales (Historias de Telegram Business). Se centra en métricas reales de *engagement* (vistas, interacciones) y elimina los sistemas de pago monetario (PXP) en favor de una arquitectura P2P (Peer-to-Peer) pura colaborativa.

## 2. Arquitectura de Monitoreo

**Integración y Validación:**
El sistema depende de un bot administrador en los canales para:
1. **Validar Canales Públicos vs Privados**: Las vistas automáticas solo son medibles fiablemente en canales públicos (`@username`). En canales privados, se bloquea la métrica `SFS_VIEWS`.
2. **Historias (SFS_STORY)**: Requiere que ambas cuentas tengan Telegram Premium y Telegram Business activo, otorgando permisos al bot para publicar historias (`business_connection_id`).

## 3. Funcionamiento de la Evaluación de Métricas (Calidad del Canal)

Cuando una modelo añade el Promo Bot a su canal o perfil como Administrador:
1. El bot registra el `chat_id` o la conexión business en la base de datos vinculado a la modelo.
2. Comienza un periodo de "Escucha Activa": por cada post reciente en canales, el bot lee la cantidad de vistas (`views`) y calcula el ER.
3. El sistema calcula el **Engagement Rate (ER)**: `(Vistas Reales Promedio / Número de Seguidores) * 100`.

## 3.1. Sistema de Reputación P2P ("Trust Score" y Reseñas)

El valor más grande de este ecosistema es la colaboración basada en confianza. 

1. **Calificación Mutua Requerida:** Al finalizar cada contrato SFS, ambas usuarias deben dejarse un *Rating* y *Comentario* que alimentarán su puntaje en el catálogo.
2. **Escala de Reseñas (1 a 5 Estrellas):** Si la calificación es menor a 4 estrellas, se exige un comentario justificativo.
3. **Impacto en el Catálogo:** Los canales con bajo Trust Score son ocultados o baneados automáticamente.
4. **Reportes Automáticos de Fraude:** Si el sistema detecta mediante `monitor_sfs_views_and_fraud` que el post o historia fue borrada antes de tiempo, decrementa el puntaje en 20 puntos por fraude y cancela la campaña.

## 4. Tipos de Contrato SFS Aceptados

- **`SFS_VIEWS`:** (Sólo canales públicos). El contrato finaliza al alcanzar la meta de visualizaciones pactada en el bot.
- **`SFS_TIME`:** El post debe mantenerse publicado en el canal por las horas estipuladas. Finalizado el tiempo, el bot elimina el post y completa el acuerdo.
- **`SFS_FOLLOWERS`:** La campaña finaliza al lograr que el canal objetivo suba su cantidad de seguidores a la meta pactada.
- **`SFS_STORY`:** (Novedad). Colaboración mediante Historias de Telegram Business publicadas cruzadamente a los perfiles de ambas partes por 24 horas y monitoreadas por persistencia de tiempo (`SFS_TIME` logic).

## 5. Limitaciones Diarias (Filtro Anti-Spam)

Para mantener la calidad y balance en el ecosistema, se imponen límites en el envío de propuestas diarias:
- **Modelos No Verificadas:** Límite de **10 SFS / día.**
- **Modelos Verificadas / Cuentas de Agencia:** Límite ampliado a **20 SFS / día.**

## 6. Experiencia de Usuario (UX) Mini App

La interfaz (`Promotions.jsx`) opera bajo pantalla completa `requestFullscreen()`, resolviendo colisiones nativas de Telegram.

1. **Catálogo Real:** Muestra el ER, seguidores y visualizaciones promedios, e indica claramente si un canal acepta `SFS_STORY` 📸.
2. **Bloqueos Condicionales:** Si un usuario intenta enviar una propuesta `SFS_VIEWS` a un canal privado, el selector se desactiva y aparece un tooltip sugiriendo cambiar a `SFS_TIME` o `SFS_FOLLOWERS` ⏱️👥.
3. **Modal de Calificación (Obligatoria):** Tras finalizar el SFS, la revisión cruzada aparece de manera evidente asegurando que el Trust Score fluye en tiempo real.

## 7. Cambios Restantes Requeridos en Jobs (Backend)

La fase actual `publish_sfs_campaigns` y `monitor_sfs_views_and_fraud` está acondicionada para tratar `SFS_STORY` mediante tolerancias en los forwards, ya que PTB maneja las historias por `business_connection_id`. En futuras iteraciones:
- Evaluar integraciones activas para `bot.post_story` en la publicación.
- Obtener telemetría de historias (si Telegram lo expone pronto) en lugar de confiarse 100% al temporizador de expiración (24h default).
