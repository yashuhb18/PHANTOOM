import json
import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.core.glm_client import glm_client
from backend.core.ai_analyst import ai_analyst
from backend.database import get_db

logger = logging.getLogger("phantom.api.ai")

router = APIRouter(prefix="/api/ai", tags=["ai"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    history: Optional[List[ChatMessage]] = []

class ScriptAnalysisRequest(BaseModel):
    filename: str
    content: str

def _build_system_prompt(session_id: Optional[str] = None) -> str:
    """Builds a high-precision cybersecurity system prompt with native PHANTOM architecture grounding."""
    prompt = (
        "You are PHANTOM Copilot, an elite, dignified, and highly respectful AI cybersecurity intelligence specialist embedded inside the PHANTOM Autonomous Threat Hunting Platform.\n\n"
        "### CORE IDENTITY & DEMEANOR:\n"
        "- Tone: Technical, authoritative, precise, and courteous. Address the user respectfully as Investigator or Analyst.\n"
        "- Avoid generic boilerplate, circular repetitions, or vague corporate speak. Provide concrete, technical security answers.\n\n"
        "### NATIVE KNOWLEDGE OF PHANTOM PLATFORM & DEFENSIVE ENGINE:\n"
        "When explaining PHANTOM or how it stops USB/hardware threats (such as RubberDucky, BadUSB, BashBunny, O.MG cable, or rogue HID devices):\n"
        "1. HARDWARE ENUMERATION & DESCRIPTOR AUDITING: Monitors physical USB insertions via Windows SetupAPI, WMI, and PnP DevNodes; verifies VID/PID and flags mass storage devices spoofing as HID keyboards.\n"
        "2. SYNTHETIC KEYSTROKE VELOCITY DEFENSE: Tracks character cadence in real-time. Human typing tops out at 15-20 CPS (~150-200 WPM). PHANTOM flags keystroke bursts exceeding 600-1000 characters/minute as synthetic DuckyScript injections and intercepts the payload before execution completes.\n"
        "3. DYNAMIC DECEPTION GRID (CANARY TRAPS): Plants decoy credential vaults (passwords.xlsx, aws_keys.env, decoy_admin.kdbx). Watchdog filesystem observers trip immediate honeypot alarms (CANARY_TRAP_TRIPPED) when automated scripts attempt reconnaissance or credential harvesting.\n"
        "4. SURGICAL MICRO-ISOLATION & AUTONOMOUS CONTAINMENT:\n"
        "   - Process Tree Annihilation: Recursively enumerates and terminates parent processes and spawned child trees (powershell.exe, cmd.exe, wscript.exe, mshta.exe) via SIGKILL.\n"
        "   - Socket Severance: Cuts active TCP/UDP sockets to terminate reverse shells and C2 beaconing.\n"
        "   - Autonomous File Quarantine: Strips execution rights, appends .PHANTOM_QUARANTINED, and secures files in the quarantine vault.\n"
        "   - True 3-Phase Hardware Ejection: Force volume dismount via WMI/FSCTL, followed by PnP hardware DevNode ejection via CM_Request_Device_EjectW to power down the port.\n"
        "5. BEHAVIORAL DNA CLUSTERING & FORENSICS: Tokenizes multi-stage attacks into unique DNA hashes, maps to MITRE ATT&CK (T1200, T1059.001, T1056.001, T1083, T1041), and generates autonomous incident reports.\n"
    )




    if session_id:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT session_id, device_name, vendor_id, product_id, risk_score, status FROM sessions WHERE session_id = ?", (session_id,))
        s_row = cursor.fetchone()
        if s_row:
            s_dict = dict(s_row)
            cursor.execute("SELECT alert_type, title, severity FROM alerts WHERE session_id = ? LIMIT 3", (session_id,))
            s_dict["alerts"] = [dict(r) for r in cursor.fetchall()]
            prompt += f"\nFocused Session: {json.dumps(s_dict)}\n"
        conn.close()

    return prompt

@router.get("/status")
async def get_ai_status():
    """Returns the operational status, latency, and model info of GLM-4 / Ollama."""
    health = await glm_client.acheck_health()
    return health

@router.post("/chat/stream")
async def copilot_chat_stream(req: ChatRequest):
    """
    Streaming SecOps Copilot endpoint.
    Tokens stream directly to the client as generated (starts in ~1.5s).
    """
    system_prompt = _build_system_prompt(req.session_id)
    messages = [{"role": "system", "content": system_prompt}]
    
    if req.history:
        for h in req.history[-4:]:
            messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": req.message})

    async def token_generator():
        async for chunk in glm_client.astream_chat(messages=messages, temperature=0.2):
            yield chunk

    return StreamingResponse(token_generator(), media_type="text/plain")

@router.post("/chat")
async def copilot_chat(req: ChatRequest):
    """
    Non-streaming fallback for SecOps Copilot interactive chat powered by GLM-4.
    """
    system_prompt = _build_system_prompt(req.session_id)
    messages = [{"role": "system", "content": system_prompt}]
    if req.history:
        for h in req.history[-4:]:
            messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": req.message})

    assistant_reply = await glm_client.achat(messages=messages, temperature=0.2)

    return {
        "reply": assistant_reply,
        "model": glm_client.model,
        "session_id": req.session_id
    }

@router.post("/analyze-script")
async def analyze_script(req: ScriptAnalysisRequest):
    """Deep analysis and de-obfuscation of a suspicious script or command line via GLM-4."""
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Script content is empty")

    analysis = await glm_client.analyze_script(script_content=req.content, filename=req.filename)
    return analysis

@router.post("/regenerate-report/{session_id}")
def regenerate_report(session_id: str):
    """Forces GLM-4 to re-analyze and regenerate the executive forensic report for a session."""
    report = ai_analyst.generate_incident_report(session_id=session_id, force_regenerate=True)
    if "error" in report:
        raise HTTPException(status_code=404, detail=report["error"])
    return report

@router.get("/voice")
async def get_neural_voice(text: str, voice: str = "en-US-ChristopherNeural"):
    """
    Streams studio-grade neural voice speech for tactical security awareness briefings.
    Uses Microsoft Neural AI speech synthesis.
    """
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    try:
        import edge_tts
        import io

        clean_text = text.strip()[:250]
        communicate = edge_tts.Communicate(clean_text, voice, rate="+3%", pitch="+1Hz")
        
        audio_stream = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_stream.write(chunk["data"])
        
        audio_stream.seek(0)
        return StreamingResponse(audio_stream, media_type="audio/mpeg")
    except Exception as e:
        logger.error(f"Neural voice generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
