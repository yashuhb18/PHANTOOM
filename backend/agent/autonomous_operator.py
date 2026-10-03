"""
PHANTOM Autonomous Operator Agent
=================================
Empowers the Local DeepSeek / Cyber LLM with real operating system authority:
1. Run terminal & shell commands autonomously.
2. Kill rogue processes, reverse shells, and malicious processor loads.
3. Surgically kill (delete/quarantine) adversary payload files.
4. Read, write, and edit code inside the project or target folders.

Implements a full autonomous ReAct reasoning loop:
  Thought (<think>) -> Action (Tool Call) -> Observation -> Next Thought -> Finish
"""

import os
import re
import sys
import time
import json
import shutil
import psutil
import logging
import datetime
import subprocess
import difflib
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from backend.config import BASE_DIR
from backend.core.glm_client import glm_client
from backend.ws_manager import ws_manager
from backend.database import get_db

logger = logging.getLogger("phantom.agent.autonomous_operator")

QUARANTINE_DIR = BASE_DIR / ".phantom_quarantine"
QUARANTINE_DIR.mkdir(parents=True, exist_ok=True)

PROTECTED_PROCESS_PATTERNS = [
    "uvicorn", "backend.main", "vite", "antigravity",
    "ollama", "systemd", "xorg", "gnome", "kde",
    "dbus", "sshd", "pulseaudio", "pipewire"
]

PROTECTED_FILE_ROOTS = [
    "/", "/bin", "/sbin", "/usr", "/usr/bin", "/usr/sbin",
    "/etc", "/boot", "/lib", "/lib64", "/sys", "/proc", "/dev"
]


