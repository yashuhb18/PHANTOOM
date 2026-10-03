import asyncio
import datetime
from typing import Dict, Any
from backend.core.event_collector import event_collector
from backend.core.session_manager import session_manager
from backend.core.risk_scoring import risk_scoring
from backend.core.correlation_engine import correlation_engine
from backend.core.fingerprint_engine import fingerprint_engine
from backend.core.canary_manager import canary_manager
from backend.core.response_engine import response_engine
from backend.core.ai_analyst import ai_analyst
from backend.ws_manager import ws_manager

class AttackSimulator:
    """
    Executes scripted hackathon demo scenarios:
    Stage 1: USB #1 (RubberDucky) -> Keystroke Injection -> PowerShell -> Canary Decoy Trip -> Containment -> DNA Stored
    Stage 2: USB #2 (BashBunny) -> Different Hardware -> Immediate 82% DNA Fingerprint Match
    """
    def __init__(self):
        self.is_simulating = False

    async def run_stage_1(self) -> Dict[str, Any]:
        self.is_simulating = True
        session_id = "sess_demo_stage1_ducky"

        session_manager.create_session(
            session_id=session_id,
            device_name="USB Rubber Ducky v2.1",
            vendor_id="03EB",
            product_id="2042",
            serial_number="DUCKY-89421-A",
            mount_point="E:\\"
        )
        canary_manager.active_session_id = session_id

        steps = [
            {
                "source": "USB",
                "event_type": "USB_INSERTED",
                "severity": "INFO",
                "data": {"device_name": "USB Rubber Ducky v2.1", "vendor_id": "03EB", "product_id": "2042", "class": "HID_KEYBOARD"},
                "delay": 0.5
            },
            {
                "source": "KEYSTROKE",
                "event_type": "KEYSTROKE_INJECTION_DETECTED",
                "severity": "HIGH",
                "data": {"chars_per_second": 890, "threshold": 120, "anomaly": "SUPERHUMAN_TYPING_BURST"},
                "delay": 0.8
            },
            {
                "source": "PROCESS",
                "event_type": "SUSPICIOUS_PROCESS_SPAWNED",
                "severity": "HIGH",
                "data": {"process_name": "powershell.exe", "command_line": "powershell.exe -NoP -NonI -W Hidden -Enc SQBFAFgA...", "parent_pid": 1084},
                "delay": 1.0
            },
            {
                "source": "CANARY_DECEPTION",
                "event_type": "CANARY_TRAP_TRIPPED",
                "severity": "CRITICAL",
                "data": {"file_path": "decoy_files/.aws_creds_canary", "trap_type": "AWS_CREDENTIALS", "action": "UNAUTHORIZED_READ"},
                "delay": 1.2
            },
            {
                "source": "RESPONSE_ENGINE",
                "event_type": "CONTAINMENT_TRIGGERED",
                "severity": "CRITICAL",
                "data": {"action": "AUTONOMOUS_SOCKET_SEVER", "target": "10.0.4.15", "status": "ISOLATED"},
                "delay": 0.6
            },
            {
                "source": "USB",
                "event_type": "USB_REMOVED",
                "severity": "INFO",
                "data": {"device_name": "USB Rubber Ducky v2.1", "status": "PHYSICALLY_DISCONNECTED"},
                "delay": 0.5
            }
        ]

        for step in steps:
            risk_delta = risk_scoring.evaluate_event_risk(step["event_type"], step["severity"], step["data"])
            event = event_collector.normalize_event(
                session_id=session_id,
                source=step["source"],
                event_type=step["event_type"],
                severity=step["severity"],
                data=step["data"],
                risk_score_delta=risk_delta
            )
            session_manager.record_event(event)

            # AI Narration
            narration = ai_analyst.narrate_event(event.dict())

            # Broadcast over WebSockets
            await ws_manager.broadcast_live(event.dict())
            await ws_manager.broadcast_narrator({
                "session_id": session_id,
                "timestamp": event.timestamp,
                "text": narration,
                "severity": event.severity
            })

            if step["event_type"] == "CANARY_TRAP_TRIPPED":
                canary_manager.handle_trap_trip("decoy_files/.aws_creds_canary", "READ_ATTEMPT")
            elif step["event_type"] == "CONTAINMENT_TRIGGERED":
                response_engine.execute_containment(session_id, "SOCKET_SEVER", "0.0.0.0/0")
            elif step["event_type"] == "USB_REMOVED":
                session_manager.close_session(session_id)

            await asyncio.sleep(step["delay"])

        # Build correlation graph & extract DNA
        correlation_engine.build_attack_graph(session_id)
        meta1 = {
            "device_name": "USB Rubber Ducky",
            "vendor_id": "03EB",
            "product_id": "2401",
            "serial_number": "DUCKY-8841-A",
            "vendor_name": "Atmel Corp / Hak5",
            "pnp_id": "/dev/sdb1",
            "filesystem": "FAT32",
            "capacity_gb": 0.512
        }
        fp = fingerprint_engine.extract_fingerprint(session_id, device_meta=meta1)

        self.is_simulating = False
        return {
            "status": "COMPLETED",
            "session_id": session_id,
            "fingerprint": fp
        }

    async def run_stage_2(self) -> Dict[str, Any]:
        self.is_simulating = True
        session_id = "sess_demo_stage2_bunny"

        session_manager.create_session(
            session_id=session_id,
            device_name="BashBunny Mark II",
            vendor_id="1FC9",
            product_id="0083",
            serial_number="BUNNY-67120-X",
            mount_point="F:\\"
        )
        canary_manager.active_session_id = session_id

        steps = [
            {
                "source": "USB",
                "event_type": "USB_INSERTED",
                "severity": "INFO",
                "data": {"device_name": "BashBunny Mark II", "vendor_id": "1FC9", "product_id": "0083", "class": "COMPOSITE_HID_CDC"},
                "delay": 0.4
            },
            {
                "source": "KEYSTROKE",
                "event_type": "KEYSTROKE_INJECTION_DETECTED",
                "severity": "HIGH",
                "data": {"chars_per_second": 940, "threshold": 120, "anomaly": "SYNTHETIC_INJECTION_PROFILE"},
                "delay": 0.7
            },
            {
                "source": "PROCESS",
                "event_type": "SUSPICIOUS_PROCESS_SPAWNED",
                "severity": "HIGH",
                "data": {"process_name": "powershell.exe", "command_line": "powershell.exe -W Hidden -NoP -Enc VABlAHMAdAA...", "parent_pid": 2048},
                "delay": 0.8
            },
            {
                "source": "CANARY_DECEPTION",
                "event_type": "CANARY_TRAP_TRIPPED",
                "severity": "CRITICAL",
                "data": {"file_path": "decoy_files/.aws_creds_canary", "trap_type": "AWS_CREDENTIALS", "action": "CREDENTIAL_ENUMERATION"},
                "delay": 1.0
            }
        ]

        for step in steps:
            risk_delta = risk_scoring.evaluate_event_risk(step["event_type"], step["severity"], step["data"])
            event = event_collector.normalize_event(
                session_id=session_id,
                source=step["source"],
                event_type=step["event_type"],
                severity=step["severity"],
                data=step["data"],
                risk_score_delta=risk_delta
            )
            session_manager.record_event(event)

            narration = ai_analyst.narrate_event(event.dict())

            await ws_manager.broadcast_live(event.dict())
            await ws_manager.broadcast_narrator({
                "session_id": session_id,
                "timestamp": event.timestamp,
                "text": narration,
                "severity": event.severity
            })

            await asyncio.sleep(step["delay"])

        correlation_engine.build_attack_graph(session_id)
        meta2 = {
            "device_name": "BashBunny Mark II",
            "vendor_id": "1FC9",
            "product_id": "0083",
            "serial_number": "BUNNY-67120-X",
            "vendor_name": "NXP Semiconductors / Hak5",
            "pnp_id": "/dev/sdc1",
            "filesystem": "FAT32",
            "capacity_gb": 1.95
        }
        fp2 = fingerprint_engine.extract_fingerprint(session_id, device_meta=meta2)

        # Immediate DNA comparison with Stage 1
        comparison = fingerprint_engine.compare_fingerprints("sess_demo_stage1_ducky", session_id)

        # Broadcast DNA comparison match alert with Lineage details
        await ws_manager.broadcast_narrator({
            "session_id": session_id,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "text": f"🧬 FORENSIC LINEAGE MATCH: {int(comparison['similarity_score']*100)}% match to Session #1 (Rubber Ducky)! Despite hardware VID/PID swap, both USBs contain identical preparation dust ({comparison.get('verdict')})",
            "severity": "CRITICAL"
        })

        self.is_simulating = False
        return {
            "status": "COMPLETED",
            "session_id": session_id,
            "fingerprint": fp2,
            "comparison": comparison
        }

attack_simulator = AttackSimulator()
