@echo off
title PHANTOM Platform Launcher
echo ======================================================================
echo           PHANTOM: Autonomous USB Threat Hunting Platform
echo ======================================================================
echo.

echo [1/2] Starting FastAPI Backend on port 8001...
start "PHANTOM Backend (Port 8001)" cmd /k "cd /d %~dp0 && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8001 --reload"

timeout /t 3 /nobreak >nul

echo [2/2] Starting React + Vite Frontend on port 3000...
start "PHANTOM Frontend (Port 3000)" cmd /k "cd /d %~dp0\frontend && npm run dev"

echo.
echo ======================================================================
echo PHANTOM is up and running!
echo - Web Application: http://localhost:3000
echo - Backend API:     http://localhost:8001
echo - API Docs:        http://localhost:8001/docs
echo ======================================================================
echo.
pause
