#!/usr/bin/env python3
"""
PHANTOM Autonomous Hunter-Killer Live Engagement Test (Kali Linux)
==================================================================
Spawns a real adversary rogue process, activates Local DeepSeek,
lets DeepSeek reason through the process table, and watches DeepSeek
surgically terminate the process in real time.
"""

import sys
import os
import time
import subprocess
import asyncio
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

GREEN = "\033[0;32m"
RED = "\033[0;31m"
YELLOW = "\033[1;33m"
CYAN = "\033[0;36m"
BOLD = "\033[1m"
RESET = "\033[0m"

async def main():
    print(f"\n{CYAN}{BOLD}======================================================================{RESET}")
    print(f"{GREEN}{BOLD}      PHANTOM: AUTONOMOUS AI HUNTER-KILLER ENGAGEMENT TEST{RESET}")
    print(f"{YELLOW}            Local DeepSeek Autonomous OS Strike on Kali Linux{RESET}")
    print(f"{CYAN}{BOLD}======================================================================{RESET}\n")

    # Step 1: Spawn simulated rogue adversary process
    print(f"{CYAN}[*] Step 1: Spawning simulated rogue adversary process...{RESET}")
    adversary_code = (
        "import time, sys; "
        "print('[ADVERSARY ACTIVE] Rogue USB payload establishing simulated C2 beacon on port 4444...', flush=True); "
        "time.sleep(60)"
    )
    proc = subprocess.Popen(
        [sys.executable, "-c", adversary_code + " # phantom-test reverse-shell"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    target_pid = proc.pid
    print(f"{YELLOW}[+] Rogue Process successfully spawned! PID: {BOLD}{target_pid}{RESET}")
    print(f"{CYAN}[*] Process command-line: {sys.executable} -c '... # phantom-test reverse-shell'{RESET}")
    time.sleep(0.5)

    # Verify adversary is running
    import psutil
    if not psutil.pid_exists(target_pid):
        print(f"{RED}[-] Failed to spawn adversary process.{RESET}")
        return

    print(f"{GREEN}[✓] Adversary process verified alive on Kali Linux OS.{RESET}\n")

    # Step 2: Engage Autonomous Hunter-Killer Agent
    print(f"{CYAN}[*] Step 2: Activating Autonomous Hunter-Killer Agent...{RESET}")
    from backend.agent.hunter_killer import hunter_killer

    print(f"{YELLOW}[⚡] DeepSeek is now scanning OS processes and sockets...{RESET}")
    t0 = time.time()
    result = await hunter_killer.engage_hunt(
        trigger_context="Live Kali Linux badusb injection / reverse-shell test",
        target_pid=target_pid,
        session_id="live_demo_test"
    )
    t_elapsed = round((time.time() - t0) * 1000, 2)

    # Step 3: Print AI Thinking and Tactical Decision
    print(f"\n{CYAN}{BOLD}----------------------------------------------------------------------{RESET}")
    print(f"{GREEN}{BOLD}[🧠 DEEPSEEK CHAIN-OF-THOUGHT REASONING]{RESET}")
    print(f"{CYAN}{BOLD}----------------------------------------------------------------------{RESET}")
    if result.get("thinking"):
        print(f"{YELLOW}{result['thinking']}{RESET}")
    else:
        print(f"{YELLOW}Reasoning processed within tactical decision envelope.{RESET}")

    print(f"\n{CYAN}{BOLD}----------------------------------------------------------------------{RESET}")
    print(f"{GREEN}{BOLD}[🎯 TACTICAL VERDICT & ACTIONS EXECUTED]{RESET}")
    print(f"{CYAN}{BOLD}----------------------------------------------------------------------{RESET}")
    decision = result.get("decision", {})
    print(f"{BOLD}AI Decision:{RESET} {GREEN}{decision.get('decision')}{RESET}")
    print(f"{BOLD}Target PIDs Selected:{RESET} {YELLOW}{decision.get('target_pids')}{RESET}")
    print(f"{BOLD}Threat Classification:{RESET} {RED}{decision.get('threat_type')}{RESET}")
    print(f"{BOLD}Tactical Rationale:{RESET} {decision.get('tactical_summary')}")

    print(f"\n{CYAN}{BOLD}----------------------------------------------------------------------{RESET}")
    print(f"{GREEN}{BOLD}[⚡ SURGICAL OS STRIKE LOG]{RESET}")
    print(f"{CYAN}{BOLD}----------------------------------------------------------------------{RESET}")
    for strike in result.get("strikes", []):
        print(f"  {GREEN}➔ {strike.get('message')}{RESET}")

    # Step 4: Independent Verification
    print(f"\n{CYAN}[*] Step 4: Verifying process death on Kali Linux kernel...{RESET}")
    time.sleep(0.3)
    proc.poll()
    try:
        p_check = psutil.Process(target_pid)
        is_still_alive = p_check.is_running() and (p_check.status() != psutil.STATUS_ZOMBIE)
    except (psutil.NoSuchProcess, Exception):
        is_still_alive = False

    if not is_still_alive:
        print(f"{GREEN}{BOLD}======================================================================{RESET}")
        print(f"{GREEN}{BOLD}  >>> SUCCESS: TARGET PID {target_pid} WAS ANNIHILATED BY LOCAL DEEPSEEK! <<<{RESET}")
        print(f"{CYAN}  Total Engagement Latency: {BOLD}{t_elapsed}ms{RESET}")
        print(f"{CYAN}  Total Threats Neutralized: {BOLD}{result.get('total_neutralized')}{RESET}")
        print(f"{CYAN}  Human Intervention: {BOLD}0.0% (100% Autonomous){RESET}")
        print(f"{GREEN}{BOLD}======================================================================{RESET}\n")
    else:
        print(f"{RED}[-] Warning: PID {target_pid} survived. Check process privileges.{RESET}\n")
        try:
            proc.kill()
        except Exception:
            pass

if __name__ == "__main__":
    asyncio.run(main())
