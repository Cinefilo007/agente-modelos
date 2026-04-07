# Nebula Startup Script
Write-Host "Iniciando Ecosistema Nebula..." -ForegroundColor Cyan

# 1. Iniciar Backend
Write-Host "Levantando Backend (FastAPI)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; python -m uvicorn main:app --reload --port 8001"

# 2. Iniciar Frontend
Write-Host "Levantando Frontend (Vite)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "Sistema Nebula en linea!" -ForegroundColor Green
Write-Host "Backend: http://localhost:8001"
Write-Host "Frontend: Ver consola de Vite para la URL"
