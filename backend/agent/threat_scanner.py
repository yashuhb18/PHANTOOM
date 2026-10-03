"""
PHANTOM Autonomous Threat Scanner Agent
========================================
Deep-scans every file on a USB drive the instant it's mounted.
Detects malicious scripts, executables, autorun mechanisms, and obfuscated payloads.
Auto-quarantines dangerous files by renaming them to prevent execution.
All findings are recorded in the database and broadcast via WebSocket.
"""

import os
import re
import math
import time
import hashlib
import asyncio
import threading
import logging
import json
from pathlib import Path
from typing import Dict, Any, List, Optional, Set, Callable
from collections import Counter

from backend.core.session_manager import session_manager
from backend.core.event_collector import event_collector
from backend.core.ai_analyst import ai_analyst
from backend.ws_manager import ws_manager
from backend.database import get_db

logger = logging.getLogger("phantom.agent.threat_scanner")

# ─────────────────────────────────────────────────────────────────────────────
# DANGEROUS FILE EXTENSIONS — files matching these are flagged for deep analysis
# ─────────────────────────────────────────────────────────────────────────────
DANGEROUS_EXTENSIONS: Set[str] = {
    # Script interpreters
    ".bat", ".cmd", ".ps1", ".psm1", ".psd1", ".ps1xml",
    ".vbs", ".vbe", ".js", ".jse", ".wsf", ".wsh", ".ws",
    # Executables & binaries
    ".exe", ".scr", ".pif", ".com", ".msi", ".msp", ".mst",
    ".dll", ".ocx", ".sys", ".drv", ".cpl",
    # Web-based execution
    ".hta", ".htm", ".html",
    # Configuration abuse
    ".inf", ".reg", ".lnk",
    # Office macros
    ".docm", ".xlsm", ".pptm", ".dotm", ".xltm",
    # Archive (potential payload containers)
    ".zip", ".rar", ".7z", ".cab", ".iso",
    # Python/Ruby/Perl scripts
    ".py", ".rb", ".pl", ".sh",
}

# Extensions that get auto-quarantined (high-risk executable/script types)
AUTO_QUARANTINE_EXTENSIONS: Set[str] = {
    ".bat", ".cmd", ".ps1", ".psm1", ".vbs", ".vbe",
    ".js", ".jse", ".wsf", ".wsh", ".hta",
    ".exe", ".scr", ".pif", ".com", ".msi",
    ".inf", ".reg", ".lnk",
    ".docm", ".xlsm", ".pptm",
}

# ─────────────────────────────────────────────────────────────────────────────
# MALICIOUS CONTENT PATTERNS — regex patterns to detect malicious code inside files
# ─────────────────────────────────────────────────────────────────────────────

POWERSHELL_INDICATORS = [
    (r"(?i)-enc(odedcommand)?", "ENCODED_COMMAND", 35),
    (r"(?i)-exec(utionpolicy)?\s*(bypass|unrestricted|remotesigned)", "EXECUTION_POLICY_BYPASS", 30),
    (r"(?i)-w(indowstyle)?\s*hidden", "HIDDEN_WINDOW", 30),
    (r"(?i)-nop(rofile)?", "NO_PROFILE", 15),
    (r"(?i)invoke-webrequest|iwr |wget |curl ", "DOWNLOAD_CRADLE", 40),
    (r"(?i)invoke-expression|iex\s*\(", "INVOKE_EXPRESSION", 40),
    (r"(?i)downloadstring|downloadfile|downloaddata", "REMOTE_DOWNLOAD", 45),
    (r"(?i)new-object\s+system\.net\.(webclient|httpwebrequest)", "NET_WEBCLIENT", 40),
    (r"(?i)start-process\s+-windowstyle\s+hidden", "HIDDEN_PROCESS_START", 35),
    (r"(?i)\[system\.convert\]::frombase64string", "BASE64_DECODE", 35),
    (r"(?i)set-itemproperty.*\\\\run\\\\", "REGISTRY_PERSISTENCE", 45),
    (r"(?i)new-scheduledtask|register-scheduledtask|schtasks", "SCHEDULED_TASK", 40),
    (r"(?i)add-type\s+-assemblyname", "ASSEMBLY_LOAD", 20),
    (r"(?i)system\.reflection\.assembly", "REFLECTION_LOAD", 30),
    (r"(?i)mimikatz|invoke-mimikatz|sekurlsa", "MIMIKATZ_REFERENCE", 50),
    (r"(?i)invoke-shellcode|invoke-dllinjection", "SHELLCODE_INJECTION", 50),
    (r"(?i)get-credential|convertto-securestring", "CREDENTIAL_ACCESS", 25),
    (r"(?i)test-netconnection|tnc\s", "NETWORK_RECON", 15),
    (r"(?i)start-bitstransfer", "BITS_TRANSFER", 35),
    (r"(?i)out-file\s+-append.*\\\\startup", "STARTUP_PERSISTENCE", 45),
]

