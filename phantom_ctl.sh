#!/bin/bash
# ==============================================================================
#  PHANTOM: Unified Autonomous Threat Hunting Platform Control CLI
#  Commands: start | stop | restart | status | logs
# ==============================================================================

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

DIR="/home/rises/Desktop/PHANTOM USB"
BACKEND_LOG="/tmp/phantom_backend.log"
FRONTEND_LOG="/tmp/phantom_frontend.log"

show_banner() {
    echo -e "${CYAN}======================================================================${NC}"
    echo -e "${BOLD}${CYAN}   👻 PHANTOM: Autonomous USB Threat Hunting & Deception Platform   ${NC}"
    echo -e "${CYAN}======================================================================${NC}"
}

start_phantom() {
    show_banner
    echo -e "${YELLOW}[*] Initializing PHANTOM Autonomous Cyber Defense System...${NC}"
    echo ""

    # Check if already running
    if lsof -i :8001 >/dev/null 2>&1 || lsof -i :3001 >/dev/null 2>&1; then
        echo -e "${YELLOW}[!] Ports 8001 or 3001 are already in use. Cleaning up stale instances...${NC}"
        stop_phantom_quiet
        sleep 1
    fi

    # 1. Start Backend
    echo -ne "${CYAN}[1/2] Launching FastAPI Backend (Port 8001)... ${NC}"
    cd "$DIR"
    nohup setsid "$DIR/.venv/bin/python" -m uvicorn backend.main:app --host 0.0.0.0 --port 8001 --reload </dev/null > "$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
    disown "$BACKEND_PID" 2>/dev/null || true
    echo -e "${GREEN}[SPAWNED - PID $BACKEND_PID]${NC}"

    echo -ne "${YELLOW}      Connecting to MongoDB Atlas & initializing agents... ${NC}"
    # Wait for backend health
    for i in {1..25}; do
        if curl -s http://localhost:8001/api/stats >/dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    echo -e "${GREEN}[READY]${NC}"

    # 2. Start Frontend
    echo -ne "${CYAN}[2/2] Launching React Vite Frontend (Port 3001)... ${NC}"
    cd "$DIR/frontend"
    nohup setsid npm run dev -- --host 0.0.0.0 --port 3001 </dev/null > "$FRONTEND_LOG" 2>&1 &
    FRONTEND_PID=$!
    disown "$FRONTEND_PID" 2>/dev/null || true
    echo -e "${GREEN}[SPAWNED - PID $FRONTEND_PID]${NC}"

    # Wait for frontend port
    for i in {1..15}; do
        if lsof -i :3001 >/dev/null 2>&1; then
            break
        fi
        sleep 0.5
    done

    echo ""
    echo -e "${GREEN}======================================================================${NC}"
    echo -e "${BOLD}${GREEN}✅ PHANTOM Autonomous Platform is ONLINE!${NC}"
    echo -e "${CYAN}  🖥️  SOC Web Dashboard: ${BOLD}http://localhost:3001${NC}"
    echo -e "${CYAN}  💬  WhatsApp SOC Bot:  ${BOLD}http://localhost:3001/whatsapp${NC}"
    echo -e "${CYAN}  ⚙️   Backend REST API:  ${BOLD}http://localhost:8001${NC}"
    echo -e "${CYAN}  📖  API Documentation: ${BOLD}http://localhost:8001/docs${NC}"
    echo -e "${GREEN}======================================================================${NC}"
    echo -e "${YELLOW}  👉 Run '${BOLD}phantom stop${NC}${YELLOW}' anytime to shut down.${NC}"
    echo -e "${YELLOW}  👉 Run '${BOLD}phantom status${NC}${YELLOW}' to check service health.${NC}"
    echo ""
}

stop_phantom_quiet() {
    fuser -k 8001/tcp >/dev/null 2>&1 || true
    fuser -k 3001/tcp >/dev/null 2>&1 || true
    pkill -f "uvicorn backend.main:app" >/dev/null 2>&1 || true
    pkill -f "vite --port 3001" >/dev/null 2>&1 || true
}

stop_phantom() {
    show_banner
    echo -e "${YELLOW}[*] Shutting down PHANTOM active services...${NC}"
    echo ""

    echo -ne "${CYAN}[*] Stopping FastAPI Backend (Port 8001)... ${NC}"
    fuser -k 8001/tcp >/dev/null 2>&1 || true
    pkill -f "uvicorn backend.main:app" >/dev/null 2>&1 || true
    echo -e "${GREEN}[STOPPED]${NC}"

    echo -ne "${CYAN}[*] Stopping Vite Frontend (Port 3001)... ${NC}"
    fuser -k 3001/tcp >/dev/null 2>&1 || true
    pkill -f "vite --port 3001" >/dev/null 2>&1 || true
    echo -e "${GREEN}[STOPPED]${NC}"

    echo ""
    echo -e "${GREEN}======================================================================${NC}"
    echo -e "${BOLD}${GREEN}🛑 All PHANTOM servers successfully shut down.${NC}"
    echo -e "${YELLOW}[*] Ports 8001 and 3001 are now released.${NC}"
    echo -e "${GREEN}======================================================================${NC}"
    echo ""
}

status_phantom() {
    show_banner
    echo -e "${CYAN}[*] PHANTOM Active Service Status:${NC}"
    echo ""

    # Backend check
    if lsof -i :8001 >/dev/null 2>&1; then
        B_PID=$(lsof -t -i :8001 | head -1)
        echo -e "  Backend (Port 8001):   ${GREEN}ONLINE${NC} (PID: $B_PID)"
    else
        echo -e "  Backend (Port 8001):   ${RED}OFFLINE${NC}"
    fi

    # Frontend check
    if lsof -i :3001 >/dev/null 2>&1; then
        F_PID=$(lsof -t -i :3001 | head -1)
        echo -e "  Frontend (Port 3001):  ${GREEN}ONLINE${NC} (PID: $F_PID)"
    else
        echo -e "  Frontend (Port 3001):  ${RED}OFFLINE${NC}"
    fi

    # API Health
    STATS=$(curl -s http://localhost:8001/api/stats 2>/dev/null || echo "")
    if [ -n "$STATS" ]; then
        echo -e "  API Health:            ${GREEN}RESPONSIVE${NC}"
    else
        echo -e "  API Health:            ${YELLOW}UNAVAILABLE${NC}"
    fi

    echo ""
}

show_logs() {
    echo -e "${CYAN}=== BACKEND LOG (/tmp/phantom_backend.log) ===${NC}"
    tail -n 25 "$BACKEND_LOG" 2>/dev/null || echo "No backend logs found."
    echo ""
    echo -e "${CYAN}=== FRONTEND LOG (/tmp/phantom_frontend.log) ===${NC}"
    tail -n 25 "$FRONTEND_LOG" 2>/dev/null || echo "No frontend logs found."
}

CMD="$1"
# Check if invoked via symlink name (e.g. phantom-start or phantom-stop)
INVOKED_NAME="$(basename "$0")"
if [ "$INVOKED_NAME" = "phantom-start" ]; then
    CMD="start"
elif [ "$INVOKED_NAME" = "phantom-stop" ]; then
    CMD="stop"
elif [ "$INVOKED_NAME" = "phantom-status" ]; then
    CMD="status"
fi

case "$CMD" in
    start)
        start_phantom
        ;;
    stop)
        stop_phantom
        ;;
    restart)
        stop_phantom
        sleep 1
        start_phantom
        ;;
    status)
        status_phantom
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "Usage: phantom {start|stop|restart|status|logs}"
        echo "   or: phantom-start | phantom-stop | phantom-status"
        exit 1
        ;;
esac
