import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

# Importar routers necesarios
from src.api.routes.config import router as config_router

# Configuración básica de la App
app = FastAPI(title="Agency Bot API")

# Compresión Gzip para optimizar transferencia
app.add_middleware(GZipMiddleware, minimum_size=1000)

# SEGURIDAD: Configuración de CORS restrictiva
origins = [
    "https://nebulaespace.site",
    "http://nebulaespace.site",
    "http://localhost:5173",  # Para desarrollo local
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- RUTAS DE API ---
app.include_router(config_router, prefix="/api/config", tags=["Config"])

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Agency Bot API"}

# --- SERVICIO DE ARCHIVOS ESTÁTICOS ---
if os.path.exists("web/dist"):
    # Montamos assets para que FastAPI gestione el streaming y compresión
    app.mount("/assets", StaticFiles(directory="web/dist/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Evitar capturar rutas de la API bajo /api
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"error": "Not Found"})
            
        # Archivos directos en raíz (manifest, icons, etc)
        file_path = f"web/dist/{full_path}"
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
             return FileResponse(file_path)
             
        # Catch-all para la SPA de React
        index_path = "web/dist/index.html"
        if os.path.exists(index_path):
            return FileResponse(index_path)
        
        return JSONResponse(status_code=404, content={"error": "Frontend build not found"})
else:
    print("Warning: web/dist directory not found. Frontend will not be served.")