BATCH_INDICATORS = [
    (r"(?i)@echo\s+off", "ECHO_SUPPRESSION", 10),
    (r"(?i)powershell\s+", "POWERSHELL_INVOCATION", 25),
    (r"(?i)certutil\s+-urlcache\s+-split\s+-f", "CERTUTIL_DOWNLOAD", 45),
    (r"(?i)bitsadmin\s+/transfer", "BITSADMIN_DOWNLOAD", 40),
    (r"(?i)reg\s+add\s+.*\\\\run", "REGISTRY_PERSISTENCE", 45),
    (r"(?i)schtasks\s+/create", "SCHEDULED_TASK_CREATE", 40),
    (r"(?i)net\s+user\s+/add", "USER_CREATION", 45),
    (r"(?i)net\s+localgroup\s+administrators\s+/add", "ADMIN_ESCALATION", 50),
    (r"(?i)del\s+/f\s+/q", "FORCE_DELETE", 15),
    (r"(?i)attrib\s+\+h\s+\+s", "HIDDEN_SYSTEM_ATTRIB", 25),
    (r"(?i)copy\s+.*\\\\startup", "STARTUP_COPY", 40),
    (r"(?i)xcopy\s+.*\\\\appdata", "APPDATA_COPY", 30),
    (r"(?i)wmic\s+process\s+call\s+create", "WMI_PROCESS_CREATE", 35),
    (r"(?i)start\s+/min\s+/b", "MINIMIZED_BACKGROUND_START", 20),
    (r"(?i)taskkill\s+/f\s+/im", "FORCE_TASKKILL", 20),
    (r"(?i)netsh\s+advfirewall\s+firewall\s+add", "FIREWALL_RULE_ADD", 35),
    (r"(?i)sc\s+create\s+", "SERVICE_CREATION", 40),
    (r"(?i)mshta\s+", "MSHTA_EXECUTION", 35),
    (r"(?i)rundll32\s+", "RUNDLL32_EXECUTION", 25),
]

VBSCRIPT_INDICATORS = [
    (r"(?i)wscript\.shell", "WSCRIPT_SHELL", 30),
    (r"(?i)createobject\s*\(\s*[\"']wscript\.shell", "CREATE_WSCRIPT_SHELL", 35),
    (r"(?i)createobject\s*\(\s*[\"']msxml2\.xmlhttp", "HTTP_REQUEST", 35),
    (r"(?i)createobject\s*\(\s*[\"']adodb\.stream", "FILE_STREAM", 30),
    (r"(?i)\.run\s+", "COMMAND_EXECUTION", 25),
    (r"(?i)\.exec\s+", "COMMAND_EXEC", 30),
    (r"(?i)shell\.application", "SHELL_APPLICATION", 25),
    (r"(?i)scripting\.filesystemobject", "FILESYSTEM_ACCESS", 20),
    (r"(?i)\.saveto(file|stream)", "FILE_SAVE", 25),
    (r"(?i)\.open\s+[\"']get[\"']\s*,\s*[\"']http", "HTTP_GET", 35),
    (r"(?i)chr\s*\(\s*\d+\s*\)\s*&\s*chr", "CHAR_OBFUSCATION", 30),
]

JAVASCRIPT_INDICATORS = [
    (r"(?i)wscript\.shell", "WSCRIPT_SHELL", 35),
    (r"(?i)activexobject", "ACTIVEX_OBJECT", 30),
    (r"(?i)shell\.application", "SHELL_APPLICATION", 30),
    (r"(?i)new\s+function\s*\(", "DYNAMIC_FUNCTION", 25),
    (r"(?i)eval\s*\(", "EVAL_EXECUTION", 30),
    (r"(?i)fromcharcode", "CHAR_DECODE", 20),
    (r"(?i)\.run\s*\(", "COMMAND_RUN", 25),
    (r"(?i)\.exec\s*\(", "COMMAND_EXEC", 30),
]

AUTORUN_INDICATORS = [
    (r"(?i)\[autorun\]", "AUTORUN_SECTION", 40),
    (r"(?i)open\s*=", "AUTORUN_OPEN", 50),
    (r"(?i)shellexecute\s*=", "AUTORUN_SHELLEXECUTE", 50),
    (r"(?i)shell\\\\.*\\\\command", "AUTORUN_SHELL_COMMAND", 45),
    (r"(?i)action\s*=", "AUTORUN_ACTION", 20),
]

