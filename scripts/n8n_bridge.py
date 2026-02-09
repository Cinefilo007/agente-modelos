import os
import requests
import logging
from typing import Dict, List, Optional, Any
from dotenv import load_dotenv

# Configuración de Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Cargar variables de entorno
load_dotenv()

N8N_BASE_URL = os.getenv("N8N_BASE_URL", "http://localhost:5678/api/v1")
N8N_API_KEY = os.getenv("N8N_API_KEY")

if not N8N_API_KEY:
    logger.warning("N8N_API_KEY no encontrada en variables de entorno.")

def _get_headers() -> Dict[str, str]:
    """Retorna los headers necesarios para la autenticación."""
    return {
        "X-N8N-API-KEY": N8N_API_KEY,
        "Content-Type": "application/json"
    }

def health_check() -> bool:
    """
    Verifica la conexión con n8n.
    Retorna True si la conexión es exitosa, False en caso contrario.
    """
    try:
        # Usamos /active-workflows como un endpoint ligero para probar auth,
        # o simplemente verificamos que la URL responda.
        # El endpoint /users o /me suele ser bueno para 'whoami', pero usaremos workflows con limit 1
        url = f"{N8N_BASE_URL}/workflows"
        response = requests.get(url, headers=_get_headers(), params={"limit": 1})
        response.raise_for_status()
        logger.info("Conexión con n8n exitosa.")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"Error conectando con n8n: {e}")
        return False

def get_workflows(active_only: bool = True) -> List[Dict[str, Any]]:
    """
    Lista los flujos disponibles.
    
    Args:
        active_only: Si es True, solo retorna flujos activos.
    """
    try:
        url = f"{N8N_BASE_URL}/workflows"
        response = requests.get(url, headers=_get_headers())
        response.raise_for_status()
        
        data = response.json()
        workflows = data.get("data", [])
        
        if active_only:
            workflows = [w for w in workflows if w.get("active") is True]
            
        return workflows
    except requests.exceptions.RequestException as e:
        logger.error(f"Error obteniendo flujos: {e}")
        return []

def activate_workflow(workflow_id: str, active: bool = True) -> bool:
    """
    Activa o desactiva un flujo por su ID.
    
    Args:
        workflow_id: ID del flujo.
        active: True para activar, False para desactivar.
    """
    try:
        endpoint = "activate" if active else "deactivate"
        url = f"{N8N_BASE_URL}/workflows/{workflow_id}/{endpoint}"
        
        # n8n API para activar/desactivar usa POST
        response = requests.post(url, headers=_get_headers())
        response.raise_for_status()
        
        state = "activado" if active else "desactivado"
        logger.info(f"Flujo {workflow_id} {state} exitosamente.")
        return True
    except requests.exceptions.RequestException as e:
        logger.error(f"Error cambiando estado del flujo {workflow_id}: {e}")
        return False

def execute_webhook(webhook_path: str, method: str = "POST", data: Optional[Dict] = None) -> Optional[Dict]:
    """
    Dispara un flujo vía webhook.
    
    Args:
        webhook_path: La ruta relativa del webhook (ej: 'mi-webhook').
                      Se asume que la URL base del webhook es diferente a la API base.
                      Normalmente es http://localhost:5678/webhook/...
        method: GET o POST.
        data: Datos a enviar en el cuerpo (para POST).
    """
    try:
        # Construir URL del webhook. 
        # Nota: La URL base de la API suele ser .../api/v1, la de webhooks suele ser raíz + /webhook/
        root_url = N8N_BASE_URL.replace("/api/v1", "")
        url = f"{root_url}/webhook/{webhook_path}"
        
        logger.info(f"Ejecutando webhook: {url}")
        
        if method.upper() == "POST":
            response = requests.post(url, json=data)
        else:
            response = requests.get(url, params=data)
            
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error ejecutando webhook {webhook_path}: {e}")
        return None

def create_workflow(workflow_json: Dict[str, Any]) -> Optional[Dict]:
    """
    Crea un nuevo flujo en n8n.
    
    Args:
        workflow_json: El diccionario con la definición del flujo.
    """
    try:
        url = f"{N8N_BASE_URL}/workflows"
        response = requests.post(url, headers=_get_headers(), json=workflow_json)
        response.raise_for_status()
        
        data = response.json()
        logger.info(f"Flujo creado exitosamente: {data.get('id')} - {data.get('name')}")
        return data
    except requests.exceptions.RequestException as e:
        logger.error(f"Error creando flujo: {e}")
        if e.response is not None:
             logger.error(f"Detalle error: {e.response.text}")
        return None
