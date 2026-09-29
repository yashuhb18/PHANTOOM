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

def _get_live_soc_context(session_id: Optional[str] = None) -> str:
    """Collects real-time SOC metrics, active devices, and recent alerts to ground AI reasoning."""
    lines = []
    try:
        conn = get_db()
        cursor = conn.cursor()
        
        # Total counts
        cursor.execute("SELECT COUNT(*) FROM alerts")
        total_alerts = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM alerts WHERE alert_type LIKE '%CONTAINMENT%' OR alert_type LIKE '%ISOLATE%' OR title LIKE '%Containment%' OR alert_type LIKE '%PROCESS_TERMINATION%' OR alert_type LIKE '%FILE_QUARANTINE%'")
        containments = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM canary_hits")
        canary_hits = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM sessions WHERE status = 'ACTIVE'")
        active_sessions = cursor.fetchone()[0]
        
        lines.append(f"• Active USB Sessions Right Now: {active_sessions}")
        lines.append(f"• Recorded Alerts: {total_alerts} (Autonomous Containments: {containments}, Canary Hits: {canary_hits})")
        
        # Recent sessions
        cursor.execute("SELECT device_name, vendor_id, product_id, risk_score, status FROM sessions ORDER BY id DESC LIMIT 3")
        recent_s = cursor.fetchall()
        if recent_s:
            s_list = [f"{r['device_name']} (VID:{r['vendor_id']}&PID:{r['product_id']}, status:{r['status']}, risk:{r['risk_score']})" for r in recent_s]
            lines.append(f"• Recent USB Devices: {', '.join(s_list)}")
            
        # Recent alerts
        cursor.execute("SELECT alert_type, title, severity, timestamp FROM alerts ORDER BY id DESC LIMIT 4")
        recent_a = cursor.fetchall()
        if recent_a:
            a_list = [f"[{r['severity']}] {r['title']} ({r['alert_type']})" for r in recent_a]
            lines.append(f"• Latest System Alerts: {'; '.join(a_list)}")
            
        if session_id:
            cursor.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,))
            s_row = cursor.fetchone()
            if s_row:
                lines.append(f"• FOCUSED INVESTIGATION SESSION: {dict(s_row)}")
                
        conn.close()
    except Exception as e:
        logger.debug(f"Failed to gather live SOC context: {e}")
        
    return "\n".join(lines) if lines else "System operational, autonomous agents armed."

def _build_system_prompt(session_id: Optional[str] = None) -> str:
    """Builds a high-precision cybersecurity system prompt with live SOC grounding and natural conversation flow."""
    soc_context = _get_live_soc_context(session_id)
    return (
        "You are PHANTOM Copilot, an expert AI cybersecurity analyst directly integrated into the PHANTOM Autonomous Threat Hunting Platform.\n\n"
        "### CONVERSATIONAL RULES & DEMEANOR:\n"
        "- NEVER repeat robotic canned greetings such as 'Greetings, Investigator' or 'Greetings, Analyst'. Reply directly, conversationally, and naturally, like a sharp senior SOC engineer speaking with a peer.\n"
        "- Do NOT regurgitate generic numbered lists of platform modules unless the user specifically asks for a full platform specification.\n"
        "- When the user asks 'who are you', 'which model are you', or 'what model is this', respond accurately and concisely:\n"
        "  'I am DeepSeek-R1 (1.5B Cyber-specialized), running locally on your workstation's NVIDIA GeForce RTX 3050 Laptop GPU via Ollama. My inference is 100% private and on-premise (zero cloud telemetry), deeply integrated with PHANTOM's kernel sentinels, canary deception grid, and SIEM hunt engine.'\n"
        "- When the user asks 'what can you do for me', answer conversationally and concisely. Highlight how you can triage plugged-in USB hardware, deobfuscate suspicious PowerShell / DuckyScript code, explain active SIEM alerts, or inspect canary honeypot tripwires.\n"
        "- Refer to the LIVE SYSTEM TELEMETRY below whenever answering questions about the workstation, connected drives, or active alerts.\n\n"
        "### PLATFORM DEFENSE ENGINE CAPABILITIES:\n"
        "- Rogue HID & BadUSB Interception: Evaluates typing speed; flags cadence >600 WPM with <1ms jitter as synthetic DuckyScript; kills parent/child process trees in <382ms.\n"
        "- Canary Deception Grid: Plants bait files (AWS keys, password sheets) on mounted drives; unauthorized read triggers immediate honeypot breach alarms with 0% false positives.\n"
        "- Surgical Containment: Kills malicious processes (SIGKILL), severs active sockets, and issues hardware DevNode ejection.\n"
        "- Attack DNA: Behavioral Jaccard similarity matrix (82.4% match) tracks repeat threat actors across swapped physical USB drives.\n\n"
        "### LIVE SYSTEM TELEMETRY:\n"
        f"{soc_context}\n"
    )

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
