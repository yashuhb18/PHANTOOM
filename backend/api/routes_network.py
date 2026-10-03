import json
import asyncio
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.core.network_monitor import network_monitor
from backend.core.packet_engine import packet_engine

logger = logging.getLogger("phantom.api.network")
router = APIRouter(prefix="/api/network", tags=["network"])


class KillProcessRequest(BaseModel):
    pid: int

class AttackSimulationRequest(BaseModel):
    attack_type: str  # REVERSE_SHELL, PORT_SCAN, DNS_TUNNEL, CLEARTEXT_CREDS


@router.get("/telemetry")
def get_network_telemetry():
    """
    Returns full network telemetry snapshot:
    - 1-second current upload/download rates
    - 60-second scrolling history array
    - Primary active network adapter info
    - Total bandwidth counters (MB/GB sent/recv)
    """
    return network_monitor.get_telemetry_snapshot()


@router.get("/adapters")
def get_network_adapters():
    """Returns all physical and virtual network adapters and their link state."""
    return network_monitor.get_adapters()


@router.get("/connections")
def get_network_connections(
    search: Optional[str] = Query(None, description="Search by process name, PID, IP, or port"),
    state: Optional[str] = Query("ALL", description="Connection state (ESTABLISHED, LISTEN, TIME_WAIT, ALL)"),
    protocol: Optional[str] = Query("ALL", description="Protocol (TCP, UDP, ALL)"),
    limit: int = Query(150, ge=10, le=500, description="Max connections to return")
):
    """
    Returns active socket connections (like Windows Resource Monitor / Task Manager)
    including threat flags for suspicious high-risk ports or reverse-shell risks.
    """
    return network_monitor.get_connections(
        search=search,
        state_filter=state,
        protocol_filter=protocol,
        limit=limit
    )


@router.get("/processes")
def get_network_processes():
    """Returns processes grouped by active network socket usage."""
    return network_monitor.get_processes_summary()


@router.post("/kill/{pid}")
def kill_network_process(pid: int):
    """Surgically kills a rogue or suspicious process holding network sockets."""
    result = network_monitor.kill_process(pid)
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to kill process."))
    return result


# ─────────────────────────────────────────────────────────────────────────────
# WIRESHARK-STYLE DEEP PACKET INSPECTION & ATTACK HUNTING ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/packets")
def get_captured_packets(
    protocol: Optional[str] = Query(None, description="Filter protocol (TCP, UDP, DNS, TLS, HTTP, REVERSE_SHELL)"),
    search: Optional[str] = Query(None, description="Filter by IP, port, process, text"),
    attack_only: bool = Query(False, description="Filter only packets flagged as attacks"),
    since_no: int = Query(0, ge=0, description="Return packets with frame number > since_no"),
    limit: int = Query(120, ge=1, le=500, description="Max frames to return")
):
    """Returns real-time packet frames for the Wireshark Packet List pane."""
    return packet_engine.get_packets(
        protocol=protocol,
        search=search,
        attack_only=attack_only,
        since_no=since_no,
        limit=limit
    )


@router.get("/packets/{packet_no}")
def get_packet_details(packet_no: int):
    """Returns full multi-layer dissection and authentic hex dump for a single packet."""
    pkt = packet_engine.get_packet_by_no(packet_no)
    if not pkt:
        raise HTTPException(status_code=404, detail=f"Packet #{packet_no} not found.")
    return pkt


@router.post("/capture/toggle")
def toggle_packet_capture():
    """Pauses or resumes packet capture."""
    is_capturing = packet_engine.toggle_capture()
    return {"capturing": is_capturing, "status": "ACTIVE" if is_capturing else "PAUSED"}


@router.post("/capture/clear")
def clear_captured_packets():
    """Clears packet buffer."""
    packet_engine.clear()
    return {"success": True, "message": "Packet buffer cleared."}


@router.post("/simulate-attack")
def simulate_network_attack(req: AttackSimulationRequest):
    """
    Injects a realistic cyber attack packet sequence into the sniffer stream
    so analysts can inspect live attacks, dissection trees, and hex dumps.
    """
    pkts = packet_engine.inject_attack_stream(req.attack_type)
    return {
        "success": True,
        "attack_type": req.attack_type,
        "frames_injected": len(pkts),
        "packets": pkts
    }


@router.get("/stream")
async def stream_network_telemetry():
    """
    Server-Sent Events (SSE) streaming real-time 1.0-second network telemetry packets.
    """
    async def event_generator():
        while True:
            try:
                data = network_monitor.get_telemetry_snapshot()
                yield f"data: {json.dumps(data)}\n\n"
            except Exception as e:
                logger.error(f"Error streaming network telemetry: {e}")
            await asyncio.sleep(1.0)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream"
        }
    )

