# SOP: Sistema Escrow y Protección al Cliente

Este documento detalla el funcionamiento del sistema de custodia (Escrow) para servicios contratados dentro de la plataforma.

## 1. Flujo de Compra y Prevención

### 1.1. Consulta Previa (Tour Guiado)
Antes de contratar cualquier servicio (Videollamada, Sexting, Encuentro, etc.), se **exige** al cliente que contacte a la modelo por privado para confirmar disponibilidad.
- **Implementación**: Tour guiado (Shepherd.js) al entrar a la sección de servicios.
- **Mensaje**: "¡Pausa! Antes de pagar, habla con la modelo al privado para confirmar su disponibilidad inmediata."

### 1.2. Opciones de Pago en Checkout
Al proceder al pago, el cliente tiene dos opciones:
1. **Pagar con Billetera (Sistema Escrow)**:
   - Los fondos se descuentan del balance del cliente y quedan congelados (`status: 'HELD'`).
   - El dinero **NO** se entrega a la modelo hasta que el servicio sea marcado como completado.
   - **Beneficio**: Compra 100% protegida.
2. **Coordinar al Privado (Fuera de Plataforma)**:
   - El cliente y la modelo acuerdan el pago por fuera (Binance, efectivo, etc.).
   - **Advertencia**: "Al contratar por fuera de nuestra plataforma, estás bajo tu propio riesgo. Nosotros no podemos proteger tu dinero en caso de incumplimiento."

---

## 2. Proceso de Transacción (Backend)

### 2.1. Creación de la Orden
Usa el endpoint `POST /api/escrow/create`.
- Descuenta balance del cliente.
- Crea registro en `escrow_orders`.
- Estado inicial: `HELD`.

### 2.2. Notificaciones
- Se notifica **automáticamente** a la modelo vía Bot de Telegram sobre la nueva venta.
- Se debe incluir: Servicio, Cliente y Link de gestión.

---

## 3. Finalización y Reviews

### 3.1. Cierre del Servicio
Una vez finalizado el servicio:
1. La modelo debe marcar el servicio como completado desde su panel.
2. El cliente debe entrar al enlace proporcionado (o su historial) y marcar como completado.
3. Al marcar ambos (o al pasar el tiempo de auto-release), los fondos se liberan a la billetera de la modelo.

### 3.2. Sistema de Reviews Mutuo
- El cliente **DEBE** dejar una calificación (1-5 estrellas) y un comentario.
- La modelo puede calificar al cliente para mejorar su reputación global.
- Los puntajes se promedian en los perfiles públicos inmediatamente.

---

## 4. Gestión de Disputas

Si un servicio no fue entregado:
1. El afectado inicia una **Disputa**.
2. Los fondos permanecen congelados (`status: 'DISPUTED'`).
3. Ambas partes pueden subir pruebas (capturas de chat, recibos).
4. Un administrador interviene para liberar los fondos a quien corresponda.

---

## 5. Archivos Relacionados
- `src/api/routes/escrow.py`: Lógica de transacciones.
- `web/src/pages/ServiceCheckout.jsx`: Interfaz de pago.
- `web/src/pages/ServiceInvoicePage.jsx`: Detalle del servicio y reglas.
- `src/bot/handlers/notifications.py`: Envío de alertas a Telegram.
