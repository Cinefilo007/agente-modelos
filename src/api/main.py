import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

# Configuración básica de la App
app = FastAPI(title="Agency Bot API")

# Configurar CORS
origins = ["*"]  # En producción deberíamos ser más restrictivos si es posible
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Agency Bot API", "env": os.getenv("ENV", "dev")}

# --- SERVICIO DE ARCHIVOS ESTÁTICOS (ROBUSTO) ---
# Montamos la carpeta assets primero para que FastAPI la maneje internamente
if os.path.exists("web/dist"):
    # Sub-app para archivos de assets
    app.mount("/assets", StaticFiles(directory="web/dist/assets"), name="assets")
    
    # Catch-all para la SPA (Single Page Application)
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # 1. Si es una ruta de API, devolvemos 404
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"error": "Not Found"})
            
        # 2. Si es un archivo directo en la raíz (ej: sw.js, manifest.json, vite.svg)
        file_path = f"web/dist/{full_path}"
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
             return FileResponse(file_path)
             
        # 3. Para cualquier otra cosa (Rutas de React), servimos el index.html
        index_path = "web/dist/index.html"
        if os.path.exists(index_path):
            return FileResponse(index_path)
        
        return JSONResponse(status_code=404, content={"error": "Frontend build not found"})
else:
    print("Warning: web/dist directory not found. Frontend will not be served.")
