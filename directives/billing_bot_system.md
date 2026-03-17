# Directiva: Sistema de Facturación Inline para Modelos

Este documento define la estructura técnica y operativa del bot de facturación diseñado para que las modelos puedan cobrar sus servicios directamente en chats con clientes utilizando comandos inline.

## 1. Visión General
El objetivo es permitir que una modelo, estando en un chat con un cliente, invoque al bot (`@mibot`), seleccione uno de sus servicios pre-registrados y envíe una "factura interactiva". El cliente podrá aceptar la factura, lo que le redirigirá al bot privado para procesar el pago (Escrow o Privado).

## 2. Estructura de Datos

### 2.1. Tablas existentes (`model_services` y `model_service_options`)
El sistema utilizará las tablas ya existentes en la base de datos para gestionar la tienda de la modelo.
- `model_services`: Contiene el título, descripción y categoría del servicio.
- `model_service_options`: Contiene las diferentes variantes de precio (ej: 5 min, 10 min) para cada servicio.

```sql
-- Estas tablas ya existen en el esquema actual
-- model_services (id, model_id, title, description, category, ...)
-- model_service_options (id, service_id, label, price, ...)
```

### 2.2. Relación con `orders`
Se utilizará la tabla `orders` existente para rastrear estas facturas.
- `status`: 'pending' (enviada), 'held' (escrow activo), 'completed' (finalizada), 'disputed' (en conflicto).

## 3. Flujo Técnico

### 3.1. Fase Inline (Selección)
1. **Invocación**: La modelo escribe `@mibot` en cualquier chat.
2. **Identificación**: El bot identifica a la modelo por su `telegram_id`.
3. **Consulta**: Se buscan los servicios activos de esa modelo en la tabla `services`.
4. **Respuesta**: Se muestran los servicios como una lista inline con nombre y precio.
5. **Envío**: Al seleccionar un servicio, el bot envía un mensaje al chat (vía `input_message_content`) con:
   - Detalle del servicio.
   - Botón `✅ Aceptar Factura` (URL: `t.me/mibot?start=pay_SERVICEID`)
   - Botón `❌ Rechazar` (Callback simple).

### 3.2. Fase de Pago (Bot Privado)
1. **Deep Link**: El cliente pulsa `Aceptar` y se abre el chat privado con el bot con el parámetro `pay_SERVICEID`.
2. **Generación de Orden**: El bot crea una entrada en `orders`.
3. **Opciones de Pago**:
   - **Billetera (Escrow)**: Si tiene saldo, se bloquea el monto (`held`).
   - **Pago Directo**: Se envían las instrucciones de pago manual de la modelo (configuración en `models.config_payments`).
4. **Notificación**: Se notifica a la modelo que el pago ha sido iniciado/garantizado.

### 3.3. Fase de Finalización y Reputación
1. **Botón Finalizar**: Disponible para el cliente una vez el pago está en `held` o `pending`.
2. **Liberación**: Al pulsar "Finalizar", el dinero se libera a la modelo (si es escrow) y la orden pasa a `completed`.
3. **Review**: El bot solicita automáticamente una valoración (1-5 estrellas) y un comentario.
4. **Reputación**: Se actualiza el `reputation_score` de la modelo en tiempo real.

## 4. Implementación (SOP vs Ejecución)

### 4.1. SOPs (Lógica de Negocio)
- `src/services/billing_service.py`: Gestión de creación de servicios y validación de facturas.
- `src/services/escrow_service.py`: (Existente) Lógica de bloqueo y liberación de fondos.

### 4.2. Ejecución (Bot Handlers)
- `src/handlers/inline_billing.py`: Maneja el `InlineQueryHandler`.
- `src/handlers/invoice_flow.py`: Maneja el flujo de `/start pay_...` y botones de pago.

## 5. Próximas Mejoras
- Soporte para servicios personalizados (la modelo escribe el monto al vuelo).
- Historial de facturas directamente en el panel de la modelo en la Web.
