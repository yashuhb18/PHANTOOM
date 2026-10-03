"""
PHANTOM Autonomous USB Monitor Daemon
========================================
Monitors Windows PnP changes, discovers plugged-in devices (flash drives,
wireless mouse dongles, keyboards, peripherals), auto-initiates Zero-Trust
threat hunting sessions, triggers deep file scanning, autorun prevention,
and filesystem surveillance. Broadcasts live topology updates over WebSockets.
"""

import sys
import os
import time
import asyncio
import threading
import logging
from typing import Callable, Optional, Dict, Any, Set
from backend.agent.hardware_agent import hardware_agent
from backend.core.session_manager import session_manager
from backend.core.event_collector import event_collector
from backend.core.canary_manager import canary_manager
from backend.core.ai_analyst import ai_analyst
from backend.ws_manager import ws_manager

logger = logging.getLogger("phantom.agent.usb")


class USBMonitor:
    """
    Autonomous Real-Time Hardware & USB Monitor Daemon.
    
    On USB insertion:
    1. Detects physical device via WMI PnP topology scan
    2. Creates a Zero-Trust threat hunting session
    3. Arms canary deception grid
    4. Triggers autonomous file scanner (ThreatScanner)
    5. Triggers autorun guardian (AutorunGuardian)
    6. Starts filesystem watcher on USB mount point
    7. Broadcasts all events via WebSocket
    
    On USB removal:
    1. Closes the active session
    2. Stops filesystem watcher
    3. Records removal event
    """

    def __init__(self, callback: Optional[Callable] = None):
        self.callback = callback
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._known_pnp_ids: Set[str] = set()
        self._active_sessions: Dict[str, str] = {}  # pnp_id -> session_id
        self._event_loop: Optional[asyncio.AbstractEventLoop] = None
        self._file_watchers: Dict[str, Any] = {}  # session_id -> observer

    def start(self, loop: Optional[asyncio.AbstractEventLoop] = None):
        if self._running:
            return
        self._running = True
        self._event_loop = loop
        self._thread = threading.Thread(target=self._monitor_loop, name="PhantomUSBMonitor", daemon=True)
        self._thread.start()
        logger.info("PHANTOM Autonomous Hardware & USB Monitor started.")

    def stop_watcher_for_mount(self, mount_point: str):
        """Stops any watchdog observer watching this mount point to release file handles before eject."""
        clean_mp = mount_point.rstrip("\\").rstrip("/").upper()
        for session_id, observer in list(self._file_watchers.items()):
            try:
                observer.stop()
                observer.join(timeout=1)
                del self._file_watchers[session_id]
                logger.info(f"Released filesystem watcher handle on {clean_mp}")
            except Exception as e:
                logger.debug(f"Error stopping watcher: {e}")

    def stop(self):
        self._running = False
        # Stop any active file watchers
        for session_id, observer in self._file_watchers.items():
            try:
                observer.stop()
                observer.join(timeout=2)
            except Exception:
                pass
        self._file_watchers.clear()
        logger.info("PHANTOM Autonomous Hardware & USB Monitor stopped.")

    def _broadcast_safe(self, coro):
        """Safely executes an async coroutine on the server event loop from the background thread."""
        if self._event_loop and self._event_loop.is_running():
            try:
                asyncio.run_coroutine_threadsafe(coro, self._event_loop)
            except Exception as e:
                logger.debug(f"Failed to dispatch coroutine to loop: {e}")

    def _monitor_loop(self):
        """
        Continuous hybrid monitoring loop:
        Performs periodic topology differential scans to capture all physical
        plug/unplug events across USB storage, mouse dongles, and peripherals.
        """
        # Initial baseline scan
        initial_storage = []
        try:
            initial_topology = hardware_agent.get_hardware_topology(force_refresh=True)
            for item in initial_topology["storage_devices"]:
                pnp = item.get("pnp_id")
                if pnp:
                    self._known_pnp_ids.add(pnp)
                    initial_storage.append(item)
            for item in initial_topology["peripherals"] + initial_topology["integrated_devices"]:
                pnp = item.get("pnp_id")
                if pnp:
                    self._known_pnp_ids.add(pnp)
            logger.info(f"USB Baseline initialized with {len(self._known_pnp_ids)} known hardware devices.")

            # If any USB storage devices are already connected at startup, engage Zero-Trust session & scanning!
            seen_mounts = set()
            for s_item in initial_storage:
                default_mp = "E:\\" if sys.platform == "win32" else "/media"
                mp = s_item.get("mount_point", default_mp)
                if sys.platform == "win32":
                    mp = mp.upper()
                system_mounts = ("C:\\", "D:\\") if sys.platform == "win32" else ("/", "/boot", "/boot/efi", "/home")
                if mp not in seen_mounts and mp not in system_mounts:
                    seen_mounts.add(mp)
                    logger.info(f"⚡ Discovered pre-connected USB storage on {mp}: Engaging autonomous hunt.")
                    self._handle_insertion("STORAGE", s_item)
        except Exception as e:
            logger.error(f"Error initializing hardware baseline: {e}")

        while self._running:
            try:
                # Delta scan every 1.5 seconds
                time.sleep(1.5)
                topology = hardware_agent.get_hardware_topology(force_refresh=True)

                current_items = {}
                for s in topology["storage_devices"]:
                    if s.get("pnp_id"):
                        current_items[s["pnp_id"]] = ("STORAGE", s)
                for p in topology["peripherals"]:
                    if p.get("pnp_id"):
                        current_items[p["pnp_id"]] = ("PERIPHERAL", p)
                for i in topology["integrated_devices"]:
                    if i.get("pnp_id"):
                        current_items[i["pnp_id"]] = ("INTEGRATED", i)

                current_pnp_set = set(current_items.keys())

                # Detect newly inserted devices
                new_pnps = current_pnp_set - self._known_pnp_ids
                for pnp in new_pnps:
                    category, item_data = current_items[pnp]
                    self._handle_insertion(category, item_data)

                # Detect removed devices
                removed_pnps = self._known_pnp_ids - current_pnp_set
                for pnp in removed_pnps:
                    self._handle_removal(pnp)

                self._known_pnp_ids = current_pnp_set

            except Exception as e:
                logger.error(f"Error in USB Monitor cycle: {e}")
                time.sleep(2.0)

    def _handle_insertion(self, category: str, item: Dict[str, Any]):
        """Handles physical connection of a device."""
        pnp_id = item.get("pnp_id", "")
        name = item.get("device_name") or item.get("name") or "USB Device"
        vid = item.get("vendor_id", "0000")
        pid = item.get("product_id", "0000")
        serial = item.get("serial_number", "UNKNOWN-SERIAL")
        logger.info(f"PHYSICAL HARDWARE INSERTION DETECTED: [{category}] {name} (VID:{vid} PID:{pid})")

        is_storage = (
            category == "STORAGE" or 
            "USBSTOR" in pnp_id.upper() or 
            "MASS STORAGE" in name.upper() or 
            "TRANSMEMORY" in name.upper()
        )

        if is_storage:
            default_mp = "E:\\" if sys.platform == "win32" else "/media"
            mount_point = item.get("mount_point", default_mp)

            # Avoid duplicate sessions for the same mount point in current run
            for existing_pnp, existing_sid in list(self._active_sessions.items()):
                sess = session_manager.get_session(existing_sid)
                if sys.platform == "win32":
                    mount_match = sess.get("mount_point", "").upper() == mount_point.upper()
                else:
                    mount_match = sess.get("mount_point", "") == mount_point
                if sess and sess.get("status") == "ACTIVE" and mount_match:
                    logger.info(f"Active in-memory session {existing_sid} already tracking {mount_point}. Linking PnP {pnp_id}.")
                    self._active_sessions[pnp_id] = existing_sid
                    return

            # Auto-instantiate live Threat Hunting Session for flash storage
            session_id = f"sess_live_{int(time.time())}"
            self._active_sessions[pnp_id] = session_id

            logger.info(f"Instantiating Zero-Trust session: {session_id} for {name} on {mount_point}")
            session_manager.create_session(
                session_id=session_id,
                device_name=name,
                vendor_id=vid,
                product_id=pid,
                serial_number=serial,
                mount_point=mount_point
            )

            # Arm canary deception for this session
            canary_manager.active_session_id = session_id

            # Create and record USB_INSERTED event
            event_payload = {
                "device_name": name,
                "vendor_id": vid,
                "product_id": pid,
                "vendor_name": item.get("vendor_name", "Unknown"),
                "mount_point": mount_point,
                "capacity_gb": item.get("capacity_gb", 0),
                "filesystem": item.get("filesystem", "Unknown"),
                "hardware_id": item.get("hardware_id", f"VID_{vid}&PID_{pid}"),
                "category": "REMOVABLE_STORAGE",
                "class": "MASS_STORAGE_USB"
            }

            event = event_collector.normalize_event(
                session_id=session_id,
                source="USB",
                event_type="USB_INSERTED",
                severity="INFO",
                data=event_payload,
                risk_score_delta=5
            )
            session_manager.record_event(event)

            # Generate AI narration
            narration = ai_analyst.narrate_event(event.dict())

            # Broadcast over WebSockets to live UI
            self._broadcast_safe(ws_manager.broadcast_live(event.dict()))
            self._broadcast_safe(ws_manager.broadcast_narrator({
                "session_id": session_id,
                "narration": narration,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }))

            # ═══════════════════════════════════════════════════════════
            # AUTONOMOUS AGENT ACTIVATION — Zero human intervention
            # ═══════════════════════════════════════════════════════════

            # 1. Launch Autorun Guardian — neutralize autorun.inf
            self._launch_autorun_scan(mount_point, session_id)

            # 2. Launch Threat Scanner — deep-scan all files
            self._launch_threat_scan(mount_point, session_id)

            # 3. Start filesystem watcher — monitor for new file creation on USB
            self._start_filesystem_watcher(mount_point, session_id)

            # 4. Autonomous Live Adversary Simulation (Hackathon Demo Mode)
            # Spawns a real-time rogue payload from the USB mount point after a brief 2.5s delay
            # so the audience witnesses PHANTOM intercepting and surgically killing it live!
            if os.getenv("PHANTOM_DEMO_AUTORUN", "true").lower() == "true":
                self._launch_live_adversary_demo(mount_point, session_id)

            # 5. Autonomous Multi-Layer Forensic DNA & Host Heritage Synthesis
            try:
                from backend.core.fingerprint_engine import fingerprint_engine
                dna_res = fingerprint_engine.extract_forensic_dna(session_id=session_id, mount_point=mount_point, item=item)
                logger.info(f"🧬 Multi-Layer Forensic DNA synthesized for {name}: {dna_res.get('dna_hash')}")
                self._broadcast_safe(ws_manager.broadcast_live({
                    "source": "FORENSIC_DNA_ENGINE",
                    "event_type": "USB_DNA_SYNTHESIZED",
                    "severity": "INFO",
                    "session_id": session_id,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "data": {
                        "device_name": name,
                        "dna_hash": dna_res.get("dna_hash"),
                        "cluster_family": dna_res.get("cluster_family"),
                        "genome": dna_res.get("genome")
                    }
                }))
            except Exception as e:
                logger.error(f"Error synthesizing Forensic DNA on USB insertion: {e}")

        elif category == "PERIPHERAL":
            # Peripheral insertion (e.g. mouse dongle, keyboard)
            event_data = {
                "source": "HARDWARE_AGENT",
                "event_type": "PERIPHERAL_ATTACHED",
                "severity": "INFO",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "data": {
                    "device_name": name,
                    "type": item.get("type", "HID_DEVICE"),
                    "hardware_id": item.get("hardware_id"),
                    "vendor_name": item.get("vendor_name", "Unknown"),
                    "is_wireless_dongle": item.get("is_wireless_dongle", True)
                }
            }
            self._broadcast_safe(ws_manager.broadcast_live(event_data))

        # Always broadcast fresh topology update so port view updates dynamically
        self._broadcast_topology()

    def _handle_removal(self, pnp_id: str):
        """Handles physical disconnection of a device."""
        logger.info(f"PHYSICAL HARDWARE REMOVAL DETECTED: {pnp_id}")

        if pnp_id in self._active_sessions:
            session_id = self._active_sessions.pop(pnp_id)
            
            # Stop filesystem watcher for this session
            if session_id in self._file_watchers:
                try:
                    self._file_watchers[session_id].stop()
                    self._file_watchers[session_id].join(timeout=2)
                except Exception:
                    pass
                del self._file_watchers[session_id]

            session_manager.close_session(session_id)

            event = event_collector.normalize_event(
                session_id=session_id,
                source="USB",
                event_type="USB_REMOVED",
                severity="INFO",
                data={"pnp_id": pnp_id, "status": "PHYSICALLY_DISCONNECTED"},
                risk_score_delta=0
            )
            session_manager.record_event(event)

            narration = ai_analyst.narrate_event(event.dict())
            self._broadcast_safe(ws_manager.broadcast_live(event.dict()))
            self._broadcast_safe(ws_manager.broadcast_narrator({
                "session_id": session_id,
                "narration": narration,
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }))

        self._broadcast_topology()

    # ═══════════════════════════════════════════════════════════════════════
    # AUTONOMOUS AGENT LAUNCHERS
    # ═══════════════════════════════════════════════════════════════════════

    def _launch_autorun_scan(self, mount_point: str, session_id: str):
        """Launches the AutorunGuardian to scan and neutralize autorun.inf."""
        try:
            from backend.agent.autorun_guardian import autorun_guardian
            # Run in background thread to not block USB detection loop
            thread = threading.Thread(
                target=autorun_guardian.scan_and_neutralize,
                args=(mount_point, session_id),
                name=f"AutorunScan-{session_id}",
                daemon=True
            )
            thread.start()
            logger.info(f"Autorun Guardian launched for {mount_point}")
        except Exception as e:
            logger.error(f"Failed to launch Autorun Guardian: {e}")

    def _launch_threat_scan(self, mount_point: str, session_id: str):
        """Launches the ThreatScanner for deep file analysis."""
        try:
            from backend.agent.threat_scanner import threat_scanner
            if self._event_loop:
                threat_scanner.set_event_loop(self._event_loop)
            threat_scanner.scan_drive(mount_point, session_id)
            logger.info(f"Threat Scanner launched for {mount_point}")
        except Exception as e:
            logger.error(f"Failed to launch Threat Scanner: {e}")

    def _launch_live_adversary_demo(self, mount_point: str, session_id: str):
        """
        Hackathon Demonstration Engine:
        Spawns a controlled adversary simulation 2.5 seconds after USB plug-in.
        The simulation mimics an unauthorized BadUSB / reverse-shell payload execution 
        originating from the USB drive. PHANTOM's Process Surveillance Agent 
        will intercept, analyze, and deploy autonomous SIGKILL within <1 second!
        """
        def _adversary_task():
            try:
                time.sleep(2.5)  # Let audience observe the USB device appear on the UI
                logger.warning(f"⚠️ [HACKATHON-DEMO] Simulating unauthorized USB adversary payload from {mount_point}...")

                # Create demo payload script directly on the USB drive if writable
                if mount_point and os.path.isdir(mount_point) and mount_point != "(unmounted)":
                    try:
                        payload_file = os.path.join(mount_point, "autorun_malware_test.sh")
                        with open(payload_file, "w") as f:
                            f.write("#!/bin/bash\n# Simulated USB BadUSB Payload\necho 'Attempting unauthorized exfiltration...'\nsleep 60\n")
                        os.chmod(payload_file, 0o755)
                    except Exception:
                        pass

                # Launch simulated rogue process pointing to the USB mount point
                # It will run in background, be caught by process_monitor, and instantly SIGKILLED!
                import subprocess
                if sys.platform.startswith("linux"):
                    cmd = [
                        "bash", "-c",
                        f"echo '[HACKATHON-DEMO] Unauthorized script execution from USB {mount_point}'; sleep 60 # phantom-test reverse-shell"
                    ]
                else:
                    cmd = f'cmd.exe /c "echo [HACKATHON-DEMO] Unauthorized execution & ping 127.0.0.1 -n 60 >nul # phantom-test"'

                cwd_target = mount_point if (mount_point and os.path.isdir(mount_point) and mount_point != "(unmounted)") else None
                p = subprocess.Popen(cmd, cwd=cwd_target)
                logger.info(f"⚡ [HACKATHON-DEMO] Rogue process PID {p.pid} spawned from USB. Awaiting autonomous containment...")
            except Exception as e:
                logger.debug(f"Demo adversary spawn error: {e}")

        demo_thread = threading.Thread(
            target=_adversary_task,
            name=f"AdversaryDemo-{session_id}",
            daemon=True
        )
        demo_thread.start()

    def _start_filesystem_watcher(self, mount_point: str, session_id: str):
        """
        Starts a watchdog filesystem observer on the USB mount point.
        Detects any new file creation and triggers immediate threat scanning.
        """
        try:
            from watchdog.observers.polling import PollingObserver
            from watchdog.events import FileSystemEventHandler

            class USBFileHandler(FileSystemEventHandler):
                def __init__(self, session_id, event_loop, broadcast_fn):
                    super().__init__()
                    self.session_id = session_id
                    self.event_loop = event_loop
                    self.broadcast_fn = broadcast_fn
                    self._scanned_files = set()

                def on_created(self, event):
                    if event.is_directory:
                        return
                    filepath = event.src_path
                    if filepath in self._scanned_files:
                        return
                    self._scanned_files.add(filepath)

                    ext = os.path.splitext(filepath)[1].lower()
                    dangerous_exts = {".bat", ".cmd", ".ps1", ".vbs", ".js", ".exe", ".scr", 
                                     ".hta", ".wsf", ".msi", ".inf", ".reg", ".lnk",
                                     ".docm", ".xlsm", ".pptm", ".py", ".rb", ".sh"}

                    if ext in dangerous_exts:
                        logger.warning(f"⚠️ NEW DANGEROUS FILE DETECTED ON USB: {filepath}")
                        # Trigger immediate scan
                        try:
                            from backend.agent.threat_scanner import threat_scanner
                            threat_scanner.scan_single_file(filepath, self.session_id)
                        except Exception as e:
                            logger.error(f"Error scanning new file {filepath}: {e}")

                    # Broadcast fresh topology update to live UI
                    try:
                        topology = hardware_agent.get_hardware_topology(force_refresh=True)
                        payload = {
                            "source": "HARDWARE_AGENT",
                            "event_type": "PORT_TOPOLOGY_UPDATED",
                            "severity": "INFO",
                            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                            "topology": topology
                        }
                        self.broadcast_fn(ws_manager.broadcast_live(payload))
                    except Exception:
                        pass

                def on_deleted(self, event):
                    if event.is_directory:
                        return
                    filepath = event.src_path
                    self._scanned_files.discard(filepath)
                    logger.info(f"File removed/deleted from USB: {filepath}")
                    # Broadcast fresh topology update so UI instantly clears threats
                    try:
                        topology = hardware_agent.get_hardware_topology(force_refresh=True)
                        payload = {
                            "source": "HARDWARE_AGENT",
                            "event_type": "PORT_TOPOLOGY_UPDATED",
                            "severity": "INFO",
                            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                            "topology": topology
                        }
                        self.broadcast_fn(ws_manager.broadcast_live(payload))
                    except Exception as e:
                        logger.error(f"Error updating topology after file deletion: {e}")

                def on_modified(self, event):
                    if not event.is_directory:
                        ext = os.path.splitext(event.src_path)[1].lower()
                        if ext in {".bat", ".cmd", ".ps1", ".vbs", ".js", ".exe", ".inf"}:
                            logger.warning(f"⚠️ DANGEROUS FILE MODIFIED ON USB: {event.src_path}")

            handler = USBFileHandler(session_id, self._event_loop, self._broadcast_safe)
            # PollingObserver does not keep an open Win32 directory handle (ReadDirectoryChangesW),
            # allowing the user and OS to safely eject the USB drive without 'Device in use' errors.
            observer = PollingObserver(timeout=2.0)
            
            if os.path.exists(mount_point) and os.path.isdir(mount_point):
                observer.schedule(handler, mount_point, recursive=True)
                observer.start()
                self._file_watchers[session_id] = observer
                logger.info(f"Filesystem watcher started on {mount_point} for session {session_id}")
            else:
                logger.warning(f"Mount point {mount_point} not accessible for filesystem watching")

        except ImportError:
            logger.warning("watchdog not installed — USB filesystem watching disabled")
        except Exception as e:
            logger.error(f"Error starting filesystem watcher: {e}")

    def _broadcast_topology(self):
        """Pushes the latest port & hardware topology to connected clients."""
        try:
            topology = hardware_agent.get_hardware_topology(force_refresh=True)
            payload = {
                "source": "HARDWARE_AGENT",
                "event_type": "PORT_TOPOLOGY_UPDATED",
                "severity": "INFO",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "topology": topology
            }
            self._broadcast_safe(ws_manager.broadcast_live(payload))
        except Exception as e:
            logger.debug(f"Topology broadcast error: {e}")


usb_monitor = USBMonitor()
