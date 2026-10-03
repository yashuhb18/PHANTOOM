import logging
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from backend.database import get_db
from backend.agent.hardware_agent import hardware_agent

logger = logging.getLogger("phantom.api.devices")

router = APIRouter(prefix="/api/devices", tags=["devices"])


class EjectRequest(BaseModel):
    mount_point: str
    session_id: Optional[str] = None
    reason: Optional[str] = "User-commanded safe ejection"


@router.get("", response_model=List[Dict[str, Any]])
def list_devices():
    """Returns database record of all historical and current devices."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM devices ORDER BY last_seen DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


@router.get("/topology")
def get_hardware_topology():
    """
    Returns full real-time laptop port and device topology:
    - USB Host Controllers (USB 3.2 / 3.1)
    - USB Root Hubs and estimated ports
    - Removable Flash Drives (active storage triage)
    - Connected HID Peripherals (Mouse dongles, keyboards)
    - Integrated System Devices (Webcams, Bluetooth adapters)
    """
    return hardware_agent.get_hardware_topology(force_refresh=False)


@router.post("/scan")
def trigger_hardware_scan():
    """Forces an immediate low-latency hardware rescan of all laptop USB ports."""
    fresh_topology = hardware_agent.get_hardware_topology(force_refresh=True)
    return {
        "status": "SUCCESS",
        "message": "Hardware rescan completed successfully.",
        "topology": fresh_topology,
    }


@router.post("/{device_id}/trust")
def update_device_trust(device_id: int, trust_status: str):
    """Updates device trust state to TRUSTED, UNTRUSTED, or BLOCKED."""
    if trust_status not in ("TRUSTED", "UNTRUSTED", "BLOCKED"):
        raise HTTPException(
            status_code=400,
            detail="Invalid trust status. Must be TRUSTED, UNTRUSTED, or BLOCKED.",
        )
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE devices SET trust_status = ? WHERE id = ?", (trust_status, device_id)
    )
    conn.commit()
    conn.close()
    return {"status": "SUCCESS", "device_id": device_id, "trust_status": trust_status}


@router.post("/eject")
async def eject_usb_drive(req: EjectRequest):
    """
    Safely dismounts and physically ejects a connected USB drive on user command.
    Gives the user full control over when to eject the device.
    """
    from backend.core.response_engine import response_engine
    import time

    logger.info(f"🔌 USER INITIATED USB EJECT: {req.mount_point}")
    res = response_engine.eject_usb_drive(
        mount_point=req.mount_point,
        session_id=req.session_id,
        reason=req.reason or "User-commanded safe hardware ejection",
    )

    # Broadcast updated topology and event over WebSocket
    try:
        from backend.agent.usb_monitor import usb_monitor
        from backend.ws_manager import ws_manager

        usb_monitor._broadcast_topology()
        await ws_manager.broadcast_live({
            "source": "USER_ACTION",
            "event_type": "USB_EJECTED_BY_USER",
            "severity": "INFO",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "data": {
                "mount_point": req.mount_point,
                "ejected": res.get("ejected", False),
                "status": res.get("status", "EJECTED"),
                "details": res.get("details", ""),
            },
        })
        await ws_manager.broadcast_narrator({
            "session_id": req.session_id or "sess_manual",
            "narration": f"🔌 USER EJECT COMPLETED: Drive {req.mount_point} safely unmounted and detached by user command.",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        })
    except Exception as e:
        logger.debug(f"Broadcast error after eject: {e}")

    return {
        "status": "SUCCESS" if res.get("ejected") else "ATTEMPTED",
        "ejected": res.get("ejected", False),
        "mount_point": req.mount_point,
        "details": res.get("details", ""),
    }


class DeleteThreatRequest(BaseModel):
    filepath: Optional[str] = None
    mount_point: Optional[str] = None
    filename: Optional[str] = "something.bat"


@router.post("/delete-threat")
async def delete_threat_file(req: DeleteThreatRequest):
    """
    Permanently deletes a detected threat file (e.g. something.bat) from the USB drive.
    Gives the user direct power to eliminate threat files on demand.
    """
    import os
    import time
    from backend.ws_manager import ws_manager

    deleted_paths = []
    candidates = []

    if req.filepath:
        candidates.append(req.filepath)
        candidates.append(req.filepath + ".PHANTOM_QUARANTINED")

    if req.mount_point:
        mp = req.mount_point.rstrip("\\").rstrip("/")
        fname = req.filename or "something.bat"
        candidates.append(f"{mp}\\{fname}")
        candidates.append(f"{mp}\\{fname}.PHANTOM_QUARANTINED")

    for cand in candidates:
        try:
            if os.path.exists(cand):
                os.remove(cand)
                deleted_paths.append(cand)
                logger.info(f"🗑️ THREAT FILE REMOVED BY USER: {cand}")
        except Exception as e:
            logger.error(f"Error removing threat file {cand}: {e}")

    # Fallback search if exact path differed
    if not deleted_paths and req.mount_point:
        try:
            mp = req.mount_point.rstrip("\\").rstrip("/")
            if os.path.exists(mp):
                for f in os.listdir(mp):
                    if "something" in f.lower() or f.lower().endswith(".bat") or ".bat.phantom" in f.lower():
                        full_p = os.path.join(mp, f)
                        try:
                            os.remove(full_p)
                            deleted_paths.append(full_p)
                            logger.info(f"🗑️ THREAT FILE REMOVED BY USER (wildcard): {full_p}")
                        except Exception:
                            pass
        except Exception:
            pass

    if deleted_paths:
        try:
            await ws_manager.broadcast_live({
                "source": "USER_ACTION",
                "event_type": "THREAT_FILE_DELETED",
                "severity": "INFO",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "data": {
                    "deleted_files": deleted_paths,
                    "message": f"Threat file(s) permanently removed from {req.mount_point or 'USB'}",
                },
            })
            from backend.agent.hardware_agent import hardware_agent
            fresh_topo = hardware_agent.get_hardware_topology(force_refresh=True)
            await ws_manager.broadcast_live({
                "source": "HARDWARE_AGENT",
                "event_type": "PORT_TOPOLOGY_UPDATED",
                "severity": "INFO",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "topology": fresh_topo
            })
            await ws_manager.broadcast_narrator({
                "session_id": "sess_threat_cleanup",
                "narration": f"🛡️ THREAT REMOVAL COMPLETE: Malicious file [{', '.join(deleted_paths)}] permanently erased from storage media.",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            })
        except Exception:
            pass

        return {
            "status": "SUCCESS",
            "message": "Threat file successfully deleted from drive.",
            "deleted": deleted_paths,
        }

    return {
        "status": "NOT_FOUND",
        "message": "File was already neutralized or removed.",
        "deleted": [],
    }


@router.get("/footprints")
def get_hardware_footprints():
    """
    Scans and returns the live forensic footprints left by USB insertion:
    - Active USB hardware topology & mount points
    - Insertion artifacts created on the host Desktop (~/Desktop/⚡_USB_INSERTED.txt)
    - Files written directly to the USB drive (/run/media/...)
    - System temp hardware logs (/tmp/usb_detected.txt, /tmp/usb_insertion_audit.log)
    - Full file content snippet, SHA-256 hash, and threat analysis for each artifact.
    """
    import os
    import hashlib
    import datetime
    import glob
    from backend.agent.hardware_agent import hardware_agent
    from backend.agent.threat_scanner import threat_scanner

    topo = hardware_agent.get_hardware_topology(force_refresh=True)
    storage_devices = topo.get("storage_devices", [])

    device_info = None
    mount_points = []

    if storage_devices:
        primary = storage_devices[0]
        device_info = {
            "name": primary.get("device_name", "Removable USB Drive"),
            "vendor": primary.get("vendor_name", "Generic Vendor"),
            "model": primary.get("model", "USB Flash Storage"),
            "serial": primary.get("serial_number", "UNKNOWN-SERIAL"),
            "pnp_id": primary.get("pnp_id", "/dev/sdc1"),
            "mount_point": primary.get("mount_point", "/run/media/yashz/KIOXIA_USB"),
            "capacity_gb": primary.get("capacity_gb", 28.84),
            "filesystem": primary.get("filesystem", "exfat"),
            "status": "MOUNTED_AND_SURVEILLED"
        }
        for s in storage_devices:
            mp = s.get("mount_point")
            if mp and os.path.exists(mp) and mp not in mount_points:
                mount_points.append(mp)

    # Check Kali Linux mount directories
    kali_mounts = glob.glob("/run/media/yashz/*") + glob.glob("/run/media/root/*") + glob.glob("/media/yashz/*")
    for km in kali_mounts:
        if os.path.isdir(km) and km not in mount_points:
            mount_points.append(km)

    artifacts = []
    seen_realpaths = set()

    def process_file(filepath: str, origin_type: str, friendly_origin: str):
        if not os.path.exists(filepath):
            return
        # If it's a forensic directory like System Volume Information, inspect files within it
        if os.path.isdir(filepath):
            base_dir = os.path.basename(filepath)
            if base_dir in ("System Volume Information", ".Spotlight-V100", ".fseventsd", ".Trashes"):
                try:
                    for sub in os.listdir(filepath):
                        sub_path = os.path.join(filepath, sub)
                        if os.path.isfile(sub_path):
                            process_file(sub_path, "FORENSIC_DUST", f"Cross-OS Host Dust ({base_dir})")
                except Exception:
                    pass
            return

        real_p = os.path.realpath(filepath)
        if real_p in seen_realpaths:
            return
        fname = os.path.basename(filepath)

        # Ignore noisy OS temporary lock files, but keep forensic dust
        if fname in (".", "..") or (fname.startswith(".~") or fname.endswith(".tmp")):
            return

        seen_realpaths.add(real_p)
        try:
            sz = os.path.getsize(filepath)
            mtime = datetime.datetime.fromtimestamp(os.path.getmtime(filepath)).strftime("%Y-%m-%d %H:%M:%S")
            with open(filepath, "rb") as fp:
                data = fp.read(8192)
                sha256 = hashlib.sha256(data).hexdigest()
                content_text = data.decode("utf-8", errors="ignore")

            ext = os.path.splitext(fname)[1].lower()
            threat_score = 0
            indicators = []
            verdict = "BENIGN_LOG"
            file_category = "SYSTEM_LOG"

            # Check if this is a forensic host artifact
            if fname in ("IndexerVolumeGuid", "WPSettings.dat", "Thumbs.db") or fname.startswith(".Spotlight") or fname.startswith(".Trash") or fname == ".DS_Store":
                verdict = "FORENSIC_HOST_ARTIFACT"
                file_category = "DIGITAL_DUST"
                indicators = ["Host Operating System Remnant Fingerprint"]

            if "exploit" in fname.lower() or "malware" in fname.lower() or ext in (".sh", ".bat", ".ps1", ".py"):
                try:
                    analysis = threat_scanner._analyze_file(filepath, "sess_footprints")
                    if analysis:
                        threat_score = analysis.get("threat_score", 0)
                        indicators = [i.get("indicator", "") for i in analysis.get("threat_indicators", [])]
                except Exception:
                    pass

                if threat_score >= 40:
                    verdict = "CRITICAL_THREAT"
                    file_category = "EXPLOIT_PAYLOAD"
                elif threat_score >= 20:
                    verdict = "SUSPICIOUS_SCRIPT"
                    file_category = "ROGUE_SCRIPT"
                else:
                    verdict = "AUDIT_SCRIPT"
                    file_category = "SCRIPT"
            elif "detected" in fname.lower() or "inserted" in fname.lower() or "verification" in fname.lower():
                verdict = "VERIFIED_HARDWARE_LOG"
                file_category = "HARDWARE_EVIDENCE"
            elif ext in (".txt", ".log"):
                verdict = "BENIGN_DOCUMENT"
                file_category = "DOCUMENT"

            artifacts.append({
                "file_name": fname,
                "file_path": filepath,
                "origin_type": origin_type,
                "origin_label": friendly_origin,
                "file_size_bytes": sz,
                "file_size_formatted": f"{sz} B" if sz < 1024 else f"{round(sz/1024, 1)} KB",
                "modified_time": mtime,
                "sha256": sha256,
                "sha256_short": f"{sha256[:12]}...{sha256[-8:]}",
                "content_snippet": content_text,
                "file_category": file_category,
                "verdict": verdict,
                "threat_score": threat_score,
                "indicators": indicators
            })
        except Exception as e:
            logger.debug(f"Error processing footprint artifact {filepath}: {e}")

    # 1. Desktop insertion alert file
    desktop_files = [
        "/home/rises/Desktop/⚡_USB_INSERTED.txt"
    ] + glob.glob("/home/rises/Desktop/*USB*.txt")
    for df in desktop_files:
        process_file(df, "DESKTOP", "Host Desktop Screen (~/Desktop)")

    # 2. System temporary audit logs
    tmp_files = [
        "/tmp/usb_detected.txt",
        "/tmp/usb_insertion_audit.log"
    ]
    for tf in tmp_files:
        process_file(tf, "SYSTEM_TMP", "Host System Audit (/tmp)")

    # 3. Files on all active USB mount points
    for mp in mount_points:
        usb_files = glob.glob(os.path.join(mp, "*"))
        for uf in usb_files:
            process_file(uf, "USB_DRIVE", f"USB Storage ({mp})")

    # Sort: highest threats first, then recent files
    artifacts.sort(key=lambda x: (x["threat_score"], x["modified_time"]), reverse=True)

    critical_count = sum(1 for a in artifacts if a["threat_score"] >= 40)
    suspicious_count = sum(1 for a in artifacts if 20 <= a["threat_score"] < 40)
    audit_count = sum(1 for a in artifacts if a["threat_score"] < 20)

    return {
        "status": "SUCCESS",
        "is_device_connected": bool(device_info),
        "device": device_info,
        "mount_points": mount_points,
        "summary": {
            "total_artifacts": len(artifacts),
            "critical_threats": critical_count,
            "suspicious_scripts": suspicious_count,
            "verified_audit_logs": audit_count
        },
        "artifacts": artifacts
    }

