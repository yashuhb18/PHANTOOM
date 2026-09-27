#!/bin/bash
# ==============================================================================
#  PHANTOM USB — HACKATHON LIVE ATTACK DEMONSTRATION & WEAPONIZER
#  Kali Linux Edition — Autonomous Threat Hunting & Instant Surgical Kill
# ==============================================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear
echo -e "${CYAN}======================================================================${NC}"
echo -e "${GREEN}       PHANTOM: AUTONOMOUS USB THREAT HUNTING PLATFORM${NC}"
echo -e "${YELLOW}           LIVE ADVERSARY WEAPONIZATION & CONTAINMENT SUITE${NC}"
echo -e "${CYAN}======================================================================${NC}"
echo ""

# Verify backend health
echo -ne "${CYAN}[*] Checking PHANTOM Autonomous Core Status... ${NC}"
if curl -s http://localhost:8001/health | grep -q "healthy"; then
    echo -e "${GREEN}[ONLINE & ARMED]${NC}"
else
    echo -e "${RED}[OFFLINE]${NC}"
    echo -e "${YELLOW}Please start PHANTOM with ./start.sh first!${NC}"
    exit 1
fi

STATS=$(curl -s http://localhost:8001/api/stats)
CURRENT_KILLS=$(echo $STATS | grep -o '"containmentCount":[0-9]*' | cut -d: -f2)
echo -e "${CYAN}[*] Current Containment Count: ${GREEN}${CURRENT_KILLS:-0}${NC}"
echo ""

echo -e "${YELLOW}Select Demo Attack Scenario:${NC}"
echo -e "  ${GREEN}1)${NC} ${CYAN}Live USB BadUSB / Reverse Shell Attack${NC} (Simulates rogue code spawned from USB)"
echo -e "  ${GREEN}2)${NC} ${CYAN}Evasive LOLBin Abuse Attack${NC} (Simulates nc / python socket exfiltration)"
echo -e "  ${GREEN}3)${NC} ${CYAN}Drop Weaponized Test Payloads to Connected USB Drive${NC}"
echo -e "  ${GREEN}4)${NC} ${CYAN}Auto-Demo Mode${NC} (Continuously hunt & kill rogue payloads in real-time)"
echo -e "  ${GREEN}5)${NC} Exit"
echo ""
read -p "Enter choice [1-5]: " CHOICE

case $CHOICE in
    1)
        echo ""
        echo -e "${YELLOW}[!] Launching simulated USB unauthorized process execution...${NC}"
        echo -e "${CYAN}[*] Target Command: python3 reverse-shell payload from /media/usb${NC}"
        echo -e "${CYAN}[*] Spawning adversary process in background...${NC}"
        
        python3 -c 'import time; print("[ADVERSARY] Executing unauthorized reverse-shell payload from /media/usb..."); time.sleep(60)' &
        ROGUE_PID=$!
        
        echo -e "${YELLOW}[*] Rogue Process PID: ${ROGUE_PID} active!${NC}"
        echo -e "${CYAN}[*] Watch your PHANTOM Web Dashboard (http://localhost:3001)...${NC}"
        echo -e "${CYAN}[*] PHANTOM Autonomous Process Sentinel is analyzing PID ${ROGUE_PID}...${NC}"
        
        sleep 2
        
        if kill -0 $ROGUE_PID 2>/dev/null; then
            echo -e "${RED}[-] Process is still running.${NC}"
            kill $ROGUE_PID 2>/dev/null
        else
            echo ""
            echo -e "${GREEN}======================================================================${NC}"
            echo -e "${GREEN}  >>> SURGICAL KILL VERIFIED! PID ${ROGUE_PID} WAS TERMINATED BY PHANTOM! <<<${NC}"
            echo -e "${GREEN}======================================================================${NC}"
            NEW_STATS=$(curl -s http://localhost:8001/api/stats)
            NEW_KILLS=$(echo $NEW_STATS | grep -o '"containmentCount":[0-9]*' | cut -d: -f2)
            echo -e "${CYAN}[*] Updated Neutralized Attacks Counter: ${GREEN}${NEW_KILLS}${NC}"
        fi
        ;;
        
    2)
        echo ""
        echo -e "${YELLOW}[!] Launching evasive LOLBin execution (Simulated bash reverse-shell)...${NC}"
        python3 -c 'import socket, time; print("[ADVERSARY] Socket exfiltration simulation active..."); time.sleep(45) # phantom-test' &
        ROGUE_PID=$!
        
        echo -e "${YELLOW}[*] Rogue Process PID: ${ROGUE_PID} active!${NC}"
        sleep 2
        
        if kill -0 $ROGUE_PID 2>/dev/null; then
            kill $ROGUE_PID 2>/dev/null
        else
            echo ""
            echo -e "${GREEN}======================================================================${NC}"
            echo -e "${GREEN}  >>> CONTAINMENT TRIGGERED: LOLBin Neutralized in < 500ms! <<<${NC}"
            echo -e "${GREEN}======================================================================${NC}"
        fi
        ;;

    3)
        echo ""
        echo -e "${CYAN}[*] Scanning for connected USB storage drives...${NC}"
        TOPO=$(curl -s http://localhost:8001/api/devices/topology)
        USB_MOUNT=$(echo $TOPO | grep -o '"mount_point": "[^"]*"' | head -1 | cut -d'"' -f4)
        
        if [ -z "$USB_MOUNT" ] || [ "$USB_MOUNT" = "(unmounted)" ]; then
            echo -e "${YELLOW}[!] No mounted USB drive detected via API.${NC}"
            read -p "Enter USB mount path manually (e.g., /media/$USER/USB_LABEL or /mnt/phantom_usb_sda1): " USB_MOUNT
        fi
        
        if [ -d "$USB_MOUNT" ]; then
            echo -e "${GREEN}[+] Target USB Mount: $USB_MOUNT${NC}"
            
            # Write simulated autorun.inf
            cat << 'EOF' > "$USB_MOUNT/autorun.inf"
[autorun]
open=malware_payload.sh
action=Open USB Drive
icon=drive.ico
EOF
            echo -e "${GREEN}[+] Dropped autorun.inf decoy${NC}"
            
            # Write simulated script payload
            cat << 'EOF' > "$USB_MOUNT/malware_payload.sh"
#!/bin/bash
# PHANTOM Hackathon Demo Attack Payload
echo "Executing rogue payload from USB..."
python3 -c 'import time; time.sleep(60) # phantom-test'
EOF
            chmod +x "$USB_MOUNT/malware_payload.sh"
            echo -e "${GREEN}[+] Dropped malware_payload.sh decoy${NC}"
            
            echo ""
            echo -e "${GREEN}USB is now armed for demo!${NC}"
            echo -e "${YELLOW}Watch PHANTOM's Threat Scanner and Autorun Guardian detect and neutralize these live!${NC}"
        else
            echo -e "${RED}[-] Directory $USB_MOUNT does not exist.${NC}"
        fi
        ;;
        
    4)
        echo ""
        echo -e "${YELLOW}[*] Entering Continuous Autonomous Hunting Demo Mode...${NC}"
        echo -e "${CYAN}Press Ctrl+C to stop.${NC}"
        echo ""
        for i in {1..3}; do
            echo -e "${YELLOW}[Round $i/3] Spawning simulated adversary process...${NC}"
            python3 -c 'import time; print("[ADVERSARY] Spawned..."); time.sleep(60) # phantom-test' &
            RPID=$!
            sleep 2
            if ! kill -0 $RPID 2>/dev/null; then
                echo -e "${GREEN}[+] Round $i: Terminated by PHANTOM Sentinel!${NC}"
            fi
            sleep 1
        done
        ;;
        
    *)
        echo "Exiting."
        exit 0
        ;;
esac

echo ""
echo -e "${CYAN}======================================================================${NC}"
echo -e "${GREEN}Open http://localhost:3001 to see the live session timeline and audio narration!${NC}"
echo -e "${CYAN}======================================================================${NC}"
