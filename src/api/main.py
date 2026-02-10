
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from src.api.routes import profile, feed, interactions, admin, client, auth

app = FastAPI(
    title="Agency Bot Mini App API",
    description="Backend API for the Telegram Mini App Social Network",
    version="1.0.0"
)

# CORS Configuration
origins = [
    "*", # In production, restrict this to your specific domain or Telegram WebApp domains
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "Agency Bot API"}

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Include Routers
app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(feed.router, prefix="/api/feed", tags=["Feed"])
app.include_router(interactions.router, prefix="/api/interactions", tags=["Interactions"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(client.router, prefix="/api/client", tags=["Client"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])

# Serve React Frontend (Static Files)
# Ensure 'web/dist' exists (it will be created during build process)
if os.path.exists("web/dist"):
    app.mount("/assets", StaticFiles(directory="web/dist/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # API routes are already handled above. 
        if full_path.startswith("api/"):
            return {"error": "Not Found"}
            
        # Serve specific file if exists (css, js, images in assets)
        file_path = f"web/dist/{full_path}"
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
            
        # For root "/" or any SPA route, serve index.html
        return FileResponse("web/dist/index.html")
else:
    print("Warning: web/dist directory not found. Frontend will not be served.")
