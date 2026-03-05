# Sistema de Casino y Minijuegos (SOP-CASINO)

Este documento define la arquitectura, reglas de negocio y flujos técnicos para la implementación de minijuegos (Ruleta, Slots, etc.) dentro del ecosistema.

## 1. Visión General
El objetivo es aumentar el tiempo de sesión (stickiness) y el gasto por usuario mediante mecánicas de juego donde los fans apuestan créditos para ganar servicios exclusivos de las modelos o bonos de moneda interna.

## 2. Análisis de Viabilidad

### Pros
- **Retención Extrema**: Los ciclos de recompensa variable (dopamina) mantienen a los usuarios regresando.
- **Monetización Pasiva**: Permite a los fans gastar restos de saldo o intentar obtener servicios caros por una fracción del costo.
- **Diferenciación**: Convierte la plataforma de un simple feed a un ecosistema de entretenimiento completo.
- **Cero Riesgo de Inventario**: Los premios son servicios digitales de las modelos, no requieren stock físico.

### Contras
- **Riesgo Legal**: Dependiendo de la jurisdicción, puede clasificarse como azar. Se recomienda el uso de "Créditos" y premios "In-App".
- **Complejidad Técnica**: Requiere un motor de probabilidades (RNG) robusto y una UI fluida.
- **Riesgo de Chargebacks**: Usuarios frustrados por perder pueden intentar revertir pagos de compra de créditos.
- **Mantenimiento**: Requiere monitoreo constante para evitar abusos o bugs que vacíen los balances.

## 3. Arquitectura del Sistema

### 3.1 Base de Datos (Extensiones)
- `casino_games`: Definición de juegos disponibles (slug, nombre, config_json).
- `casino_bets`: Registro de apuestas (`user_id`, `model_id`, `game_id`, `amount`, `outcome_json`, `prize_awarded`).
- `model_prizes`: Configuracion de premios por modelo (`model_id`, `prize_type`, `value`, `probability`).

### 3.2 Lógica de Juego (Backend)
- **Motor RNG**: Servicio centralizado que garantiza aleatoriedad.
- **Verificador de Saldo**: Validación atómica antes de procesar cualquier apuesta.
- **Distribuidor de Premios**: Integración con el sistema de mensajería/contenido para entregar fotos o desbloquear posts automáticamente.

### 3.3 Interfaz (Frontend)
- Componente `CasinoGameWrapper`: Contenedor para los diferentes tipos de juegos.
- Animaciones optimizadas para móviles.
- Sonidos y efectos visuales de "Victoria".

## 3. Arquitectura de Integración (Recomendación)
Se recomienda integrar los minijuegos **dentro de la misma plataforma y Mini App principal**.
-   **Razón**: Compartir la misma billetera (wallet), base de usuarios y estética premium. Crear un bot aparte fragmentaría la experiencia y obligaría a sincronizar saldos complejos.
-   **Ubicación**: Una pestaña dedicada "Casino" o "Suerte" dentro del perfil de cada modelo.

## 4. Flujos de Usuario

### 4.1 Para la Modelo (Configuración)
1.  **Panel de Control**: La modelo tiene una sección "Mi Casino".
2.  **Configuración de Premios**: Define qué ofrece (ej: Foto Hot, Video 10s, 50% descuento en servicio X).
3.  **Probabilidades**: Asigna un "peso" a cada premio. El sistema calcula automáticamente el margen de la casa (RTP).
4.  **Activación**: Puede activar/desactivar su casino en cualquier momento.

### 4.2 Para el Cliente (Acceso y Juego)
1.  **Navegación**: El fan entra al perfil de la modelo y ve un botón brillante: "¡Prueba tu suerte!".
2.  **Selección**: Elige el minijuego (Ruleta, Slots).
3.  **Apuesta**: El sistema muestra el costo en créditos. El fan confirma la apuesta.
4.  **Resultado**: Animación visual. Si gana, recibe una notificación y el servicio se marca como "Pendiente de entrega" o se desbloquea automáticamente si es digital.

## 5. Lógica de Entrega de Premios (Automatización)

Para que el sistema sea eficiente, la entrega debe ser lo más automática posible:

### 5.1 Tipos de Premios Técnicos
-   **`UNLOCK_POST`**: El sistema busca el `post_id` en `prize_value_json` y otorga acceso permanente al fan (insert en `post_access`).
-   **`CREDIT_BONUS`**: Suma créditos directamente a la `wallet` del cliente.
-   **`CUSTOM_SERVICE`**: Envía una notificación inmediata al bot de la modelo: *"¡Ganador! @usuario ha ganado 'Chat 5 min'. Haz clic aquí para cumplirlo"*.
-   **`DISCOUNT_CODE`**: Genera un código único de un solo uso para la próxima compra del fan.

### 5.2 Algoritmo RNG (Weighted Random)
El motor de juego usará un algoritmo de "Selección por Peso":
1.  Se obtienen todos los premios activos de la modelo.
2.  Se suman sus probabilidades (deben sumar 1.0 para un pool completo, o menos si hay probabilidad de "No ganar nada").
3.  Se genera un número aleatorio entre 0 y 1.
4.  Se selecciona el premio correspondiente al rango obtenido.

## 6. Seguridad y Prevención de Fraude
-   **Idempotencia**: Cada apuesta genera un `bet_id` antes de procesar el RNG. Si la conexión falla, el resultado ya está decidido y guardado.
-   **Validación de Saldo**: Uso de transacciones SQL (`BEGIN`, `COMMIT`) para asegurar que el descuento de créditos y la entrega del premio ocurran "todo o nada".

## 7. Reglas de Negocio
1.  **La Casa Siempre Gana**: Los juegos deben tener un RTP (Return to Player) configurado entre el 80% y 95%.
2.  **Premios de Modelo**: Las modelos pueden elegir qué servicios ofrecen (ej: "1 Foto VIP", "5 min de Chat").
3.  **Transparencia**: Los usuarios deben poder ver el historial de sus últimas jugadas.
4.  **Límites**: Implementar límites diarios de pérdida para juego responsable.

## 5. Próximos Pasos
1.  Diseñar el esquema SQL detallado.
2.  Crear prototipo de "Ruleta de la Fortuna" en React.
3.  Implementar el endpoint `/api/casino/play`.

---
*Documento creado: 5 de Marzo de 2026*
