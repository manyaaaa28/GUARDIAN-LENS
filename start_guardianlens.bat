@echo off
cd /d "C:\Users\arpan\OneDrive\Desktop\GUARDIAN-LENS-main"
start "Backend" cmd /k ".\venv\Scripts\activate.bat && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"
timeout /t 3
start "Frontend" cmd /k "cd frontend && npm run dev"
timeout /t 5
start "" "http://localhost:5173"