class AutonomousOperatorAgent:
    """
    Autonomous AI agent capable of executing commands, terminating processes,
    deleting/quarantining files, and modifying source code directly on Kali Linux.
    """

    def __init__(self, workspace_root: Optional[Path] = None):
        self.workspace_root = (workspace_root or BASE_DIR.parent).resolve()
        self.execution_history: List[Dict[str, Any]] = []

    # =========================================================================
    # TOOL 1: RUN COMMAND
    # =========================================================================
    def tool_run_command(self, command: str, cwd: Optional[str] = None, timeout: int = 30) -> Dict[str, Any]:
        """
        Executes a shell command on the host operating system.
        """
        command = command.strip()

        # Auto-quote unquoted paths containing spaces (e.g. PHANTOM USB)
        if "PHANTOM USB" in command and '"PHANTOM USB"' not in command and "'PHANTOM USB'" not in command:
            command = command.replace("PHANTOM USB", '"PHANTOM USB"')

        # Auto-resolve ellipsis in /run/media/... or /media/... to real USB path
        if "/run/media/.../" in command:
            command = command.replace("/run/media/.../", "/run/media/yashz/")
        elif "/media/.../" in command:
            command = command.replace("/media/.../", "/run/media/yashz/")
        elif "/run/media/..." in command:
            command = command.replace("/run/media/...", "/run/media/yashz")

        # Auto-resolve mistaken workspace KIOXIA_USB paths to real mount point
        if "KIOXIA_USB" in command and "/run/media" not in command and "/media" not in command:
            command = re.sub(r'(?:/home/[^/\s]+/Desktop/[^/\s]+(?: [^/\s]+)*/)?KIOXIA_USB', '/run/media/yashz/KIOXIA_USB', command)

        # Full elevated execution support via sudo pass 0529
        if "sudo " in command and "echo '0529' | sudo -S" not in command:
            command = re.sub(r'\bsudo\b', "echo '0529' | sudo -S", command, count=1)

        logger.info(f"[TOOL: RUN_COMMAND] Executing: {command}")

        # Guardrails against catastrophic accidental destruction
        dangerous_patterns = [
            r"rm\s+-rf\s+/\s*$",
            r"rm\s+-rf\s+/\*$",
            r"mkfs",
            r">\s*/dev/sd[a-z]",
            r"dd\s+if=.*of=/dev/sd[a-z]"
        ]
        for pat in dangerous_patterns:
            if re.search(pat, command):
                return {
                    "tool": "RUN_COMMAND",
                    "success": False,
                    "command": command,
                    "returncode": -1,
                    "stdout": "",
                    "stderr": "BLOCKED BY PHANTOM SAFETY GUARD: Destructive disk/root command pattern detected.",
                    "elapsed_ms": 0
                }

        target_cwd = Path(cwd).resolve() if cwd else self.workspace_root
        if not target_cwd.exists():
            target_cwd = self.workspace_root

        t0 = time.time()
        try:
            proc = subprocess.run(
                command,
                shell=True,
                cwd=str(target_cwd),
                capture_output=True,
                text=True,
                timeout=timeout
            )
            elapsed_ms = round((time.time() - t0) * 1000, 2)
            stdout = proc.stdout[:3000]
            stderr = proc.stderr[:3000]

            return {
                "tool": "RUN_COMMAND",
                "success": (proc.returncode == 0),
                "command": command,
                "cwd": str(target_cwd),
                "returncode": proc.returncode,
                "stdout": stdout or "(no stdout)",
                "stderr": stderr or "",
                "elapsed_ms": elapsed_ms
            }
        except subprocess.TimeoutExpired:
            return {
                "tool": "RUN_COMMAND",
                "success": False,
                "command": command,
                "returncode": -1,
                "stdout": "",
                "stderr": f"Command timed out after {timeout} seconds.",
                "elapsed_ms": round((time.time() - t0) * 1000, 2)
            }
        except Exception as e:
            return {
                "tool": "RUN_COMMAND",
                "success": False,
                "command": command,
                "returncode": -1,
                "stdout": "",
                "stderr": f"Execution error: {str(e)}",
                "elapsed_ms": round((time.time() - t0) * 1000, 2)
            }

    # =========================================================================
    # TOOL 2: KILL PROCESS / PROCESSOR
    # =========================================================================
    def tool_kill_process(self, pid: Optional[int] = None, name_pattern: Optional[str] = None, signal: str = "SIGKILL") -> Dict[str, Any]:
        """
        Surgically kills rogue processes and child processes by PID or name pattern.
        """
        logger.info(f"[TOOL: KILL_PROCESS] Target PID: {pid} | Pattern: {name_pattern} | Signal: {signal}")
        killed_list = []
        errors = []
        current_pid = os.getpid()
        parent_pid = os.getppid()

        targets_to_terminate: List[psutil.Process] = []

        if pid is not None:
            if pid in (0, 1, 2, current_pid, parent_pid):
                return {
                    "tool": "KILL_PROCESS",
                    "success": False,
                    "message": f"REFUSED: PID {pid} is protected core OS or PHANTOM process.",
                    "killed_pids": []
                }
            try:
                targets_to_terminate.append(psutil.Process(pid))
            except psutil.NoSuchProcess:
                return {
                    "tool": "KILL_PROCESS",
                    "success": True,
                    "message": f"Process PID {pid} is already terminated or does not exist.",
                    "killed_pids": [pid]
                }
            except Exception as e:
                errors.append(f"Failed to resolve PID {pid}: {e}")

        elif name_pattern:
            clean_pat = name_pattern.strip().lower()
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    p_info = proc.info
                    p_pid = p_info['pid']
                    if p_pid in (0, 1, 2, current_pid, parent_pid):
                        continue

                    cmd_str = " ".join(p_info.get('cmdline') or []).lower()
                    p_name = (p_info.get('name') or "").lower()

                    if clean_pat in p_name or clean_pat in cmd_str:
                        # Check immune patterns
                        if any(imm in cmd_str for imm in PROTECTED_PROCESS_PATTERNS):
                            continue
                        targets_to_terminate.append(proc)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

        if not targets_to_terminate and not errors:
            return {
                "tool": "KILL_PROCESS",
                "success": False,
                "message": f"No running processes matched target (PID={pid}, pattern={name_pattern}).",
                "killed_pids": []
            }

        for proc in targets_to_terminate:
            try:
                p_pid = proc.pid
                p_name = proc.name()
                cmd_str = " ".join(proc.cmdline() or [])

                # Verify immunity again
                if any(imm in cmd_str.lower() for imm in PROTECTED_PROCESS_PATTERNS):
                    errors.append(f"Skipped protected process {p_name} (PID: {p_pid})")
                    continue

                # Kill children first
                children = proc.children(recursive=True)
                for child in children:
                    try:
                        child.kill()
                    except Exception:
                        pass

                proc.kill()
                killed_list.append({
                    "pid": p_pid,
                    "name": p_name,
                    "children_killed": len(children),
                    "status": "TERMINATED"
                })
            except psutil.NoSuchProcess:
                killed_list.append({"pid": proc.pid, "name": "unknown", "status": "ALREADY_DEAD"})
            except psutil.AccessDenied:
                # Elevate via OS kill
                try:
                    subprocess.run(["kill", "-9", str(proc.pid)], check=True, timeout=2)
                    killed_list.append({"pid": proc.pid, "name": proc.name(), "status": "TERMINATED_VIA_SUDO"})
                except Exception as e:
                    errors.append(f"Access denied killing PID {proc.pid}: {e}")
            except Exception as e:
                errors.append(f"Error killing PID {proc.pid}: {e}")

        success = len(killed_list) > 0
        return {
            "tool": "KILL_PROCESS",
            "success": success,
            "message": f"Successfully killed {len(killed_list)} process(es)." if success else "Failed to terminate targets.",
            "killed_processes": killed_list,
            "errors": errors
        }

    # =========================================================================
    # TOOL 3: KILL FILE (DELETE OR QUARANTINE)
    # =========================================================================
    def tool_kill_file(self, filepath: str, permanent: bool = False, quarantine: bool = True) -> Dict[str, Any]:
        """
        Surgically deletes or quarantines malicious files, dropper scripts, or payloads.
        """
        logger.info(f"[TOOL: KILL_FILE] File: {filepath} | Permanent: {permanent} | Quarantine: {quarantine}")
        clean_path = filepath.strip()
        target = Path(clean_path)
        if not target.is_absolute():
            target = (self.workspace_root / target).resolve()
        else:
            target = target.resolve()

        # Protection check: never delete OS root system files
        target_str = str(target)
        for prot in PROTECTED_FILE_ROOTS:
            if target_str == prot or target_str.startswith(prot + "/") and not any(
                target_str.startswith(allowed) for allowed in ["/tmp", "/dev/shm", "/media", "/mnt", str(self.workspace_root), "/home/"]
            ):
                return {
                    "tool": "KILL_FILE",
                    "success": False,
                    "filepath": str(target),
                    "message": f"SECURITY REFUSAL: Target '{target}' is a protected operating system path."
                }

        if not target.exists():
            return {
                "tool": "KILL_FILE",
                "success": True,
                "filepath": str(target),
                "message": f"File '{target}' does not exist or was already removed."
            }

        try:
            file_size = target.stat().st_size if target.is_file() else 0
            quarantine_info = None

            if quarantine and not permanent:
                timestamp = int(time.time())
                quarantined_name = f"{timestamp}_{target.name}"
                quarantined_path = QUARANTINE_DIR / quarantined_name
                if target.is_dir():
                    shutil.move(str(target), str(quarantined_path))
                else:
                    shutil.move(str(target), str(quarantined_path))
                quarantine_info = str(quarantined_path)
                msg = f"File isolated and quarantined to '{quarantined_path}' ({file_size} bytes neutralized)."
            else:
                if target.is_dir():
                    shutil.rmtree(str(target))
                else:
                    target.unlink()
                msg = f"Permanently deleted '{target}' ({file_size} bytes)."

            return {
                "tool": "KILL_FILE",
                "success": True,
                "filepath": str(target),
                "quarantined_to": quarantine_info,
                "bytes_neutralized": file_size,
                "message": msg
            }
        except Exception as e:
            return {
                "tool": "KILL_FILE",
                "success": False,
                "filepath": str(target),
                "message": f"Failed to remove file: {str(e)}"
            }

    # =========================================================================
    # TOOL 4: READ FILE
    # =========================================================================
    def tool_read_file(self, filepath: str, start_line: int = 1, end_line: int = 250) -> Dict[str, Any]:
        """
        Reads code or text from a file with line numbers for inspection.
        """
        clean_path = filepath.strip()
        if "/run/media/.../" in clean_path:
            clean_path = clean_path.replace("/run/media/.../", "/run/media/yashz/")
        elif "/media/.../" in clean_path:
            clean_path = clean_path.replace("/media/.../", "/run/media/yashz/")
        elif "/run/media/..." in clean_path:
            clean_path = clean_path.replace("/run/media/...", "/run/media/yashz")

        if "KIOXIA_USB" in clean_path and "/run/media" not in clean_path and "/media" not in clean_path:
            clean_path = re.sub(r'(?:/home/[^/\s]+/Desktop/[^/\s]+(?: [^/\s]+)*/)?KIOXIA_USB', '/run/media/yashz/KIOXIA_USB', clean_path)

        target = Path(clean_path)
        if not target.is_absolute():
            target = (self.workspace_root / target).resolve()
        else:
            target = target.resolve()

        if not target.exists() or not target.is_file():
            return {
                "tool": "READ_FILE",
                "success": False,
                "filepath": str(target),
                "error": f"File does not exist: {target}"
            }

        try:
            with open(target, "r", encoding="utf-8", errors="replace") as f:
                lines = f.readlines()

            total_lines = len(lines)
            start_idx = max(0, start_line - 1)
            end_idx = min(total_lines, end_line)

            numbered_lines = [
                f"{i + 1:4d} | {lines[i]}" for i in range(start_idx, end_idx)
            ]

            rel_path = str(target)
            try:
                rel_path = str(target.relative_to(self.workspace_root))
            except Exception:
                pass

            return {
                "tool": "READ_FILE",
                "success": True,
                "filepath": str(target),
                "filename": target.name,
                "rel_path": rel_path,
                "total_lines": total_lines,
                "showing_lines": f"{start_line}-{end_idx}",
                "content": "".join(numbered_lines),
                "message": f"Read lines {start_line}-{end_idx} of {target.name}"
            }
        except Exception as e:
            return {
                "tool": "READ_FILE",
                "success": False,
                "filepath": str(target),
                "error": f"Failed to read file: {e}"
            }

    # =========================================================================
    # TOOL 5: EDIT CODE
    # =========================================================================
    def tool_edit_code(self, filepath: str, old_code: str, new_code: str) -> Dict[str, Any]:
        """
        Performs surgical code replacement inside a target file with real-time diff tracking.
        """
        logger.info(f"[TOOL: EDIT_CODE] Modifying file: {filepath}")
        clean_path = filepath.strip()
        if "/run/media/.../" in clean_path:
            clean_path = clean_path.replace("/run/media/.../", "/run/media/yashz/")
        elif "/media/.../" in clean_path:
            clean_path = clean_path.replace("/media/.../", "/run/media/yashz/")
        elif "/run/media/..." in clean_path:
            clean_path = clean_path.replace("/run/media/...", "/run/media/yashz")

        if "KIOXIA_USB" in clean_path and "/run/media" not in clean_path and "/media" not in clean_path:
            clean_path = re.sub(r'(?:/home/[^/\s]+/Desktop/[^/\s]+(?: [^/\s]+)*/)?KIOXIA_USB', '/run/media/yashz/KIOXIA_USB', clean_path)

        target = Path(clean_path)
        if not target.is_absolute():
            target = (self.workspace_root / target).resolve()
        else:
            target = target.resolve()

        rel_path = str(target)
        try:
            rel_path = str(target.relative_to(self.workspace_root))
        except Exception:
            pass

        # If target file does not exist, auto-create it with new_code
        if not target.exists() or not target.is_file():
            try:
                target.parent.mkdir(parents=True, exist_ok=True)
                with open(target, "w", encoding="utf-8") as f:
                    f.write(new_code)
                lines_added = len(new_code.splitlines())
                diff_lines = list(difflib.unified_diff(
                    [],
                    new_code.splitlines(keepends=True),
                    fromfile="/dev/null",
                    tofile=f"b/{rel_path}",
                    n=3
                ))
                return {
                    "tool": "EDIT_CODE",
                    "success": True,
                    "filepath": str(target),
                    "filename": target.name,
                    "rel_path": rel_path,
                    "lines_added": lines_added,
                    "lines_removed": 0,
                    "diff": "".join(diff_lines),
                    "old_code": "",
                    "new_code": new_code,
                    "message": f"Created new file '{rel_path}' and wrote content (+{lines_added} lines)."
                }
            except Exception as e:
                return {
                    "tool": "EDIT_CODE",
                    "success": False,
                    "filepath": str(target),
                    "filename": target.name,
                    "rel_path": rel_path,
                    "message": f"Target file did not exist and could not be created: {str(e)}"
                }

        try:
            with open(target, "r", encoding="utf-8") as f:
                content = f.read()

            if old_code not in content:
                # Try normalized whitespace match
                normalized_content = "\n".join(line.rstrip() for line in content.splitlines())
                normalized_old = "\n".join(line.rstrip() for line in old_code.splitlines())
                if normalized_old not in normalized_content:
                    return {
                        "tool": "EDIT_CODE",
                        "success": False,
                        "filepath": str(target),
                        "filename": target.name,
                        "rel_path": rel_path,
                        "message": "Target old_code chunk not found in file. Please verify with READ_FILE first."
                    }
                content = normalized_content
                old_code = normalized_old

            count = content.count(old_code)
            if count > 1:
                logger.warning(f"Multiple ({count}) matches found for replacement in {target.name}. Replacing first occurrence.")

            new_content = content.replace(old_code, new_code, 1)

            # Calculate line changes & unified diff
            lines_added = len(new_code.splitlines())
            lines_removed = len(old_code.splitlines())
            diff_lines = list(difflib.unified_diff(
                old_code.splitlines(keepends=True),
                new_code.splitlines(keepends=True),
                fromfile=f"a/{rel_path}",
                tofile=f"b/{rel_path}",
                n=3
            ))
            diff_text = "".join(diff_lines)

            # Backup original
            backup_path = target.with_suffix(target.suffix + ".bak")
            with open(backup_path, "w", encoding="utf-8") as f:
                f.write(content)

            # Write updated code
            with open(target, "w", encoding="utf-8") as f:
                f.write(new_content)

            return {
                "tool": "EDIT_CODE",
                "success": True,
                "filepath": str(target),
                "filename": target.name,
                "rel_path": rel_path,
                "lines_added": lines_added,
                "lines_removed": lines_removed,
                "diff": diff_text,
                "old_code": old_code,
                "new_code": new_code,
                "backup_saved": str(backup_path),
                "message": f"Successfully edited {rel_path} (+{lines_added} / -{lines_removed} lines)."
            }
        except Exception as e:
            return {
                "tool": "EDIT_CODE",
                "success": False,
                "filepath": str(target),
                "filename": target.name,
                "rel_path": rel_path,
                "message": f"Failed to edit code: {str(e)}"
            }

    # =========================================================================
    # TOOL 6: WRITE / CREATE FILE
    # =========================================================================
    def tool_write_file(self, filepath: str, content: str) -> Dict[str, Any]:
        """
        Creates or overwrites a file with content inside the project directory.
        Calculates line counts, unified diff, and relative path for Antigravity UI telemetry.
        """
        clean_path = filepath.strip()
        if "/run/media/.../" in clean_path:
            clean_path = clean_path.replace("/run/media/.../", "/run/media/yashz/")
        elif "/media/.../" in clean_path:
            clean_path = clean_path.replace("/media/.../", "/run/media/yashz/")
        elif "/run/media/..." in clean_path:
            clean_path = clean_path.replace("/run/media/...", "/run/media/yashz")

        if "KIOXIA_USB" in clean_path and "/run/media" not in clean_path and "/media" not in clean_path:
            clean_path = re.sub(r'(?:/home/[^/\s]+/Desktop/[^/\s]+(?: [^/\s]+)*/)?KIOXIA_USB', '/run/media/yashz/KIOXIA_USB', clean_path)

        target = Path(clean_path)
        if not target.is_absolute():
            target = (self.workspace_root / target).resolve()
        else:
            target = target.resolve()

        try:
            rel_path = str(target.relative_to(self.workspace_root))
        except ValueError:
            rel_path = str(target)

        old_content = ""
        if target.exists() and target.is_file():
            try:
                with open(target, "r", encoding="utf-8", errors="replace") as f:
                    old_content = f.read()
            except Exception:
                old_content = ""

        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            with open(target, "w", encoding="utf-8") as f:
                f.write(content)

            lines_added = len(content.splitlines())
            lines_removed = len(old_content.splitlines()) if old_content else 0

            diff_lines = list(difflib.unified_diff(
                old_content.splitlines(keepends=True),
                content.splitlines(keepends=True),
                fromfile=f"a/{rel_path}" if old_content else "/dev/null",
                tofile=f"b/{rel_path}",
                n=3
            ))
            diff_text = "".join(diff_lines)

            return {
                "tool": "WRITE_FILE",
                "success": True,
                "filepath": str(target),
                "filename": target.name,
                "rel_path": rel_path,
                "lines_added": lines_added,
                "lines_removed": lines_removed,
                "diff": diff_text,
                "bytes_written": len(content.encode("utf-8")),
                "message": f"File successfully written to '{rel_path}' (+{lines_added} / -{lines_removed} lines)."
            }
        except Exception as e:
            return {
                "tool": "WRITE_FILE",
                "success": False,
                "filepath": str(target),
                "filename": target.name,
                "rel_path": rel_path,
                "message": f"Write failed: {str(e)}"
            }

    # =========================================================================
    # TOOL 7: LIST FILES & DIRECTORY
    # =========================================================================
    def tool_list_files(self, directory: str = ".", pattern: str = "*", recursive: bool = False) -> Dict[str, Any]:
        """
        Lists files, sizes, and timestamps inside a directory.
        """
        clean_dir = directory.strip()
        if "/run/media/.../" in clean_dir:
            clean_dir = clean_dir.replace("/run/media/.../", "/run/media/yashz/")
        elif "/media/.../" in clean_dir:
            clean_dir = clean_dir.replace("/media/.../", "/run/media/yashz/")
        elif "/run/media/..." in clean_dir:
            clean_dir = clean_dir.replace("/run/media/...", "/run/media/yashz")

        if "KIOXIA_USB" in clean_dir and "/run/media" not in clean_dir and "/media" not in clean_dir:
            clean_dir = re.sub(r'(?:/home/[^/\s]+/Desktop/[^/\s]+(?: [^/\s]+)*/)?KIOXIA_USB', '/run/media/yashz/KIOXIA_USB', clean_dir)

        target = Path(clean_dir)
        if not target.is_absolute():
            target = (self.workspace_root / target).resolve()
        else:
            target = target.resolve()

        if not target.exists() or not target.is_dir():
            return {
                "tool": "LIST_FILES",
                "success": False,
                "directory": str(target),
                "message": f"Directory does not exist: {target}"
            }

        try:
            items = []
            files_gen = target.rglob(pattern) if recursive else target.glob(pattern)
            for p in sorted(files_gen)[:80]:
                if any(part.startswith(".") for part in p.parts if part not in [".", "..", ".phantom_quarantine"]):
                    continue
                if "__pycache__" in p.parts or "node_modules" in p.parts:
                    continue

                items.append({
                    "name": p.name,
                    "rel_path": str(p.relative_to(target)),
                    "is_dir": p.is_dir(),
                    "size_bytes": p.stat().st_size if p.is_file() else 0
                })

            return {
                "tool": "LIST_FILES",
                "success": True,
                "directory": str(target),
                "total_items": len(items),
                "items": items
            }
        except Exception as e:
            return {
                "tool": "LIST_FILES",
                "success": False,
                "directory": str(target),
                "message": f"Listing error: {str(e)}"
            }

    # =========================================================================
    # TOOL 8: LIST PROCESSES
    # =========================================================================
    def tool_list_processes(self, filter_kw: Optional[str] = None) -> Dict[str, Any]:
        """
        Lists active operating system processes with PID, user, cmdline, and CPU/mem.
        """
        procs = []
        kw = filter_kw.strip().lower() if filter_kw else ""
        for p in psutil.process_iter(['pid', 'name', 'cmdline', 'cpu_percent', 'memory_percent']):
            try:
                cmd = " ".join(p.info.get('cmdline') or [])
                name = p.info.get('name') or ""
                if kw:
                    if kw not in name.lower() and kw not in cmd.lower():
                        continue
                procs.append({
                    "pid": p.info['pid'],
                    "name": name,
                    "cmdline": cmd[:150],
                    "cpu": round(p.info.get('cpu_percent') or 0, 1),
                    "mem": round(p.info.get('memory_percent') or 0, 1)
                })
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        return {
            "tool": "LIST_PROCESSES",
            "success": True,
            "filter": filter_kw,
            "count": len(procs),
            "processes": procs[:25]
        }

    # =========================================================================
    # TOOL 9: DETECT USB DRIVES & PERIPHERALS
    # =========================================================================
    def tool_detect_usb(self) -> Dict[str, Any]:
        """
        Discovers all plugged-in physical USB storage devices, hardware IDs,
        vendor names, partition sizes, and file system mount points.
        """
        try:
            from backend.agent.hardware_agent import hardware_agent
            topology = hardware_agent.get_hardware_topology(force_refresh=True)
            storage = topology.get("storage_devices", [])
            peripherals = topology.get("peripherals", [])

            mounts = []
            for d in storage:
                mp = d.get("mount_point")
                if mp and mp != "E:\\" and os.path.exists(mp):
                    mounts.append({
                        "device_name": d.get("device_name"),
                        "vendor_name": d.get("vendor_name"),
                        "mount_point": mp,
                        "capacity_gb": d.get("capacity_gb"),
                        "filesystem": d.get("filesystem"),
                        "active_threats": d.get("active_threats", [])
                    })

            # Direct fallback for Linux media folders
            if not mounts and sys.platform.startswith("linux"):
                for media_root in ("/run/media", "/media", "/mnt"):
                    if os.path.exists(media_root):
                        for root, dirs, files in os.walk(media_root):
                            if root != media_root and os.path.ismount(root):
                                mounts.append({
                                    "device_name": os.path.basename(root),
                                    "mount_point": root,
                                    "capacity_gb": 0
                                })

            return {
                "tool": "DETECT_USB",
                "success": True,
                "connected_count": len(storage),
                "storage_devices": storage,
                "mounted_drives": mounts,
                "mount_points": [m["mount_point"] for m in mounts],
                "message": f"Found {len(storage)} USB storage device(s) and {len(mounts)} active mount point(s): {', '.join([m['mount_point'] for m in mounts]) if mounts else 'None'}"
            }
        except Exception as e:
            return {
                "tool": "DETECT_USB",
                "success": False,
                "error": str(e)
            }

    # =========================================================================
    # DISPATCHER
    # =========================================================================
    def execute_tool(self, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Executes a tool by name and returns observation dictionary."""
        name = tool_name.upper().strip()
        if name == "RUN_COMMAND":
            return self.tool_run_command(
                command=args.get("command", ""),
                cwd=args.get("cwd"),
                timeout=args.get("timeout", 30)
            )
        elif name == "KILL_PROCESS":
            return self.tool_kill_process(
                pid=args.get("pid"),
                name_pattern=args.get("name_pattern"),
                signal=args.get("signal", "SIGKILL")
            )
        elif name == "KILL_FILE":
            return self.tool_kill_file(
                filepath=args.get("filepath", ""),
                permanent=args.get("permanent", False),
                quarantine=args.get("quarantine", True)
            )
        elif name == "READ_FILE":
            return self.tool_read_file(
                filepath=args.get("filepath", ""),
                start_line=args.get("start_line", 1),
                end_line=args.get("end_line", 250)
            )
        elif name == "EDIT_CODE":
            return self.tool_edit_code(
                filepath=args.get("filepath", ""),
                old_code=args.get("old_code", ""),
                new_code=args.get("new_code", "")
            )
        elif name == "WRITE_FILE":
            return self.tool_write_file(
                filepath=args.get("filepath", ""),
                content=args.get("content", "")
            )
        elif name == "LIST_FILES":
            return self.tool_list_files(
                directory=args.get("directory", "."),
                pattern=args.get("pattern", "*"),
                recursive=args.get("recursive", False)
            )
        elif name == "LIST_PROCESSES":
            return self.tool_list_processes(
                filter_kw=args.get("filter_kw")
            )
        elif name == "DETECT_USB":
            return self.tool_detect_usb()
        else:
            return {
                "tool": tool_name,
                "success": False,
                "error": f"Unknown tool: '{tool_name}'"
            }

    # =========================================================================
    # AUTONOMOUS REACT AGENT STREAMING LOOP
    # =========================================================================
    async def stream_mission(
        self,
        mission_goal: str,
        max_steps: int = 8,
        session_id: Optional[str] = None,
        history: Optional[List[Dict[str, Any]]] = None
    ):
        """
        Executes an autonomous mission on the host OS using the local model,
        yielding real-time execution events (STEP_START, THINKING_CHUNK, TOOL_START,
        TOOL_COMPLETE, STEP_COMPLETE, MISSION_COMPLETE) for live Antigravity UX.
        """
        sid = session_id or f"mission_{int(time.time())}"
        start_time = time.time()
        steps_log: List[Dict[str, Any]] = []

        logger.info(f"=== Starting Autonomous Mission [{sid}]: {mission_goal} ===")

        # Fast-path for conversational greetings
        goal_lower = mission_goal.strip().lower()
        greetings = ["hi", "hello", "hey", "hola", "sup", "greetings", "good morning", "good evening", "how are you"]
        if goal_lower in greetings or goal_lower in ["hi!", "hello!", "hey!"]:
            yield {
                "type": "STEP_START",
                "session_id": sid,
                "step": 1,
                "max_steps": 1,
                "goal": mission_goal
            }
            yield {
                "type": "THINKING_COMPLETE",
                "session_id": sid,
                "step": 1,
                "thinking": "User greeted. Responding conversationally without running OS commands."
            }
            yield {
                "type": "MISSION_COMPLETE",
                "session_id": sid,
                "goal": mission_goal,
                "status": "COMPLETED",
                "final_summary": "Hello! I am the PHANTOM Antigravity Agent powered by DeepSeek-R1. I have direct terminal execution, process kill, file quarantine, and code editing authority on this system.\n\nTell me what you'd like to do — for example:\n- `kill process <PID>`\n- `run command <bash>`\n- `delete file <path>`\n- `edit code in <file>`",
                "total_steps": 0,
                "elapsed_ms": 1.2,
                "steps": []
            }
            return

        # Available Tools Catalog
        tools_catalog = (
            "You are PHANTOM Autonomous Operator Agent running directly on Kali Linux with OS command authority.\n"
            "You can run terminal commands, kill rogue processes/processors, delete/quarantine files, and edit code inside the folder.\n\n"
            "### AVAILABLE TOOLS:\n"
            "1. RUN_COMMAND: {'command': 'bash command string', 'cwd': 'optional dir path'}\n"
            "2. KILL_PROCESS: {'pid': integer_pid, 'name_pattern': 'string pattern to match'}\n"
            "3. KILL_FILE: {'filepath': 'path to file', 'permanent': false, 'quarantine': true}\n"
            "4. READ_FILE: {'filepath': 'path to file', 'start_line': 1, 'end_line': 100}\n"
            "5. EDIT_CODE: {'filepath': 'path to file', 'old_code': 'exact string to replace', 'new_code': 'replacement string'}\n"
            "6. WRITE_FILE: {'filepath': 'path to file', 'content': 'full file content'}\n"
            "7. LIST_FILES: {'directory': 'path or .', 'pattern': '*'}\n"
            "8. LIST_PROCESSES: {'filter_kw': 'optional search keyword'}\n"
            "9. DETECT_USB: {}\n"
            "10. FINISH: {'summary': 'Comprehensive summary of what was accomplished and current system state'}\n\n"
            "### CRITICAL RULES:\n"
            "- To detect or work with USB drives, first call DETECT_USB to discover connected flash drives and their mount points (e.g. /run/media/yashz/KIOXIA_USB). Then use WRITE_FILE, READ_FILE, or LIST_FILES inside that mount path.\n"
            "- Always wrap paths that have spaces (e.g. 'PHANTOM USB' or 'KIOXIA USB') in double quotes in bash commands.\n"
            "- If the user's input is a greeting or general question, DO NOT run bash commands like 'echo hi'. Return action: 'FINISH' with your helpful response in 'summary'.\n"
            "- Only use RUN_COMMAND, KILL_PROCESS, KILL_FILE, or EDIT_CODE when an actual OS action, process kill, file removal, or code editing task is requested.\n\n"
            "### STRICT OUTPUT FORMAT:\n"
            "You MUST first think inside <think>...</think> tags.\n"
            "Then, output a SINGLE JSON object with your action:\n"
            "{\n"
            '  "action": "TOOL_NAME",\n'
            '  "args": { ... tool parameters ... },\n'
            '  "reason": "1-sentence tactical explanation"\n'
            "}\n"
            "If your mission is complete, set action to 'FINISH'.\n"
            "Output ONLY the JSON after </think>. Do NOT enclose with markdown triple backticks."
        )

        conversation_history: List[str] = []
        if history:
            history_lines = ["PREVIOUS CONVERSATION CONTEXT:"]
            for h in history[-4:]:
                role = str(h.get("role", "user")).upper()
                content = str(h.get("content", "")).strip()
                if content:
                    history_lines.append(f"{role}: {content[:350]}")
            conversation_history.append("\n".join(history_lines))

        # Discover active USB mounts directly to ground LLM in reality
        usb_info_lines = []
        try:
            from backend.agent.hardware_agent import hardware_agent
            topo = hardware_agent.get_hardware_topology(force_refresh=False)
            for dev in topo.get("storage_devices", []):
                mp = dev.get("mount_point")
                if mp and mp != "E:\\" and os.path.exists(mp):
                    name = dev.get("device_name") or dev.get("model") or "USB Storage"
                    usb_info_lines.append(f"• USB Device '{name}' is MOUNTED at: {mp}")
        except Exception:
            pass

        if not usb_info_lines and sys.platform.startswith("linux"):
            for root_dir in ("/run/media/yashz", "/run/media", "/media/yashz", "/media"):
                if os.path.exists(root_dir):
                    for entry in os.listdir(root_dir):
                        full = os.path.join(root_dir, entry)
                        if os.path.ismount(full):
                            usb_info_lines.append(f"• USB Device '{entry}' is MOUNTED at: {full}")

        usb_context_str = "\n".join(usb_info_lines) if usb_info_lines else "None currently mounted."

        conversation_history.append(
            f"MISSION GOAL: {mission_goal}\n"
            f"WORKSPACE ROOT: {self.workspace_root}\n"
            f"ACTIVE MOUNTED USB DRIVES ON THIS SYSTEM:\n{usb_context_str}\n"
            f"(CRITICAL: When the user asks to create or inspect files on a USB drive, use the EXACT mount path above, such as /run/media/yashz/KIOXIA_USB. Never invent paths with '...' and never create folders in the project workspace!)"
        )

        final_summary = "Mission ended."
        status = "COMPLETED"

        for step_idx in range(1, max_steps + 1):
            step_prompt = "\n\n".join(conversation_history)
            logger.info(f"[STEP {step_idx}/{max_steps}] Querying local DeepSeek model...")

            # Broadcast step initiation to UI
            await self._broadcast_event({
                "type": "AGENT_STEP_STARTED",
                "session_id": sid,
                "step": step_idx,
                "max_steps": max_steps,
                "goal": mission_goal
            })

            yield {
                "type": "STEP_START",
                "session_id": sid,
                "step": step_idx,
                "max_steps": max_steps,
                "goal": mission_goal
            }

            thinking = ""
            body = ""

            try:
                # Stream from Ollama
                async for chunk in glm_client.astream_generate(
                    prompt=step_prompt,
                    system=tools_catalog,
                    temperature=0.1
                ):
                    c_type = chunk.get("type")
                    if c_type == "thinking":
                        th_piece = chunk.get("chunk", "")
                        thinking += th_piece
                        yield {
                            "type": "THINKING_CHUNK",
                            "session_id": sid,
                            "step": step_idx,
                            "chunk": th_piece
                        }
                    elif c_type == "done":
                        thinking = chunk.get("thinking") or thinking
                        body = chunk.get("response") or ""
                        yield {
                            "type": "THINKING_COMPLETE",
                            "session_id": sid,
                            "step": step_idx,
                            "thinking": thinking
                        }

                # Fallback if body is empty or thinking tags present in body
                if not body and thinking:
                    body = thinking
                    thinking = ""

                if "<think>" in body and "</think>" in body:
                    t_start = body.find("<think>") + 7
                    t_end = body.find("</think>")
                    if not thinking:
                        thinking = body[t_start:t_end].strip()
                    body = body[t_end + 8:].strip()

                logger.debug(f"[STEP {step_idx}] LLM Body:\n{body[:400]}")

                # Clean markdown code blocks if any
                clean_body = re.sub(r"^```(?:json)?", "", body.strip(), flags=re.MULTILINE)
                clean_body = re.sub(r"```$", "", clean_body.strip(), flags=re.MULTILINE).strip()

                # Parse JSON using JSONDecoder.raw_decode
                action_data = None
                start_brace = clean_body.find("{")
                start_bracket = clean_body.find("[")

                if start_brace != -1 and (start_bracket == -1 or start_brace < start_bracket):
                    try:
                        decoder = json.JSONDecoder()
                        parsed, _ = decoder.raw_decode(clean_body[start_brace:])
                        action_data = parsed
                    except Exception as ex:
                        logger.warning(f"JSON raw_decode error: {ex}")

                elif start_bracket != -1:
                    try:
                        decoder = json.JSONDecoder()
                        parsed, _ = decoder.raw_decode(clean_body[start_bracket:])
                        action_data = {"actions": parsed}
                    except Exception as ex:
                        logger.warning(f"JSON list raw_decode error: {ex}")

                if not action_data:
                    match = re.search(r'\{[^{}]*\}', clean_body)
                    if match:
                        try:
                            action_data = json.loads(match.group(0))
                        except Exception:
                            pass

                if not action_data:
                    logger.warning(f"Could not parse valid action JSON. Body: {clean_body[:200]}")
                    action_data = {
                        "action": "FINISH",
                        "args": {"summary": clean_body[:300]},
                        "reason": "Completed observation or non-tool reply."
                    }

                # Normalize to list of actions
                action_list = []
                if "actions" in action_data and isinstance(action_data["actions"], list):
                    action_list = action_data["actions"]
                elif "action" in action_data:
                    action_list = [action_data]
                elif "tool" in action_data:
                    action_list = [{"action": action_data["tool"], "args": action_data.get("args") or action_data.get("parameters") or {}, "reason": action_data.get("reason", "")}]
                else:
                    found_tool = False
                    for k, v in action_data.items():
                        if k.upper() in ["RUN_COMMAND", "KILL_PROCESS", "KILL_FILE", "READ_FILE", "EDIT_CODE", "WRITE_FILE", "LIST_FILES", "LIST_PROCESSES", "FINISH"]:
                            action_list.append({"action": k, "args": v if isinstance(v, dict) else {"target": v}, "reason": "Direct tool mapping"})
                            found_tool = True
                            break
                    if not found_tool:
                        action_list = [{"action": "FINISH", "args": {"summary": json.dumps(action_data)[:300]}, "reason": "No recognized tool"}]

                # Process all actions in this step
                step_finished = False
                for act in action_list:
                    action_name = str(act.get("action", "")).upper().strip()
                    action_args = act.get("args", {})
                    action_reason = act.get("reason", "")

                    logger.info(f"[STEP {step_idx}] Executing Action: {action_name} | Args: {action_args}")

                    # Check if Agent declared FINISH
                    if action_name == "FINISH":
                        final_summary = action_args.get("summary") or action_reason or ""
                        if not final_summary or final_summary == "Mission completed successfully.":
                            if steps_log:
                                last_s = steps_log[-1]
                                last_tool = last_s.get("action")
                                last_res = last_s.get("result", {})
                                if last_tool == "READ_FILE" and last_res.get("content"):
                                    final_summary = f"Content of `{last_res.get('filename')}`:\n\n```\n{last_res.get('content', '').strip()}\n```"
                                elif last_tool in ("EDIT_CODE", "WRITE_FILE"):
                                    final_summary = last_res.get("message") or f"Successfully modified `{last_res.get('rel_path')}`."
                                elif last_tool == "RUN_COMMAND":
                                    final_summary = f"Command `{last_res.get('command')}` completed successfully."
                                elif last_res.get("message"):
                                    final_summary = last_res.get("message")
                            if not final_summary:
                                final_summary = "Mission completed successfully."

                        step_record = {
                            "step": step_idx,
                            "thinking": thinking,
                            "action": "FINISH",
                            "args": action_args,
                            "reason": action_reason,
                            "result": {"status": "GOAL_REACHED", "summary": final_summary},
                            "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
                        }
                        steps_log.append(step_record)
                        yield {
                            "type": "STEP_COMPLETE",
                            "session_id": sid,
                            "step": step_idx,
                            "step_record": step_record
                        }
                        await self._broadcast_event({
                            "type": "AGENT_STEP_COMPLETE",
                            "session_id": sid,
                            "step": step_idx,
                            "data": step_record
                        })
                        step_finished = True
                        break

                    # 1. Yield TOOL_START so UI displays active tool right away
                    yield {
                        "type": "TOOL_START",
                        "session_id": sid,
                        "step": step_idx,
                        "action": action_name,
                        "args": action_args,
                        "reason": action_reason
                    }

                    # 2. Execute requested tool
                    t_exec_start = time.time()
                    tool_result = self.execute_tool(action_name, action_args)
                    tool_duration_ms = round((time.time() - t_exec_start) * 1000, 2)
                    tool_result["duration_ms"] = tool_duration_ms

                    # 3. Yield TOOL_COMPLETE with diffs, lines changed, duration
                    yield {
                        "type": "TOOL_COMPLETE",
                        "session_id": sid,
                        "step": step_idx,
                        "action": action_name,
                        "args": action_args,
                        "reason": action_reason,
                        "result": tool_result
                    }

                    step_record = {
                        "step": step_idx,
                        "thinking": thinking,
                        "action": action_name,
                        "args": action_args,
                        "reason": action_reason,
                        "result": tool_result,
                        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
                    }
                    steps_log.append(step_record)

                    # 4. Yield STEP_COMPLETE
                    yield {
                        "type": "STEP_COMPLETE",
                        "session_id": sid,
                        "step": step_idx,
                        "step_record": step_record
                    }
                    await self._broadcast_event({
                        "type": "AGENT_STEP_COMPLETE",
                        "session_id": sid,
                        "step": step_idx,
                        "data": step_record
                    })

                    # Feed observation back into next turn
                    observation_str = f"STEP {step_idx} RESULT ({action_name}):\n{json.dumps(tool_result, indent=2)}"
                    conversation_history.append(f"AI STEP {step_idx}:\nAction: {action_name}\nArgs: {json.dumps(action_args)}\n\n{observation_str}")

                if step_finished:
                    break

            except Exception as e:
                logger.error(f"Error in agent step {step_idx}: {e}", exc_info=True)
                step_record = {
                    "step": step_idx,
                    "thinking": "Exception occurred during execution cycle.",
                    "action": "ERROR",
                    "args": {},
                    "reason": str(e),
                    "result": {"error": str(e)},
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
                }
                steps_log.append(step_record)
                yield {
                    "type": "STEP_COMPLETE",
                    "session_id": sid,
                    "step": step_idx,
                    "step_record": step_record
                }
                break
        else:
            status = "MAX_STEPS_REACHED"
            final_summary = f"Reached maximum allowed steps ({max_steps}) without explicit finish declaration."

        elapsed_ms = round((time.time() - start_time) * 1000, 2)
        if final_summary == "Mission ended." and steps_log:
            final_summary = f"Completed {len(steps_log)} action(s) successfully."

        mission_report = {
            "session_id": sid,
            "goal": mission_goal,
            "status": status,
            "final_summary": final_summary,
            "total_steps": len([s for s in steps_log if s.get("action") != "FINISH"]),
            "elapsed_ms": elapsed_ms,
            "steps": [s for s in steps_log if s.get("action") != "FINISH"],
            "completed_at": datetime.datetime.utcnow().isoformat() + "Z"
        }

        # Save to database
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO alerts (session_id, alert_type, severity, title, description, mitre_technique, status, created_at)
                VALUES (?, 'AUTONOMOUS_OPERATOR_MISSION', 'HIGH', ?, ?, 'T1059', 'RESOLVED', ?)
            """, (
                sid,
                f"Autonomous Agent Mission: {mission_goal[:60]}",
                f"Executed {len(steps_log)} tool actions in {elapsed_ms}ms. Final: {final_summary[:120]}",
                datetime.datetime.utcnow().isoformat() + "Z"
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.debug(f"Failed to record mission in DB: {e}")

        # Broadcast final report
        await self._broadcast_event({
            "type": "AGENT_MISSION_FINISHED",
            "session_id": sid,
            "report": mission_report
        })

        yield {
            "type": "MISSION_COMPLETE",
            "session_id": sid,
            "goal": mission_goal,
            "status": status,
            "final_summary": final_summary,
            "total_steps": len([s for s in steps_log if s.get("action") != "FINISH"]),
            "elapsed_ms": elapsed_ms,
            "steps": [s for s in steps_log if s.get("action") != "FINISH"],
            "completed_at": mission_report["completed_at"]
        }

    async def run_mission(
        self,
        mission_goal: str,
        max_steps: int = 8,
        session_id: Optional[str] = None,
        history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Executes an autonomous mission on the host OS using the local model.
        Loops: Observe -> DeepSeek <think> Reason -> Action (Tool) -> Verification.
        """
        mission_report = None
        async for event in self.stream_mission(mission_goal, max_steps, session_id, history):
            if event.get("type") == "MISSION_COMPLETE":
                mission_report = event

        return mission_report or {
            "session_id": session_id or "mission_default",
            "goal": mission_goal,
            "status": "COMPLETED",
            "final_summary": "Mission completed.",
            "total_steps": 0,
            "elapsed_ms": 0,
            "steps": []
        }

    async def _broadcast_event(self, event_data: Dict[str, Any]):
        """Broadcasts WebSocket telemetry to connected clients."""
        try:
            await ws_manager.broadcast_live(event_data)
        except Exception:
            pass


# Global singleton instance
autonomous_operator = AutonomousOperatorAgent()
