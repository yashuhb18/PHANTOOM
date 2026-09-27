#!/bin/bash
# PHANTOM: Autonomous USB Threat Hunting Platform — Kali Linux Launcher

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "======================================================================"
echo "     PHANTOM: Autonomous USB Threat Hunting Platform (Kali Linux)"
echo "======================================================================"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down PHANTOM..."
    [ -n "$BACKEND_PID" ] && kill $BACKEND_PID 2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill $FRONTEND_PID 2>/dev/null
    wait 2>/dev/null
    echo "PHANTOM stopped."
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start Backend
echo "[1/2] Starting FastAPI Backend on port 8001..."
source .venv/bin/activate
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!
echo "      Backend PID: $BACKEND_PID"

sleep 3

# Start Frontend
echo "[2/2] Starting React + Vite Frontend on port 3001..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..
echo "      Frontend PID: $FRONTEND_PID"

echo ""
echo "======================================================================"
echo "PHANTOM is up and running on Kali Linux!"
echo "  - Web Application: http://localhost:3001"
echo "  - Backend API:     http://localhost:8001"
echo "  - API Docs:        http://localhost:8001/docs"
echo "======================================================================"
echo ""
echo "Press Ctrl+C to stop all services."

# Wait for background processes
wait
