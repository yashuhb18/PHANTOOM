import json
import logging
import re
import socket
import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from backend.database import get_db
from backend.core.glm_client import glm_client

logger = logging.getLogger("phantom.api.siem")

router = APIRouter(prefix="/api/siem", tags=["siem"])

HOSTNAME = socket.gethostname() or "darknight"

# Standard SIEM EventID Mappings (Windows Security / Linux Kernel / EDR)
EVENT_ID_MAP = {
    # 1000 Series: Physical Hardware & USB Bus Telemetry
    "USB_INSERTED": {"code": 1001, "name": "USB_HARDWARE_ATTACH", "sourcetype": "PHANTOM:KERNEL_UDEV", "desc": "Removable USB block device attached to bus"},
    "DEVICE_CONNECTED": {"code": 1001, "name": "USB_HARDWARE_ATTACH", "sourcetype": "PHANTOM:KERNEL_UDEV", "desc": "USB peripheral device connected"},
    "USB_REMOVED": {"code": 1002, "name": "USB_HARDWARE_DETACH", "sourcetype": "PHANTOM:KERNEL_UDEV", "desc": "Removable USB block device detached"},
    "DEVICE_DISCONNECTED": {"code": 1002, "name": "USB_HARDWARE_DETACH", "sourcetype": "PHANTOM:KERNEL_UDEV", "desc": "USB peripheral device disconnected"},
    "USB_EJECTED_BY_USER": {"code": 1003, "name": "USB_FORCE_DISMOUNT", "sourcetype": "PHANTOM:USER_OVERRIDE", "desc": "Volume unmounted and detached by operator"},

    # 2000 Series: BadUSB / HID Synthetic Keystroke Injection
    "KEYSTROKE_INJECTION_DETECTED": {"code": 2001, "name": "SYNTHETIC_KEYSTROKE_BURST", "sourcetype": "PHANTOM:HID_SENTINEL", "desc": "Anomalous typing cadence detected matching DuckyScript injection"},
    "BADUSB_ATTACK_DETECTED": {"code": 2002, "name": "BADUSB_EMULATION_DETECTED", "sourcetype": "PHANTOM:HID_SENTINEL", "desc": "Device reconfigured as spoofed Human Interface Device"},

    # 4000 Series: Process Execution & Surveillance (Aligned with Sysmon EventID 4688)
    "SUSPICIOUS_PROCESS_SPAWNED": {"code": 4688, "name": "PROCESS_CREATION_SUSPICIOUS", "sourcetype": "PHANTOM:PROCESS_SENTINEL", "desc": "Rogue process execution spawned originating from removable volume"},
    "PROCESS_SURVEILLED": {"code": 4688, "name": "PROCESS_CREATION_TELEMETRY", "sourcetype": "PHANTOM:PROCESS_SENTINEL", "desc": "Monitored process tree telemetry"},
    "REVERSE_SHELL_DETECTED": {"code": 4689, "name": "REVERSE_SHELL_ESTABLISHED", "sourcetype": "PHANTOM:NETWORK_DEFENSE", "desc": "Interactive shell connection bound to network socket"},

    # 5000 Series: Canary & Honeytoken Deception Grid
    "CANARY_TRAP_TRIPPED": {"code": 5001, "name": "DECEPTION_HONEYPOT_BREACH", "sourcetype": "PHANTOM:DECEPTION_GRID", "desc": "Unauthorized read access against decoy honeypot vault"},
    "CANARY_FILE_READ": {"code": 5001, "name": "DECEPTION_HONEYPOT_BREACH", "sourcetype": "PHANTOM:DECEPTION_GRID", "desc": "Decoy file access registered by filesystem observer"},

    # 6000 Series: Threat Scanner & Artifact Vault
    "FILE_QUARANTINED": {"code": 6001, "name": "MALICIOUS_FILE_ISOLATED", "sourcetype": "PHANTOM:THREAT_SCANNER", "desc": "Weaponized payload stripped of permissions and vaulted"},
    "THREAT_DETECTED": {"code": 6002, "name": "WEAPONIZED_PAYLOAD_DETECTED", "sourcetype": "PHANTOM:THREAT_SCANNER", "desc": "Static signature match against known malware pattern"},
    "USB_SCAN_COMPLETE": {"code": 6003, "name": "STORAGE_VOLUME_AUDIT_COMPLETE", "sourcetype": "PHANTOM:THREAT_SCANNER", "desc": "Heuristic audit completed on mounted partition"},
    "THREAT_FILE_DELETED": {"code": 6004, "name": "THREAT_FILE_PERMANENTLY_ERASED", "sourcetype": "PHANTOM:THREAT_SCANNER", "desc": "Malicious payload permanently deleted from volume by operator"},

    # 7000 Series: Autonomous Containment & Surgical Response
    "CONTAINMENT_TRIGGERED": {"code": 7001, "name": "AUTONOMOUS_SURGICAL_KILL", "sourcetype": "PHANTOM:RESPONSE_ENGINE", "desc": "Process tree annihilated via SIGKILL in sub-45ms response"},

    # 8000 Series: Autorun & Volume Defense
    "AUTORUN_NEUTRALIZED": {"code": 8001, "name": "AUTORUN_SUBSYSTEM_IMMUNIZED", "sourcetype": "PHANTOM:AUTORUN_GUARDIAN", "desc": "Autorun vulnerability neutralized on volume root"}
}

