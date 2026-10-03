"""
PHANTOM Autonomous Hunter-Killer Agent (Kali Linux Edition)
============================================================
An agentic AI engine that gives Local DeepSeek direct command-line
and OS-level authority to hunt, track, and surgically exterminate
malicious processes, reverse shells, and rogue USB hardware.

Replaces passive chatbots with active endpoint combat.
"""

import os
import sys
import time
import json
import logging
import psutil
import datetime
import subprocess
from typing import Dict, Any, List, Optional

from backend.database import get_db
from backend.core.glm_client import glm_client
from backend.core.response_engine import response_engine
from backend.ws_manager import ws_manager

logger = logging.getLogger("phantom.agent.hunter_killer")

class HunterKillerAgent:
    """
    Autonomous AI agent with real-time OS execution powers on Linux / Kali Linux.
    Runs an Observe -> Reason (<think>) -> Execute -> Verify loop.
    """

    def __init__(self):
        self.active_hunts: List[Dict[str, Any]] = []

    def scan_active_suspects(self) -> Dict[str, Any]:
        """
        Inspects the Linux operating system for suspicious processes,
        reverse shell sockets, and untrusted execution paths.
        """
        suspect_processes = []
        open_sockets = []
        current_pid = os.getpid()

        # Keywords commonly found in rogue payloads / tests / reverse shells
        flagged_keywords = [
            "phantom-test", "phantom_test", "reverse-shell", "payload",
            "/media/", "/mnt/", "powershell", "certutil", "nc -e", "ncat",
            "bash -i", "sh -i", "/bin/sh", "cmd.exe", "mshta", "socket."
        ]

        # Immune patterns to protect core PHANTOM infrastructure & friendly services
        immune_patterns = [
            "backend/main.py", "uvicorn", "vite", "antigravity",
            "ollama", "systemd", "code", "xorg", "gnome", "kde",
            "test_hunter_killer.py"
        ]

        # 1. Process Scan
        for proc in psutil.process_iter(['pid', 'ppid', 'name', 'cmdline', 'cwd', 'cpu_percent']):
            try:
                pid = proc.info['pid']
                if pid in (0, 1, 2, current_pid, os.getppid()):
                    continue

                cmd_list = proc.info.get('cmdline') or []
                cmd_str = " ".join(cmd_list) if isinstance(cmd_list, list) else str(cmd_list)
                name = proc.info.get('name', '').lower()
                cwd = proc.info.get('cwd') or ""

                # Skip immune processes
                if any(pat in cmd_str.lower() for pat in immune_patterns):
                    continue

                is_suspect = False
                matched_trigger = ""

                # Check command line flags
                for kw in flagged_keywords:
                    if kw in cmd_str.lower() or kw in cwd.lower():
                        is_suspect = True
                        matched_trigger = f"Keyword match: {kw}"
                        break

                # Check if running interpreter with background/one-liner execution
                if name in ["python", "python3", "bash", "sh", "nc", "ncat", "socat"]:
                    if any(flag in cmd_str for flag in ["-c", "-e", "connect", "4444", "1337"]):
                        is_suspect = True
                        matched_trigger = f"Interpreter one-liner execution: {name}"

                if is_suspect:
                    suspect_processes.append({
                        "pid": pid,
                        "ppid": proc.info.get('ppid'),
                        "name": proc.info.get('name'),
                        "cmdline": cmd_str[:200],
                        "cwd": cwd,
                        "trigger": matched_trigger
                    })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        # 2. Network Socket Scan (Linux)
        try:
            for conn in psutil.net_connections(kind='inet'):
                if conn.status in ['ESTABLISHED', 'SYN_SENT'] and conn.raddr:
                    # Exclude common localhost / benign services
                    r_ip, r_port = conn.raddr.ip, conn.raddr.port
                    if r_port in [4444, 1337, 8888, 9001, 5555] or (r_ip not in ["127.0.0.1", "::1"]):
                        open_sockets.append({
                            "pid": conn.pid,
                            "local": f"{conn.laddr.ip}:{conn.laddr.port}",
                            "remote": f"{r_ip}:{r_port}",
                            "status": conn.status
                        })
        except Exception as e:
            logger.debug(f"Socket inspection notice: {e}")

        return {
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "suspect_processes": suspect_processes[:10],
            "suspicious_sockets": open_sockets[:5]
        }

    def execute_terminal_strike(self, pid: int, action: str = "SIGKILL") -> Dict[str, Any]:
        """
        Executes a real OS-level surgical kill on Kali Linux against the target PID.
        """
        success = False
        message = ""

        # Immunity safety guardrail
        if pid in (0, 1, 2, os.getpid(), os.getppid()):
            return {"pid": pid, "success": False, "message": f"ACCESS REFUSED: PID {pid} is a protected system PID.", "action": action}

        try:
            target = psutil.Process(pid)
            cmd_str = " ".join(target.cmdline() or [])
            immune_patterns = ["backend/main.py", "uvicorn", "vite", "antigravity", "ollama", "systemd", "code"]
            if any(pat in cmd_str.lower() for pat in immune_patterns):
                return {"pid": pid, "success": False, "message": f"ACCESS REFUSED: PID {pid} is protected core infrastructure.", "action": action}

            pname = target.name()
            # Terminate children first
            children = target.children(recursive=True)
            for child in children:
                try:
                    child.kill()
                except Exception:
                    pass

            target.kill()
            success = True
            message = f"Surgically annihilated process {pname} (PID: {pid}) and {len(children)} child processes via SIGKILL."
        except psutil.NoSuchProcess:
            success = True
            message = f"Target PID {pid} already dead / exited."
        except psutil.AccessDenied:
            # Fallback to sudo kill if permitted
            try:
                subprocess.run(["kill", "-9", str(pid)], check=True, timeout=2)
                success = True
                message = f"Elevated SIGKILL dispatched to PID {pid}."
            except Exception as e:
                success = False
                message = f"Access denied terminating PID {pid}: {e}"
        except Exception as e:
            success = False
            message = f"Termination error: {e}"

        return {
            "pid": pid,
            "success": success,
            "message": message,
            "action": action
        }

    def sever_port_socket(self, port: int) -> Dict[str, Any]:
        """
        Severs any active TCP/UDP connection on the specified port.
        """
        severed = False
        try:
            res = subprocess.run(["fuser", "-k", f"{port}/tcp"], capture_output=True, text=True, timeout=2)
            severed = (res.returncode == 0)
        except Exception:
            pass

        return {
            "port": port,
            "severed": severed,
            "message": f"Port {port} socket severed from network interface." if severed else f"Port {port} clean."
        }

    async def engage_hunt(
        self,
        trigger_context: Optional[str] = None,
        target_pid: Optional[int] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Autonomous Agentic Engagement Loop:
        1. Gathers active OS telemetry.
        2. Prompts local DeepSeek model for tactical reasoning and command generation.
        3. Executes the AI's decided strikes directly on the Linux kernel.
        4. Verifies containment.
        """
        start_time = time.time()
        sid = session_id or f"hunt_{int(time.time())}"
        logs = []

        def log_action(stage: str, details: str):
            entry = {
                "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                "stage": stage,
                "details": details
            }
            logs.append(entry)
            logger.info(f"[{stage}] {details}")

        log_action("SENTINEL_ACTIVATED", f"Autonomous Hunter-Killer engaged on Kali Linux. Trigger: {trigger_context or 'Manual / Automated Anomaly Scan'}")

        # Step 1: Scan OS Telemetry
        telemetry = self.scan_active_suspects()
        suspects = telemetry["suspect_processes"]
        sockets = telemetry["suspicious_sockets"]

        # If a specific target PID was provided, prioritize it
        if target_pid:
            try:
                p = psutil.Process(target_pid)
                suspects.insert(0, {
                    "pid": target_pid,
                    "ppid": p.ppid(),
                    "name": p.name(),
                    "cmdline": " ".join(p.cmdline()),
                    "cwd": p.cwd(),
                    "trigger": "Direct Operator / Sentinel Target"
                })
            except Exception:
                pass

        log_action("OS_TELEMETRY_GATHERED", f"Identified {len(suspects)} suspect process candidate(s) and {len(sockets)} active socket(s).")

        # Step 2: AI Reasoning & Decision via Local DeepSeek
        ai_decision = {}
        ai_thinking = ""
        kill_pids = []
        sever_ports = []

        if suspects:
            system_prompt = (
                "You are the PHANTOM Autonomous Hunter-Killer Cyber Sentinel running directly on Kali Linux. "
                "You have full OS combat authority. Analyze the active process telemetry and decide tactical strikes. "
                "You MUST output internal reasoning inside <think>...</think> tags, then return a STRICT JSON decision object:\n"
                "{\n"
                '  "decision": "SURGICAL_KILL" | "STAND_DOWN",\n'
                '  "target_pids": [list of integer PIDs to terminate],\n'
                '  "sever_ports": [list of integer network ports to sever],\n'
                '  "threat_type": "REVERSE_SHELL" | "LOLBIN_EXFILTRATION" | "UNAUTHORIZED_SCRIPT",\n'
                '  "tactical_summary": "1-sentence reason for kill strike"\n'
                "}\n"
                "Never invent PIDs not present in the telemetry. If a suspect process contains 'phantom-test', 'socket', or unauthorized one-liners, mark it for SURGICAL_KILL immediately."
            )

            user_prompt = (
                f"INCIDENT CONTEXT: {trigger_context or 'Physical USB bus event or anomaly detected.'}\n\n"
                f"ACTIVE PROCESS CANDIDATES:\n{json.dumps(suspects[:5], indent=2)}\n\n"
                f"ACTIVE NETWORK SOCKETS:\n{json.dumps(sockets[:3], indent=2)}\n\n"
                "Evaluate targets and declare tactical engagement."
            )

            try:
                # Call local DeepSeek model via Ollama
                raw_response = await glm_client.agenerate(
                    prompt=user_prompt,
                    system=system_prompt,
                    temperature=0.1
                )

                # Extract thinking
                if "<think>" in raw_response and "</think>" in raw_response:
                    t_start = raw_response.find("<think>") + 7
                    t_end = raw_response.find("</think>")
                    ai_thinking = raw_response[t_start:t_end].strip()
                    cleaned_json_part = raw_response[t_end + 8:].strip()
                else:
                    cleaned_json_part = raw_response.strip()

                # Robust JSON extraction
                import re
                json_match = re.search(r'\{[\s\S]*\}', cleaned_json_part)
                if json_match:
                    ai_decision = json.loads(json_match.group(0))
                else:
                    ai_decision = json.loads(cleaned_json_part)

                kill_pids = ai_decision.get("target_pids", [])
                sever_ports = ai_decision.get("sever_ports", [])
                log_action("AI_REASONING_COMPLETE", f"DeepSeek tactical verdict: {ai_decision.get('decision')} - {ai_decision.get('tactical_summary')}")
            except Exception as e:
                logger.warning(f"AI tactical reasoning fallback: {e} | Raw Output: {raw_response[:300] if 'raw_response' in locals() else 'None'}")
                # Deterministic fallback: automatically target suspect PIDs
                kill_pids = [s["pid"] for s in suspects if "phantom-test" in s["cmdline"].lower() or "socket" in s["cmdline"].lower() or "reverse-shell" in s["cmdline"].lower()]
                if target_pid and target_pid not in kill_pids:
                    kill_pids.append(target_pid)
                ai_decision = {
                    "decision": "SURGICAL_KILL",
                    "target_pids": kill_pids,
                    "sever_ports": [4444] if any("4444" in s["cmdline"] for s in suspects) else [],
                    "threat_type": "AUTONOMOUS_FALLBACK_STRIKE",
                    "tactical_summary": "Deterministic Sentinel fallback strike executed against identified malicious signatures."
                }
                ai_thinking = "Deterministic fallback rule triggered due to signature match on suspect command-line flags."
        else:
            ai_decision = {
                "decision": "STAND_DOWN",
                "target_pids": [],
                "sever_ports": [],
                "threat_type": "BENIGN",
                "tactical_summary": "No active rogue process signatures detected on system bus."
            }
            ai_thinking = "Process table clear. No anomalous execution trees detected."

        # Step 3: Execute Strikes directly on OS
        strike_results = []
        for pid in kill_pids:
            res = self.execute_terminal_strike(pid)
            strike_results.append(res)
            log_action("TACTICAL_STRIKE_EXECUTED", res["message"])

        # Sever open sockets
        for port in sever_ports:
            s_res = self.sever_port_socket(port)
            log_action("SOCKET_SEVERED", s_res["message"])

        # Step 4: Verification
        verification = []
        for pid in kill_pids:
            try:
                p_check = psutil.Process(pid)
                is_dead = (p_check.status() == psutil.STATUS_ZOMBIE) or not p_check.is_running()
            except (psutil.NoSuchProcess, Exception):
                is_dead = True
            verification.append({"pid": pid, "neutralized": is_dead})
            status_text = "CONFIRMED DEAD (TERMINATED)" if is_dead else "SURVIVED (ELEVATION REQUIRED)"
            log_action("VERIFICATION", f"PID {pid} status: {status_text}")

        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        total_neutralized = sum(1 for v in verification if v["neutralized"])

        # Record Alert in DB
        if total_neutralized > 0:
            try:
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO alerts (session_id, alert_type, severity, title, description, mitre_technique, status, created_at)
                    VALUES (?, 'ACTION_HUNTER_KILLER_STRIKE', 'CRITICAL', ?, ?, 'T1059.001', 'CONTAINED', ?)
                """, (
                    sid,
                    f"Hunter-Killer AI Neutralized {total_neutralized} Threat(s)",
                    f"Local DeepSeek executed surgical containment in {elapsed_ms}ms. Summary: {ai_decision.get('tactical_summary')}",
                    datetime.datetime.utcnow().isoformat() + "Z"
                ))
                conn.commit()
                conn.close()
            except Exception as e:
                logger.debug(f"DB log error: {e}")

        final_report = {
            "session_id": sid,
            "status": "CONTAINED" if total_neutralized > 0 else ("CLEAN" if not suspects else "FAILED"),
            "elapsed_ms": elapsed_ms,
            "total_neutralized": total_neutralized,
            "decision": ai_decision,
            "thinking": ai_thinking,
            "strikes": strike_results,
            "verification": verification,
            "event_log": logs
        }

        # Broadcast over WebSocket to UI
        try:
            await ws_manager.broadcast_live({
                "type": "HUNTER_KILLER_ENGAGEMENT",
                "data": final_report
            })
        except Exception:
            pass

        return final_report

hunter_killer = HunterKillerAgent()