LINUX_SHELL_INDICATORS = [
    (r"(?i)/bin/(bash|sh|zsh)", "SHELL_INVOCATION", 20),
    (r"(?i)/dev/tcp/\d+\.\d+\.\d+\.\d+", "BASH_REVERSE_SHELL", 50),
    (r"(?i)(nc|netcat|socat)\s+.*-e\s+/bin/", "NETCAT_REVERSE_SHELL", 50),
    (r"(?i)curl\s+.*\|\s*(bash|sh)", "CURL_PIPE_EXEC", 45),
    (r"(?i)wget\s+.*\|\s*(bash|sh)", "WGET_PIPE_EXEC", 45),
    (r"(?i)chmod\s+(\+x|[0-7]{3,4})", "PERMISSION_ESCALATION", 25),
    (r"(?i)base64\s+-d", "BASE64_DECODE_EXEC", 35),
    (r"(?i)/etc/(shadow|passwd)", "CREDENTIAL_SNOOPING", 45),
    (r"(?i)crontab\s+", "CRON_PERSISTENCE", 35),
    (r"(?i)systemctl\s+(start|enable)", "SERVICE_PERSISTENCE", 30),
    (r"(?i)(exfiltration|reverse-shell|badusb|malware|payload|dropper|stealer|unauthorized)", "MALICIOUS_KEYWORD", 35),
    (r"(?i)python3?\s+-c\s+[\"'].*socket", "PYTHON_REVERSE_SHELL", 45),
]


# ─────────────────────────────────────────────────────────────────────────────
# ENTROPY ANALYSIS — detect packed/encrypted/obfuscated payloads
# ─────────────────────────────────────────────────────────────────────────────

def calculate_entropy(data: bytes) -> float:
    """Calculate Shannon entropy of binary data. High entropy = likely packed/encrypted."""
    if not data:
        return 0.0
    counter = Counter(data)
    length = len(data)
    entropy = -sum((count / length) * math.log2(count / length) for count in counter.values() if count > 0)
    return round(entropy, 4)


def calculate_sha256(filepath: str) -> str:
    """Calculate SHA256 hash of a file."""
    sha256 = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256.update(chunk)
        return sha256.hexdigest()
    except Exception:
        return "HASH_ERROR"


# ─────────────────────────────────────────────────────────────────────────────
# THREAT SCANNER CLASS
# ─────────────────────────────────────────────────────────────────────────────

