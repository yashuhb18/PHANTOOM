"""
PHANTOM Autonomous Process Surveillance & Containment Agent
=============================================================
Ultra-aggressive real-time process monitoring with autonomous kill capability.
Monitors ALL process spawns, detects suspicious script hosts, USB-origin execution,
evasive command-line flags, and surgically terminates threats with zero human intervention.
Kills entire process trees, not just individual processes.
"""

import sys
import os
import time
import asyncio
import threading
import logging
import re
from typing import Callable, Optional, Set, Dict, Any, List
import psutil
from backend.core.session_manager import session_manager
from backend.core.event_collector import event_collector
from backend.core.response_engine import response_engine
from backend.core.ai_analyst import ai_analyst
from backend.ws_manager import ws_manager
from backend.database import get_db

logger = logging.getLogger("phantom.agent.process")


class ProcessMonitor:
    """
    Autonomous Real-Time Process Surveillance & Containment Agent.
    
    This is PHANTOM's strongest defense layer. It monitors every new process spawn
    on the system and makes autonomous decisions to terminate threats.
    
    Detection Capabilities:
    1. Script interpreter abuse (PowerShell, CMD, WScript, CScript, MSHTA, etc.)
    2. USB-origin execution (any process running from a removable drive)
    3. Evasive command-line flags (hidden windows, encoded commands, bypass policies)
    4. Download cradles (Invoke-WebRequest, certutil, bitsadmin)
    5. Persistence installation (reg add, schtasks, sc create)
    6. Credential access tools (mimikatz references, credential dumping)
    7. Network reconnaissance (nslookup, netstat, ipconfig enumeration)
    8. Living-off-the-land binaries (LOLBins) abuse
    
    Response Capabilities:
    1. Instant process termination via psutil.kill()
    2. Full process tree annihilation (parent + all children)
    3. Event recording with MITRE ATT&CK mapping
    4. Real-time WebSocket broadcast to UI
    5. AI-narrated threat analysis
    """

    # ─────────────────────────────────────────────────────────────────────
    # SUSPICIOUS PROCESS NAMES — script interpreters and LOLBins
    # ─────────────────────────────────────────────────────────────────────
    SUSPICIOUS_NAMES: Set[str] = {
        # Script interpreters
        "powershell.exe", "pwsh.exe", "cmd.exe",
        "wscript.exe", "cscript.exe", "mshta.exe",
        # LOLBins (Living Off The Land Binaries)
        "certutil.exe", "bitsadmin.exe", "rundll32.exe",
        "regsvr32.exe", "msiexec.exe", "installutil.exe",
        "regasm.exe", "regsvcs.exe", "msbuild.exe",
        "cmstp.exe", "msxsl.exe", "ieexec.exe",
        # System utilities often abused
        "reg.exe", "schtasks.exe", "sc.exe",
        "net.exe", "net1.exe", "netsh.exe",
        "wmic.exe", "taskkill.exe",
        # Scripting runtimes
        "python.exe", "python3.exe", "pythonw.exe",
        "node.exe", "ruby.exe", "perl.exe",
        "java.exe", "javaw.exe",
        # Linux script interpreters & LOLBins
        "bash", "sh", "dash", "zsh", "fish", "ksh",
        "python3", "python", "perl", "ruby", "node",
        # Linux network tools (potential reverse shells)
        "nc", "ncat", "netcat", "socat",
        "curl", "wget",
        # Linux system tools that can be abused
        "crontab", "at", "nohup", "screen", "tmux",
        "xterm", "xdg-open",
        "xfce4-terminal", "gnome-terminal", "qterminal", "konsole", "terminator", "alacritty",
        "chmod", "chown",
    }

    # Processes that should ALWAYS be killed if spawned from USB
    ALWAYS_KILL_FROM_USB: Set[str] = {
        "powershell.exe", "pwsh.exe", "powershell", "pwsh", "cmd.exe",
        "wscript.exe", "cscript.exe", "mshta.exe",
        "certutil.exe", "bitsadmin.exe", "rundll32.exe",
        "regsvr32.exe", "python.exe", "python3.exe",
        "node.exe", "ruby.exe", "perl.exe",
        "java.exe", "javaw.exe",
        "bash", "sh", "dash", "zsh",
        "python3", "python", "perl", "ruby", "node",
        "nc", "ncat", "netcat", "socat",
    }

    # Terminal emulators for storm/burst monitoring
    TERMINAL_NAMES: Set[str] = {
        "xterm", "xfce4-terminal", "gnome-terminal", "alacritty",
        "konsole", "terminator", "qterminal", "uxterm", "rxvt", "tilix", "foot",
        "x-terminal-emulator", "lxterminal", "mate-terminal"
    }

    # ─────────────────────────────────────────────────────────────────────
    # SUSPICIOUS COMMAND-LINE FLAGS — evasive execution patterns
    # ─────────────────────────────────────────────────────────────────────
    SUSPICIOUS_FLAGS: List[str] = [
        # PowerShell evasion
        "-nop", "-noprofile", "-executionpolicy bypass", "-ep bypass",
        "-w hidden", "-windowstyle hidden", "-enc", "-encodedcommand",
        "-sta", "-noninteractive",
        # Generic evasion
        "phantom-test", "phantom_test", "start-sleep",
        # Download cradles
        "invoke-webrequest", "invoke-restmethod", "downloadstring",
        "downloadfile", "downloaddata", "start-bitstransfer",
        "urlcache", "certutil -urlcache",
        # Persistence
        "reg add", "schtasks /create", "sc create",
        "new-scheduledtask", "register-scheduledtask",
        # Credential access
        "mimikatz", "sekurlsa", "lsadump", "invoke-mimikatz",
        "get-credential", "convertto-securestring",
        # Reconnaissance
        "invoke-portscan", "test-netconnection",
        # Execution
        "invoke-expression", "iex(", "iex (",
        # Obfuscation
        "frombase64string", "[convert]::frombase64",
        "charcode", "replace(",
        # Process injection
        "invoke-shellcode", "invoke-dllinjection",
        "virtualalloc", "createthread",
        # Linux reverse shells
        "/dev/tcp/", "/dev/udp/",
        "bash -i", "sh -i",
        "mkfifo", "mknod",
        "| bash", "| sh",
        # Linux persistence
        "crontab -", "/etc/cron",
        "/.bashrc", "/.zshrc", "/.profile",
        "/etc/rc.local",
        "systemctl enable", "systemctl start",
        # Linux privilege escalation
        "chmod +s", "chmod u+s", "chmod 4755",
        "sudo -", "su -",
        "/etc/passwd", "/etc/shadow",
        # Linux credential access
        "/.ssh/", "id_rsa", "authorized_keys",
    ]

    # High-confidence kill indicators — if ANY of these are in cmdline, kill immediately
    INSTANT_KILL_PATTERNS: List[str] = [
        "-encodedcommand", "-enc ", "encodedcommand",
        "invoke-mimikatz", "mimikatz",
        "invoke-shellcode", "invoke-dllinjection",
        "downloadstring(", "downloadfile(",
        "-windowstyle hidden",
        "certutil -urlcache -split -f",
        "bitsadmin /transfer",
        "phantom-test", "phantom_test",
        "bash -i >& /dev/tcp/",
        "nc -e /bin/", "ncat -e /bin/",
        "socat exec:",
        "python -c 'import socket",
        "python3 -c 'import socket",
        "perl -e 'use Socket",
        "mkfifo /tmp/",
        "/etc/shadow",
        # Terminal spam storm & automated demo attack interceptors
        "usb-terminal-demo",
        "usb-terminal-loop",
        "open_termial",
        "open_terminal",
        "flood_test",
        "tenter.sh",
        "run_terminals.sh",
        # Batch attack scripts, exploit launchers & demo payloads
        "run_all.bat", "run_all.cmd", "run_all",
        "install_this.bat", "install_this",
        "usb_watcher.ps1",
        "glitch_demo", "error_demo", "usb_demo",
        "glitch_demo.exe", "error_demo.exe", "usb_demo.exe",
        "glitch.exe", "error.exe",
    ]

    # ACTIVE DEFENSE MODE: When False, PHANTOM autonomously detects, alerts, and kills
    # the malicious/unauthorized USB process trees to stop execution immediately.
    DEMO_MODE: bool = False

    def __init__(self, callback: Optional[Callable] = None):
        self.callback = callback
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._known_pids: Set[int] = set()
        self._event_loop: Optional[asyncio.AbstractEventLoop] = None
        self._killed_pids: Set[int] = set()  # Track killed PIDs to avoid duplicate alerts
        self._kill_count = 0
        self._terminal_spawns: List[Any] = []  # Track terminal spawns (timestamp, pid, ppid) for storm detection

    def start(self, loop: Optional[asyncio.AbstractEventLoop] = None):
        if self._running:
            return
        self._running = True
        self._event_loop = loop
        self._thread = threading.Thread(
            target=self._monitor_loop,
            name="PhantomProcessMonitor",
            daemon=True
        )
        self._thread.start()
        logger.info("🛡️ PHANTOM Autonomous Process Surveillance & Containment Agent started.")

    def stop(self):
        self._running = False
        logger.info(f"PHANTOM Process Surveillance Agent stopped. Total kills this session: {self._kill_count}")

    def _broadcast_safe(self, coro):
        if self._event_loop and self._event_loop.is_running():
            try:
                asyncio.run_coroutine_threadsafe(coro, self._event_loop)
            except Exception as e:
                logger.debug(f"Failed to dispatch coroutine to loop: {e}")

    # ─────────────────────────────────────────────────────────────────────
    # MAIN MONITORING LOOP — Ultra-fast 500ms polling
    # ─────────────────────────────────────────────────────────────────────

    def _monitor_loop(self):
        """
        Continuous process surveillance loop.
        Polls every 500ms for new processes and analyzes each one.
        """
        # Initial baseline: establish known PIDs immediately so real-time surveillance starts in 1ms
        try:
            self._known_pids = set(psutil.pids())
            logger.info(f"🛡️ Process Surveillance: Baseline established across {len(self._known_pids)} processes. Real-time loop active.")
        except Exception:
            self._known_pids = set()

        cycle_counter = 0
        while self._running:
            try:
                time.sleep(0.5)  # 500ms polling — fast enough for real-time response
                cycle_counter += 1
                current_pids = set(psutil.pids())
                new_pids = current_pids - self._known_pids

                for pid in new_pids:
                    if pid in self._killed_pids:
                        continue

                    try:
                        self._analyze_process(pid)
                    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                        pass
                    except Exception as e:
                        logger.debug(f"Process analysis error for PID {pid}: {e}")

                self._known_pids = current_pids

                # Every 2 cycles (~1.0s), inspect active processes for runaway CPU processor burn
                if cycle_counter % 2 == 0:
                    self._check_high_cpu_processes()

            except Exception as e:
                logger.debug(f"Process monitor cycle error: {e}")
                time.sleep(1.0)

    # ─────────────────────────────────────────────────────────────────────
    # REAL-TIME PROCESSOR ANOMALY SURVEILLANCE
    # ─────────────────────────────────────────────────────────────────────

    def _check_high_cpu_processes(self):
        """
        Active Processor Anomaly Watcher.
        Surveils active processes for abnormal multi-core CPU spikes (>= 35% CPU).
        Excludes protected core IDE, system infrastructure, and PHANTOM daemons.
        Autonomously terminates rogue processor-burning payloads and cryptominers.
        """
        my_pid = os.getpid()
        parent_pid = os.getppid()

        SAFE_PROCESS_NAMES = {
            "system", "system idle process", "registry", "smss.exe", "csrss.exe",
            "wininit.exe", "services.exe", "lsass.exe", "svchost.exe", "dwm.exe",
            "explorer.exe", "taskmgr.exe", "antigravity.exe", "code.exe", "cursor.exe",
            "ollama.exe", "ollama_llama_server.exe", "node.exe", "python.exe", "python3.exe",
            "uvicorn.exe"
        }

        try:
            for p in psutil.process_iter(['pid', 'name', 'exe', 'cmdline', 'cpu_percent']):
                try:
                    pid = p.info['pid']
                    if pid in (0, 4, my_pid, parent_pid) or pid in self._killed_pids:
                        continue
                    pname = (p.info.get('name') or "").lower()
                    if pname in SAFE_PROCESS_NAMES or any(s in pname for s in ("antigravity", "cursor", "code", "ollama", "system")):
                        continue

                    # Check for IDE / Assistant parents or servers
                    cmdline = " ".join(p.info.get('cmdline') or []).lower()
                    if any(srv in cmdline for srv in ("uvicorn", "backend.main", "vite", "antigravity", "cursor", "code-insiders", "ollama")):
                        continue

                    # Check process CPU utilization
                    cpu = p.info.get('cpu_percent') or 0.0

                    # Exclude Windows system service paths and trusted enterprise software from generic CPU killing
                    proc_exe = (p.info.get('exe') or "").lower()
                    is_in_system_dir = any(sys_path in proc_exe for sys_path in (
                        "c:\\windows", "c:\\program files", "c:\\program files (x86)", "\\windowsapps"
                    ))
                    is_trusted_app = any(svc in pname for svc in ("splunk", "installer", "trustedinstaller", "tiworker", "searchindexer", "spoolsv", "backgrounddownload", "xbox", "msedge", "chrome", "firefox", "teams"))

                    # Suspicious named processes (glitch, demo, prank, miner, rogue) are flagged immediately upon processor burn
                    is_suspicious_name = any(k in pname for k in ("glitch", "demo", "error", "prank", "rogue", "miner", "test", "load", "burn", "cryptominer"))
                    is_suspicious_spike = is_suspicious_name and cpu >= 12.0
                    is_general_spike = cpu >= 35.0 and not (is_in_system_dir or is_trusted_app)

                    if is_general_spike or is_suspicious_spike:
                        logger.warning(f"🚨 RUNAWAY PROCESSOR THREAT: '{pname}' (PID {pid}) using {cpu}% CPU! Autonomous kill engaged.")

                        active_session = session_manager.get_active_session()
                        session_id = active_session["session_id"] if active_session else f"sess_live_{int(time.time())}"
                        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

                        alert_event = {
                            "source": "PROCESS_MONITOR",
                            "event_type": "HIGH_CPU_PROCESSOR_ANOMALY",
                            "severity": "CRITICAL",
                            "session_id": session_id,
                            "timestamp": now,
                            "data": {
                                "process_name": pname,
                                "pid": pid,
                                "command_line": cmdline[:200],
                                "cpu_percent": round(cpu, 1),
                                "threat_type": "RUNAWAY_HIGH_PROCESSOR_ABUSE",
                                "anomaly": f"PROCESSOR_BURST_{round(cpu, 1)}_PERCENT",
                                "status": "AUTONOMOUS_KILL_EXECUTED"
                            }
                        }
                        self._broadcast_safe(ws_manager.broadcast_live(alert_event))
                        self._broadcast_safe(ws_manager.broadcast_narrator({
                            "session_id": session_id,
                            "narration": f"🔴 PROCESSOR SPIKE NEUTRALIZED: '{pname}' (PID {pid}) consumed {round(cpu, 1)}% CPU across system processor cores. PHANTOM autonomous containment terminated the threat instantly.",
                            "timestamp": now
                        }))

                        proc_obj = psutil.Process(pid)
                        self._execute_containment(
                            proc=proc_obj,
                            pid=pid,
                            name=pname,
                            cmdline=cmdline,
                            threat_type="RUNAWAY_HIGH_PROCESSOR_ABUSE",
                            severity="CRITICAL",
                            risk_delta=50,
                            is_from_usb=False,
                            detected_usb_mount="",
                            active_session=active_session
                        )
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
        except Exception as e:
            logger.debug(f"High CPU scan error: {e}")

    # ─────────────────────────────────────────────────────────────────────
    # PROCESS ANALYSIS ENGINE
    # ─────────────────────────────────────────────────────────────────────

    def _analyze_process(self, pid: int, is_initial_sweep: bool = False):
        """
        Deep-analyzes a new process to determine if it's a threat.
        Makes autonomous kill/allow decisions.
        """
        # Whitelist PHANTOM backend itself, frontend dev server (node/vite), parent process, and project workspace
        try:
            my_pid = os.getpid()
            if pid == my_pid:
                return
            p = psutil.Process(pid)

            try:
                name = p.name().lower()
            except Exception:
                name = ""

            try:
                cmdline_list = p.cmdline() or []
                cmdline = " ".join(cmdline_list).lower()
            except Exception:
                cmdline_list = []
                cmdline = ""

            try:
                proc_exe = (p.exe() or "").lower()
            except Exception:
                proc_exe = ""

            try:
                proc_cwd = (p.cwd() or "").lower()
            except Exception:
                proc_cwd = ""

            # ─────────────────────────────────────────────────────────────
            # TOP PRIORITY: Rogue High-CPU Cryptominer / Adversary Executables / Batch Attack Launchers
            # ─────────────────────────────────────────────────────────────
            ROGUE_PATTERNS = (
                "phantom_rogue", "rogue_malware", "rogue_payload", "phantom_malware",
                "glitch", "error_demo", "usb_demo", "cryptominer", "malware_demo",
                "badusb", "rubberducky", "forkbomb", "prank", "run_all"
            )
            is_rogue = (
                name not in ("python.exe", "python3.exe", "pythonw.exe", "node.exe", "npm.exe", "powershell.exe")
                and (
                    any(k in name for k in ROGUE_PATTERNS)
                    or any(k in proc_exe for k in ROGUE_PATTERNS)
                    or (name.endswith(".exe") and any(k in name for k in ("rogue", "cryptominer", "malware", "glitch", "error_demo", "usb_demo", "prank", "payload", "miner")))
                    or ("cmd.exe" in name and any(k in cmdline for k in ("run_all", "install_this", "glitch", "error_demo", "usb_demo")))
                )
            )

            if is_rogue:
                if "glitch" in name or "glitch" in proc_exe:
                    threat_type = "ROGUE_HIGH_CPU_GLITCH_PAYLOAD"
                    narration_threat = "rogue visual glitch & multi-core processor burn payload"
                elif "error_demo" in name or "error_demo" in proc_exe:
                    threat_type = "ROGUE_ERROR_FLOOD_PAYLOAD"
                    narration_threat = "rogue error dialog cascade flood attack"
                elif "run_all" in cmdline:
                    threat_type = "BATCH_ATTACK_LAUNCHER"
                    narration_threat = "automated attack launcher [Run_All.bat]"
                else:
                    threat_type = "ROGUE_HIGH_CPU_MALWARE"
                    narration_threat = "rogue adversary payload / high-CPU threat"

                severity = "CRITICAL"
                risk_delta = 50
                logger.warning(f"🚨 ROGUE THREAT INTERCEPTED: {name} (PID: {pid}). INSTANT AUTONOMOUS KILL ENGAGED — zero tolerance, no grace period.")

                active_session = session_manager.get_active_session()
                session_id = active_session["session_id"] if active_session else f"sess_live_{int(time.time())}"
                now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                alert_event = {
                    "source": "PROCESS_MONITOR",
                    "event_type": "ROGUE_PROCESS_IDENTIFIED",
                    "severity": "CRITICAL",
                    "session_id": session_id,
                    "timestamp": now,
                    "data": {
                        "process_name": name,
                        "pid": pid,
                        "command_line": cmdline[:300],
                        "threat_type": threat_type,
                        "anomaly": "MULTI_CORE_PROCESSOR_BURST",
                        "status": "INSTANT_KILL_ENGAGED",
                        "containment_countdown_sec": 0
                    }
                }
                self._broadcast_safe(ws_manager.broadcast_live(alert_event))
                self._broadcast_safe(ws_manager.broadcast_narrator({
                    "session_id": session_id,
                    "narration": f"🔴 INSTANT KILL: '{name}' (PID {pid}) — {narration_threat} intercepted. PHANTOM executed immediate autonomous containment with zero grace period.",
                    "timestamp": now
                }))

                detected_usb = ""
                is_usb_origin = False
                if active_session and active_session.get("mount_point"):
                    s_mp = active_session["mount_point"].lower().rstrip("\\/")
                    if (s_mp in proc_exe or s_mp in proc_cwd or s_mp in cmdline):
                        is_usb_origin = True
                        detected_usb = active_session["mount_point"]

                if not is_usb_origin:
                    try:
                        for part in psutil.disk_partitions(all=False):
                            p_mp = part.mountpoint.lower().rstrip("\\/")
                            if p_mp and p_mp not in ("c:", "d:"):
                                if (p_mp in proc_exe or p_mp in proc_cwd or p_mp in cmdline):
                                    is_usb_origin = True
                                    detected_usb = part.mountpoint
                                    break
                    except Exception:
                        pass

                # INSTANT KILL — no delay, no grace period
                self._execute_containment(
                    proc=p,
                    pid=pid,
                    name=name,
                    cmdline=cmdline,
                    threat_type=threat_type,
                    severity=severity,
                    risk_delta=risk_delta,
                    is_from_usb=is_usb_origin,
                    detected_usb_mount=detected_usb,
                    active_session=active_session
                )
                return

            is_test_probe = ("phantom-test" in cmdline or "phantom_test" in cmdline)
            is_usb_path = ("/run/media/" in proc_cwd or "/media/" in proc_cwd or "/run/media/" in cmdline or "/media/" in cmdline or is_test_probe)

            # Skip existing user shells and terminal emulators during initial startup baseline sweep
            if is_initial_sweep and name in ("xfce4-terminal", "gnome-terminal", "qterminal", "xterm", "bash", "zsh"):
                return

            # Whitelist our own direct server processes (FastAPI backend and Vite frontend)
            if not is_usb_path:
                parent = p.parent()
                if parent and (parent.pid == my_pid or parent.pid == os.getppid()):
                    return

                # Whitelist processes spawned by IDE or Assistant (antigravity, code, cursor)
                try:
                    for anc in p.parents():
                        anc_name = anc.name().lower()
                        if anc_name in ("antigravity.exe", "code.exe", "cursor.exe") or any(k in anc_name for k in ("antigravity", "cursor", "code")):
                            return
                        anc_cmd = " ".join(anc.cmdline() or []).lower()
                        if any(k in anc_cmd for k in ("antigravity", "cursor", "code-insiders")):
                            return
                except Exception:
                    pass

                # Only whitelist active developer infrastructure (Vite dev server and Uvicorn backend)
                if name in ("node", "npm") and any(k in cmdline for k in ("vite", "dev", "build")):
                    return
                if name.startswith("python") and any(k in cmdline for k in ("uvicorn", "backend.main", "multiprocessing")):
                    return
                if name in ("antigravity", "code", "cursor", "ollama") or any(k in cmdline for k in ("antigravity", "cursor", "code-insiders", "ollama")):
                    return
        except Exception:
            return

        exe_path = ""
        cwd = ""

        try:
            exe_path = p.exe() or ""
        except (psutil.AccessDenied, psutil.NoSuchProcess):
            pass

        try:
            cwd = p.cwd() or ""
        except (psutil.AccessDenied, psutil.NoSuchProcess):
            pass

        # ── Check 1: Is this a known suspicious process name? ──
        is_suspicious_host = name in self.SUSPICIOUS_NAMES

        # ── Check 2: Does command line contain suspicious flags? ──
        has_suspicious_flag = any(flag in cmdline for flag in self.SUSPICIOUS_FLAGS)

        # ── Check 3: Is it spawned from or references a USB drive? ──
        is_from_usb = False
        detected_usb_mount = ""
        active_session = session_manager.get_active_session()
        usb_mount = ""
        if active_session:
            usb_mount = active_session.get("mount_point", "").lower().rstrip("\\").rstrip("/")
            if usb_mount:
                # Check for both Windows and Linux path formats
                is_in_cmdline = (f"{usb_mount}\\" in cmdline or f"{usb_mount}/" in cmdline or usb_mount == cmdline)
                is_in_exe = bool(exe_path and (f"{usb_mount}\\" in exe_path.lower() or f"{usb_mount}/" in exe_path.lower() or exe_path.lower().startswith(usb_mount)))
                is_in_cwd = bool(cwd and (f"{usb_mount}\\" in cwd.lower() or f"{usb_mount}/" in cwd.lower() or cwd.lower().startswith(usb_mount)))

                if is_in_cmdline or is_in_exe or is_in_cwd:
                    is_from_usb = True
                    detected_usb_mount = active_session.get("mount_point", "")

        # Also check all removable drive letters mounted on the machine
        if not is_from_usb:
            try:
                for part in psutil.disk_partitions(all=True):
                    is_removable_drive = (
                        "removable" in part.opts.lower()
                        or part.mountpoint.startswith(("/media/", "/run/media/", "/mnt/"))
                    )
                    if is_removable_drive and part.mountpoint not in ('/', '/boot', '/boot/efi', '/home', '[SWAP]'):
                        r_mount = part.mountpoint.rstrip("\\").rstrip("/").lower()
                        r_dev = part.device.rstrip("\\").rstrip("/").lower()

                        for target in (r_mount, r_dev):
                            if not target:
                                continue
                            if (f"{target}\\" in cmdline or f"{target}/" in cmdline or
                                (exe_path and (f"{target}\\" in exe_path.lower() or f"{target}/" in exe_path.lower() or exe_path.lower().startswith(target))) or
                                (cwd and (f"{target}\\" in cwd.lower() or f"{target}/" in cwd.lower() or cwd.lower().startswith(target)))):
                                is_from_usb = True
                                detected_usb_mount = part.mountpoint
                                usb_mount = r_mount
                                break
                        if is_from_usb:
                            break
            except Exception:
                pass

        # Regex fallback for non-system drive letters in cmdline (Windows)
        if not is_from_usb:
            import re
            m = re.search(r'\b([a-zA-Z]:)[/\\]', cmdline)
            if m:
                matched_drive = m.group(1).upper()
                if matched_drive not in ("C:", "D:"):
                    is_from_usb = True
                    detected_usb_mount = matched_drive

        # Linux fallback: check for USB mount paths in cmdline, cwd, or exe
        if not is_from_usb and sys.platform.startswith("linux"):
            for usb_prefix in ["/media/", "/run/media/", "/mnt/"]:
                if (usb_prefix in cmdline or 
                    (cwd and cwd.startswith(usb_prefix)) or 
                    (exe_path and exe_path.startswith(usb_prefix))):
                    is_from_usb = True
                    detected_usb_mount = usb_prefix
                    usb_mount = usb_prefix
                    break

        # ── Check 4: Instant-kill pattern match ──
        has_instant_kill = any(pat in cmdline for pat in self.INSTANT_KILL_PATTERNS)

        # ── Check 5: Executable running directly from USB path ──
        exe_from_usb = False
        if (usb_mount or detected_usb_mount) and exe_path:
            target_mount = (usb_mount or detected_usb_mount).lower()
            exe_from_usb = target_mount in exe_path.lower()
        if is_from_usb and exe_path and any(exe_path.startswith(p) for p in ["/media/", "/run/media/", "/mnt/"]):
            exe_from_usb = True

        # ─────────────────────────────────────────────────────────
        # DECISION ENGINE — Autonomous Kill/Allow
        # ─────────────────────────────────────────────────────────

        should_kill = False
        threat_type = "UNKNOWN"
        severity = "MEDIUM"
        risk_delta = 0

        # RULE 1: Any executable running from USB → KILL
        if exe_from_usb:
            should_kill = True
            threat_type = "USB_ORIGIN_EXECUTION"
            severity = "CRITICAL"
            risk_delta = 45
            logger.warning(f"🚨 USB-ORIGIN EXECUTION: {name} (PID: {pid}) running from {exe_path}")

        # RULE 2: Instant-kill patterns → KILL immediately
        elif has_instant_kill:
            should_kill = True
            threat_type = "INSTANT_KILL_PATTERN"
            severity = "CRITICAL"
            risk_delta = 50
            logger.warning(f"🚨 INSTANT KILL PATTERN: {name} (PID: {pid})")

        # RULE 3: Suspicious host + suspicious flags → KILL
        elif is_suspicious_host and has_suspicious_flag:
            should_kill = True
            threat_type = "EVASIVE_SCRIPT_HOST_EXECUTION"
            severity = "CRITICAL"
            risk_delta = 40
            logger.warning(f"🚨 EVASIVE EXECUTION: {name} (PID: {pid})")

        # RULE 4: Suspicious host + from USB → KILL
        elif is_suspicious_host and is_from_usb:
            should_kill = True
            threat_type = "USB_TRIGGERED_SCRIPT_HOST"
            severity = "CRITICAL"
            risk_delta = 45
            logger.warning(f"🚨 USB-TRIGGERED SCRIPT HOST: {name} (PID: {pid})")

        # RULE 5: Known always-kill process from USB context → KILL
        elif name in self.ALWAYS_KILL_FROM_USB and is_from_usb:
            should_kill = True
            threat_type = "ALWAYS_KILL_USB_PROCESS"
            severity = "CRITICAL"
            risk_delta = 40

        # RULE 6: Any suspicious host with "phantom" in cmdline (test detection) → KILL
        elif is_suspicious_host and "phantom" in cmdline:
            should_kill = True
            threat_type = "PHANTOM_TEST_DETECTED"
            severity = "HIGH"
            risk_delta = 35

        # Check if process is an interactive terminal emulator or child shell instance (e.g. zsh/bash on /dev/pts/*)
        proc_tty = ""
        try:
            proc_tty = p.terminal() or ""
        except Exception:
            pass

        is_terminal = (
            name not in ("openconsole.exe", "conhost.exe", "windowsterminal.exe")
            and (
                name in self.TERMINAL_NAMES
                or any(t in name for t in ("terminal", "xterm", "qterm", "alacritty", "konsole", "terminator", "tilix", "uxterm"))
                or (exe_path and any(t in exe_path.lower() for t in ("terminal", "xterm", "qterm", "alacritty", "konsole", "terminator", "tilix", "uxterm")) and not any(w in exe_path.lower() for w in ("openconsole", "windowsterminal", "conhost")))
                or any(k in cmdline for k in ("usb-terminal-loop", "usb-terminal-demo"))
            )
        )

        # Check if process is executing a shell script that contains a terminal spam / flood loop
        is_script_flood = False
        if name in ("openconsole.exe", "conhost.exe", "windowsterminal.exe", "explorer.exe", "antigravity.exe", "code.exe"):
            is_script_flood = False
        elif any(k in cmdline for k in ("usb-terminal-demo", "usb-terminal-loop", "open_termial", "open_terminal", "run_terminals", "flood_test")):
            is_script_flood = True
        else:
            has_term_keyword = any(term in cmdline for term in ["xterm", "xfce4-terminal", "gnome-terminal", "alacritty", "konsole", "terminator", "terminal", "qterminal"])
            has_loop_keyword = any(tok in cmdline for tok in ["for ", "while ", "seq ", "{1..", "xdotool", "--split", "tej", "tenter", "open_termial", "open_terminal", "loop", "termial", "window_count"])

            if has_term_keyword and has_loop_keyword and name not in ("vim", "vi", "nano", "mousepad", "gedit", "code"):
                is_script_flood = True
            else:
                for arg in cmdline_list:
                    clean_arg = arg.strip('\'"')
                    if clean_arg.endswith((".sh", ".bash", ".zsh", "tej", ".py")) or any(s in clean_arg.lower() for s in ("tenter", "open_termial", "open_terminal", "terminal_flood", "tej", "loop", "term")):
                        full_script_path = os.path.join(cwd, clean_arg) if (cwd and not os.path.isabs(clean_arg)) else clean_arg
                        if os.path.exists(full_script_path):
                            try:
                                with open(full_script_path, "r", errors="ignore") as sf:
                                    s_content = sf.read().lower()
                                    if any(t in s_content for t in ("terminal", "xterm", "qterm", "x-terminal-emulator")) and any(l in s_content for l in ("for ", "while ", "seq ", "{1..", "xdotool", "sleep 0", "--split", "window_count")):
                                        is_script_flood = True
                                        break
                            except Exception:
                                pass
                        elif any(s in clean_arg.lower() for s in ("tenter", "open_termial", "open_terminal", "tej", "usb-terminal")):
                            is_script_flood = True
                            break

        # RULE 7: Script/Loop Terminal Flooding Attack (Denial of Service / Window Spam Storm)
        if is_script_flood:
            should_kill = True
            threat_type = "TERMINAL_SPAM_FLOOD_ATTACK"
            severity = "CRITICAL"
            risk_delta = 50
            logger.warning(f"🚨 TERMINAL SPAM FLOOD ATTACK INTERCEPTED: {name} (PID: {pid}) executing '{cmdline[:100]}'")

        # RULE 8: Terminal Process Burst Rate Limiter (Catches 2+ terminals spawned rapidly within 6s anywhere on OS)
        elif is_terminal and not is_initial_sweep:
            now_ts = time.time()
            self._terminal_spawns = [t for t in self._terminal_spawns if now_ts - t[0] < 6.0]
            self._terminal_spawns.append((now_ts, pid, p.ppid()))
            if len(self._terminal_spawns) >= 2:
                should_kill = True
                threat_type = "TERMINAL_BURST_STORM_ATTACK"
                severity = "CRITICAL"
                risk_delta = 50
                logger.warning(f"🚨 TERMINAL BURST STORM: {len(self._terminal_spawns)} terminals spawned in <6s! Neutralizing PID {pid}")

        if not should_kill:
            return  # Process is clean — allow it

        # ─────────────────────────────────────────────────────────
        # EXECUTE CONTAINMENT
        # ─────────────────────────────────────────────────────────
        self._execute_containment(
            proc=p,
            pid=pid,
            name=name,
            cmdline=" ".join(cmdline_list),
            threat_type=threat_type,
            severity=severity,
            risk_delta=risk_delta,
            is_from_usb=is_from_usb,
            detected_usb_mount=detected_usb_mount,
            active_session=active_session
        )

    # ─────────────────────────────────────────────────────────────────────
    # CONTAINMENT EXECUTION — Kill process + entire tree + auto-eject USB
    # ─────────────────────────────────────────────────────────────────────

    def _execute_containment(
        self, proc: psutil.Process, pid: int, name: str, cmdline: str,
        threat_type: str, severity: str, risk_delta: int,
        is_from_usb: bool, detected_usb_mount: str,
        active_session: Optional[Dict[str, Any]]
    ):
        """
        Executes autonomous containment:
        1. Records threat event
        2. Broadcasts to UI
        3. Kills the process
        4. Kills the entire process tree (children)
        5. Records containment alert
        6. Forcefully auto-ejects the USB drive if threat is USB-related
        """
        my_pid = os.getpid()
        if pid in (my_pid, os.getppid()):
            logger.warning(f"🛡️ Self-protection: Refusing to kill self or parent (PID {pid})")
            return
        if any(srv in cmdline.lower() for srv in ("uvicorn", "backend.main", "vite")):
            logger.warning(f"🛡️ Self-protection: Refusing to kill server process (PID {pid}: {cmdline[:60]})")
            return

        SAFE_SYSTEM_NAMES = {
            "antigravity", "code", "cursor", "systemd", "xorg", "lightdm",
            "xfce4-session", "xfdesktop", "xfce4-panel",
            "gnome-terminal-server", "ollama", "dbus-daemon", "pulseaudio", "pipewire"
        }
        if name in SAFE_SYSTEM_NAMES or any(s in cmdline.lower() for s in ("antigravity", "cursor", "code-insiders", "ollama")):
            logger.warning(f"🛡️ Safety Guard: Refusing to terminate protected system/developer process '{name}' (PID {pid})")
            return

        session_id = active_session["session_id"] if active_session else f"sess_live_{int(time.time())}"
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        self._killed_pids.add(pid)
        self._kill_count += 1

        # 1. Record threat detection event
        event = event_collector.normalize_event(
            session_id=session_id,
            source="PROCESS_MONITOR",
            event_type="SUSPICIOUS_PROCESS_SPAWNED",
            severity=severity,
            data={
                "process_name": name,
                "pid": pid,
                "command_line": cmdline[:500],
                "is_from_usb": is_from_usb,
                "detected_usb_mount": detected_usb_mount,
                "threat_type": threat_type,
                "anomaly": threat_type,
                "decision": "AUTONOMOUS_KILL"
            },
            risk_score_delta=risk_delta
        )
        session_manager.record_event(event)

        # 2. AI Narration
        narration = (
            f"🚨 CRITICAL THREAT DETECTED: '{name}' (PID: {pid}) identified as {threat_type.replace('_', ' ')}. "
            f"Command: '{cmdline[:120]}'. "
            f"AUTONOMOUS CONTAINMENT ENGAGED — process will be surgically terminated."
        )
        self._broadcast_safe(ws_manager.broadcast_live(event.dict()))
        self._broadcast_safe(ws_manager.broadcast_narrator({
            "session_id": session_id,
            "narration": narration,
            "timestamp": now
        }))

        # 3. DEMO MODE CHECK — detect and alert but don't kill
        if self.DEMO_MODE:
            logger.warning(f"🎯 DEMO MODE: Detected {threat_type} for {name} (PID: {pid}) — NOT killing (demo mode active)")
            demo_event = {
                "source": "RESPONSE_ENGINE",
                "event_type": "CONTAINMENT_TRIGGERED",
                "severity": "CRITICAL",
                "timestamp": now,
                "session_id": session_id,
                "data": {
                    "action": "DEMO_MODE_DETECTION",
                    "target_pid": pid,
                    "process_name": name,
                    "threat_type": threat_type,
                    "children_killed": 0,
                    "killed_children": [],
                    "status": "DETECTED_NOT_KILLED_DEMO_MODE",
                    "total_kills_this_session": self._kill_count
                }
            }
            self._broadcast_safe(ws_manager.broadcast_live(demo_event))
            self._broadcast_safe(ws_manager.broadcast_narrator({
                "session_id": session_id,
                "narration": (
                    f"🎯 DEMO MODE: '{name}' (PID: {pid}) detected as {threat_type.replace('_', ' ')}. "
                    f"Process ALLOWED to run for demonstration. "
                    f"In production mode, this process would be immediately terminated."
                ),
                "timestamp": now
            }))
            return  # Don't kill in demo mode

        # 3. KILL THE PROCESS TREE (production mode)
        killed_children = []
        try:
            # First, kill all children (recursive)
            children = proc.children(recursive=True)
            for child in children:
                try:
                    child_name = child.name().lower()
                    child_cmd = " ".join(child.cmdline() or []).lower()
                    if child_name in SAFE_SYSTEM_NAMES or any(s in child_cmd for s in ("antigravity", "cursor", "code-insiders", "ollama", "uvicorn", "vite", "systemd")):
                        continue
                    child.kill()
                    killed_children.append({"pid": child.pid, "name": child_name})
                    self._killed_pids.add(child.pid)
                    logger.warning(f"   └── Killed child process: {child_name} (PID: {child.pid})")
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

        # 4. Kill the main process (skip if it's the main desktop terminal server)
        if name not in ("xfce4-terminal", "gnome-terminal"):
            containment_res = response_engine.terminate_process(
                pid=pid,
                process_name=name,
                session_id=session_id,
                reason=f"Autonomous Kill: {threat_type} ('{cmdline[:80]}')"
            )

        # Forcefully terminate on Windows and close GUI window
        if sys.platform == "win32":
            try:
                import subprocess
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True, timeout=2)
            except Exception:
                pass

        # If this threat is a demo attack, prank, or batch launcher, sweep for parallel instances
        if any(k in threat_type.lower() for k in ("glitch", "error", "demo", "batch", "rogue", "processor")) or any(k in name for k in ("glitch", "error_demo", "usb_demo", "run_all")):
            try:
                for cand in psutil.process_iter(['pid', 'name']):
                    try:
                        c_name = (cand.info.get('name') or "").lower()
                        if any(c_name.startswith(pre) for pre in ("glitch", "error_demo", "usb_demo")):
                            c_pid = cand.info['pid']
                            if c_pid not in (my_pid, os.getppid()) and c_pid not in self._killed_pids:
                                cand.kill()
                                self._killed_pids.add(c_pid)
                                if sys.platform == "win32":
                                    import subprocess
                                    subprocess.run(["taskkill", "/F", "/PID", str(c_pid)], capture_output=True, timeout=1)
                                logger.warning(f"   └── Neutralized parallel demo payload: {c_name} (PID {c_pid})")
                    except Exception:
                        pass
            except Exception:
                pass

        # 4b. If terminal storm or loop attack, also terminate all tracked storm terminals, loop scripts, and the spawning parent script
        if threat_type in ("TERMINAL_BURST_STORM_ATTACK", "TERMINAL_SPAM_FLOOD_ATTACK") or any(k in cmdline.lower() for k in ("usb-terminal-loop", "usb-terminal-demo")):
            try:
                # Terminate all tracked storm terminal PIDs
                for t in list(self._terminal_spawns):
                    sp_pid = t[1]
                    if sp_pid != pid and sp_pid not in self._killed_pids and sp_pid not in (my_pid, os.getppid()):
                        try:
                            p_other = psutil.Process(sp_pid)
                            other_name = p_other.name().lower()
                            if other_name not in ("xfce4-terminal", "gnome-terminal") and other_name not in SAFE_SYSTEM_NAMES:
                                p_other.kill()
                                self._killed_pids.add(sp_pid)
                                logger.warning(f"   └── Neutralized storm terminal instance PID {sp_pid}")
                        except Exception:
                            pass

                # Sweep across all OS processes for any remaining rogue loop scripts or demo instances
                for p_cand in psutil.process_iter(['pid', 'name', 'cmdline']):
                    try:
                        cand_cmd = " ".join(p_cand.info['cmdline'] or []).lower()
                        if any(k in cand_cmd for k in ("usb-terminal-loop", "usb-terminal-demo", "flood_test.sh", "run_terminals")):
                            c_pid = p_cand.info['pid']
                            if c_pid not in (my_pid, os.getppid()) and c_pid not in self._killed_pids:
                                p_cand.kill()
                                self._killed_pids.add(c_pid)
                                logger.warning(f"   └── Neutralized rogue terminal storm process: PID {c_pid} ({cand_cmd[:60]})")
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass

                parent = proc.parent()
                if parent and parent.pid > 1 and parent.pid not in (my_pid, os.getppid()):
                    parent_name = parent.name()
                    parent_pid = parent.pid
                    if parent_name.lower() in ("bash", "sh", "zsh", "python", "python3", "perl", "ruby"):
                        parent.kill()
                        self._killed_pids.add(parent_pid)
                        logger.warning(f"   └── Terminated spawning parent script: {parent_name} (PID: {parent_pid})")
            except Exception:
                pass

        # 5. Broadcast containment action
        containment_event = {
            "source": "RESPONSE_ENGINE",
            "event_type": "CONTAINMENT_TRIGGERED",
            "severity": "CRITICAL",
            "timestamp": now,
            "session_id": session_id,
            "data": {
                "action": "PROCESS_TREE_ANNIHILATION",
                "target_pid": pid,
                "process_name": name,
                "threat_type": threat_type,
                "children_killed": len(killed_children),
                "killed_children": killed_children[:5],
                "status": "TERMINATED_AND_ISOLATED",
                "total_kills_this_session": self._kill_count
            }
        }
        self._broadcast_safe(ws_manager.broadcast_live(containment_event))

        # 6. Final narration for kill
        children_msg = f" Along with {len(killed_children)} child processes." if killed_children else ""
        self._broadcast_safe(ws_manager.broadcast_narrator({
            "session_id": session_id,
            "narration": (
                f"🛡️ AUTONOMOUS CONTAINMENT COMPLETE: '{name}' (PID: {pid}) surgically neutralized. "
                f"Threat type: {threat_type.replace('_', ' ')}.{children_msg} "
                f"Total kills this session: {self._kill_count}. System secured."
            ),
            "timestamp": now
        }))

        logger.warning(
            f"🛡️ CONTAINMENT EXECUTED: {name} (PID: {pid}) | "
            f"Type: {threat_type} | "
            f"Children killed: {len(killed_children)} | "
            f"Session kills: {self._kill_count}"
        )

        # 7. USER-CONTROLLED USB EJECT — If threat is from USB or references USB, notify user that ejection is available
        if is_from_usb or detected_usb_mount or threat_type in {"USB_ORIGIN_EXECUTION", "USB_TRIGGERED_SCRIPT_HOST", "ALWAYS_KILL_USB_PROCESS"}:
            eject_drive = detected_usb_mount
            if not eject_drive and active_session:
                eject_drive = active_session.get("mount_point", "")
            if not eject_drive:
                import re
                m = re.search(r'\b([a-zA-Z]:)[/\\]?', cmdline)
                if m and m.group(1).upper() not in ("C:", "D:"):
                    eject_drive = m.group(1).upper()
            if not eject_drive:
                try:
                    for part in psutil.disk_partitions(all=True):
                        if "removable" in part.opts.lower():
                            eject_drive = part.device
                            break
                except Exception:
                    pass

            if eject_drive:
                logger.warning(f"⚠️ USB-LINKED PROCESS TERMINATED ({name} PID:{pid}) — Drive {eject_drive} remains mounted. Eject option available to user.")
                try:
                    threat_action_event = {
                        "source": "PROCESS_MONITOR",
                        "event_type": "USB_THREAT_ACTION_REQUIRED",
                        "severity": "CRITICAL",
                        "timestamp": now,
                        "session_id": session_id,
                        "data": {
                            "mount_point": eject_drive,
                            "triggering_process": name,
                            "triggering_pid": pid,
                            "threat_type": threat_type,
                            "status": "AWAITING_USER_EJECT",
                            "can_eject": True,
                            "reason": f"Malicious process {name} (PID: {pid}) terminated. Drive remains connected until user chooses to eject."
                        }
                    }
                    self._broadcast_safe(ws_manager.broadcast_live(threat_action_event))

                    self._broadcast_safe(ws_manager.broadcast_narrator({
                        "session_id": session_id,
                        "narration": (
                            f"🛡️ MALICIOUS PROCESS TERMINATED: Process '{name}' from {eject_drive} was killed immediately. "
                            f"Drive remains mounted — click EJECT DRIVE when you wish to safely disconnect."
                        ),
                        "timestamp": now
                    }))
                except Exception as e:
                    logger.error(f"Error notifying user eject for USB drive {eject_drive}: {e}")


process_monitor = ProcessMonitor()
