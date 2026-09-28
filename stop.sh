#!/bin/bash
# ==============================================================================
#  PHANTOM: Stop All Active Services (FastAPI Backend + React Frontend)
# ==============================================================================

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}======================================================================${NC}"
echo -e "${YELLOW}           PHANTOM: SHUTTING DOWN ACTIVE SERVICES...${NC}"
echo -e "${CYAN}======================================================================${NC}"

# 1. Kill backend (uvicorn)
echo -ne "${CYAN}[*] Stopping FastAPI Backend (Port 8001)... ${NC}"
pkill -f "uvicorn backend.main:app" 2>/dev/null || true
fuser -k 8001/tcp 2>/dev/null || true
echo -e "${GREEN}[STOPPED]${NC}"

# 2. Kill frontend (vite)
echo -ne "${CYAN}[*] Stopping React + Vite Frontend (Port 3001)... ${NC}"
pkill -f "vite" 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
echo -e "${GREEN}[STOPPED]${NC}"

echo ""
echo -e "${GREEN}✅ All PHANTOM servers successfully shut down.${NC}"
echo -e "${YELLOW}[*] Ports 8001 and 3001 are now released.${NC}"
echo -e "${CYAN}======================================================================${NC}"
