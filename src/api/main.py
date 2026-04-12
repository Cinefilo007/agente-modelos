import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

# --- IMPORTACIÓN DE ROUTERS ---
from src.api.routes.config import router as config_router
from src.api.routes.auth import router as auth_router
from src.api.routes.profile import router as profile_router
from src.api.routes.content import router as content_router
from src.api.routes.feed import router as feed_router
from src.api.routes.wallet import router as wallet_router
from src.api.routes.shop import router as shop_router
from src.api.routes.admin import router as admin_router
from src.api.routes.casino import router as casino_router
from src.api.routes.notifications import router as notifications_router
from src.api.routes.promo import router as promo_router
from src.api.routes.interactions import router as interactions_router
from src.api.routes.orders import router as orders_router

# Configuración básica de la App
app = FastAPI(title="Agency Bot API")

# Compresión Gzip para optimización
app.add_middleware(GZipMiddleware, minimum_size=1000)

# SEGURIDAD: CORS restrictivo
origins = [
    "https://nebulaespace.site",
    "http://nebulaespace.site",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REGISTRO DE RUTAS ---
app.include_router(config_router, prefix="/api/config", tags=["Config"])
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(profile_router, prefix="/api/profile", tags=["Profile"])
app.include_router(content_router, prefix="/api/content", tags=["Content"])
app.include_router(feed_router, prefix="/api/feed", tags=["Feed"])
app.include_router(wallet_router, prefix="/api/wallet", tags=["Wallet"])
app.include_router(shop_router, prefix="/api/shop", tags=["Shop"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(casino_router, prefix="/api/casino", tags=["Casino"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(promo_router, prefix="/api/promo", tags=["Promo"])
app.include_router(interactions_router, prefix="/api/interactions", tags=["Interactions"])
app.include_router(orders_router, prefix="/api/orders", tags=["Orders"])

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Agency Bot API"}

# --- SERVICIO DE ARCHIVOS ESTÁTICOS ---
if os.path.exists("web/dist"):
    app.mount("/assets", StaticFiles(directory="web/dist/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"error": "Not Found"})
            
        file_path = f"web/dist/{full_path}"
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
             return FileResponse(file_path)
             
        index_path = "web/dist/index.html"
        if os.path.exists(index_path):
            return FileResponse(index_path)
        
        return JSONResponse(status_code=404, content={"error": "Frontend build not found"})
else:
    print("Warning: web/dist directory not found. Frontend will not be served.")
