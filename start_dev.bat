@echo off
echo ========================================================
echo  Cognivision Voice Intelligence - Dual System Launch
echo ========================================================
echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000...
start "Cognivision Backend" cmd /k "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting React/Vite Frontend on http://localhost:5173...
start "Cognivision Frontend" cmd /k "npm --prefix frontend run dev"

echo.
echo Both services have been launched in separate terminal windows.
echo - Frontend: http://localhost:5173
echo - Backend API Docs: http://127.0.0.1:8000/docs
echo ========================================================
