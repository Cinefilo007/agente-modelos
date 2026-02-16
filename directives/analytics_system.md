# Sistema de Analíticas y Conversión 📊📈

Este documento detalla la lógica de cálculo y seguimiento de métricas del Panel Administrativo de Modelos.

## 1. Seguimiento de Visitas (Visitas) 👥
- **Activador**: Carga del perfil de modelo.
- **Endpoint**: `POST /api/analytics/view`
- **Registro**: Tabla `profile_views`.
- **Datos**: `model_id`, `visitor_id`, `viewer_ip`, `viewed_at`.

## 2. Registro de Ventas (Ventas $) 💰
- **Origen**: Tabla `orders`.
- **Estado**: Solo órdenes `completed`.
- **Métricas**:
  - `sales_count`: Cantidad total de órdenes.
  - `revenue`: Suma de `amount`.

## 3. Tasa de Conversión (%) ⚡
- **Fórmula**: `(Ventas / Visitas) * 100`
- **Mensajes**:
  - `< 5%`: Sugerencia de activar Bot IA.
  - `> 5%`: Felicitación por alto rendimiento.

## 4. Tendencias de Crecimiento (Growth %) 📈
- **Fórmula**: `((Curr - Prev) / Prev) * 100`
- **Períodos**:
  - **Actual**: Últimos 7 días.
  - **Anterior**: Del día 14 al 7 previo.
- **Métricas**: Calculado para Visitas y Ventas.

## 5. Exposición (Gráfico) 📉
- Tendencia diaria de los últimos 7 días.
- Puntos sin datos se rellenan con `0`.
- Tooltip dinámico sobre el último punto de datos.

## 6. Navegación por Pestañas (Tabs) 🗂️
- **Analíticas**: KPIs y gráficos.
- **Bot IA**: Configuración de entrenamiento.
- **Tienda y Seguridad**: Servicios y control de usuarios.

---
© 2026 Nebula Agency - Directivas de Sistema
