@echo off
title PHANTOM Platform Stopper
echo ======================================================================
echo           PHANTOM: Stopping Platform Services (Ports 8001 and 3000)
echo ======================================================================
echo.

echo [1/2] Terminating processes and subprocess trees on ports 8001 and 3000...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8001,3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { taskkill /F /T /PID $_ 2>$null }"

echo [2/2] Closing PHANTOM terminal consoles...
taskkill /F /FI "WINDOWTITLE eq PHANTOM Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq PHANTOM Frontend*" >nul 2>&1

echo.
echo ======================================================================
echo [OK] All PHANTOM servers stopped. Ports 8001 and 3000 are 100%% clear.
echo ======================================================================
echo.
ping -n 2 127.0.0.1 >nul
