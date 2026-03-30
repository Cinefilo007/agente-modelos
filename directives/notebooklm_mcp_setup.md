# Directiva de Integración: NotebookLM MCP Server

Este documento establece el estándar para la instalación, configuración y mantenimiento del servidor MCP de NotebookLM en el entorno de Antigravity.

## 1. Requisitos del Entorno
- **Lenguaje**: Python 3.10+
- **Gestor de Paquetes**: `pip` (o `uv` si está disponible).
- **Configuración MCP**: Archivo `mcp_config.json` localizado en la carpeta de datos de Antigravity.

## 2. Proceso de Instalación (SOP-INSTALL)
1. **Actualización de Pip**: Asegurar que pip esté actualizado.
2. **Instalación del Paquete**: `python -m pip install -U notebooklm-mcp-server`.
3. **Verificación**: Ejecutar `notebooklm-mcp-auth --version` o similar para confirmar.

## 3. Configuración del Servidor (SOP-CONFIG)
El servidor debe registrarse en `mcp_config.json` bajo la clave `mcpServers`.

### Estructura JSON:
```json
"notebooklm": {
  "command": "notebooklm-mcp"
}
```
*Nota: En Windows, si el comando no se reconoce, usar la ruta absoluta al ejecutable en el directorio `Scripts` de Python.*

## 4. Autenticación (SOP-AUTH)
1. **Comando**: Ejecutar `notebooklm-mcp-auth`.
2. **Flujo**: Seguir el enlace del navegador para autorizar el acceso a Google NotebookLM.
3. **Persistencia**: Las credenciales se almacenan localmente en el perfil del usuario (usualmente en `.notebooklm-mcp-auth.json`).

## 5. Validación de Herramientas
El servidor debe exponer herramientas para:
- Crear notebooks (`create_notebook`).
- Listar notebooks (`list_notebooks`).
- Consultar contenido de notebooks.
- Gestionar fuentes (sources).

Se espera un mínimo de **32 herramientas** operativas.

## 6. Mantenimiento y Logs
- Si el servidor falla, revisar si las credenciales han expirado.
- Re-ejecutar `notebooklm-mcp-auth` en caso de errores de 401/403.
- Actualizar el paquete regularmente para nuevas funcionalidades.

---
*Fecha de Creación: 30 de Marzo de 2026*
