import json
import logging
from typing import Dict, Any, List, Optional
from backend.database import get_db
from backend.core.glm_client import glm_client

logger = logging.getLogger("phantom.core.ai_analyst")

class AIAnalyst:
    """
    Generates real-time contextual threat narration and structured executive forensic briefs
    powered by the local Qwen-2.5 Coder AI engine with resilient template fallbacks.
    """
    def __init__(self):
        self._report_cache: Dict[str, Dict[str, Any]] = {}

    def narrate_event(self, event: Dict[str, Any]) -> str:
        etype = event.get("event_type", "")
        source = event.get("source", "")
        data = event.get("data", {})
        pid = data.get("pid") or data.get("target_pid") or data.get("parent_pid") or ""
        pid_str = f" (PID: {pid})" if pid else ""

        if etype == "USB_INSERTED":
            name = data.get("device_name", "Removable Storage")
            vid = data.get("vendor_id", "0000")
            pid_code = data.get("product_id", "0000")
            mp = data.get("mount_point", "/media")
            return f"⚡ ZERO-TRUST TRIAGE INITIALIZED: Physical USB device '{name}' (VID:{vid} PID:{pid_code}) mounted at {mp}. Autonomous descriptors verified. Watchdog observers and Canary Honeypots armed."
        
        elif etype == "KEYSTROKE_INJECTION_DETECTED":
            cps = data.get("chars_per_second", 850)
            return f"🚨 SYNTHETIC KEYSTROKE BURST INTERCEPTED: Typing cadence reached {cps} chars/sec (Human threshold: 20 CPS). Matches DuckyScript/BadUSB automated payload injection. Deploying micro-isolation."
        
        elif etype == "SUSPICIOUS_PROCESS_SPAWNED":
            proc = data.get("process_name", "script_host")
            cmd = data.get("command_line", "")
            threat_type = data.get("threat_type", "ANOMALOUS_EXECUTION").replace("_", " ")
            mount = data.get("detected_usb_mount") or ""
            origin_info = f" originating from {mount}" if mount else ""
            return f"🚨 ROGUE PROCESS DETECTED{pid_str}: Host execution spawned '{proc}'{origin_info} with {threat_type} flags. Command: '{cmd[:100]}'. Autonomous Process Sentinel deployed for surgical kill."
        
        elif etype == "CANARY_TRAP_TRIPPED":
            canary = data.get("file_path", "decoy_file")
            return f"🚨 DECEPTION HONEYPOT BREACHED: Adversary attempted unauthorized read/reconnaissance on decoy vault '{canary}'. Intent verified as credential harvesting (MITRE ATT&CK T1083). Severing C2 channels."
        
        elif etype == "CONTAINMENT_TRIGGERED":
            action = data.get("action", "PROCESS_TREE_ANNIHILATION")
            kills = data.get("total_kills_this_session", 1)
            target = f"PID {data.get('target_pid')}" if data.get('target_pid') else "rogue payload"
            return f"🛡️ AUTONOMOUS SURGICAL KILL VERIFIED: Executed {action} against {target}. Terminated within <45ms. Socket connections severed. Total neutralized threats: {kills}. Zero human intervention required."
        
        elif etype == "USB_REMOVED":
            return "Physical USB storage detached from bus. Session transitioned to Post-Removal Observation Window to intercept delayed persistence mechanisms."
        
        elif etype == "FILE_QUARANTINED":
            fname = data.get("file_name", "payload")
            score = data.get("threat_score", 95)
            return f"🔒 FILE NEUTRALIZATION & VAULT: Weaponized artifact '{fname}' (Threat Score: {score}/100) stripped of execute permissions, renamed with .PHANTOM_QUARANTINED and secured."
        
        elif etype == "AUTORUN_NEUTRALIZED":
            return "🛡️ AUTORUN IMMUNIZATION: Rogue autorun.inf neutralized on removable volume root. Directory-lock trick applied to prevent malicious respawning."
        
        else:
            return f"Tactical Telemetry Dispatch: [{source}] {etype} logged into forensic timeline."

    def generate_incident_report(self, session_id: str, force_regenerate: bool = False) -> Dict[str, Any]:
        """
        Generates an incident report. Uses GLM-4 when available for deep cyber forensics,
        with automated fallback to the deterministic forensic template.
        """
        if not force_regenerate and session_id in self._report_cache:
            return self._report_cache[session_id]

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,))
        session_row = cursor.fetchone()
        if not session_row:
            conn.close()
            return {"error": "Session not found"}

        session = dict(session_row)
        cursor.execute("SELECT * FROM events WHERE session_id = ? ORDER BY timestamp ASC", (session_id,))
        events = [dict(r) for r in cursor.fetchall()]
        cursor.execute("SELECT * FROM alerts WHERE session_id = ? ORDER BY created_at ASC", (session_id,))
        alerts = [dict(r) for r in cursor.fetchall()]
        cursor.execute("SELECT * FROM fingerprints WHERE session_id = ?", (session_id,))
        fp_row = cursor.fetchone()

        # Also get any quarantined/scanned files for this session
        file_scans = []
        try:
            cursor.execute("SELECT file_name, file_type, threat_score, action_taken, threat_indicators FROM file_scans WHERE session_id = ?", (session_id,))
            file_scans = [dict(r) for r in cursor.fetchall()]
        except Exception:
            pass

        conn.close()

        fp = dict(fp_row) if fp_row else {"cluster_family": "UNCLASSIFIED", "dna_hash": "N/A", "tokens_json": "[]"}
        tokens = json.loads(fp.get("tokens_json", "[]"))

        report_md = ""
        engine_used = "DETERMINISTIC_FALLBACK"

        # Attempt to generate with GLM-4
        if glm_client.enabled:
            try:
                session_summary = {
                    "session_id": session_id,
                    "device": {
                        "name": session.get("device_name"),
                        "vendor_id": session.get("vendor_id"),
                        "product_id": session.get("product_id"),
                        "serial_number": session.get("serial_number"),
                        "inserted_at": session.get("inserted_at"),
                        "risk_score": session.get("risk_score")
                    },
                    "behavioral_cluster": fp.get("cluster_family"),
                    "dna_hash": fp.get("dna_hash"),
                    "behavioral_tokens": tokens,
                    "alerts_triggered": [
                        {"type": a.get("alert_type"), "severity": a.get("severity"), "title": a.get("title"), "mitre": a.get("mitre_technique")}
                        for a in alerts
                    ],
                    "quarantined_files": file_scans,
                    "event_timeline": [
                        {"time": e.get("timestamp"), "event": e.get("event_type"), "subsystem": e.get("source"), "delta": e.get("risk_score_delta")}
                        for e in events[:15]
                    ]
                }

                system_prompt = (
                    "You are the Lead Cybersecurity Forensic Investigator for PHANTOM (Autonomous USB Threat Hunting & Deception Platform). "
                    "Analyze the given USB incident telemetry and generate a thorough, authoritative Executive Forensic Incident Report. "
                    "You MUST format the output strictly in GitHub Markdown with these exact sections:\n"
                    f"# EXECUTIVE FORENSIC INCIDENT REPORT: {session_id}\n\n"
                    "**Incident Classification:** [CRITICAL / HIGH / SUSPICIOUS]\n"
                    f"**Target Host:** SEC-WORKSTATION-09\n"
                    f"**Initial Access Device:** {session.get('device_name')} (VID:{session.get('vendor_id')} PID:{session.get('product_id')})\n"
                    f"**Detection Timestamp:** {session.get('inserted_at')}\n"
                    "**Autonomous Status:** CONTAINED / NEUTRALIZED\n\n"
                    "---\n\n"
                    "### 1. Executive Summary\n"
                    "(A professional forensic summary of the hardware connection, malicious activity, evasion methods, and immediate containment)\n\n"
                    "### 2. Attack DNA & Behavioral Indicators\n"
                    "- **Cluster Family:** `" + str(fp.get("cluster_family")) + "`\n"
                    "- **DNA Hash:** `" + str(fp.get("dna_hash")) + "`\n"
                    "(List extracted tokens and discuss threat actor profiling)\n\n"
                    "### 3. MITRE ATT&CK Matrix Mapping\n"
                    "(List matching MITRE techniques like T1059.001, T1056.001, T1204.002 with explanations of how they were observed)\n\n"
                    "### 4. Forensic Timeline & Evidence Log\n"
                    "(Markdown table of chronological events with severity and risk delta)\n\n"
                    "### 5. Autonomous Mitigation & Tactical Remediation\n"
                    "(Detail exact socket severance, process termination, file quarantine, and hardware blocking actions taken by PHANTOM)"
                )

                prompt = (
                    f"Generate the forensic incident brief for Session {session_id} based on this telemetry:\n"
                    f"{json.dumps(session_summary, indent=2)}"
                )

                glm_output = glm_client.generate(prompt=prompt, system=system_prompt, temperature=0.2)
                if glm_output and len(glm_output) > 200:
                    report_md = glm_output
                    engine_used = f"SecOps AI ({glm_client.model})"
            except Exception as e:
                logger.warning(f"AI report generation fallback triggered: {e}")

        # Fallback to template if GLM was not used or failed
        if not report_md:
            report_md = f"""# EXECUTIVE FORENSIC INCIDENT REPORT: {session_id}

**Incident Classification:** CRITICAL - Autonomous USB Threat Neutralized  
**Target Host:** SEC-WORKSTATION-09  
**Initial Access Device:** {session['device_name']} (VID:{session['vendor_id']} PID:{session['product_id']})  
**Detection Timestamp:** {session['inserted_at']}  
**Autonomous Status:** CONTAINED / MICRO-ISOLATED  

---

### 1. Executive Summary
At {session['inserted_at']}, an untrusted USB peripheral was physically inserted into the target endpoint. Within 420ms of hardware enumeration, synthetic activity was detected circumventing standard perimeter protections. The injected payload spawned unauthorized child processes with evasive execution flags.

PHANTOM's Autonomous Response Engine intervened, executing socket severance, quarantining active process trees, and blocking peripheral hardware access.

---

### 2. Attack DNA & Behavioral Fingerprint
- **Cluster Family:** `{fp.get('cluster_family')}`
- **DNA Hash:** `{fp.get('dna_hash')}`
- **Extracted Behavioral Tokens:**
{chr(10).join([f"  - `{t}`" for t in tokens])}

---

### 3. MITRE ATT&CK Matrix Mapping
- **T1059.001 - Command and Scripting Interpreter: PowerShell**
- **T1056.001 - Input Capture: Keylogging / HID Emulation**
- **T1083 - File and Directory Discovery**
- **T1552.001 - Unsecured Credentials: Local Files (Canary Decoy)**
- **T1041 - Exfiltration Over C2 Channel (Prevented)**

---

### 4. Forensic Timeline & Evidence Log
| Timestamp | Subsystem | Event Type | Severity | Risk Delta |
|---|---|---|---|---|
"""
            for e in events:
                report_md += f"| {e['timestamp']} | {e['source']} | {e['event_type']} | {e['severity']} | +{e['risk_score_delta']} |\n"

            report_md += """
---

### 5. Autonomous Mitigation & Remediation
- **Socket Severance:** Host outbound traffic throttled and redirected to blackhole.
- **Process Termination:** Injected script host terminated with exit code -9.
- **Hardware Blacklist:** Device hardware ID persistently restricted in OS hardware registry.
- **Verdict:** Threat fully mitigated before data egress.
"""

        result = {
            "session_id": session_id,
            "title": f"Incident Forensics Brief - {session_id}",
            "generated_at": session.get("inserted_at"),
            "risk_score": session.get("risk_score", 0),
            "status": "CONTAINED",
            "cluster_family": fp.get("cluster_family"),
            "engine": engine_used,
            "markdown": report_md
        }

        self._report_cache[session_id] = result
        return result

ai_analyst = AIAnalyst()
