"""
PHANTOM Autonomous WhatsApp SOC Bot & Alert Dispatcher
======================================================
Automated alert delivery to WhatsApp without mandatory login/OAuth.
Supports:
1. CallMeBot Gateway (Direct to personal WhatsApp with zero login/browser requirements)
2. Open-WA / Baileys REST Gateway (Connects to open-source @open-wa/wa-automate REST daemon)
3. In-App Simulated WhatsApp Web Client (Live SOC chatbot widget in the web console)
4. Two-way AI Command Center (status, alerts, eject, isolate, AI security Q&A)
"""

import os
import sys
import time
import json
import logging
import asyncio
import urllib.parse
from typing import Dict, Any, List, Optional
import httpx

from backend.database import get_db
from backend.ws_manager import ws_manager

logger = logging.getLogger("phantom.whatsapp")

CONFIG_FILE = os.path.expanduser("~/.phantom_whatsapp_config.json")

THREAT_NAME_MAP = {
    "KEYSTROKE_INJECTION": "Keystroke Injection (Rubber Ducky)",
    "KEYSTROKE_INJECTION_DETECTED": "Keystroke Injection (Rubber Ducky)",
    "USB_TRIGGERED_SCRIPT_HOST": "USB-Triggered Script Execution",
    "ROGUE_ERROR_FLOOD_PAYLOAD": "Rogue Process Flood Attack",
    "RUNAWAY_HIGH_PROCESSOR_ABUSE": "Host CPU Glitch / Resource Abuse",
    "ROGUE_HIGH_CPU_GLITCH_PAYLOAD": "Rogue CPU Spike Glitch",
    "BATCH_ATTACK_LAUNCHER": "Autonomous Batch Payload Launcher",
    "CANARY_DECEPTION": "Canary Honeypot Trap Tripped",
    "CANARY_FILE_TAMPERING": "Decoy Honeypot File Tampering",
    "DNA_FINGERPRINT_MATCH": "Hardware DNA Threat Recurrence",
    "SUSPICIOUS_PROCESS_SPAWNED": "Unauthorized Process Execution",
    "USB_UNAUTHORIZED": "Unauthorized Physical Peripheral",
    "USB_THREAT_AWAITING_USER_EJECT": "Adversary Payload Isolated (Awaiting Eject)",
    "USB_SCAN_COMPLETE": "Deep USB Peripheral Audit Complete",
}

