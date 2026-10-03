import json
import asyncio
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.core.network_monitor import network_monitor

logger = logging.getLogger("phantom.api.network")
router = APIRouter(prefix="/api/network", tags=["network"])


class KillProcessRequest(BaseModel):
    pid: int


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


@router.get("/stream")
async def stream_network_telemetry():
    """
    Server-Sent Events (SSE) streaming real-time 1.0-second network telemetry packets
    directly to the Task Manager dashboard.
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
