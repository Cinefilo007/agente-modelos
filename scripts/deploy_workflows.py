import os
import json
from dotenv import load_dotenv
from n8n_bridge import create_workflow, activate_workflow

# Cargar variables (.env debe estar en la raíz o ajustamos path)
load_dotenv(dotenv_path="../.env") # Ajustar según donde se ejecute

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY")

def deploy():
    print("--- Desplegando Flujos a n8n ---")
    
    # Lista de flujos a desplegar
    flow_files = [
        "flows/onboarding_supabase.json",
        "flows/lead_interaction_supabase.json"
    ]
    
    for flow_path in flow_files:
        try:
            with open(flow_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            # Reemplazo de Placeholders
            content = content.replace("SUPABASE_URL_PLACEHOLDER", SUPABASE_URL)
            content = content.replace("SUPABASE_KEY_PLACEHOLDER", SUPABASE_KEY)
            content = content.replace("OPENROUTER_KEY_PLACEHOLDER", OPENROUTER_KEY)
            
            # NOTA: No podemos reemplazar credential placeholders fácilmente sin crear credenciales primero.
            # Los nodos de Telegram seguirán marcados con error en UI hasta que el usuario configure las credenciales manualmente
            # o implementemos la creación de credenciales vía API (que es compleja por cifrado).
            # Para este paso, asumimos que el usuario arreglará el nodo de Telegram, pero RESTO (DB, AI) funcionará.
            
            workflow_json = json.loads(content)
            
            # Crear
            result = create_workflow(workflow_json)
            
            if result:
                print(f"[OK] Flujo creado: {result.get('name')} (ID: {result.get('id')})")
                # Opcional: Activar
                # activate_workflow(result.get('id'))
            else:
                print(f"[ERROR] Error al crear flujo: {flow_path}")
                
        except Exception as e:
            print(f"[ERROR] Error procesando {flow_path}: {e}")

if __name__ == "__main__":
    deploy()
