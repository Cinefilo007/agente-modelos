# Análisis: Variaciones de Conversación y Customer Journey

Este análisis desglosa los diferentes tipos de clientes y escenarios que el Agente de Ventas (Manager) enfrentará, categorized por su **Nivel de Intención**.

## 1. 🔥 Alta Intención (Cierre Inmediato)
Son clientes que ya conocen el servicio o tienen una necesidad clara. No hay que perder tiempo en charla trivial.

| Escenario | Comportamiento del Cliente | Acción del Agente (IA) |
|-----------|----------------------------|------------------------|
| **Inquiry de Precios** | "¿Hola, cuánto cuesta el pack VIP?" o "¿Tienes promo hoy?" | Dar precio directo (según DB) y preguntar método de pago. |
| **Cierre Directo** | "Quiero el servicio X, pásame tu link de pago." | Enviar métodos de pago y disparar NOTIFICACIÓN a la modelo. |
| **Urgencia** | "¿Estás activa ahora? Quiero algo ya." | Confirmar "disponibilidad" (según config) y forzar el cierre. |

## 2. ⚡ Interés Medio (Nutrición / Convencimiento)
El cliente está interesado pero tiene dudas, miedos o necesita una "muestra" de confianza.

| Escenario | Comportamiento del Cliente | Acción del Agente (IA) |
|-----------|----------------------------|------------------------|
| **Validación Física** | "¿De verdad eres tú? ¿Cómo son tus ojos/curvas?" | Usar `config_physique` para describir con detalle y tentar. |
| **Miedo a Estafa** | "¿Me vas a enviar el contenido de verdad dopo del pago?" | Validar con "Nebula Escrow" o mencionar reviews positivas. |
| **Pide Muestras** | "¿Me mandas una foto de ahora para ver si eres real?" | Responder con humor/misterio. "Lo mejor se guarda para el VIP". |

## 3. 🧊 Baja Intención (Time Wasters / Curiosos)
Son usuarios que solo buscan contenido gratis o compañía sin pagar. Drenan el parámetro de **Paciencia**.

| Escenario | Comportamiento del Cliente | Acción del Agente (IA) |
|-----------|----------------------------|------------------------|
| **Charla Infinita** | "Hola linda, ¿qué haces? ¿cómo vas?" (Sin preguntar servicios) | Respuestas amables pero cortas. No gastar burbujas. |
| **Petición de Cita Gratis** | "Si nos vemos te pago en persona" o "Solo quiero hablar". | Cortar en seco. "Mis servicios son prepagos vía plataforma". |
| **Regateo Extremo** | "Es muy caro, dame un descuento del 80%". | Mantener firmeza. "La calidad tiene un precio, cariño". |

## 4. 🚫 Crítico / Blacklist (Trolls y Peligrosos)
Usuarios que violan las reglas de la comunidad o faltan al respeto.

| Escenario | Comportamiento del Cliente | Acción del Agente (IA) |
|-----------|----------------------------|------------------------|
| **Insultos / Abuso** | Lenguaje ofensivo o humillante. | **GHOSTING INMEDIATO**. No gasta ni un crédito más. |
| **Estafadores** | "Te envío un comprobante falso" o "Paga tú primero". | Detectar patrón y sugerir a la modelo que lo bloquee. |

## 💡 Matriz de Detección de Intención
La IA usa esta lógica para el tag de retorno:

- **INTEREST**: Si el mensaje contiene palabras clave de *Precio, Pack, Pago, Video-llamada, Encuentro, Suscripción*.
- **NO_INTEREST**: Si tras 3 mensajes no ha preguntado por nada monetizable o si ha faltado al respeto.

---
*Este análisis servirá para refinar el Prompt del Manager en las próximas iteraciones.*