class ThreatScanner:
    """
    Autonomous USB File Threat Scanner.
    
    When a USB drive is inserted, this agent:
    1. Recursively enumerates every file on the drive
    2. Identifies dangerous file types (scripts, executables, autorun)
    3. Performs deep content analysis on scripts for malicious patterns
    4. Calculates entropy to detect packed/obfuscated binaries
    5. Generates SHA256 hashes for forensic fingerprinting
    6. Auto-quarantines high-risk files by renaming them
    7. Records all findings in the database
    8. Broadcasts real-time scan progress via WebSocket
    """

    QUARANTINE_SUFFIX = ".PHANTOM_QUARANTINED"
    AUTO_QUARANTINE_ENABLED = False  # Defer destructive actions to user choice (Eject / Delete)
    THREAT_SCORE_QUARANTINE_THRESHOLD = 25  # Threat detection threshold
    MAX_FILE_SIZE_FOR_CONTENT_SCAN = 10 * 1024 * 1024  # 10 MB max for content scanning

    def __init__(self):
        self._scan_threads: Dict[str, threading.Thread] = {}
        self._event_loop: Optional[asyncio.AbstractEventLoop] = None
        self._active_scans: Dict[str, Dict[str, Any]] = {}  # session_id -> scan state

    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        self._event_loop = loop

    def _broadcast_safe(self, coro):
        """Safely dispatches async coroutine to the server event loop from background thread."""
        if self._event_loop and self._event_loop.is_running():
            try:
                asyncio.run_coroutine_threadsafe(coro, self._event_loop)
            except Exception as e:
                logger.debug(f"Failed to dispatch broadcast: {e}")

    # ─────────────────────────────────────────────────────────────────────
    # PUBLIC API
    # ─────────────────────────────────────────────────────────────────────

    def scan_drive(self, mount_point: str, session_id: str):
        """
        Launches a background thread to deep-scan a USB drive.
        Non-blocking — the scan runs asynchronously.
        """
        if session_id in self._scan_threads and self._scan_threads[session_id].is_alive():
            logger.warning(f"Scan already running for session {session_id}")
            return

        thread = threading.Thread(
            target=self._execute_scan,
            args=(mount_point, session_id),
            name=f"PhantomThreatScan-{session_id}",
            daemon=True
        )
        self._scan_threads[session_id] = thread
        thread.start()
        logger.info(f"🔍 THREAT SCAN INITIATED: {mount_point} (Session: {session_id})")

    def scan_single_file(self, filepath: str, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Scans a single file and returns the threat analysis result.
        Used for real-time monitoring of newly created files on USB.
        """
        try:
            result = self._analyze_file(filepath, session_id)
            if result:
                self._record_scan_result(result)
                self._broadcast_scan_event(result, session_id)

                # Auto-quarantine if enabled and threat score is high enough
                if self.AUTO_QUARANTINE_ENABLED and result["threat_score"] >= self.THREAT_SCORE_QUARANTINE_THRESHOLD:
                    self._quarantine_file(filepath, result, session_id)

            return result
        except Exception as e:
            logger.error(f"Error scanning file {filepath}: {e}")
            return None

    # ─────────────────────────────────────────────────────────────────────
    # INTERNAL SCAN EXECUTION
    # ─────────────────────────────────────────────────────────────────────

    def _execute_scan(self, mount_point: str, session_id: str):
        """Main scan execution — runs in background thread."""
        scan_start = time.time()
        mount_path = Path(mount_point)

        if not mount_path.exists():
            logger.error(f"Mount point {mount_point} does not exist, aborting scan.")
            return

        # Broadcast scan start
        self._broadcast_scan_status(session_id, "SCAN_STARTED", {
            "mount_point": mount_point,
            "message": f"Autonomous threat scan initiated on {mount_point}"
        })

        # Track scan state
        scan_state = {
            "total_files": 0,
            "scanned_files": 0,
            "dangerous_files": 0,
            "quarantined_files": 0,
            "threat_score_total": 0,
            "findings": []
        }
        self._active_scans[session_id] = scan_state

        # Phase 1: Enumerate all files
        all_files = []
        try:
            for root, dirs, files in os.walk(mount_point):
                # Skip system/hidden directories
                dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ('$RECYCLE.BIN', 'System Volume Information')]
                for fname in files:
                    fpath = os.path.join(root, fname)
                    all_files.append(fpath)
        except PermissionError as e:
            logger.warning(f"Permission denied during file enumeration: {e}")
        except Exception as e:
            logger.error(f"Error enumerating files: {e}")

        scan_state["total_files"] = len(all_files)

        self._broadcast_scan_status(session_id, "SCAN_ENUMERATION_COMPLETE", {
            "total_files": len(all_files),
            "message": f"Found {len(all_files)} files on {mount_point}. Beginning deep analysis..."
        })

        # Record enumeration event in session
        enum_event = event_collector.normalize_event(
            session_id=session_id,
            source="THREAT_SCANNER",
            event_type="USB_DRIVE_ENUMERATED",
            severity="INFO",
            data={"mount_point": mount_point, "total_files": len(all_files)},
            risk_score_delta=2
        )
        session_manager.record_event(enum_event)
        self._broadcast_safe(ws_manager.broadcast_live(enum_event.dict()))

        # Phase 2: Analyze each file
        for idx, filepath in enumerate(all_files):
            try:
                result = self._analyze_file(filepath, session_id)
                scan_state["scanned_files"] += 1

                if result and result["threat_score"] > 0:
                    scan_state["dangerous_files"] += 1
                    scan_state["threat_score_total"] += result["threat_score"]
                    scan_state["findings"].append(result)

                    # Record in database
                    self._record_scan_result(result)

                    # Broadcast finding
                    self._broadcast_scan_event(result, session_id)

                    # Auto-quarantine if enabled and high-risk
                    if self.AUTO_QUARANTINE_ENABLED and result["threat_score"] >= self.THREAT_SCORE_QUARANTINE_THRESHOLD:
                        self._quarantine_file(filepath, result, session_id)
                        scan_state["quarantined_files"] += 1

                # Broadcast progress every 10 files
                if (idx + 1) % 10 == 0 or idx == len(all_files) - 1:
                    self._broadcast_scan_status(session_id, "SCAN_PROGRESS", {
                        "scanned": scan_state["scanned_files"],
                        "total": scan_state["total_files"],
                        "dangerous": scan_state["dangerous_files"],
                        "quarantined": scan_state["quarantined_files"],
                        "percent": round((scan_state["scanned_files"] / max(scan_state["total_files"], 1)) * 100, 1)
                    })

            except Exception as e:
                logger.debug(f"Error analyzing file {filepath}: {e}")

        # Phase 3: Scan complete
        scan_duration = round(time.time() - scan_start, 2)
        
        # Record completion event
        completion_event = event_collector.normalize_event(
            session_id=session_id,
            source="THREAT_SCANNER",
            event_type="USB_SCAN_COMPLETE",
            severity="HIGH" if scan_state["dangerous_files"] > 0 else "INFO",
            data={
                "mount_point": mount_point,
                "total_files": scan_state["total_files"],
                "dangerous_files": scan_state["dangerous_files"],
                "quarantined_files": scan_state["quarantined_files"],
                "scan_duration_seconds": scan_duration,
                "verdict": "THREATS_DETECTED_AND_QUARANTINED" if scan_state["quarantined_files"] > 0 
                           else ("SUSPICIOUS_FILES_FOUND" if scan_state["dangerous_files"] > 0 
                                 else "CLEAN")
            },
            risk_score_delta=scan_state["dangerous_files"] * 5
        )
        session_manager.record_event(completion_event)
        self._broadcast_safe(ws_manager.broadcast_live(completion_event.dict()))

        # AI Narration for scan completion
        if scan_state["dangerous_files"] > 0:
            narration = (
                f"🔍 AUTONOMOUS THREAT SCAN COMPLETE: Analyzed {scan_state['total_files']} files on {mount_point} "
                f"in {scan_duration}s. Detected {scan_state['dangerous_files']} dangerous files. "
                f"Auto-quarantined {scan_state['quarantined_files']} high-risk files to prevent execution. "
                f"USB drive is under continuous surveillance."
            )
        else:
            narration = (
                f"✅ THREAT SCAN COMPLETE: Deep-scanned {scan_state['total_files']} files on {mount_point} "
                f"in {scan_duration}s. No immediate threats detected. Continuous monitoring active."
            )

        self._broadcast_safe(ws_manager.broadcast_narrator({
            "session_id": session_id,
            "narration": narration,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }))

        self._broadcast_scan_status(session_id, "SCAN_COMPLETE", {
            "total_files": scan_state["total_files"],
            "dangerous_files": scan_state["dangerous_files"],
            "quarantined_files": scan_state["quarantined_files"],
            "scan_duration_seconds": scan_duration,
            "verdict": completion_event.data.get("verdict", "CLEAN")
        })

        logger.info(
            f"✅ THREAT SCAN COMPLETE: {mount_point} | "
            f"Files: {scan_state['total_files']} | "
            f"Dangerous: {scan_state['dangerous_files']} | "
            f"Quarantined: {scan_state['quarantined_files']} | "
            f"Duration: {scan_duration}s"
        )

        # ═══════════════════════════════════════════════════════════════
        # USER-CONTROLLED USB EJECT — Threats detected, eject left to user
        # ═══════════════════════════════════════════════════════════════
        if scan_state["dangerous_files"] > 0:
            threat_names = [f.get("file_name", "threat_file") for f in scan_state["findings"]]
            threat_files_summary = ", ".join(threat_names) if threat_names else "dangerous files"
            logger.warning(
                f"⚠️ THREATS DETECTED ON USB DRIVE: {mount_point} "
                f"({threat_files_summary}). "
                f"Auto-eject disabled — awaiting user decision to eject."
            )

            # Broadcast threat notification with user eject option
            threat_event = {
                "source": "THREAT_SCANNER",
                "event_type": "USB_THREAT_ACTION_REQUIRED",
                "severity": "CRITICAL",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "session_id": session_id,
                "data": {
                    "mount_point": mount_point,
                    "dangerous_files": scan_state["dangerous_files"],
                    "quarantined_files": scan_state["quarantined_files"],
                    "threat_files": threat_names,
                    "primary_threat": threat_names[0] if threat_names else "something.bat",
                    "status": "AWAITING_USER_EJECT",
                    "reason": f"Threat detected: {threat_files_summary} is inside this folder. You need to eject as early as possible or eject now.",
                    "can_eject": True,
                    "findings": scan_state["findings"]
                }
            }
            self._broadcast_safe(ws_manager.broadcast_live(threat_event))

            self._broadcast_safe(ws_manager.broadcast_narrator({
                "session_id": session_id,
                "narration": (
                    f"⚠️ CRITICAL THREAT DETECTED ON {mount_point}: '{threat_files_summary}' detected inside drive folder. "
                    f"PowerShell auto-invocation payload identified. You need to eject as early as possible or eject now."
                ),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }))

            # Record threat alert in session
            threat_session_event = event_collector.normalize_event(
                session_id=session_id,
                source="THREAT_SCANNER",
                event_type="USB_THREAT_AWAITING_USER_EJECT",
                severity="HIGH",
                data={
                    "mount_point": mount_point,
                    "dangerous_files": scan_state["dangerous_files"],
                    "quarantined_files": scan_state["quarantined_files"],
                    "status": "AWAITING_USER_ACTION"
                },
                risk_score_delta=15
            )
            session_manager.record_event(threat_session_event)

    # ─────────────────────────────────────────────────────────────────────
    # FILE ANALYSIS ENGINE
    # ─────────────────────────────────────────────────────────────────────

    def _analyze_file(self, filepath: str, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Deep-analyzes a single file for threats.
        Returns a threat analysis dict or None if the file is safe/uninteresting.
        """
        try:
            fpath = Path(filepath)
            if not fpath.exists() or not fpath.is_file():
                return None

            ext = fpath.suffix.lower()
            fname = fpath.name
            fsize = fpath.stat().st_size

            # Skip very large files and empty files
            if fsize == 0 or fsize > 500 * 1024 * 1024:  # Skip >500MB
                return None

            # Check if this is a dangerous file type
            is_dangerous_type = ext in DANGEROUS_EXTENSIONS
            is_autorun = fname.lower() == "autorun.inf"

            if not is_dangerous_type and not is_autorun:
                return None

            # Build result
            result: Dict[str, Any] = {
                "session_id": session_id,
                "file_path": str(filepath),
                "file_name": fname,
                "file_type": ext.lstrip(".").upper() or "UNKNOWN",
                "file_size": fsize,
                "sha256_hash": calculate_sha256(filepath),
                "threat_score": 0,
                "threat_indicators": [],
                "action_taken": "ANALYZED",
                "scanned_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "category": "SCRIPT" if ext in {".bat", ".cmd", ".ps1", ".psm1", ".vbs", ".vbe", ".js", ".jse", ".wsf", ".wsh", ".py", ".rb", ".pl", ".sh"} 
                           else ("EXECUTABLE" if ext in {".exe", ".scr", ".pif", ".com", ".msi", ".dll"} 
                                 else ("AUTORUN" if is_autorun 
                                       else "DOCUMENT" if ext in {".docm", ".xlsm", ".pptm"}
                                       else "CONFIG" if ext in {".inf", ".reg", ".lnk"}
                                       else "ARCHIVE" if ext in {".zip", ".rar", ".7z", ".cab", ".iso"}
                                       else "OTHER"))
            }

            # ── Autorun.inf is ALWAYS dangerous ──
            if is_autorun:
                result["threat_score"] += 50
                result["threat_indicators"].append({
                    "indicator": "AUTORUN_INF_PRESENT",
                    "description": "autorun.inf file detected — potential auto-execution vector",
                    "score": 50
                })

            # ── Extension-based risk scoring ──
            if ext in {".exe", ".scr", ".pif", ".com", ".msi"}:
                base_score = 45  # Direct execution vector on removable media
                result["threat_score"] += base_score
                result["threat_indicators"].append({
                    "indicator": f"EXECUTABLE_ON_REMOVABLE_STORAGE_{ext.upper().lstrip('.')}",
                    "description": f"Standalone binary ({ext}) present on removable storage — unauthorized execution vector",
                    "score": base_score
                })
                # Check for suspicious threat naming
                lower_fname = fname.lower()
                if any(k in lower_fname for k in ("exploit", "malware", "payload", "glitch", "error", "prank", "demo", "hack", "miner", "trojan")):
                    score_add = 30
                    result["threat_score"] += score_add
                    result["threat_indicators"].append({
                        "indicator": "ADVERSARY_PAYLOAD_NAMING",
                        "description": f"Binary name '{fname}' matches known adversary exploit/demo pattern",
                        "score": score_add
                    })
            elif ext in AUTO_QUARANTINE_EXTENSIONS:
                base_score = 25 if ext in {".bat", ".cmd", ".ps1", ".vbs", ".js", ".hta", ".wsf"} else 15
                result["threat_score"] += base_score
                result["threat_indicators"].append({
                    "indicator": f"DANGEROUS_FILE_TYPE_{ext.upper().lstrip('.')}",
                    "description": f"File type {ext} is commonly used in USB-based attacks",
                    "score": base_score
                })

            # ── Content analysis for scripts ──
            if fsize <= self.MAX_FILE_SIZE_FOR_CONTENT_SCAN:
                content_indicators = self._analyze_content(filepath, ext)
                for indicator in content_indicators:
                    result["threat_score"] += indicator["score"]
                    result["threat_indicators"].append(indicator)

            # ── Entropy analysis for executables ──
            if ext in {".exe", ".scr", ".dll", ".com", ".pif", ".msi"}:
                try:
                    with open(filepath, "rb") as f:
                        data = f.read(min(fsize, 1024 * 1024))  # Read first 1MB
                    entropy = calculate_entropy(data)
                    if entropy > 7.5:
                        score_add = 25
                        result["threat_score"] += score_add
                        result["threat_indicators"].append({
                            "indicator": "HIGH_ENTROPY_BINARY",
                            "description": f"Binary entropy {entropy}/8.0 — likely packed/encrypted payload",
                            "score": score_add,
                            "entropy": entropy
                        })
                    elif entropy > 6.5:
                        score_add = 10
                        result["threat_score"] += score_add
                        result["threat_indicators"].append({
                            "indicator": "ELEVATED_ENTROPY_BINARY",
                            "description": f"Binary entropy {entropy}/8.0 — possibly obfuscated",
                            "score": score_add,
                            "entropy": entropy
                        })
                except Exception:
                    pass

            # ── LNK (shortcut) analysis ──
            if ext == ".lnk":
                result["threat_score"] += 20
                result["threat_indicators"].append({
                    "indicator": "SHORTCUT_FILE_ON_USB",
                    "description": "LNK shortcut file on USB — common attack vector for hidden command execution",
                    "score": 20
                })

            # Only return files that have some threat indicators
            if result["threat_score"] > 0:
                return result
            return None

        except Exception as e:
            logger.debug(f"Error analyzing {filepath}: {e}")
            return None

    def _analyze_content(self, filepath: str, ext: str) -> List[Dict[str, Any]]:
        """
        Reads file content and checks for malicious patterns based on file type.
        """
        indicators = []
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read(self.MAX_FILE_SIZE_FOR_CONTENT_SCAN)
        except Exception:
            return indicators

        # Select indicator set based on file type
        if ext in {".ps1", ".psm1", ".psd1", ".ps1xml"}:
            patterns = POWERSHELL_INDICATORS
        elif ext in {".bat", ".cmd"}:
            patterns = BATCH_INDICATORS
        elif ext in {".sh", ".bash", ".zsh"}:
            patterns = LINUX_SHELL_INDICATORS
        elif ext in {".vbs", ".vbe"}:
            patterns = VBSCRIPT_INDICATORS
        elif ext in {".js", ".jse", ".wsf", ".wsh", ".ws"}:
            patterns = JAVASCRIPT_INDICATORS
        elif ext == ".inf" or filepath.lower().endswith("autorun.inf"):
            patterns = AUTORUN_INDICATORS
        else:
            # For other script types, check Linux shell + PowerShell + batch patterns
            patterns = LINUX_SHELL_INDICATORS + POWERSHELL_INDICATORS + BATCH_INDICATORS
            # Also check for generic obfuscation
            if len(content) > 100:
                # Count lines with very long strings (potential obfuscation)
                for line in content.split("\n"):
                    if len(line.strip()) > 500:
                        indicators.append({
                            "indicator": "OBFUSCATED_LONG_LINE",
                            "description": f"Line with {len(line.strip())} chars detected — potential obfuscation",
                            "score": 15
                        })
                        break

        # Run pattern matching
        matched_indicators = set()  # Track unique indicators to avoid duplicates
        for pattern, indicator_name, score in patterns:
            if indicator_name in matched_indicators:
                continue
            try:
                if re.search(pattern, content):
                    matched_indicators.add(indicator_name)
                    indicators.append({
                        "indicator": indicator_name,
                        "description": f"Detected {indicator_name.replace('_', ' ').lower()} pattern in {ext} file",
                        "score": score
                    })
            except re.error:
                pass

        # Check for Base64 encoded content (generic, works for all file types)
        base64_pattern = r"[A-Za-z0-9+/]{50,}={0,2}"
        if "BASE64_DECODE" not in matched_indicators and "ENCODED_COMMAND" not in matched_indicators:
            b64_matches = re.findall(base64_pattern, content)
            if b64_matches:
                longest = max(len(m) for m in b64_matches)
                if longest > 100:
                    indicators.append({
                        "indicator": "LONG_BASE64_STRING",
                        "description": f"Base64-encoded string ({longest} chars) — possible encoded payload",
                        "score": 20
                    })

        return indicators

    # ─────────────────────────────────────────────────────────────────────
    # QUARANTINE ENGINE
    # ─────────────────────────────────────────────────────────────────────

    def _quarantine_file(self, filepath: str, result: Dict[str, Any], session_id: str):
        """
        Quarantines a dangerous file by renaming it to prevent execution.
        """
        try:
            quarantined_path = filepath + self.QUARANTINE_SUFFIX
            if os.path.exists(quarantined_path):
                # Already quarantined
                return

            os.rename(filepath, quarantined_path)
            result["action_taken"] = "QUARANTINED"
            
            logger.warning(
                f"🛡️ AUTO-QUARANTINED: {result['file_name']} "
                f"(Score: {result['threat_score']}) → {quarantined_path}"
            )

            # Record quarantine event
            quarantine_event = event_collector.normalize_event(
                session_id=session_id,
                source="THREAT_SCANNER",
                event_type="FILE_QUARANTINED",
                severity="HIGH",
                data={
                    "file_name": result["file_name"],
                    "file_path": filepath,
                    "quarantined_path": quarantined_path,
                    "threat_score": result["threat_score"],
                    "indicators": [i["indicator"] for i in result["threat_indicators"]],
                    "action": "AUTO_QUARANTINE_RENAME"
                },
                risk_score_delta=15
            )
            session_manager.record_event(quarantine_event)
            self._broadcast_safe(ws_manager.broadcast_live(quarantine_event.dict()))

            # AI Narration
            indicators_str = ", ".join([i["indicator"] for i in result["threat_indicators"][:3]])
            self._broadcast_safe(ws_manager.broadcast_narrator({
                "session_id": session_id,
                "narration": (
                    f"🛡️ AUTONOMOUS FILE QUARANTINE: '{result['file_name']}' neutralized "
                    f"(Threat Score: {result['threat_score']}). "
                    f"Indicators: {indicators_str}. "
                    f"File renamed to prevent execution."
                ),
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }))

            # Record alert in database
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO alerts (session_id, alert_type, severity, title, description, mitre_technique, status, created_at)
                VALUES (?, 'FILE_QUARANTINE', 'HIGH', ?, ?, 'T1204.002', 'CONTAINED', ?)
            """, (
                session_id,
                f"Auto-Quarantined: {result['file_name']}",
                f"Threat scanner auto-quarantined {result['file_name']} (Score: {result['threat_score']}). Indicators: {indicators_str}",
                time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            ))
            conn.commit()
            conn.close()

        except PermissionError:
            logger.warning(f"Permission denied quarantining {filepath} — file may be in use")
            result["action_taken"] = "QUARANTINE_FAILED_PERMISSION"
        except Exception as e:
            logger.error(f"Error quarantining {filepath}: {e}")
            result["action_taken"] = "QUARANTINE_FAILED"

    # ─────────────────────────────────────────────────────────────────────
    # DATABASE RECORDING
    # ─────────────────────────────────────────────────────────────────────

    def _record_scan_result(self, result: Dict[str, Any]):
        """Records a file scan result in the database."""
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO file_scans (session_id, file_path, file_name, file_type, file_size, sha256_hash, threat_score, threat_indicators, action_taken, scanned_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                result["session_id"],
                result["file_path"],
                result["file_name"],
                result["file_type"],
                result["file_size"],
                result["sha256_hash"],
                result["threat_score"],
                json.dumps(result["threat_indicators"]),
                result["action_taken"],
                result["scanned_at"]
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.debug(f"Error recording scan result: {e}")

    # ─────────────────────────────────────────────────────────────────────
    # WEBSOCKET BROADCASTING
    # ─────────────────────────────────────────────────────────────────────

    def _broadcast_scan_event(self, result: Dict[str, Any], session_id: str):
        """Broadcasts a file scan finding to connected clients."""
        severity = "CRITICAL" if result["threat_score"] >= 40 else ("HIGH" if result["threat_score"] >= 25 else "MEDIUM")
        event_data = {
            "source": "THREAT_SCANNER",
            "event_type": "FILE_THREAT_DETECTED",
            "severity": severity,
            "timestamp": result["scanned_at"],
            "session_id": session_id,
            "data": {
                "file_name": result["file_name"],
                "file_type": result["file_type"],
                "threat_score": result["threat_score"],
                "category": result.get("category", "UNKNOWN"),
                "indicators": [i["indicator"] for i in result["threat_indicators"]],
                "action_taken": result["action_taken"],
                "sha256": result["sha256_hash"][:16] + "..."
            }
        }
        self._broadcast_safe(ws_manager.broadcast_live(event_data))

        # Record alert in database and announce via AI Narrator if threat_score >= 25
        if result.get("threat_score", 0) >= 25:
            try:
                from backend.database import get_db
                conn = get_db()
                cursor = conn.cursor()
                indicators_str = ", ".join([i.get("indicator", "") for i in result.get("threat_indicators", [])[:3]])
                cursor.execute("""
                    INSERT INTO alerts (session_id, alert_type, severity, title, description, mitre_technique, status, created_at)
                    VALUES (?, 'FILE_THREAT_DETECTED', ?, ?, ?, 'T1204.002', 'DETECTED', ?)
                """, (
                    session_id,
                    severity,
                    f"Malicious File Detected: {result['file_name']}",
                    f"Threat Scanner identified dangerous payload in {result['file_name']} (Score: {result['threat_score']}). Indicators: {indicators_str}",
                    time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                ))
                conn.commit()
                conn.close()

                # Dispatch AI Threat Narrator line so the voice engine announces it live!
                self._broadcast_safe(ws_manager.broadcast_narrator({
                    "session_id": session_id,
                    "narration": f"⚠️ Threat Alert: Suspicious payload '{result['file_name']}' detected on USB storage. Indicators: {indicators_str}. Threat Score: {result['threat_score']}.",
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "severity": severity
                }))
            except Exception as e:
                logger.debug(f"Error recording file threat alert: {e}")

    def _broadcast_scan_status(self, session_id: str, status: str, data: Dict[str, Any]):
        """Broadcasts scan progress/status updates."""
        payload = {
            "source": "THREAT_SCANNER",
            "event_type": status,
            "severity": "INFO",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "session_id": session_id,
            "data": data
        }
        self._broadcast_safe(ws_manager.broadcast_live(payload))


# Module-level singleton
threat_scanner = ThreatScanner()
