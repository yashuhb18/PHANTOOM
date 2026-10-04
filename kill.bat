@echo off
title PHANTOM Platform Stopper
echo ======================================================================
echo           PHANTOM: Stopping Platform Services (Ports 8001 & 3001)
echo ======================================================================
echo.

powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8001, 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo [OK] Backend (Port 8001) and Frontend (Port 3000) terminated successfully.
echo.
pause
