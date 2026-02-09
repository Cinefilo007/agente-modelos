# SOP: Flujo de Onboarding y Verificación

Este documento detalla el proceso paso a paso desde que una modelo potencial contacta al bot hasta que está activa y lista para recibir leads.

## 1. Fase de Atracción (Venta del Bot)
-   **Trigger**: Modelo inicia el bot (`/start`).
-   **Agente**: `meta-llama/llama-3.3-70b-instruct` (OpenRouter) -> **Persona: Hunter**.
-   **Comportamiento Humano**:
    -   **Typing**: Debe mostrar "Escribiendo..." antes de responder.
    -   **Idioma Inteligente**: Detecta y responde en el idioma de la modelo (Español, Inglés, etc.).
    -   **Markdown**: Usa formato compatible con Telegram (`*negrita*`).
    -   **Estilo**: Persuasivo, directo, enfocado en beneficios.
-   **Transición Inteligente (Smart Start)**: 
    -   El bot analiza la intención de compra. Si la modelo dice "quiero empezar" o "estoy lista", el bot detecta la intención y lanza la encuesta automáticamente.
    -   **Historial de Chat**: El bot mantiene el contexto de la conversación leyendo los mensajes anteriores para responder de forma coherente.
    -   **Detección de Intención**: El bot etiqueta internamente cada mensaje con una intención o estatus para saber en qué punto quedó la conversación.

## 2. Fase de Verificación y Encuesta
-   **Transición**: Cuando el bot detecta la intención de **[START]** o el usuario escribe "EMPEZAR".
-   **Conversation Flow**:
    -   El bot debe explicar las funciones poco a poco.
    -   Mensajes cortos y en burbujas separadas.
    -   Si le preguntan precios, ofrece el plan gratuito inicial.
    -   Si preguntan métodos de pago, referir al administrador (nunca inventar).
-   **Datos Recopilados**:
    1.  **Nombre y Apellido**: Uso interno administrativo.
    2.  **Edad**: Validación (`> 18`). Si es menor, se rechaza automáticamente.
    3.  **País**: Registro demográfico.
    4.  **Selfie con Documento**: Foto sosteniendo ID/Cédula para validar identidad.
    5.  **Video de Aceptación**: Video Note (redondo) aceptando términos y voluntad propia.
-   **Procesamiento**:
    1.  El bot recopila paso a paso.
    2.  Al finalizar, envía un **Resumen al Admin** (Foto + Datos + Botones) y el **Video Note**.
-   **Acciones del Admin**:
    -   **Aprobar**: Notifica a la modelo y activa el comando `/setup`.
    -   **Rechazar**: Notifica el rechazo.
    -   **Repetir**: Pide reiniciar el proceso si las pruebas no son claras.

## 3. Fase de Configuración (Setup)
Una vez aprobada (`verificado = TRUE` en DB), el bot solicita la configuración obligatoria para operar.

### 3.3. Métodos de Pago
5.  **Pagos por País**: "¿Qué métodos de pago aceptas? Detalla por país si es necesario."
    -   *Regla*: El bot NO da cuentas bancarias ni wallets. Solo dice "Acepto Binance, PayPal y Transferencia MX". Cuando el cliente elige, el bot avisa a la modelo para que ELLA envíe los datos de pago finales (seguridad y cierre humano).

## 4. Activación
-   Asignar créditos de prueba (ej: 50 créditos).
-   Cambiar estado a `Activa`.
-   Notificar: "¡Tu asistente está listo! Cuando un cliente te escriba, yo lo atenderé hasta el cierre."