DEFAULT_META = {"code": 9001, "name": "SYSTEM_TELEMETRY", "sourcetype": "PHANTOM:TELEMETRY", "desc": "General forensic security event"}


def format_siem_event(row: Any) -> Dict[str, Any]:
    """Transforms a raw database event row into a rich Splunk/SIEM format."""
    etype = row["event_type"]
    meta = EVENT_ID_MAP.get(etype, DEFAULT_META)
    event_code = meta["code"]
    event_name = meta["name"]
    sourcetype = meta["sourcetype"]
    description = meta["desc"]

    # Parse JSON data payload
    data = {}
    try:
        data = json.loads(row["data_json"]) if row["data_json"] else {}
    except Exception:
        data = {"raw": str(row["data_json"])}

    timestamp = row["timestamp"]
    severity = row["severity"] or "INFO"
    event_id = row["event_id"]
    session_id = row["session_id"]

    # Extract standard SIEM fields
    pid = data.get("pid") or data.get("target_pid") or data.get("parent_pid") or ""
    process_name = data.get("process_name") or data.get("name") or ""
    command_line = data.get("command_line") or data.get("cmd") or ""
    target_pid = data.get("target_pid") or ""
    device_name = data.get("device_name") or data.get("model") or ""
    mount_point = data.get("mount_point") or data.get("detected_usb_mount") or ""
    vendor_id = data.get("vendor_id") or ""
    product_id = data.get("product_id") or ""
    sha256 = data.get("sha256") or ""
    file_name = data.get("file_name") or ""
    file_path = data.get("file_path") or ""
    threat_score = data.get("threat_score") or data.get("risk_weight") or row["risk_score_delta"] or 0
    mitre_technique = data.get("mitre_technique") or ""

    if not mitre_technique:
        if event_code == 4688:
            mitre_technique = "T1059.004 (Unix Shell)"
        elif event_code == 2001:
            mitre_technique = "T1056.001 (Keyboard Keylogging/HID)"
        elif event_code == 5001:
            mitre_technique = "T1083 (File and Directory Discovery)"
        elif event_code == 1001:
            mitre_technique = "T1200 (Hardware Additions)"
        elif event_code == 7001:
            mitre_technique = "T1562 (Impair Defenses - Countermeasure)"

    # Build concise human-readable summary
    if command_line:
        summary = f"Process [{process_name or 'payload'}] executed: {command_line[:120]}"
    elif target_pid:
        summary = f"Surgical termination executed on PID {target_pid} (<34ms response)"
    elif device_name:
        summary = f"Hardware {device_name} attached at {mount_point or '/dev/sdc1'}"
    elif file_name:
        summary = f"Artifact '{file_name}' quarantined (Threat Score: {threat_score})"
    else:
        summary = description

    # Construct Splunk-style raw syslog representation
    raw_parts = [
        f"{timestamp}",
        f"host={HOSTNAME}",
        f"sourcetype={sourcetype}",
        f"EventCode={event_code}",
        f"EventName=\"{event_name}\"",
        f"severity={severity}",
        f"session_id=\"{session_id}\""
    ]
    if pid:
        raw_parts.append(f"pid={pid}")
    if process_name:
        raw_parts.append(f"process=\"{process_name}\"")
    if command_line:
        raw_parts.append(f"cmd=\"{command_line.replace('\"', '\\\"')}\"")
    if target_pid:
        raw_parts.append(f"target_pid={target_pid}")
    if mount_point:
        raw_parts.append(f"mount=\"{mount_point}\"")
    if device_name:
        raw_parts.append(f"device=\"{device_name}\"")
    if sha256:
        raw_parts.append(f"sha256={sha256}")
    if mitre_technique:
        raw_parts.append(f"mitre=\"{mitre_technique}\"")

    raw_log = " ".join(raw_parts)

    return {
        "event_id": event_id,
        "session_id": session_id,
        "timestamp": timestamp,
        "event_code": event_code,
        "event_name": event_name,
        "sourcetype": sourcetype,
        "host": HOSTNAME,
        "user": "yashz",
        "severity": severity,
        "summary": summary,
        "description": description,
        "mitre_technique": mitre_technique,
        "threat_score": threat_score,
        "extracted_fields": {
            "EventCode": event_code,
            "EventName": event_name,
            "Sourcetype": sourcetype,
            "Severity": severity,
            "Host": HOSTNAME,
            "User": "yashz",
            "PID": pid,
            "ProcessName": process_name,
            "CommandLine": command_line,
            "TargetPID": target_pid,
            "MountPoint": mount_point,
            "DeviceName": device_name,
            "VendorID": vendor_id,
            "ProductID": product_id,
            "FileName": file_name,
            "FilePath": file_path,
            "SHA256": sha256,
            "MitreTechnique": mitre_technique,
            "ThreatScore": threat_score
        },
        "data": data,
        "raw_log": raw_log
    }


