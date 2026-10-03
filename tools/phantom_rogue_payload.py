"""
PHANTOM ROGUE INTRUSION VECTOR · HIGH-CPU CRYPTOMINER SIMULATOR
================================================================
Designed for live demonstration to evaluators:
1. Spawns multi-core cryptographic hash crunchers (80% - 95% CPU load).
2. Transmits anomalous UDP exfiltration beacons to 127.0.0.1:5353.
3. Provides a clean 5-6 second evaluation window for observers to
   inspect high processor load in Windows Task Manager.
4. Intercepted and surgically terminated by PHANTOM's Autonomous Hunter-Killer agent.
"""

import os
import sys
import time
import socket
import hashlib
import threading
import ctypes

# Safe stdout reconfiguration for Windows terminals
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

RUNNING = True

# ANSI Color codes for Windows terminal
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
WHITE = "\033[97m"
BOLD = "\033[1m"
RESET = "\033[0m"

def set_terminal_title(title: str):
    """Sets the Windows console window title."""
    try:
        if os.name == 'nt':
            ctypes.windll.kernel32.SetConsoleTitleW(title)
    except Exception:
        pass

def cpu_stress_worker(worker_id: int):
    """Maxes out a single processor core via continuous SHA-256 crunching."""
    data = os.urandom(2048)
    while RUNNING:
        data = hashlib.sha256(data).digest()

def udp_beacon_worker():
    """Generates anomalous outbound UDP exfiltration beacons."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    payload = b"PHANTOM_ROGUE_PAYLOAD_EXFIL_BEACON_METRIC_0xDEADBEEF"
    target = ("127.0.0.1", 5353)
    while RUNNING:
        try:
            sock.sendto(payload, target)
        except Exception:
            pass
        time.sleep(0.3)

def main():
    # Enable ANSI escape sequences on Windows console
    if os.name == 'nt':
        os.system('')
    
    pid = os.getpid()
    cpu_cores = os.cpu_count() or 4
    set_terminal_title(f"[!] ROGUE INTRUSION VECTOR - PID: {pid} [HIGH CPU CRYPTOMINER]")

    banner = f"""{RED}{BOLD}
================================================================================
  [!] PHANTOM 2.0 ROGUE INTRUSION VECTOR SIMULATOR
  [!] ACTIVE EXPLOIT: MULTI-CORE HIGH-CPU CRYPTOMINER & UDP C2
================================================================================{RESET}
{CYAN}[+] TARGET PROCESS PID   :{RESET} {WHITE}{BOLD}{pid}{RESET}
{CYAN}[+] EXECUTABLE BINARY    :{RESET} {WHITE}{sys.argv[0]}{RESET}
{CYAN}[+] MULTI-CORE WORKERS   :{RESET} {YELLOW}{BOLD}{cpu_cores} THREADS ACTIVE{RESET}
{CYAN}[+] NETWORK C2 CHANNEL   :{RESET} {YELLOW}UDP 127.0.0.1:5353 (Anomalous Beacons){RESET}
{CYAN}[+] ANOMALY VECTOR       :{RESET} {RED}{BOLD}MAX PROCESSOR EXHAUSTION (~85% - 95% CPU){RESET}
--------------------------------------------------------------------------------
{YELLOW}{BOLD}[!] EVALUATION DEMONSTRATION INSTRUCTIONS:{RESET}
    {WHITE}1. Open Windows Task Manager ({BOLD}Ctrl + Shift + Esc{RESET}{WHITE}).{RESET}
    {WHITE}2. Find {YELLOW}'PHANTOM_ROGUE_MALWARE_DEMO.exe'{RESET}{WHITE} or PID {BOLD}{pid}{RESET}.
    {WHITE}3. Observe processor utilization spike across all cores!{RESET}
    {WHITE}4. Watch PHANTOM Autonomous EDR Hunter-Killer detect & terminate!{RESET}
--------------------------------------------------------------------------------
"""
    print(banner)

    # Launch CPU stress threads across all processor cores
    threads = []
    for i in range(cpu_cores):
        t = threading.Thread(target=cpu_stress_worker, args=(i,), daemon=True)
        t.start()
        threads.append(t)

    # Launch UDP beacon thread
    net_t = threading.Thread(target=udp_beacon_worker, daemon=True)
    net_t.start()

    print(f"{GREEN}[*] Multi-core stress crunchers online across {cpu_cores} cores.{RESET}")
    print(f"{GREEN}[*] UDP exfiltration beacon sockets active on port 5353.{RESET}")
    print(f"{YELLOW}[*] Live demonstration window active. Awaiting PHANTOM autonomous kill...{RESET}\n")

    # Countdown loop (5-6 seconds of active showcase, with 15s failsafe)
    try:
        start_time = time.time()
        second_counter = 0
        while True:
            time.sleep(1.0)
            second_counter += 1
            elapsed = int(time.time() - start_time)
            
            # Pure ASCII Progress bar visualization (100% cp1252 safe)
            fill = min(20, second_counter * 3)
            bar = "#" * fill + "-" * (20 - fill)
            
            if second_counter <= 5:
                status = f"{YELLOW}EVALUATOR INSPECTION TIME ({6 - second_counter}s left){RESET}"
            elif second_counter <= 7:
                status = f"{RED}{BOLD}PHANTOM HUNTER-KILLER ENGAGEMENT ZONE{RESET}"
            else:
                status = f"{RED}AWAITING SEVERANCE{RESET}"

            print(f" {CYAN}[{elapsed:02d}s]{RESET} [{RED}{bar}{RESET}] {WHITE}CPU LOAD: {BOLD}~92%{RESET} | {status}")

            # Standalone failsafe exit if PHANTOM is not running
            if elapsed >= 15:
                print(f"\n{YELLOW}[!] Standalone failsafe timeout (15s) reached. Normalizing CPU...{RESET}")
                break

    except KeyboardInterrupt:
        print(f"\n{YELLOW}[*] Manual demo interruption requested. Exiting.{RESET}")
    finally:
        global RUNNING
        RUNNING = False
        print(f"{GREEN}[+] Rogue payload terminated. CPU restored.{RESET}")

if __name__ == "__main__":
    main()
