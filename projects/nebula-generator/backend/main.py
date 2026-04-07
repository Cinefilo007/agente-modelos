import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from services.fal_service import FalService
from services.billing_service import BillingService

app = FastAPI(title="Nebula Model Generator API")

# Configurar CORS para permitir peticiones desde el frontend de Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En producción, limitar a los dominios del frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerationRequest(BaseModel):
    prompt: str
    lora_url: Optional[str] = None

@app.get("/")
def read_root():
    return {"message": "Nebula API is running", "version": "0.1.0"}

@app.get("/api/v1/auth/balance")
def get_balance():
    """
    Endpoint para consultar los créditos de fal.ai.
    """
    balance_info = BillingService.get_fal_balance()
    if "error" in balance_info:
        raise HTTPException(status_code=500, detail=balance_info)
    return balance_info

@app.post("/api/v1/nebula/generate")
async def generate_model(request: GenerationRequest):
    """
    Endpoint para generar imágenes de modelos femeninas.
    """
    try:
        image_url = await FalService.generate_model_image(
            user_prompt=request.prompt,
            lora_url=request.lora_url
        )
        return {"id": "nebula-" + os.urandom(4).hex(), "image_url": image_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