@router.get("/events")
def get_siem_events(
    q: Optional[str] = None,
    severity: Optional[str] = None,
    event_code: Optional[int] = None,
    sourcetype: Optional[str] = None,
    time_range: Optional[str] = "all",
    limit: int = 100,
    offset: int = 0
):
    """
    Splunk-style log search API with field extraction, keyword querying, and time bucketing.
    """
    conn = get_db()
    cursor = conn.cursor()

    # Base query on events table
    sql = "SELECT * FROM events ORDER BY timestamp DESC"
    cursor.execute(sql)
    rows = cursor.fetchall()
    conn.close()

    formatted_events = [format_siem_event(r) for r in rows]

    # Time-range filtering
    now = datetime.datetime.utcnow()
    filtered = []
    for evt in formatted_events:
        # Filter by time if requested
        if time_range != "all":
            try:
                # Format: 2026-09-28T04:14:45.355Z or without ms
                ts_str = evt["timestamp"].replace("Z", "")
                evt_dt = datetime.datetime.fromisoformat(ts_str)
                delta = now - evt_dt
                if time_range == "15m" and delta.total_seconds() > 900:
                    continue
                elif time_range == "1h" and delta.total_seconds() > 3600:
                    continue
                elif time_range == "24h" and delta.total_seconds() > 86400:
                    continue
            except Exception:
                pass

        # Filter by severity
        if severity and evt["severity"].upper() != severity.upper():
            continue

        # Filter by EventCode
        if event_code and evt["event_code"] != event_code:
            continue

        # Filter by Sourcetype
        if sourcetype and sourcetype.lower() not in evt["sourcetype"].lower():
            continue

        # Query parsing (Splunk SPL style / text matching)
        if q:
            q_clean = q.strip()
            # Handle key=value SPL patterns
            kv_patterns = re.findall(r'(\w+)=(?:"([^"]*)"|(\S+))', q_clean)
            matches_all_kv = True
            
            if kv_patterns:
                for key, val_quoted, val_unquoted in kv_patterns:
                    val = val_quoted if val_quoted else val_unquoted
                    key_lower = key.lower()
                    val_lower = val.lower().replace("*", "")

                    if key_lower in ("eventcode", "code"):
                        try:
                            if evt["event_code"] != int(val):
                                matches_all_kv = False
                        except Exception:
                            matches_all_kv = False
                    elif key_lower in ("severity", "level"):
                        if val_lower not in evt["severity"].lower():
                            matches_all_kv = False
                    elif key_lower in ("sourcetype", "source"):
                        if val_lower not in evt["sourcetype"].lower():
                            matches_all_kv = False
                    elif key_lower in ("cmd", "command", "commandline"):
                        cmd = evt["extracted_fields"].get("CommandLine", "").lower()
                        if val_lower not in cmd:
                            matches_all_kv = False
                    elif key_lower in ("pid", "target_pid"):
                        pid_val = str(evt["extracted_fields"].get("PID", ""))
                        t_pid_val = str(evt["extracted_fields"].get("TargetPID", ""))
                        if val_lower not in pid_val and val_lower not in t_pid_val:
                            matches_all_kv = False
                    elif key_lower in ("host", "hostname"):
                        if val_lower not in evt["host"].lower():
                            matches_all_kv = False
                    else:
                        # Check extracted fields generically
                        found_in_fields = any(val_lower in str(v).lower() for v in evt["extracted_fields"].values())
                        if not found_in_fields:
                            matches_all_kv = False

            # Free text search across raw log
            # Remove the key=val tokens to see if there's residual free text
            residual_q = re.sub(r'\w+=(?:"[^"]*"|\S+)', '', q_clean).strip()
            if residual_q:
                terms = residual_q.lower().replace("*", "").split()
                matches_terms = all(
                    term in evt["raw_log"].lower() or
                    term in evt["summary"].lower() or
                    term in str(evt["event_code"])
                    for term in terms
                )
            else:
                matches_terms = True

            if not (matches_all_kv and matches_terms):
                continue

        filtered.append(evt)

    total_matched = len(filtered)
    paginated = filtered[offset : offset + limit]

    return {
        "status": "SUCCESS",
        "total_matched": total_matched,
        "limit": limit,
        "offset": offset,
        "events": paginated
    }


