# 🏛️ DIRECTIVA MAESTRA: Ecosistema Agente Modelos

## 1. Visión Holística del Proyecto
Este sistema es una solución integral para la gestión y automatización de la interacción entre Modelos y Fans, utilizando Inteligencia Artificial para maximizar la conversión y seguridad.

**Filosofía de Desarrollo**:
1. **Planificación (SOP)**: Todo se documenta primero. No se escribe código sin un procedimiento estándar.
2. **Coordinación (Agente)**: El Agente (IA) asegura el cumplimiento de los SOPs.
3. **Ejecución (Python Modular)**: Código desacoplado, mantenible y escalable.

---

## 2. Jerarquía de Documentación (Mapa del Tesoro)

### 🚀 Estrategia y Planificación
*   **[Master Plan](./master_plan.md)**: Roadmap, Fases (A a E) y Modelos de Negocio.
*   **[Customer Journey](./customer_journey_analysis.md)**: El camino del usuario desde el descubrimiento hasta la fidelización.

### 🛠️ Estándares Técnicos (SOP & Ejecución)
*   **[Documentación del Sistema](./system_documentation.md)**: Arquitectura, Backend (FastAPI), Bot (Python-Telegram-Bot) y Frontend (React).
*   **[Esquema de Base de Datos](./database_schema.md)**: PostgreSQL (Supabase) - Un solo origen de la verdad.
*   **[Manual de Despliegue](./deployment_guide.md)**: Railway, Docker y Variables de Entorno.

### 🔒 Seguridad y Flujos Críticos
*   **[Sistema de Autenticación Híbrida](./auth_system_v2.md)**: Telegram WebApp + JWT.
*   **[Flujo de Onboarding](./onboarding_flow.md)**: De registro a verificación ID.
*   **[Sistema Escrow (P2P)](./escrow_system.md)**: Pagos seguros y disputas.

---

## 3. Estándar de Trabajo: SOP vs Ejecución

Cualquier mejora en el sistema debe estructurarse bajo este esquema binario para garantizar la coherencia:

### A. Sección SOP (Standard Operating Procedure)
*   **Objetivo**: Qué queremos lograr y por qué.
*   **Lógica de Negocio**: Reglas que el código debe seguir (ej. "Solo modelos verificadas pueden postear").
*   **Criterios de Éxito**: Cómo sabemos que funciona.

### B. Sección de Ejecución (Implementación Técnica)
*   **Rutas/API**: Endpoints afectados.
*   **DB Changes**: Migraciones necesarias.
*   **Frontend**: Componentes y UI/UX involucrados.

---

## 4. Guía de Mantenimiento Rápido
- **¿Mover un Post?**: Consultar [Sales Agent System](./sales_agent_system.md).
- **¿Nueva Campaña SFS?**: Consultar [SFS Funnel Strategy](./sfs_funnel_strategy.md).
- **¿Actualizar IA?**: Consultar `src/services/ai_service.py` y [Analytics System](./analytics_system.md).

---
*Última Actualización: 30 de Marzo de 2026*
