from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from src.api.routes import profile, feed, interactions, admin, client, auth, content, notifications, shop, analytics, wallet, escrow, admin_gifts, config, promo, casino, ai_editor, coach, orders

app = FastAPI(
    title="Agency Bot Mini App API",
    description="Backend API for the Telegram Mini App Social Network",
    version="1.0.0"
)

# CORS Configuration
# SEGURIDAD: Restringir orígenes permitidos. En producción, configurar ALLOWED_ORIGINS.
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "https://t.me,https://web.telegram.org")
origins = [o.strip() for o in allowed_origins_env.split(",")]

# Si estamos en desarrollo, podemos permitir localhost (opcional)
if os.getenv("ENV") != "production":
    origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
from fastapi.responses import JSONResponse
import logging

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"[GLOBAL ERROR] {request.method} {request.url.path} | Error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "msg": str(exc)}
    )

import time
from fastapi import Request

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    path = request.url.path
    
    # Log solo si no es un asset muy ruidoso, o log todo si estamos debuggeando
    if not path.startswith("/api/notification/unread"): # Evitar spam de notificaciones
        print(f"[Backend Log] --> {request.method} {path}")
    
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        
        if not path.startswith("/api/notification/unread"):
            print(f"[Backend Log] <-- {request.method} {path} | STATUS: {response.status_code} | TIME: {process_time:.2f}ms")
            
        return response
    except Exception as e:
        print(f"[CRITICAL ERROR] Fallo procesando {path}: {str(e)}")
        raise

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Agency Bot API", "env": os.getenv("ENV", "dev")}

@app.get("/api/debug/files")
async def debug_files():
    import os
    files = []
    if os.path.exists("web/dist"):
        for root, dirs, filenames in os.walk("web/dist"):
            for f in filenames:
                files.append(os.path.join(root, f))
    return {"web_dist_exists": os.path.exists("web/dist"), "files": files}

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Include Routers
app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(feed.router, prefix="/api/feed", tags=["Feed"])
app.include_router(interactions.router, prefix="/api/interactions", tags=["Interactions"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(client.router, prefix="/api/client", tags=["Client"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(content.router, prefix="/api/content", tags=["Content"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(shop.router, prefix="/api/shop", tags=["Shop"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(wallet.router, prefix="/api/wallet", tags=["Wallet"])
app.include_router(escrow.router, prefix="/api/escrow", tags=["Escrow"])
app.include_router(admin_gifts.router, prefix="/api/admin_gifts", tags=["Admin Gifts"])
app.include_router(config.router, prefix="/api/config", tags=["Config"])
app.include_router(promo.router, prefix="/api/promo", tags=["Promo SFS"])
app.include_router(casino.router, prefix="/api/casino", tags=["Casino"])
app.include_router(ai_editor.router, prefix="/api/ai-editor", tags=["AI Photo Editor"])
app.include_router(coach.router, prefix="/api/coach", tags=["Nebula Coach"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])

from fastapi.responses import FileResponse, HTMLResponse
import re
from src.services.database import db

# Caché en memoria para el index.html para evitar lecturas constantes de disco
INDEX_HTML_CACHE = None

# Serve React Frontend (Static Files)
if os.path.exists("web/dist"):
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        global INDEX_HTML_CACHE
        
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"error": "Not Found"})
            
        file_path = f"web/dist/{full_path}"
        
        # Log para debug (solo en logs del servidor, no ruidoso)
        if full_path and not full_path.endswith((".js", ".css", ".png", ".jpg", ".svg")):
            print(f"[Static Debug] Request: {full_path}")
            
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
            
        # Cargar index.html si no está en caché
        if not INDEX_HTML_CACHE:
            try:
                with open("web/dist/index.html", "r", encoding="utf-8") as f:
                    INDEX_HTML_CACHE = f.read()
            except Exception as e:
                print(f"Error cargando index.html: {e}")
                return JSONResponse(status_code=500, content={"error": "Frontend not ready"})

        # Generar links enriquecidos para Telegram
        exclude_routes = {"api", "assets", "admin", "promotions", "landing", "feed", "explore", "reviews", "notifications", "edit-profile", "create-post", "create-story", "post", "service", "checkout", "order", "support", "shop-manager", "profile", "me", "casino", "onboarding", "wallet", "index.html", "sw.js", "manifest.json"}
        
        path_segments = [p for p in full_path.split("/") if p]
        
        if not full_path or full_path == "" or full_path == "index.html":
             return HTMLResponse(content=INDEX_HTML_CACHE)

        if len(path_segments) == 1:
            username = path_segments[0]
            if username not in exclude_routes:
                try:
                    query = db.client.table("models").select("artistic_name, full_name, username, avatar_url, bio_short").eq("username", username).maybe_single().execute()
                    if query and query.data:
                        model = query.data
                        name = model.get("artistic_name") or model.get("full_name") or model.get("username")
                        bio = model.get("bio_short") or f"Perfil de {name}."
                        bio_clean = bio.replace('\n', ' ').replace('"', "'")
                        avatar = model.get("avatar_url") or ""
                        
                        og_tags = f"""
    <meta property="og:title" content="{name}" />
    <meta property="og:description" content="{bio_clean}" />
    <meta property="og:image" content="{avatar}" />
    <meta property="og:type" content="profile" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="{name}" />
    <meta name="twitter:description" content="{bio_clean}" />
    <meta name="twitter:image" content="{avatar}" />
"""
                        return HTMLResponse(content=INDEX_HTML_CACHE.replace("</head>", f"{og_tags}</head>"))
                except Exception as e:
                    print(f"Error in OG tags generation for {username}: {e}")
            
        return HTMLResponse(content=INDEX_HTML_CACHE)
else:
    print("Warning: web/dist directory not found. Frontend will not be served.")
