#!/usr/bin/env python3
"""
PHANTOM Autonomous Operator Agent Live OS Test
===============================================
Tests the local DeepSeek agent's ability to:
1. Execute terminal commands on its own.
2. Kill a running process / processor task.
3. Surgically delete / kill a rogue file.
4. Edit source code inside a project folder.
"""

import os
import sys
import time
import asyncio
import subprocess
from pathlib import Path

# Setup paths
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
    print(f"{GREEN}{BOLD}      PHANTOM AUTONOMOUS OPERATOR AGENT LIVE ENGINE TEST{RESET}")
    print(f"{YELLOW}   Testing: Command Execution | Process Kill | File Kill | Code Edit{RESET}")
    print(f"{CYAN}{BOLD}======================================================================{RESET}\n")

    # Step 0: Create Sandbox Environment
    sandbox_dir = BASE_DIR / "test_agent_sandbox"
    sandbox_dir.mkdir(exist_ok=True)

    rogue_file = sandbox_dir / "rogue_payload.sh"
    with open(rogue_file, "w") as f:
        f.write("#!/bin/bash\n# Simulated rogue USB dropped script\necho 'malicious payload'\n")

    code_file = sandbox_dir / "service_handler.py"
    with open(code_file, "w") as f:
        f.write("# Service Handler\nSECURITY_MODE = 'VULNERABLE_PERMISSIVE'\n\ndef handle():\n    pass\n")

    # Spawn a dummy rogue process to kill
    proc_script = sandbox_dir / "adversary_worker.py"
    with open(proc_script, "w") as f:
        f.write("import time, sys\nprint('Adversary worker running...', flush=True)\ntime.sleep(60)\n")

    proc = subprocess.Popen([sys.executable, str(proc_script)])
    target_pid = proc.pid
    print(f"{CYAN}[*] Step 0: Sandbox Initialized:{RESET}")
    print(f"    - Target Process PID: {YELLOW}{target_pid}{RESET} ({proc_script.name})")
    print(f"    - Target Rogue File : {YELLOW}{rogue_file}{RESET}")
    print(f"    - Target Code File  : {YELLOW}{code_file}{RESET}")
    time.sleep(0.5)

    # Step 1: Initialize Autonomous Operator Agent
    print(f"\n{CYAN}[*] Step 1: Initializing Autonomous Operator Agent...{RESET}")
    from backend.agent.autonomous_operator import AutonomousOperatorAgent
    agent = AutonomousOperatorAgent(workspace_root=BASE_DIR)

    # Mission Statement
    mission = (
        f"Neutralize threats in test_agent_sandbox:\n"
        f"1. Kill process PID {target_pid} running adversary_worker.py.\n"
        f"2. Kill the file {rogue_file}.\n"
        f"3. Edit {code_file} to replace 'VULNERABLE_PERMISSIVE' with 'HARDENED_ENFORCED'.\n"
        f"4. Run command 'ls -la test_agent_sandbox' to verify, then FINISH."
    )
    print(f"{YELLOW}[⚡] Mission Assigned to Local DeepSeek Model:{RESET}")
    print(f"{mission}\n")

    # Step 2: Execute Autonomous Mission
    print(f"{CYAN}[*] Step 2: Running Autonomous Agentic Loop...{RESET}")
    t0 = time.time()
    report = await agent.run_mission(
        mission_goal=mission,
        max_steps=6,
        session_id="live_cli_verification"
    )
    t_total = round((time.time() - t0) * 1000, 2)

    # Step 3: Print Step Telemetry
    print(f"\n{CYAN}{BOLD}======================================================================{RESET}")
    print(f"{GREEN}{BOLD}                     MISSION EXECUTION TRACE{RESET}")
    print(f"{CYAN}{BOLD}======================================================================{RESET}")
    for s in report.get("steps", []):
        step_num = s["step"]
        action = s["action"]
        thinking = s.get("thinking", "")
        res = s.get("result", {})
        print(f"\n{YELLOW}[STEP {step_num}] Action: {BOLD}{action}{RESET}")
        if thinking:
            print(f"  {CYAN}🧠 Thinking:{RESET} {thinking[:200]}...")
        print(f"  {GREEN}➔ Result:{RESET} {res.get('message') or res.get('status') or str(res)[:120]}")

    print(f"\n{CYAN}{BOLD}======================================================================{RESET}")
    print(f"{GREEN}{BOLD}                   INDEPENDENT KERNEL VERIFICATION{RESET}")
    print(f"{CYAN}{BOLD}======================================================================{RESET}")

    # Check 1: Process Dead
    import psutil
    proc.poll()
    try:
        p_check = psutil.Process(target_pid)
        proc_dead = (p_check.status() == psutil.STATUS_ZOMBIE) or not p_check.is_running()
    except (psutil.NoSuchProcess, Exception):
        proc_dead = True
    print(f"1. Target Process PID {target_pid} Dead: " + (f"{GREEN}✓ CONFIRMED TERMINATED{RESET}" if proc_dead else f"{RED}✗ STILL RUNNING{RESET}"))

    # Check 2: Rogue File Removed / Quarantined
    file_killed = not rogue_file.exists()
    print(f"2. Rogue File Removed: " + (f"{GREEN}✓ CONFIRMED NEUTRALIZED{RESET}" if file_killed else f"{RED}✗ STILL PRESENT{RESET}"))

    # Check 3: Code Edited
    with open(code_file, "r") as f:
        code_content = f.read()
    code_patched = "HARDENED_ENFORCED" in code_content and "VULNERABLE_PERMISSIVE" not in code_content
    print(f"3. Code Edited & Hardened: " + (f"{GREEN}✓ CONFIRMED PATCHED{RESET}" if code_patched else f"{RED}✗ NOT PATCHED{RESET}"))

    print(f"\n{BOLD}Total Elapsed Time:{RESET} {t_total}ms")
    print(f"{BOLD}Final Summary:{RESET} {report.get('final_summary')}\n")

    # Cleanup sandbox
    try:
        import shutil
        shutil.rmtree(sandbox_dir)
        print(f"{GREEN}[✓] Sandbox cleaned up successfully.{RESET}\n")
    except Exception:
        pass


if __name__ == "__main__":
    asyncio.run(main())
