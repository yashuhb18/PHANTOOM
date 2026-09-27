#!/bin/bash
# ==============================================================================
#  PHANTOM: LIVE REAL-TIME ADVERSARY ATTACK SIMULATOR (Kali Linux)
# ==============================================================================

RED='\033[1;31m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
CYAN='\033[1;36m'
BOLD='\033[1m'
NC='\033[0m'

clear
echo -e "${RED}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║       ⚠️  PHANTOM LIVE WEAPONIZED ATTACK DEMONSTRATION ⚠️            ║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}${BOLD}THE TWO-PHASE HACKATHON EXPERIMENT:${BOLD}${NC}"
echo -e "  ${RED}PHASE 1 (Servers OFF):${NC} This attack script runs undisturbed. System is"
echo -e "                        completely compromised. Data is being exfiltrated."
echo -e "  ${GREEN}PHASE 2 (Servers ON):${NC}  The second you run ${BOLD}./start.sh${NC} in another terminal,"
echo -e "                        PHANTOM awakens, identifies this rogue process,"
echo -e "                        and executes an ${GREEN}INSTANT SURGICAL KILL (SIGKILL)${NC}!"
echo ""
echo -e "${CYAN}----------------------------------------------------------------------${NC}"

# Spawn the rogue background adversary payload
python3 -c '
import time, sys, os

pid = os.getpid()
print(f"\033[1;31m>>> [ROGUE ADVERSARY SPAWNED] Active with PID: {pid}\033[0m")
print("\033[1;33m>>> [VULNERABLE STATE] PHANTOM Core is inactive. System undefended!\033[0m\n")
sys.stdout.flush()

counter = 1
while True:
    print(f"\033[0;31m  [ATTACK CYCLE #{counter:02d}] Exfiltrating data from /media/usb... [ACTIVE PID {pid}]\033[0m")
    sys.stdout.flush()
    time.sleep(1.2)
    counter += 1
# phantom-test reverse-shell /dev/tcp
' &
ROGUE_PID=$!

echo -e "${CYAN}[*] Background Adversary PID: ${BOLD}${ROGUE_PID}${NC}"
echo -e "${YELLOW}[*] Go to your second terminal and run: ${GREEN}./start.sh${NC}"
echo -e "${CYAN}----------------------------------------------------------------------${NC}"
echo ""

# Monitor the rogue process until PHANTOM terminates it
while kill -0 $ROGUE_PID 2>/dev/null; do
    sleep 0.5
done

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ SURGICAL KILL CONFIRMED! ROGUE PROCESS TERMINATED BY PHANTOM!   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo -e "${CYAN}[*] Rogue Process PID ${ROGUE_PID} was neutralized in real time!${NC}"
echo -e "${YELLOW}[*] Check your PHANTOM Web Dashboard: http://localhost:3001${NC}"
echo -e "${YELLOW}[*] The threat is logged under Neutralized Attacks with AI narration!${NC}"
echo ""