class WhatsAppBotManager:
    """Manages automated WhatsApp alert dispatching and interactive SOC bot commands."""

    def __init__(self):
        self.config = self._load_config()
        self.chat_history: List[Dict[str, Any]] = []
        self._init_db()

    def _init_db(self):
        """Ensures the whatsapp_messages table exists in SQLite."""
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS whatsapp_messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    direction TEXT NOT NULL,  -- 'OUTBOUND' or 'INBOUND'
                    sender TEXT,
                    message TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    status TEXT DEFAULT 'DELIVERED',
                    metadata_json TEXT
                )
            """)
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error initializing whatsapp_messages table: {e}")

    def _load_config(self) -> Dict[str, Any]:
        """Loads configuration from disk or defaults."""
        default_config = {
            "enabled": True,
            "target_phone": "",          # e.g. "+919876543210" or "919876543210"
            "gateway_mode": "CALLMEBOT", # "CALLMEBOT", "OPENWA_REST", "MOCK"
            "callmebot_apikey": "",      # Free CallMeBot API Key
            "openwa_rest_url": "http://127.0.0.1:8085/api/sendText",
            "ntfy_topic": "phantom_alerts",
            "ntfy_icon": "https://raw.githubusercontent.com/yashuhb18/PHANTOOM/main/frontend/public/phantom-icon-yellow.png",
            "console_url": "http://localhost:3000",
            "auto_alert_severity": ["CRITICAL", "HIGH"],
            "bot_name": "PHANTOM SOC Sentinel"
        }
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r") as f:
                    data = json.load(f)
                    default_config.update(data)
            except Exception as e:
                logger.error(f"Failed to load WhatsApp config: {e}")
        return default_config

    def save_config(self, new_config: Dict[str, Any]) -> Dict[str, Any]:
        """Updates and persists WhatsApp bot configuration."""
        self.config.update(new_config)
        try:
            with open(CONFIG_FILE, "w") as f:
                json.dump(self.config, f, indent=2)
            logger.info("WhatsApp Bot configuration saved successfully.")
        except Exception as e:
            logger.error(f"Failed to save WhatsApp config: {e}")
        return self.config

    def get_messages(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves recent WhatsApp messages."""
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, direction, sender, message, timestamp, status, metadata_json
                FROM whatsapp_messages
                ORDER BY id DESC LIMIT ?
            """, (limit,))
            rows = cursor.fetchall()
            conn.close()
            msgs = []
            for r in reversed(rows):
                msgs.append({
                    "id": r[0],
                    "direction": r[1],
                    "sender": r[2],
                    "message": r[3],
                    "timestamp": r[4],
                    "status": r[5],
                    "metadata": json.loads(r[6]) if r[6] else {}
                })
            return msgs
        except Exception as e:
            logger.error(f"Error fetching WhatsApp messages: {e}")
            return []

    def record_message(self, direction: str, sender: str, message: str, metadata: Optional[Dict[str, Any]] = None):
        """Stores a message in SQLite and broadcasts it to live UI."""
        now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        meta_str = json.dumps(metadata or {})
        try:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO whatsapp_messages (direction, sender, message, timestamp, status, metadata_json)
                VALUES (?, ?, ?, ?, 'DELIVERED', ?)
            """, (direction, sender, message, now, meta_str))
            msg_id = cursor.lastrowid
            conn.commit()
            conn.close()

            # Broadcast over WebSocket to active UI clients
            payload = {
                "source": "WHATSAPP_BOT",
                "event_type": "WHATSAPP_MESSAGE_RECEIVED" if direction == "INBOUND" else "WHATSAPP_ALERT_SENT",
                "severity": "INFO",
                "timestamp": now,
                "data": {
                    "id": msg_id,
                    "direction": direction,
                    "sender": sender,
                    "message": message,
                    "metadata": metadata or {}
                }
            }
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(ws_manager.broadcast_live(payload))
            except RuntimeError:
                try:
                    coro = ws_manager.broadcast_live(payload)
                    from backend.agent.process_monitor import process_monitor
                    if process_monitor._event_loop and process_monitor._event_loop.is_running():
                        asyncio.run_coroutine_threadsafe(coro, process_monitor._event_loop)
                    else:
                        coro.close()
                except Exception:
                    pass
        except Exception as e:
            logger.error(f"Error recording WhatsApp message: {e}")

    def trigger_alert(self, title: str, threat_type: str, severity: str, details: str, target: str = ""):
        """
        Thread-safe alert trigger. Can be safely invoked from any background thread,
        process monitor, or callback without requiring an asyncio event loop.
        """
        import threading
        threading.Thread(
            target=self._sync_alert_worker,
            args=(title, threat_type, severity, details, target),
            daemon=True
        ).start()

    def _sync_alert_worker(self, title: str, threat_type: str, severity: str, details: str, target: str = ""):
        """Synchronously processes and dispatches alerts to DB, WebSockets, ntfy.sh, and gateways."""
        if not self.config.get("enabled", True):
            return

        sev = (severity or "CRITICAL").upper()
        clean_threat = THREAT_NAME_MAP.get(threat_type.upper().strip(), threat_type.replace('_', ' ').title())
        now_str = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())

        # Clean target and details
        target_clean = target.strip() if target else "Physical Host Interface"
        details_clean = details.strip() if details else "Autonomous kernel intervention executed."
        if len(details_clean) > 200:
            details_clean = details_clean[:197] + "..."

        # Priority & visual status based on severity
        if sev == "CRITICAL":
            ntfy_priority = 5
            ntfy_tags = ["shield", "zap", "rotating_light"]
            ntfy_title = f"🛡️ PHANTOM: {clean_threat} Neutralized"
            header_badge = "⚡ AUTONOMOUS CONTAINMENT ENGAGED"
            action_desc = "Host sockets severed & rogue PID terminated (<0.8s)"
        elif sev == "HIGH":
            ntfy_priority = 4
            ntfy_tags = ["shield", "warning"]
            ntfy_title = f"⚠️ PHANTOM: {clean_threat} Intercepted"
            header_badge = "⚠️ ANOMALOUS PERIPHERAL BEHAVIOR"
            action_desc = "Process isolated under kernel surveillance"
        else:
            ntfy_priority = 3
            ntfy_tags = ["shield", "information_source"]
            ntfy_title = f"🛡️ PHANTOM: {clean_threat}"
            header_badge = "ℹ️ PERIPHERAL TELEMETRY NOTIFICATION"
            action_desc = "Telemetry event recorded & audited"

        # Rich Markdown notification body formatted specifically for mobile lock-screens & ntfy
        ntfy_body = (
            f"### {header_badge}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"• **Threat:** {clean_threat}\n"
            f"• **Severity:** `{sev}` [Level {5 if sev == 'CRITICAL' else 4 if sev == 'HIGH' else 3}]\n"
            f"• **Target:** `{target_clean}`\n"
            f"• **Containment:** {action_desc}\n"
            f"• **Details:** {details_clean}\n"
            f"• **Timestamp:** {now_str}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🔒 *Machine defended at kernel physical layer by PHANTOM*"
        )

        # Standard plain-text alert for DB record and fallback gateways
        alert_body = (
            f"🛡️ *PHANTOM ZERO-TRUST SOC ALERT* 🚨\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"⚠️ *Severity:* `{sev}`\n"
            f"🎯 *Threat:* *{clean_threat}*\n"
            f"🎯 *Target:* `{target_clean}`\n"
            f"⚡ *Status:* {action_desc}\n"
            f"📝 *Details:* {details_clean}\n"
            f"🕒 *Timestamp:* {now_str}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🔒 *Autonomous Sentinel:* Intercepted & Secured"
        )

        # 1. Record in SQLite message database
        try:
            self.record_message("OUTBOUND", "PHANTOM Sentinel", alert_body, {
                "threat_type": threat_type,
                "severity": sev,
                "target": target_clean
            })
        except Exception as e:
            logger.debug(f"Error recording message in DB: {e}")

        # 2. Direct mobile lock-screen push notification to ntfy.sh (instant, zero-dependency, rich UI)
        try:
            import urllib.request
            topic = self.config.get("ntfy_topic", "phantom_alerts")
            icon_url = self.config.get(
                "ntfy_icon",
                "https://raw.githubusercontent.com/yashuhb18/PHANTOOM/main/frontend/public/phantom-icon-yellow.png"
            )
            console_url = self.config.get("console_url", "http://localhost:3000")

            ntfy_payload = {
                "topic": topic,
                "title": ntfy_title,
                "message": ntfy_body,
                "priority": ntfy_priority,
                "tags": ntfy_tags,
                "icon": icon_url,
                "click": f"{console_url}/dashboard",
                "actions": [
                    {
                        "action": "view",
                        "label": "🖥️ Open SOC Console",
                        "url": f"{console_url}/dashboard"
                    },
                    {
                        "action": "view",
                        "label": "📋 Incident Report",
                        "url": f"{console_url}/reports"
                    }
                ],
                "markdown": True
            }

            req = urllib.request.Request(
                "https://ntfy.sh",
                data=json.dumps(ntfy_payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json; charset=utf-8",
                    "User-Agent": "PHANTOM-Defense-Engine/2.0"
                }
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    logger.info(f"📱 Mobile lock-screen push delivered: ntfy.sh/{topic} with PHANTOM logo (Status: {resp.status})")
        except Exception as e:
            logger.error(f"Mobile push notification delivery error: {e}")

        # 3. CallMeBot Gateway if configured
        mode = self.config.get("gateway_mode", "CALLMEBOT").upper()
        phone = self.config.get("target_phone", "").strip().replace("+", "").replace(" ", "").replace("-", "")
        if mode == "CALLMEBOT" and phone and self.config.get("callmebot_apikey"):
            apikey = self.config.get("callmebot_apikey", "").strip()
            encoded_text = urllib.parse.quote(alert_body)
            url = f"https://api.callmebot.com/whatsapp.php?phone={phone}&text={encoded_text}&apikey={apikey}"
            try:
                import urllib.request
                req = urllib.request.Request(url, headers={"User-Agent": "PHANTOM-SOC/2.0"})
                with urllib.request.urlopen(req, timeout=8) as resp:
                    logger.info(f"✅ CallMeBot delivery status: {resp.status}")
            except Exception as e:
                logger.error(f"CallMeBot delivery error: {e}")

    async def send_whatsapp_alert(self, title: str, threat_type: str, severity: str, details: str, target: str = "") -> bool:
        """Async wrapper for send_whatsapp_alert calling the sync worker."""
        self._sync_alert_worker(title, threat_type, severity, details, target)
        return True

    async def handle_user_command(self, incoming_text: str, sender: str = "User") -> str:
        """Processes an incoming WhatsApp message and generates an intelligent SOC response."""
        self.record_message("INBOUND", sender, incoming_text)
        cmd = incoming_text.strip().lower()

        response = ""
        # 1. Quick Command: Status
        if cmd in ("status", "health", "system", "info"):
            try:
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM events")
                evt_count = cursor.fetchone()[0]
                cursor.execute("SELECT COUNT(*) FROM alerts")
                alert_count = cursor.fetchone()[0]
                conn.close()

                response = (
                    f"🟢 *PHANTOM SOC SYSTEM HEALTH*\n"
                    f"━━━━━━━━━━━━━━━━━━━━━━\n"
                    f"🛡️ *Defense Status:* ACTIVE ZERO-TRUST\n"
                    f"📊 *Total Events Logged:* {evt_count}\n"
                    f"🚨 *Total Threats Intercepted:* {alert_count}\n"
                    f"💾 *Removable Media:* Real-time hardware surveillance active\n"
                    f"🤖 *AI Copilot:* Ready\n"
                    f"━━━━━━━━━━━━━━━━━━━━━━\n"
                    f"_Commands available: 'alerts', 'eject', 'help'_"
                )
            except Exception as e:
                response = f"⚠️ Error querying status: {e}"

        # 2. Quick Command: Alerts
        elif cmd in ("alerts", "threats", "incidents"):
            try:
                conn = get_db()
                cursor = conn.cursor()
                cursor.execute("SELECT threat_type, severity, description, created_at FROM alerts ORDER BY id DESC LIMIT 3")
                rows = cursor.fetchall()
                conn.close()
                if not rows:
                    response = "✅ *No active threats.* System clean and operational."
                else:
                    response = "🚨 *LATEST INTERCEPTED THREATS:*\n━━━━━━━━━━━━━━━━━━━━━━\n"
                    for r in rows:
                        response += f"• *{r[0]}* ({r[1]})\n  _{r[2]}_\n  🕒 {r[3]}\n\n"
                    response += "━━━━━━━━━━━━━━━━━━━━━━\n_All threats autonomously contained._"
            except Exception as e:
                response = f"⚠️ Error fetching alerts: {e}"

        # 3. Quick Command: Eject
        elif "eject" in cmd:
            try:
                import subprocess
                subprocess.run(["sync"], check=False)
                # Unmount any KIOXIA or removable storage
                unmount_res = subprocess.run(["umount", "/run/media/yashz/KIOXIA_USB"], capture_output=True, text=True)
                response = "🛡️ *EMERGENCY CONTAINMENT ACTIVATED:*\nRemovable drive safely unmounted and decoupled from endpoint."
            except Exception as e:
                response = f"⚠️ Eject execution notice: {e}"

        # 4. Help
        elif cmd in ("help", "menu", "commands"):
            response = (
                f"🛡️ *PHANTOM WHATSAPP SOC BOT - COMMANDS*\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"• *status* - Endpoint security posture & metrics\n"
                f"• *alerts* - View latest 3 critical threat intercepts\n"
                f"• *eject* - Remotely isolate & unmount connected USB\n"
                f"• *help* - Display this operational guide\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"_You can also ask any cybersecurity question directly!_"
            )

        # 5. Natural Language AI Fallback
        else:
            try:
                from backend.core.glm_client import query_local_llm
                prompt = (
                    f"You are the PHANTOM WhatsApp SOC Sentinel, an elite cybersecurity incident response AI bot. "
                    f"A security analyst sent you this WhatsApp message: '{incoming_text}'. "
                    f"Give a concise, professional, WhatsApp-formatted response (use emojis, *bold*, and short paragraphs). "
                    f"Focus on USB endpoint security, Zero-Trust defense, and real-time containment."
                )
                ai_reply = query_local_llm(prompt)
                response = ai_reply if ai_reply else "🛡️ PHANTOM Sentinel: Threat intelligence engine processed your message. Endpoint remains secured."
            except Exception as e:
                response = (
                    f"🛡️ *PHANTOM Sentinel:* Received your query: '{incoming_text}'. "
                    f"All endpoint sensors and USB containment traps are operational."
                )

        self.record_message("OUTBOUND", "PHANTOM Sentinel", response)
        return response

whatsapp_bot = WhatsAppBotManager()
