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

class HuntRequest(BaseModel):
    trigger_context: Optional[str] = "Manual operator / Sentinel trigger"
    target_pid: Optional[int] = None
    session_id: Optional[str] = None

@router.post("/hunt")
async def trigger_autonomous_hunt(req: HuntRequest):
    """
    Engages the Autonomous Hunter-Killer Agent on Kali Linux.
    Runs Observe -> DeepSeek Reason (<think>) -> Execute -> Verify.
    """
    from backend.agent.hunter_killer import hunter_killer
    report = await hunter_killer.engage_hunt(
        trigger_context=req.trigger_context,
        target_pid=req.target_pid,
        session_id=req.session_id
    )
    return report

class MissionRequest(BaseModel):
    goal: str
    max_steps: Optional[int] = 8
    session_id: Optional[str] = None

@router.post("/agent/mission")
async def execute_agent_mission(req: MissionRequest):
    """
    Empowers the local DeepSeek model to run commands on its own,
    kill processes, delete/quarantine files, or edit code inside the project folder.
    """
    if not req.goal.strip():
        raise HTTPException(status_code=400, detail="Mission goal cannot be empty.")

    from backend.agent.autonomous_operator import autonomous_operator
    report = await autonomous_operator.run_mission(
        mission_goal=req.goal,
        max_steps=req.max_steps or 8,
        session_id=req.session_id
    )
    return report

class DirectToolRequest(BaseModel):
    tool: str
    args: Dict[str, Any]

@router.post("/agent/tool")
async def execute_agent_tool(req: DirectToolRequest):
    """
    Directly executes an agent tool on the host OS:
    RUN_COMMAND, KILL_PROCESS, KILL_FILE, EDIT_CODE, READ_FILE, WRITE_FILE, LIST_FILES, LIST_PROCESSES.
    """
    from backend.agent.autonomous_operator import autonomous_operator
    result = autonomous_operator.execute_tool(req.tool, req.args)
    return result

@router.get("/agent/telemetry")
async def get_agent_os_telemetry():
    """Returns active OS process candidates and quarantine status."""
    from backend.agent.autonomous_operator import autonomous_operator, QUARANTINE_DIR
    procs = autonomous_operator.tool_list_processes()
    quarantined = [f.name for f in QUARANTINE_DIR.glob("*") if f.is_file()]
    return {
        "active_processes": procs.get("processes", []),
        "quarantined_files": quarantined[:20],
        "quarantine_count": len(quarantined),
        "quarantine_path": str(QUARANTINE_DIR)
    }

class AgentPromptRequest(BaseModel):
    prompt: str
    session_id: Optional[str] = None
    history: Optional[List[Dict[str, Any]]] = []

@router.post("/agent/stream")
async def stream_agent_mission(req: AgentPromptRequest):
    """
    Real-time Server-Sent Events (SSE) stream for Antigravity Autonomous Agent.
    Yields STEP_START, THINKING_CHUNK, THINKING_COMPLETE, TOOL_START, TOOL_COMPLETE, STEP_COMPLETE, MISSION_COMPLETE.
    """
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is empty.")

    from backend.agent.autonomous_operator import autonomous_operator

    async def sse_event_generator():
        try:
            async for event in autonomous_operator.stream_mission(
                mission_goal=req.prompt,
                max_steps=8,
                session_id=req.session_id,
                history=req.history
            ):
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            logger.error(f"Error in agent stream: {e}", exc_info=True)
            err_event = {
                "type": "MISSION_COMPLETE",
                "goal": req.prompt,
                "status": "ERROR",
                "final_summary": f"Execution error: {str(e)}",
                "steps": [],
                "elapsed_ms": 0
            }
            yield f"data: {json.dumps(err_event)}\n\n"

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/agent/prompt")
async def handle_agent_prompt(req: AgentPromptRequest):
    """
    Unified agent endpoint: user types any prompt, and the agent
    either answers directly or autonomously executes commands, kills processes/files,
    or edits code, returning the exact steps taken and the final answer.
    """
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is empty.")

    from backend.agent.autonomous_operator import autonomous_operator
    
    prompt_lower = req.prompt.lower().strip()
    greetings = ["hi", "hello", "hey", "hola", "sup", "greetings", "good morning", "good evening", "how are you"]
    if prompt_lower in greetings or prompt_lower in ["hi!", "hello!", "hey!"]:
        return {
            "reply": "Hello! I am the PHANTOM Autonomous Agent powered by DeepSeek-R1. I have direct terminal execution, process kill, file quarantine, and code editing authority on this system.\n\nTell me what you'd like to do — for example:\n- `kill process <PID>`\n- `run command <bash>`\n- `delete file <path>`\n- `edit code in <file>`",
            "thinking": "User offered a greeting. Responding conversationally without running OS commands.",
            "steps": [],
            "status": "READY",
            "elapsed_ms": 1.2
        }

    action_keywords = [
        "kill", "terminate", "stop process", "ps ", "rm ", "delete", "remove",
        "edit", "modify", "change", "patch", "run command", "run ", "execute",
        "ls", "cat", "bash", "grep", "quarantine", "clean", "purge", "write",
        "mkdir", "touch", "find", "pkill"
    ]
    is_action_prompt = any(kw in prompt_lower for kw in action_keywords)

    report = await autonomous_operator.run_mission(
        mission_goal=req.prompt,
        max_steps=6 if is_action_prompt else 4,
        session_id=req.session_id,
        history=req.history
    )

    steps = report.get("steps", [])
    thinking = ""
    for s in steps:
        if s.get("thinking"):
            thinking = s["thinking"]

    return {
        "reply": report.get("final_summary") or "Done.",
        "thinking": thinking,
        "steps": [
            {
                "step": s.get("step"),
                "action": s.get("action"),
                "args": s.get("args"),
                "reason": s.get("reason"),
                "result": s.get("result"),
                "thinking": s.get("thinking")
            }
            for s in steps if s.get("action") != "FINISH"
        ],
        "status": report.get("status"),
        "elapsed_ms": report.get("elapsed_ms")
    }


