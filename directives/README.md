# Índice de Directivas del Sistema

Este directorio contiene la documentación oficial (SOPs, Arquitectura, Planes) del proyecto. **Todo cambio en el código debe estar respaldado por una directiva actualizada.**

## Archivos Principales

| Archivo | Descripción |
| :--- | :--- |
| **[master_plan.md](./master_plan.md)** | **Visión General**. Modelos de negocio, fases de desarrollo y roadmap. |
| **[system_documentation.md](./system_documentation.md)** | **Manual Técnico**. Arquitectura, estructura de archivos, y SOPs de desarrollo (Auth, DB, Frontend, Backend). |
| **[deployment_guide.md](./deployment_guide.md)** | Guía de despliegue en Railway y variables de entorno. |
| **[database_schema.md](./database_schema.md)** | Esquema de base de datos detallado (Tablas, Relaciones). |

## Guías Específicas

| Archivo | Descripción |
| :--- | :--- |
| **[auth_system_v2.md](./auth_system_v2.md)** | Detalle profundo del sistema de autenticación híbrido (Telegram + JWT). |
| **[telegram_auth_flow.md](./telegram_auth_flow.md)** | Diagramas y flujo de la autenticación vía Telegram WebApp. |
| **[onboarding_flow.md](./onboarding_flow.md)** | Lógica de negocio para el registro y verificación de modelos/usuarios. |
| **[frontend_documentation.md](./frontend_documentation.md)** | Estándares de UI/UX, componentes y estructura de React. |
| **[analytics_system.md](./analytics_system.md)** | Definición de métricas y dashboard de administración. |
| **[n8n_api_integration.md](./n8n_api_integration.md)** | (Legacy/Ref) Integración con n8n (si aplica). |

---

## Regla de Oro
**NUNCA** escribir código sin antes verificar y actualizar la directiva correspondiente en esta carpeta.
