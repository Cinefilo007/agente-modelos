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
from src.api.routes.analytics import router as analytics_router
from src.api.routes.coach import router as coach_router
from src.api.routes.ai_editor import router as ai_editor_router
from src.api.routes.admin_gifts import router as admin_gifts_router
from src.api.routes.client import router as client_router
from src.api.routes.escrow import router as escrow_router

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
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(coach_router, prefix="/api/coach", tags=["Coach"])
app.include_router(ai_editor_router, prefix="/api/ai-editor", tags=["AI Editor"])
app.include_router(admin_gifts_router, prefix="/api/admin-gifts", tags=["Admin Gifts"])
app.include_router(client_router, prefix="/api/client", tags=["Client"])
app.include_router(escrow_router, prefix="/api/escrow", tags=["Escrow"])

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Agency Bot API"}

# --- SERVICIO DE ARCHIVOS ESTÁTICOS Y SEO DINÁMICO ---
from src.services.database import db

BOT_USER_AGENTS = [
    "telegrambot", "twitterbot", "facebookexternalhit", "whatsapp", "linkedinbot",
    "googlebot", "bingbot", "slackbot"
]

if os.path.exists("web/dist"):
    app.mount("/assets", StaticFiles(directory="web/dist/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_react_app(request: Request, full_path: str = ""):
        # 1. Detección de Bots y Perfiles para SEO Enriquecido
        user_agent = request.headers.get("user-agent", "").lower()
        is_bot = any(bot in user_agent for bot in BOT_USER_AGENTS)
        
        # Ignorar archivos con extensión y rutas de sistema
        is_potential_profile = (
            full_path and 
            "." not in full_path and 
            not full_path.startswith("api/") and 
            full_path not in ["login", "explore", "onboarding", "admin", "wallet", "shop", "settings", "casino", "pwa"]
        )

        index_path = "web/dist/index.html"

        if is_bot and is_potential_profile:
            try:
                username = full_path.replace("/", "")
                # Query directo a Supabase para obtener metadatos
                model_res = db.client.table("models").select("artistic_name, full_name, bio_short, avatar_url").eq("username", username).maybe_single().execute()
                
                if model_res.data:
                    m = model_res.data
                    name = m.get('artistic_name') or m.get('full_name') or username
                    bio = m.get('bio_short') or f"Mira el perfil de {name} en NebulaStar."
                    # Asegurar URL absoluta para la imagen
                    image = m.get('avatar_url') or "https://nebulaespace.site/pwa-512x512.png"
                    
                    if os.path.exists(index_path):
                        with open(index_path, "r", encoding="utf-8") as f:
                            html = f.read()
                        
                        meta_tags = f"""
    <!-- SEO Dinámico para {username} -->
    <title>NebulaStar | {name}</title>
    <meta name="description" content="{bio}">
    <meta property="og:title" content="NebulaStar | {name}">
    <meta property="og:description" content="{bio}">
    <meta property="og:image" content="{image}">
    <meta property="og:url" content="https://nebulaespace.site/{username}">
    <meta property="og:type" content="profile">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="{image}">
"""
                        html = html.replace("</head>", f"{meta_tags}\n</head>")
                        from fastapi.responses import HTMLResponse
                        return HTMLResponse(content=html)
            except Exception as e:
                print(f"[SEO Bot] Error: {e}")

        # 2. Servir archivos estáticos directos
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"error": "Not Found"})
            
        file_path = f"web/dist/{full_path}"
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            headers = {}
            if any(full_path.endswith(ext) for ext in ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff2', '.ico']):
                headers["Cache-Control"] = "public, max-age=31536000, immutable"
            return FileResponse(file_path, headers=headers)

        # 3. Catch-all React SPA
        if os.path.exists(index_path):
            return FileResponse(index_path, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
        
        return JSONResponse(status_code=404, content={"error": "Frontend build not found"})
else:
    print("Warning: web/dist directory not found. Static serving disabled.")
