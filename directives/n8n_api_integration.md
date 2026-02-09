# SOP: Integración con API de n8n

## Objetivo
Establecer un puente seguro y determinista entre el sistema local (scripts Python) y el motor de flujos n8n.

## Configuración
-   **URL Base**: `http://localhost:5678/api/v1` (por defecto para n8n local).
-   **Autenticación**: Header `X-N8N-API-KEY`.
-   **Seguridad**: La API Key nunca se hardcodea; se lee de variables de entorno (`.env`).

## Funciones Requeridas en `n8n_bridge.py`

1.  **`health_check()`**: Verificar conexión con n8n.
2.  **`get_workflows(active_only=True)`**: Listar flujos disponibles.
3.  **`activate_workflow(id, active=True)`**: Encender/apagar flujos.
4.  **`execute_webhook(webhook_path, method, data)`**: Disparar flujos vía webhook (aunque esto suele ir a la URL del webhook, no a la API de gestión, es útil tener un wrapper).

## Estándares de Código
-   Usar librería `requests`.
-   Manejo de errores con `try/except` y logging adecuado.
-   Typing hints en todas las funciones.
-   Docstrings explicativos.

## Endpoints Clave (Referencia)
-   `GET /workflows`: Listar.
-   `POST /workflows`: Crear.
-   `GET /workflows/{id}`: Detalle.
-   `POST /workflows/{id}/activate`: Activar.
-   `POST /workflows/{id}/deactivate`: Desactivar.
