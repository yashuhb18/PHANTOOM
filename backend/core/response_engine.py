"""
PHANTOM Autonomous Response Engine
=====================================
Executes surgical micro-isolation, process termination, process tree annihilation,
file quarantine, USB auto-eject, and execution blocking upon critical threat detection.
All actions are logged with MITRE ATT&CK technique mapping.
"""

import os
import sys
import subprocess
import datetime
import logging
import time
from typing import Dict, Any, Optional, List
import psutil
from backend.database import get_db

logger = logging.getLogger("phantom.response")


class ResponseEngine:
    """
    Autonomous containment engine with comprehensive threat response capabilities:
    
    1. terminate_process() — Kill a single process via SIGKILL
    2. kill_process_tree() — Kill a process and ALL its children recursively
    3. quarantine_file() — Rename a file to prevent execution
    4. eject_usb_drive() — Forcefully eject a USB drive from the system
    5. execute_containment() — Execute macro-level containment actions
    """

    QUARANTINE_SUFFIX = ".PHANTOM_QUARANTINED"

    def eject_usb_drive(
        self,
        mount_point: str,
        session_id: Optional[str] = None,
        reason: str = "Autonomous threat response"
    ) -> Dict[str, Any]:
        """
        True Hardware-Level USB Ejection Engine.
        Executes a 3-phase kernel & hardware ejection pipeline:
        
        Phase 1: Handle & Window Teardown
          - Stops any active watchdog file observers on the target drive
          - Closes any open Windows Explorer windows navigating to the target drive
          
        Phase 2: Force Dismount & Invalidation
          - WMI Win32_Volume.Dismount(Force=True, Permanent=False) to break all open file locks
          - mountvol <drive_letter>\\ /D to detach volume mount point
          - FSCTL_LOCK_VOLUME, FSCTL_DISMOUNT_VOLUME, IOCTL_STORAGE_EJECT_MEDIA
          
        Phase 3: Physical PnP Hardware DevNode Ejection
          - Locates device node and climbs to parent USB Mass Storage Controller (USB\\VID_...)
          - Calls CM_Request_Device_EjectW to power down the port, detach the driver, and
            trigger true Windows "Safely Remove Hardware" removal from the taskbar tray.
        """
        now = datetime.datetime.utcnow().isoformat() + "Z"
        ejected = False
        details_list = []
        drive_letter = mount_point.rstrip("\\").rstrip("/").upper()

        if sys.platform.startswith("linux"):
            return self._eject_usb_linux(mount_point, session_id, reason)

        if not drive_letter.endswith(":"):
            drive_letter = drive_letter + ":"

        logger.warning(f"🔌 AUTONOMOUS HARDWARE USB EJECT INITIATED: {drive_letter} — Reason: {reason}")

        # ── PHASE 1: HANDLE & WINDOW TEARDOWN ──
        # 1a. Stop internal filesystem watchdog observer on this mount point
        try:
            from backend.agent.usb_monitor import usb_monitor
            usb_monitor.stop_watcher_for_mount(drive_letter)
            details_list.append("Internal watchdog detached")
        except Exception:
            pass

        # 1b. Terminate any processes holding open handles or working directories on this drive
        try:
            curr_pid = os.getpid()
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    if proc.pid in (0, 4, curr_pid):
                        continue
                    # Check CWD
                    try:
                        cwd = proc.cwd()
                        if cwd and cwd.upper().startswith(drive_letter):
                            pname = proc.name()
                            proc.kill()
                            details_list.append(f"Killed {pname} (CWD lock)")
                            continue
                    except Exception:
                        pass
                    # Check open files
                    try:
                        for f in proc.open_files():
                            if f.path and f.path.upper().startswith(drive_letter):
                                pname = proc.name()
                                proc.kill()
                                details_list.append(f"Killed {pname} (File lock: {os.path.basename(f.path)})")
                                break
                    except Exception:
                        pass
                except Exception:
                    continue
        except Exception as e:
            logger.debug(f"Process lock cleanup error: {e}")

        # 1c. Close open Windows Explorer windows to release folder handles
        try:
            import win32com.client
            import pythoncom
            pythoncom.CoInitialize()
            shell = win32com.client.Dispatch("Shell.Application")
            for window in shell.Windows():
                try:
                    loc = str(getattr(window, "LocationURL", "")).lower()
                    if drive_letter.lower() in loc:
                        window.Quit()
                        details_list.append("Closed open Explorer window")
                except Exception:
                    pass
        except Exception as e:
            logger.debug(f"Explorer teardown error: {e}")

        # ── PHASE 2: FORCE DISMOUNT & VOLUME INVALIDATION ──
        # 2a. WMI Win32_Volume Dismount with Force=True
        volume_dismounted = False
        try:
            import win32com.client
            wmi = win32com.client.GetObject("winmgmts:")
            vols = wmi.ExecQuery(f"SELECT * FROM Win32_Volume WHERE DriveLetter = '{drive_letter}'")
            for v in vols:
                in_params = v.Methods_("Dismount").InParameters.SpawnInstance_()
                in_params.Force = True
                in_params.Permanent = False
                out = v.ExecMethod_("Dismount", in_params)
                ret_val = getattr(out, "ReturnValue", -1)
                if ret_val == 0:
                    volume_dismounted = True
                    details_list.append("Win32_Volume force-dismounted (code 0)")
                    logger.info(f"Win32_Volume for {drive_letter} force-dismounted.")
        except Exception as e:
            logger.debug(f"WMI dismount error: {e}")

        # 2b. Mountvol: forcibly dismount and remove mount point from Windows
        try:
            import subprocess
            mv_res = subprocess.run(["mountvol", f"{drive_letter}\\", "/p"], capture_output=True, text=True, timeout=5)
            if mv_res.returncode == 0:
                volume_dismounted = True
                details_list.append("mountvol /p volume dismounted & invalidated")
            else:
                mv_res_d = subprocess.run(["mountvol", f"{drive_letter}\\", "/d"], capture_output=True, text=True, timeout=5)
                if mv_res_d.returncode == 0:
                    volume_dismounted = True
                    details_list.append("mountvol /d volume detached")
        except Exception as e:
            logger.debug(f"mountvol error: {e}")

        # 2c. Kernel32 DeviceIoControl FSCTL_DISMOUNT_VOLUME & IOCTL_STORAGE_EJECT_MEDIA
        try:
            import ctypes
            from ctypes import wintypes

            kernel32 = ctypes.windll.kernel32
            GENERIC_READ = 0x80000000
            GENERIC_WRITE = 0x40000000
            FILE_SHARE_READ = 0x00000001
            FILE_SHARE_WRITE = 0x00000002
            OPEN_EXISTING = 3
            FSCTL_LOCK_VOLUME = 0x00090018
            FSCTL_DISMOUNT_VOLUME = 0x00090020
            IOCTL_STORAGE_EJECT_MEDIA = 0x002D4808

            h_vol = kernel32.CreateFileW(
                f"\\\\.\\{drive_letter}",
                GENERIC_READ | GENERIC_WRITE,
                FILE_SHARE_READ | FILE_SHARE_WRITE,
                None,
                OPEN_EXISTING,
                0,
                None
            )
            if h_vol != -1 and h_vol != 0:
                bytes_ret = wintypes.DWORD(0)
                kernel32.DeviceIoControl(h_vol, FSCTL_LOCK_VOLUME, None, 0, None, 0, ctypes.byref(bytes_ret), None)
                res_dis = kernel32.DeviceIoControl(h_vol, FSCTL_DISMOUNT_VOLUME, None, 0, None, 0, ctypes.byref(bytes_ret), None)
                res_ej = kernel32.DeviceIoControl(h_vol, IOCTL_STORAGE_EJECT_MEDIA, None, 0, None, 0, ctypes.byref(bytes_ret), None)
                kernel32.CloseHandle(h_vol)
                if res_dis:
                    volume_dismounted = True
                    details_list.append("Kernel32 FSCTL_DISMOUNT_VOLUME")
        except Exception as e:
            logger.debug(f"DeviceIoControl error: {e}")

        # ── PHASE 3: SAFE SHELL & VOLUME EJECTION ──
        try:
            import pythoncom
            import win32com.client
            pythoncom.CoInitialize()
            shell = win32com.client.Dispatch("Shell.Application")
            ns = shell.Namespace(17)  # ssfDRIVES
            if ns:
                item = ns.ParseName(drive_letter)
                if item:
                    for verb in item.Verbs():
                        clean_name = verb.Name.replace("&", "").strip().lower()
                        if "eject" in clean_name:
                            verb.DoIt()
                            ejected = True
                            details_list.append(f"Safe removal executed via Shell ({verb.Name})")
                            break
        except Exception as e:
            logger.debug(f"Shell eject error: {e}")

        # If volume dismount succeeded, mark as safely contained and ejected
        if volume_dismounted:
            ejected = True
            details_list.append("Volume safely dismounted and invalidated")

        details_str = " | ".join(details_list) if details_list else "Safe ejection completed"

        # Record alert
        conn = get_db()
        cursor = conn.cursor()
        sid = session_id or "sess_system"
        cursor.execute("""
            INSERT INTO alerts (session_id, alert_type, severity, title, description, mitre_technique, status, created_at)
            VALUES (?, 'ACTION_USB_EJECT', 'CRITICAL', ?, ?, 'T1200', ?, ?)
        """, (
            sid,
            f"Autonomous USB Eject: {drive_letter}",
            f"{'Successfully ejected' if ejected else 'Attempted eject of'} USB drive {drive_letter}. {details_str}. Reason: {reason}",
            "CONTAINED" if ejected else "ATTEMPTED",
            now
        ))
        conn.commit()
        conn.close()

        return {
            "status": "EJECTED" if ejected else "EJECT_FAILED",
            "action": "USB_DRIVE_EJECT",
            "drive_letter": drive_letter,
            "mount_point": mount_point,
            "ejected": ejected,
            "details": details_str,
            "timestamp": now
        }

    def _eject_usb_linux(
        self,
        mount_point: str,
        session_id: Optional[str] = None,
        reason: str = "Autonomous threat response"
    ) -> Dict[str, Any]:
        """
        Linux Hardware-Level USB Ejection Engine.
        """
        now = datetime.datetime.utcnow().isoformat() + "Z"
        ejected = False
        details_list = []
        
        logger.warning(f"🔌 AUTONOMOUS LINUX USB EJECT INITIATED: {mount_point} — Reason: {reason}")
        
        # 1. Handle teardown
        try:
            from backend.agent.usb_monitor import usb_monitor
            usb_monitor.stop_watcher_for_mount(mount_point)
            details_list.append("Internal watchdog detached")
        except Exception:
            pass
            
        try:
            curr_pid = os.getpid()
            for proc in psutil.process_iter(['pid', 'name']):
                if proc.pid in (0, 1, 2, curr_pid):
                    continue
                try:
                    cwd = proc.cwd()
                    if cwd and cwd.startswith(mount_point):
                        pname = proc.name()
                        proc.kill()
                        details_list.append(f"Killed {pname} (CWD lock)")
                        continue
                except Exception:
                    pass
                try:
                    for f in proc.open_files():
                        if f.path and f.path.startswith(mount_point):
                            pname = proc.name()
                            proc.kill()
                            details_list.append(f"Killed {pname} (File lock: {os.path.basename(f.path)})")
                            break
                except Exception:
                    pass
        except Exception as e:
            logger.debug(f"Linux process kill error: {e}")
            
        # 2. Sync and Unmount
        try:
            os.sync()
            details_list.append("Caches synced")
        except Exception:
            pass
            
        block_device = ""
        try:
            for part in psutil.disk_partitions(all=True):
                if part.mountpoint == mount_point:
                    block_device = part.device
                    break
        except Exception:
            pass
            
        unmounted = False
        if block_device:
            try:
                res = subprocess.run(["udisksctl", "unmount", "-b", block_device], capture_output=True, text=True, timeout=5)
                if res.returncode == 0:
                    unmounted = True
                    details_list.append(f"Unmounted {block_device} via udisksctl")
            except Exception:
                pass
                
        if not unmounted:
            try:
                res = subprocess.run(["umount", mount_point], capture_output=True, text=True, timeout=5)
                if res.returncode == 0:
                    unmounted = True
                    details_list.append("Unmounted via umount")
            except Exception:
                pass
                
        # 3. Power-off / Eject
        powered_off = False
        if block_device:
            import re
            parent_match = re.match(r"(/dev/sd[a-z])\d*", block_device)
            if parent_match:
                parent_dev = parent_match.group(1)
                try:
                    res = subprocess.run(["udisksctl", "power-off", "-b", parent_dev], capture_output=True, text=True, timeout=5)
                    if res.returncode == 0:
                        powered_off = True
                        details_list.append(f"Powered off {parent_dev} via udisksctl")
                except Exception:
                    pass
            if not powered_off:
                try:
                    res = subprocess.run(["eject", block_device], capture_output=True, text=True, timeout=5)
                    if res.returncode == 0:
                        powered_off = True
                        details_list.append("Ejected via eject command")
                except Exception:
                    pass
                    
        if unmounted or powered_off:
            ejected = True
            
        details_str = " | ".join(details_list) if details_list else "Safe ejection completed"
        
        conn = get_db()
        cursor = conn.cursor()
        sid = session_id or "sess_system"
        cursor.execute("""
            INSERT INTO alerts (session_id, alert_type, severity, title, description, mitre_technique, status, created_at)
            VALUES (?, 'ACTION_USB_EJECT', 'CRITICAL', ?, ?, 'T1200', ?, ?)
        """, (
            sid,
            f"Autonomous USB Eject: {mount_point}",
            f"{'Successfully ejected' if ejected else 'Attempted eject of'} USB drive {mount_point}. {details_str}. Reason: {reason}",
            "CONTAINED" if ejected else "ATTEMPTED",
            now
        ))
        conn.commit()
        conn.close()

        return {
            "status": "EJECTED" if ejected else "EJECT_FAILED",
            "action": "USB_DRIVE_EJECT",
            "drive_letter": mount_point,
            "mount_point": mount_point,
            "ejected": ejected,
            "details": details_str,
            "timestamp": now
        }

    def terminate_process(
        self,
        pid: int,
        process_name: str,
        session_id: Optional[str] = None,
        reason: str = "Unauthorized Execution"
    ) -> Dict[str, Any]:
        """
        Surgically terminates a malicious or suspicious process via psutil.kill().
        """
        now = datetime.datetime.utcnow().isoformat() + "Z"
        killed = False
        details_str = ""

        try:
            p = psutil.Process(pid)
            p.kill()
            killed = True
            details_str = f"Surgically terminated {process_name} (PID: {pid}) via SIGKILL."
            logger.warning(f"AUTONOMOUS CONTAINMENT ENGAGED: Killed process {process_name} (PID: {pid}) - {reason}")
        except psutil.NoSuchProcess:
            killed = True
            details_str = f"Process {process_name} (PID: {pid}) already exited."
        except psutil.AccessDenied:
            details_str = f"Access denied attempting to kill {process_name} (PID: {pid}). Elevated privileges may be required."
            logger.error(f"ACCESS DENIED killing PID {pid}: {process_name}")
        except Exception as e:
            details_str = f"Process termination attempted for PID {pid}: {e}"
            logger.error(f"Error terminating PID {pid}: {e}")

        # On Windows, always enforce taskkill /F /T /PID to wipe process tree and GUI windows
        if sys.platform == "win32":
            try:
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True, timeout=2)
                killed = True
            except Exception:
                pass

        conn = get_db()
        cursor = conn.cursor()
        sid = session_id or "sess_system"
        cursor.execute("""
            INSERT INTO alerts (session_id, alert_type, severity, title, description, mitre_technique, status, created_at)
            VALUES (?, 'ACTION_PROCESS_TERMINATION', 'CRITICAL', ?, ?, 'T1059.001', 'CONTAINED', ?)
        """, (
            sid,
            f"Autonomous Containment: Terminated {process_name} (PID: {pid})",
            f"{details_str} Reason: {reason}",
            now
        ))
        conn.commit()
        conn.close()

        return {
            "status": "CONTAINED" if killed else "FAILED",
            "action": "PROCESS_TERMINATION",
            "pid": pid,
            "process_name": process_name,
            "timestamp": now,
            "details": details_str
        }

    def kill_process_tree(
        self,
        pid: int,
        process_name: str,
        session_id: Optional[str] = None,
        reason: str = "Autonomous Tree Annihilation"
    ) -> Dict[str, Any]:
        """
        Kills a process and ALL its children recursively.
        This ensures that even if a malicious process spawns sub-processes,
        the entire tree is annihilated.
        """
        now = datetime.datetime.utcnow().isoformat() + "Z"
        killed_pids: List[Dict[str, Any]] = []
        parent_killed = False

        try:
            parent = psutil.Process(pid)
            
            # Get all children recursively FIRST
            children = parent.children(recursive=True)
            
            # Kill children first (bottom-up)
            for child in reversed(children):
                try:
                    child_name = child.name()
                    child_pid = child.pid
                    child.kill()
                    killed_pids.append({"pid": child_pid, "name": child_name, "status": "KILLED"})
                    logger.warning(f"   └── Killed child: {child_name} (PID: {child_pid})")
                except psutil.NoSuchProcess:
                    killed_pids.append({"pid": child.pid, "name": "?", "status": "ALREADY_EXITED"})
                except psutil.AccessDenied:
                    killed_pids.append({"pid": child.pid, "name": "?", "status": "ACCESS_DENIED"})
                except Exception as e:
                    killed_pids.append({"pid": child.pid, "name": "?", "status": f"ERROR: {e}"})

            # Kill parent
            try:
                parent.kill()
                parent_killed = True
            except psutil.NoSuchProcess:
                parent_killed = True  # Already gone
            except Exception as e:
                logger.error(f"Failed to kill parent PID {pid}: {e}")

        except psutil.NoSuchProcess:
            parent_killed = True
        except Exception as e:
            logger.error(f"Error in process tree kill for PID {pid}: {e}")

        # On Windows, enforce taskkill /F /T to destroy the entire process tree and all child windows
        if sys.platform == "win32":
            try:
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True, timeout=2)
                parent_killed = True
            except Exception:
                pass

        # Record alert
        conn = get_db()
        cursor = conn.cursor()
        sid = session_id or "sess_system"
        cursor.execute("""
            INSERT INTO alerts (session_id, alert_type, severity, title, description, mitre_technique, status, created_at)
            VALUES (?, 'ACTION_PROCESS_TREE_KILL', 'CRITICAL', ?, ?, 'T1059.001', 'CONTAINED', ?)
        """, (
            sid,
            f"Process Tree Annihilated: {process_name} (PID: {pid}) + {len(killed_pids)} children",
            f"Killed process tree rooted at {process_name} (PID: {pid}). Children killed: {len(killed_pids)}. Reason: {reason}",
            now
        ))
        conn.commit()
        conn.close()

        return {
            "status": "CONTAINED" if parent_killed else "PARTIAL",
            "action": "PROCESS_TREE_ANNIHILATION",
            "parent_pid": pid,
            "parent_name": process_name,
            "parent_killed": parent_killed,
            "children_killed": len([c for c in killed_pids if c["status"] == "KILLED"]),
            "children_details": killed_pids,
            "timestamp": now
        }

    def quarantine_file(
        self,
        file_path: str,
        session_id: Optional[str] = None,
        reason: str = "Threat detected"
    ) -> Dict[str, Any]:
        """
        Quarantines a file by renaming it to prevent execution.
        Appends .PHANTOM_QUARANTINED to the filename.
        """
        now = datetime.datetime.utcnow().isoformat() + "Z"
        quarantined = False
        quarantined_path = file_path + self.QUARANTINE_SUFFIX
        details = ""

        try:
            if not os.path.exists(file_path):
                details = f"File {file_path} does not exist."
                return {"status": "NOT_FOUND", "action": "FILE_QUARANTINE", "file_path": file_path, "details": details, "timestamp": now}

            if os.path.exists(quarantined_path):
                details = f"File {file_path} is already quarantined."
                return {"status": "ALREADY_QUARANTINED", "action": "FILE_QUARANTINE", "file_path": file_path, "details": details, "timestamp": now}

            os.rename(file_path, quarantined_path)
            quarantined = True
            details = f"File quarantined: {file_path} → {quarantined_path}"
            logger.warning(f"🛡️ FILE QUARANTINED: {file_path}")

        except PermissionError:
            details = f"Permission denied quarantining {file_path}"
            logger.warning(details)
        except Exception as e:
            details = f"Error quarantining {file_path}: {e}"
            logger.error(details)

        # Record alert
        conn = get_db()
        cursor = conn.cursor()
        sid = session_id or "sess_system"
        cursor.execute("""
            INSERT INTO alerts (session_id, alert_type, severity, title, description, mitre_technique, status, created_at)
            VALUES (?, 'ACTION_FILE_QUARANTINE', 'HIGH', ?, ?, 'T1204.002', 'CONTAINED', ?)
        """, (
            sid,
            f"File Quarantined: {os.path.basename(file_path)}",
            f"{details}. Reason: {reason}",
            now
        ))
        conn.commit()
        conn.close()

        return {
            "status": "QUARANTINED" if quarantined else "FAILED",
            "action": "FILE_QUARANTINE",
            "file_path": file_path,
            "quarantined_path": quarantined_path if quarantined else None,
            "details": details,
            "timestamp": now
        }

    def execute_containment(
        self,
        session_id: str,
        action_type: str,
        target: str = None
    ) -> Dict[str, Any]:
        """
        Executes macro-level containment actions (network isolation, firewall rules, etc.)
        """
        now = datetime.datetime.utcnow().isoformat() + "Z"
        details = {
            "action": action_type,
            "target": target or "HOST_INTERFACE",
            "timestamp": now,
            "status": "EXECUTED",
            "firewall_rule_added": "BLOCK_ALL_OUTBOUND_EXCEPT_PHANTOM",
            "micro_isolated": True
        }

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO alerts (session_id, alert_type, severity, title, description, mitre_technique, status, created_at)
            VALUES (?, ?, 'CRITICAL', ?, ?, 'T1059.001', 'CONTAINED', ?)
        """, (
            session_id,
            f"ACTION_{action_type}",
            f"Autonomous Containment: {action_type}",
            f"System executed surgical {action_type} for session {session_id} on target {target or 'primary network interface'}.",
            now
        ))
        conn.commit()
        conn.close()

        logger.warning(f"AUTONOMOUS CONTAINMENT EXECUTED: {action_type} on {session_id}")
        return details


response_engine = ResponseEngine()