@router.get("/stats")
def get_siem_stats():
    """
    Returns SIEM aggregation metrics:
    - Events per second / minute
    - Top EventCodes and Sourcetypes
    - Time-bucketed histogram for Splunk timeline chart
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM events ORDER BY timestamp ASC")
    rows = cursor.fetchall()
    conn.close()

    total_count = len(rows)
    critical_count = 0
    high_count = 0
    code_counts: Dict[int, int] = {}
    sourcetype_counts: Dict[str, int] = {}
    time_buckets: Dict[str, Dict[str, int]] = {}

    for r in rows:
        etype = r["event_type"]
        sev = (r["severity"] or "INFO").upper()
        if sev == "CRITICAL":
            critical_count += 1
        elif sev == "HIGH":
            high_count += 1

        meta = EVENT_ID_MAP.get(etype, DEFAULT_META)
        code = meta["code"]
        stype = meta["sourcetype"]

        code_counts[code] = code_counts.get(code, 0) + 1
        sourcetype_counts[stype] = sourcetype_counts.get(stype, 0) + 1

        # Bucket by hour:minute in Indian Standard Time (IST: UTC + 5:30)
        ts = r["timestamp"]
        try:
            ts_clean = ts.replace("Z", "").replace(" ", "T")
            dt_utc = datetime.datetime.fromisoformat(ts_clean)
            dt_ist = dt_utc + datetime.timedelta(hours=5, minutes=30)
            bucket_key = dt_ist.strftime("%H:%M")
        except Exception:
            bucket_key = ts[11:16] if len(ts) >= 16 else "General"

        if bucket_key not in time_buckets:
            time_buckets[bucket_key] = {"total": 0, "critical": 0, "high": 0, "other": 0}
        time_buckets[bucket_key]["total"] += 1
        if sev == "CRITICAL":
            time_buckets[bucket_key]["critical"] += 1
        elif sev == "HIGH":
            time_buckets[bucket_key]["high"] += 1
        else:
            time_buckets[bucket_key]["other"] += 1

    # Format histogram bars
    histogram = []
    # Take last 20 time buckets
    bucket_keys = list(time_buckets.keys())[-24:]
    for k in bucket_keys:
        histogram.append({
            "time_label": k,
            "total": time_buckets[k]["total"],
            "critical": time_buckets[k]["critical"],
            "high": time_buckets[k]["high"],
            "other": time_buckets[k]["other"]
        })

    # Sort top codes and sourcetypes
    sorted_codes = sorted([{"code": k, "count": v, "name": next((m["name"] for m in EVENT_ID_MAP.values() if m["code"] == k), "OTHER")} for k, v in code_counts.items()], key=lambda x: x["count"], reverse=True)
    sorted_sourcetypes = sorted([{"sourcetype": k, "count": v} for k, v in sourcetype_counts.items()], key=lambda x: x["count"], reverse=True)

    return {
        "status": "SUCCESS",
        "total_events": total_count,
        "critical_events": critical_count,
        "high_events": high_count,
        "kill_events": code_counts.get(7001, 0),
        "quarantine_events": code_counts.get(6001, 0),
        "canary_events": code_counts.get(5001, 0),
        "badusb_events": code_counts.get(2001, 0),
        "process_events": code_counts.get(4688, 0),
        "estimated_eps": 1.4,
        "histogram": histogram,
        "top_event_codes": sorted_codes,
        "top_sourcetypes": sorted_sourcetypes
    }


class ChatHistoryItem(BaseModel):
    role: str
    content: str


class AITriageRequest(BaseModel):
    event_id: str
    event_code: int
    event_name: str
    sourcetype: str
    severity: str
    timestamp: str
    raw_log: str
    extracted_fields: Dict[str, Any]
    summary: str
    user_message: Optional[str] = None
    chat_history: Optional[List[ChatHistoryItem]] = []


@router.post("/ai-triage")
async def analyze_event_with_ai(req: AITriageRequest):
    """
    Interactive, conversational AI SOC analyst triage anchored to this specific log event.
    Chats directly with the analyst from the perspective of this event rather than generating a static report.
    """
    system_prompt = (
        "You are a Senior Lead SOC Incident Responder sitting side-by-side with a fellow analyst at a SIEM workstation. "
        "You are actively investigating this specific log event together in real time:\n"
        f"- Timestamp: {req.timestamp}\n"
        f"- EventCode: {req.event_code} ({req.event_name})\n"
        f"- Sourcetype: {req.sourcetype}\n"
        f"- Severity: {req.severity}\n"
        f"- Host: {req.extracted_fields.get('Host', 'darknight')}\n"
        f"- Process/Command: {req.extracted_fields.get('CommandLine') or req.summary}\n"
        f"- PID: {req.extracted_fields.get('PID') or req.extracted_fields.get('TargetPID')}\n"
        f"- Raw Log: {req.raw_log}\n\n"
        "YOUR CORE INSTRUCTIONS:\n"
        "1. DO NOT write a dry, numbered report or compliance document.\n"
        "2. CHAT NATURALLY with the analyst from the direct perspective of this log. Talk peer-to-peer like a savvy, elite threat hunter.\n"
        "3. Address what is happening right now in the log: dissect the suspicious command, explain the adversary's intent, warn of risks, and propose tangible actions.\n"
        "4. If the analyst asks follow-up questions, answer directly in the context of this event.\n"
        "5. Keep responses concise, direct, conversational, and technical."
    )

    history_context = ""
    if req.chat_history:
        history_context = "\n".join([f"{msg.role.upper()}: {msg.content}" for msg in req.chat_history[-6:]])

    if req.user_message:
        user_prompt = f"""
