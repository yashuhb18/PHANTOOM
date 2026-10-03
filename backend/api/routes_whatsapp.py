"""
FastAPI Routes for PHANTOM WhatsApp SOC Bot & Automated Alerts
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from backend.core.whatsapp_bot import whatsapp_bot

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

class WhatsAppConfigRequest(BaseModel):
    enabled: bool = True
    target_phone: str = ""
    gateway_mode: str = "CALLMEBOT"  # "CALLMEBOT", "OPENWA_REST", "MOCK"
    callmebot_apikey: str = ""
    openwa_rest_url: str = "http://127.0.0.1:8085/api/sendText"

class WhatsAppChatRequest(BaseModel):
    message: str
    sender: str = "User"

class WhatsAppTestAlertRequest(BaseModel):
    threat_type: str = "USB_TRIGGERED_SCRIPT_HOST"
    severity: str = "CRITICAL"
    details: str = "Simulated adversarial payload intercepted from /run/media/yashz/KIOXIA_USB"
    target: str = "bash (PID: 1188214)"

@router.get("/config")
def get_config():
    """Returns current WhatsApp bot settings."""
    return whatsapp_bot.config

@router.post("/config")
def update_config(req: WhatsAppConfigRequest):
    """Updates WhatsApp bot settings."""
    updated = whatsapp_bot.save_config(req.dict())
    return {"status": "SUCCESS", "config": updated}

@router.get("/messages")
def get_chat_history(limit: int = 50):
    """Returns WhatsApp message history."""
    return whatsapp_bot.get_messages(limit=limit)

@router.post("/chat")
async def chat_with_bot(req: WhatsAppChatRequest):
    """Processes an incoming chat message and returns the bot's response."""
    reply = await whatsapp_bot.handle_user_command(req.message, req.sender)
    return {
        "status": "SUCCESS",
        "reply": reply,
        "history": whatsapp_bot.get_messages(limit=20)
    }

@router.post("/send_test")
async def send_test_alert(req: WhatsAppTestAlertRequest):
    """Triggers an immediate test alert to WhatsApp."""
    success = await whatsapp_bot.send_whatsapp_alert(
        title="Test Alert",
        threat_type=req.threat_type,
        severity=req.severity,
        details=req.details,
        target=req.target
    )
    return {
        "status": "SUCCESS" if success else "FAILED",
        "message": "Alert queued and dispatched to WhatsApp bot."
    }

@router.post("/webhook")
async def receive_webhook(payload: Dict[str, Any]):
    """Receives inbound messages from Open-WA or external WhatsApp webhooks."""
    text = payload.get("body") or payload.get("text") or payload.get("message") or ""
    sender = payload.get("sender") or payload.get("from") or "WhatsApp User"
    if text:
        reply = await whatsapp_bot.handle_user_command(text, sender)
        return {"status": "SUCCESS", "reply": reply}
    return {"status": "IGNORED"}
