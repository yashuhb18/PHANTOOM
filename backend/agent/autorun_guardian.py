"""
PHANTOM Autorun Guardian Agent
================================
Dedicated agent to detect, neutralize, and block autorun exploitation on USB drives.
Monitors for autorun.inf files and Windows Registry autorun keys.
"""

import os
import sys
import time
import threading
import logging
import re
from typing import Optional, Dict, Any, Callable
import asyncio

from backend.core.session_manager import session_manager
from backend.core.event_collector import event_collector
from backend.ws_manager import ws_manager
from backend.database import get_db

logger = logging.getLogger("phantom.agent.autorun_guardian")


class AutorunGuardian:
    """
    Autonomous Autorun Prevention Agent.
    
    Capabilities:
    1. Scans USB drives for autorun.inf and neutralizes them
    2. Parses autorun.inf to identify target executables
    3. Monitors Windows Registry Run keys for new persistence entries during USB sessions
    4. Quarantines autorun.inf by renaming to prevent Windows from processing it
    5. Broadcasts all events via WebSocket
    """

    QUARANTINE_SUFFIX = ".PHANTOM_BLOCKED"

    def __init__(self):
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._event_loop: Optional[asyncio.AbstractEventLoop] = None
        self._monitored_run_keys: Dict[str, str] = {}  # Registry key baseline
        self._baseline_captured = False

    def start(self, loop: Optional[asyncio.AbstractEventLoop] = None):
        if self._running:
            return
        self._running = True
        self._event_loop = loop
        self._thread = threading.Thread(
            target=self._monitor_registry_loop,
            name="PhantomAutorunGuardian",
            daemon=True
        )
        self._thread.start()
        logger.info("PHANTOM Autorun Guardian Agent started.")

    def stop(self):
        self._running = False
        logger.info("PHANTOM Autorun Guardian Agent stopped.")

    def _broadcast_safe(self, coro):
        if self._event_loop and self._event_loop.is_running():
            try:
                asyncio.run_coroutine_threadsafe(coro, self._event_loop)
            except Exception as e:
                logger.debug(f"Failed to dispatch broadcast: {e}")

    # ─────────────────────────────────────────────────────────────────────
    # AUTORUN.INF SCANNING & NEUTRALIZATION
    # ─────────────────────────────────────────────────────────────────────

    def scan_and_neutralize(self, mount_point: str, session_id: str) -> Dict[str, Any]:
        """
        Scans a USB drive's root for autorun.inf and neutralizes it.
        Returns a dict with scan results.
        """
        result = {
            "autorun_found": False,
            "autorun_neutralized": False,
            "parsed_commands": [],
            "target_executable": None,
            "threat_level": "NONE"
        }

        autorun_path = os.path.join(mount_point, "autorun.inf")
        autorun_blocked_path = autorun_path + self.QUARANTINE_SUFFIX

        # Check for already-blocked autorun
        if os.path.exists(autorun_blocked_path):
            logger.info(f"Autorun.inf already neutralized at {mount_point}")
            result["autorun_found"] = True
            result["autorun_neutralized"] = True
            return result

        # Check for autorun.inf (case insensitive)
        found_autorun = None
        try:
            root_files = os.listdir(mount_point)
            for f in root_files:
                if f.lower() == "autorun.inf":
                    found_autorun = os.path.join(mount_point, f)
                    break
        except Exception as e:
            logger.warning(f"Error listing {mount_point}: {e}")
            return result

        if not found_autorun:
            return result

        result["autorun_found"] = True
        logger.warning(f"⚠️ AUTORUN.INF DETECTED at {found_autorun}")

        # Parse autorun.inf
        try:
            with open(found_autorun, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            # Extract Open= directive (main execution target)
            open_match = re.search(r"(?i)open\s*=\s*(.+)", content)
            if open_match:
                target = open_match.group(1).strip()
                result["target_executable"] = target
                result["parsed_commands"].append(f"open={target}")
                result["threat_level"] = "CRITICAL"

            # Extract ShellExecute= directive
            shell_match = re.search(r"(?i)shellexecute\s*=\s*(.+)", content)
            if shell_match:
                target = shell_match.group(1).strip()
                result["parsed_commands"].append(f"shellexecute={target}")
                result["threat_level"] = "CRITICAL"

            # Extract Shell\...\Command directives
            shell_cmd_matches = re.findall(r"(?i)shell\\(.+?)\\command\s*=\s*(.+)", content)
            for name, cmd in shell_cmd_matches:
                result["parsed_commands"].append(f"shell\\{name}\\command={cmd.strip()}")
                result["threat_level"] = "CRITICAL"

            # Extract Action= directive
            action_match = re.search(r"(?i)action\s*=\s*(.+)", content)
            if action_match:
                result["parsed_commands"].append(f"action={action_match.group(1).strip()}")

            # Extract Icon= directive
            icon_match = re.search(r"(?i)icon\s*=\s*(.+)", content)
            if icon_match:
                result["parsed_commands"].append(f"icon={icon_match.group(1).strip()}")

        except Exception as e:
            logger.error(f"Error parsing autorun.inf: {e}")
            result["threat_level"] = "HIGH"

        # NEUTRALIZE: Rename autorun.inf
        try:
            os.rename(found_autorun, found_autorun + self.QUARANTINE_SUFFIX)
            result["autorun_neutralized"] = True
            logger.warning(f"🛡️ AUTORUN NEUTRALIZED: {found_autorun} → {found_autorun}{self.QUARANTINE_SUFFIX}")
        except PermissionError:
            logger.warning(f"Permission denied neutralizing autorun.inf at {found_autorun}")
            result["autorun_neutralized"] = False
        except Exception as e:
            logger.error(f"Error neutralizing autorun.inf: {e}")
            result["autorun_neutralized"] = False

        # Record event
        event = event_collector.normalize_event(
            session_id=session_id,
            source="AUTORUN_GUARDIAN",
            event_type="AUTORUN_INF_DETECTED",
            severity="CRITICAL",
            data={
                "autorun_path": str(found_autorun),
                "target_executable": result["target_executable"],
                "parsed_commands": result["parsed_commands"],
                "neutralized": result["autorun_neutralized"],
                "threat_level": result["threat_level"]
            },
            risk_score_delta=25
        )
        session_manager.record_event(event)
        self._broadcast_safe(ws_manager.broadcast_live(event.dict()))

        # AI Narration
        target_str = result["target_executable"] or "unknown target"
        narration = (
            f"🚨 AUTORUN ATTACK VECTOR NEUTRALIZED: autorun.inf detected on USB drive "
            f"targeting '{target_str}'. File has been {'quarantined' if result['autorun_neutralized'] else 'flagged'}. "
            f"Autorun execution blocked by PHANTOM Guardian."
        )
        self._broadcast_safe(ws_manager.broadcast_narrator({
            "session_id": session_id,
            "narration": narration,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }))

        # Record alert
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO alerts (session_id, alert_type, severity, title, description, mitre_technique, status, created_at)
            VALUES (?, 'AUTORUN_BLOCKED', 'CRITICAL', ?, ?, 'T1547.001', 'CONTAINED', ?)
        """, (
            session_id,
            f"Autorun Attack Vector Neutralized",
            f"autorun.inf detected targeting '{target_str}'. Commands: {'; '.join(result['parsed_commands'])}. File {'quarantined' if result['autorun_neutralized'] else 'flagged but could not be quarantined'}.",
            time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        ))
        conn.commit()
        conn.close()

        return result

    # ─────────────────────────────────────────────────────────────────────
    # REGISTRY MONITORING FOR PERSISTENCE
    # ─────────────────────────────────────────────────────────────────────

    def _monitor_registry_loop(self):
        """
        Continuously monitors Windows Registry Run keys for new persistence entries.
        Detects if a USB payload tries to install persistence during a session.
        """
        if sys.platform != "win32":
            # Linux persistence monitoring
            import subprocess
            home = os.path.expanduser("~")
            autostart_dir = os.path.join(home, ".config", "autostart")
            
            # Capture baseline
            baseline_files = {}
            baseline_rc_hashes = {}
            
            # Track .desktop files in autostart
            if os.path.isdir(autostart_dir):
                for f in os.listdir(autostart_dir):
                    fpath = os.path.join(autostart_dir, f)
                    baseline_files[fpath] = os.path.getmtime(fpath) if os.path.exists(fpath) else 0
            
            # Track RC files
            for rc in [".bashrc", ".zshrc", ".profile"]:
                rc_path = os.path.join(home, rc)
                if os.path.exists(rc_path):
                    import hashlib
                    with open(rc_path, "rb") as f:
                        baseline_rc_hashes[rc_path] = hashlib.md5(f.read()).hexdigest()
            
            # Track crontab
            baseline_crontab = ""
            try:
                result = subprocess.run(["crontab", "-l"], capture_output=True, text=True, timeout=5)
                baseline_crontab = result.stdout
            except Exception:
                pass
            
            self._baseline_captured = True
            logger.info(f"Autorun Guardian: Linux persistence baseline captured")
            
            while self._running:
                try:
                    time.sleep(3.0)
                    
                    # Check for new .desktop autostart files
                    if os.path.isdir(autostart_dir):
                        for f in os.listdir(autostart_dir):
                            fpath = os.path.join(autostart_dir, f)
                            if fpath not in baseline_files:
                                baseline_files[fpath] = os.path.getmtime(fpath)
                                self._handle_new_persistence(f"~/.config/autostart/{f}", fpath)
                    
                    # Check RC file modifications
                    for rc_path, old_hash in list(baseline_rc_hashes.items()):
                        if os.path.exists(rc_path):
                            import hashlib
                            with open(rc_path, "rb") as f:
                                new_hash = hashlib.md5(f.read()).hexdigest()
                            if new_hash != old_hash:
                                baseline_rc_hashes[rc_path] = new_hash
                                rc_name = os.path.basename(rc_path)
                                self._handle_new_persistence(f"Shell RC Modified: ~/{rc_name}", rc_path)
                    
                    # Check crontab changes
                    try:
                        result = subprocess.run(["crontab", "-l"], capture_output=True, text=True, timeout=5)
                        current_crontab = result.stdout
                        if current_crontab != baseline_crontab and current_crontab.strip():
                            baseline_crontab = current_crontab
                            self._handle_new_persistence("Crontab Modified", current_crontab[:200])
                    except Exception:
                        pass
                except Exception as e:
                    logger.debug(f"Linux persistence monitor error: {e}")
                    time.sleep(5.0)
            return

        try:
            import winreg
        except ImportError:
            logger.warning("winreg not available — Registry monitoring disabled")
            while self._running:
                time.sleep(5.0)
            return

        # Registry paths to monitor
        registry_targets = [
            (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\Run"),
            (winreg.HKEY_CURRENT_USER, r"Software\Microsoft\Windows\CurrentVersion\RunOnce"),
        ]

        # Capture baseline
        time.sleep(2.0)  # Give system time to settle
        for hive, path in registry_targets:
            try:
                with winreg.OpenKey(hive, path, 0, winreg.KEY_READ) as key:
                    count = winreg.QueryInfoKey(key)[1]
                    for i in range(count):
                        name, val, _ = winreg.EnumValue(key, i)
                        self._monitored_run_keys[f"{path}\\{name}"] = str(val)
            except Exception:
                pass
        
        self._baseline_captured = True
        logger.info(f"Autorun Guardian: Registry baseline captured ({len(self._monitored_run_keys)} entries)")

        # Monitor loop
        while self._running:
            try:
                time.sleep(3.0)
                for hive, path in registry_targets:
                    try:
                        with winreg.OpenKey(hive, path, 0, winreg.KEY_READ) as key:
                            count = winreg.QueryInfoKey(key)[1]
                            for i in range(count):
                                name, val, _ = winreg.EnumValue(key, i)
                                full_key = f"{path}\\{name}"
                                val_str = str(val)
                                
                                if full_key not in self._monitored_run_keys:
                                    # NEW PERSISTENCE ENTRY DETECTED!
                                    self._monitored_run_keys[full_key] = val_str
                                    self._handle_new_persistence(full_key, val_str)
                    except Exception:
                        pass
            except Exception as e:
                logger.debug(f"Registry monitor error: {e}")
                time.sleep(5.0)

    def _handle_new_persistence(self, key_path: str, value: str):
        """Handles detection of a new Registry persistence entry."""
        logger.warning(f"🚨 NEW REGISTRY PERSISTENCE DETECTED: {key_path} = {value}")

        active_session = session_manager.get_active_session()
        session_id = active_session["session_id"] if active_session else f"sess_system_{int(time.time())}"

        event = event_collector.normalize_event(
            session_id=session_id,
            source="AUTORUN_GUARDIAN",
            event_type="REGISTRY_PERSISTENCE_ADDED",
            severity="CRITICAL",
            data={
                "registry_key": key_path,
                "registry_value": value,
                "hive": "HKCU",
                "threat": "PERSISTENCE_INSTALLATION",
                "mitre": "T1547.001"
            },
            risk_score_delta=30
        )
        session_manager.record_event(event)
        self._broadcast_safe(ws_manager.broadcast_live(event.dict()))

        self._broadcast_safe(ws_manager.broadcast_narrator({
            "session_id": session_id,
            "narration": (
                f"🚨 PERSISTENCE ATTACK DETECTED: New Windows Registry Run key added: "
                f"'{key_path}' pointing to '{value}'. This may indicate a USB payload "
                f"attempting to establish boot persistence on the host."
            ),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }))

        # Record alert
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO alerts (session_id, alert_type, severity, title, description, mitre_technique, status, created_at)
            VALUES (?, 'REGISTRY_PERSISTENCE', 'CRITICAL', ?, ?, 'T1547.001', 'DETECTED', ?)
        """, (
            session_id,
            f"Registry Persistence Detected: {key_path.split(chr(92))[-1]}",
            f"New Run key detected: {key_path} = {value}. Potential USB payload persistence.",
            time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        ))
        conn.commit()
        conn.close()


# Module-level singleton
autorun_guardian = AutorunGuardian()
