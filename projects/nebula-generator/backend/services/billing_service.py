import os
import requests
from dotenv import load_dotenv

# Intentar cargar .env desde la raíz del proyecto (subiendo 4 niveles)
load_dotenv(os.path.join(os.path.dirname(__file__), "../../../../.env"))

FAL_KEY = os.getenv("FAL_AI_KEY")
if not FAL_KEY:
    FAL_KEY = os.getenv("FAL_KEY")

# Asegurar que FAL_KEY esté en el environment para otras librerías
if FAL_KEY:
    os.environ["FAL_KEY"] = FAL_KEY

class BillingService:
    @staticmethod
    def get_fal_balance():
        """
        Consulta el balance actual de créditos de fal.ai.
        """
        if not FAL_KEY:
            return {"error": "FAL_AI_KEY no configurada"}
            
        url = "https://api.fal.ai/v1/account/billing"
        headers = {
            "Authorization": f"Key {FAL_KEY}"
        }
        params = {
            "expand": "credits"
        }
        
        try:
            response = requests.get(url, headers=headers, params=params)
            if response.status_code == 200:
                data = response.json()
                credits_info = data.get("credits", {})
                return {
                    "balance": credits_info.get("current_balance"),
                    "currency": credits_info.get("currency"),
                    "username": data.get("username"),
                    "estimated_cost_per_image": 0.035 # Costo estimado para SDXL Custom + High Steps
                }
            else:
                return {"error": f"API Error: {response.status_code}", "detail": response.text}
        except Exception as e:
            return {"error": str(e)}