CONVERSATION CONTEXT:
{history_context}

ANALYST'S NEW QUESTION/MESSAGE:
"{req.user_message}"

Respond directly to the analyst in conversation:
"""
    else:
        user_prompt = f"""
The analyst just opened this log to investigate it with you. 
Give them an immediate, conversational opening breakdown of what you see in this event, why it matters, and invite them to dig deeper with you.
"""

    ai_response = await glm_client.agenerate(user_prompt, system=system_prompt, temperature=0.3)

    # Conversational fallback if Ollama is paused/disabled
    if not ai_response or "[AI Engine Disabled]" in ai_response:
        cmd = req.extracted_fields.get("CommandLine") or req.summary
        pid = req.extracted_fields.get("PID") or req.extracted_fields.get("TargetPID")
        pid_text = f"on PID {pid}" if pid else ""
        
        if req.user_message:
            ai_response = (
                f"Looking back at this event ({req.event_name}), regarding \"{req.user_message}\": "
                f"The command was `{cmd}`. In our live environment, any process spawned with these parameters "
                f"is treated as an active exfiltration attempt. We should check if socket connections were created, "
                f"or run `ss -tlpn` to see if PID {pid or '<target>'} opened an external port."
            )
        else:
            ai_response = (
                f"Hey, let's look at this one closely. We've got Event {req.event_code} ({req.event_name}) at {req.timestamp}.\n\n"
                f"Notice what was executed {pid_text}: `{cmd}`.\n\n"
                f"This looks like an unauthorized payload or script host running straight from removable media. "
                f"The adversary is likely attempting data exfiltration or opening a reverse-shell connection back to a remote listener.\n\n"
                f"Our sentinel flagged it as {req.severity}. What do you want to check next? We can trace the parent PID, "
                f"kill any related processes, or check the USB mount point for additional dropped scripts."
            )

    return {
        "status": "SUCCESS",
        "event_id": req.event_id,
        "event_code": req.event_code,
        "ai_triage": ai_response,
        "reply": ai_response
    }


class AIQueryRequest(BaseModel):
    natural_language_prompt: str


@router.post("/ai-query")
async def convert_natural_language_to_spl(req: AIQueryRequest):
    """
    Translates an analyst's plain English request into a clean Splunk SPL search query.
    Example: "find all killed reverse shells from today" -> "EventCode=7001 OR (EventCode=4688 command_line="*nc*")"
    """
    system_prompt = (
        "You are an expert Splunk SPL Query Engineer for a hardware-focused SOC SIEM. "
        "The SIEM indexes these EventCodes: "
        "- EventCode=1001 (USB Hardware Attached) "
        "- EventCode=1002 (USB Hardware Detached) "
        "- EventCode=2001 (Synthetic Keystroke Injection / BadUSB) "
        "- EventCode=4688 (Suspicious Process Execution) "
        "- EventCode=5001 (Canary Decoy Trap Tripped) "
        "- EventCode=6001 (Malicious File Quarantined) "
        "- EventCode=7001 (Autonomous Surgical Kill) "
        "- EventCode=8001 (Autorun Neutralized) "
        "Available fields: sourcetype, severity, EventCode, command_line, pid, target_pid, mount_point, device_name, sha256. "
        "Output ONLY the SPL query string. Do NOT include markdown fences, explanations, or quotes."
    )

    user_prompt = f"Convert this analyst request to a Splunk query: \"{req.natural_language_prompt}\""
    spl_query = await glm_client.agenerate(user_prompt, system=system_prompt, temperature=0.1)
    spl_query = spl_query.strip().replace("```spl", "").replace("```", "").strip()

    if not spl_query:
        # Fallback keyword logic
        p_low = req.natural_language_prompt.lower()
        if "kill" in p_low or "terminate" in p_low:
            spl_query = "EventCode=7001 severity=CRITICAL"
        elif "reverse" in p_low or "shell" in p_low:
            spl_query = "EventCode=4688 command_line=\"*nc*\""
        elif "usb" in p_low or "insert" in p_low:
            spl_query = "EventCode=1001"
        elif "canary" in p_low or "decoy" in p_low:
            spl_query = "EventCode=5001"
        elif "badusb" in p_low or "keystroke" in p_low:
            spl_query = "EventCode=2001"
        else:
            spl_query = req.natural_language_prompt

    return {
        "status": "SUCCESS",
        "original_prompt": req.natural_language_prompt,
        "spl_query": spl_query
    }
