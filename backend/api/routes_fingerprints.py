import json
from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any, Optional
from backend.database import get_db
from backend.core.fingerprint_engine import fingerprint_engine
from backend.core.forensic_dna import forensic_dna_engine

router = APIRouter(prefix="/api/fingerprints", tags=["fingerprints"])

@router.get("", response_model=List[Dict[str, Any]])
def list_fingerprints():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT f.session_id, f.dna_hash, f.cluster_family, f.tokens_json, f.genome_json, f.created_at,
               s.device_name, s.vendor_id, s.product_id, s.risk_score, s.mount_point
        FROM fingerprints f
        LEFT JOIN sessions s ON f.session_id = s.session_id
        WHERE f.session_id NOT LIKE 'sess_demo_%'
        ORDER BY f.created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        item = dict(r)
        try:
            item["tokens"] = json.loads(item["tokens_json"])
        except Exception:
            item["tokens"] = []

        if item.get("genome_json"):
            try:
                item["genome"] = json.loads(item["genome_json"])
            except Exception:
                item["genome"] = None
        else:
            try:
                item["genome"] = forensic_dna_engine.synthesize_genome(item["session_id"], mount_point=item.get("mount_point"))
            except Exception:
                item["genome"] = None

        result.append(item)
    return result

@router.get("/active-live")
def get_active_live_dna():
    """
    Returns the real-time Forensic DNA profile ONLY IF a physical USB device
    is currently mounted and connected to the system.
    """
    from backend.agent.hardware_agent import hardware_agent
    topology = hardware_agent.get_hardware_topology(force_refresh=True)
    storage_devices = topology.get("storage_devices", [])

    if storage_devices:
        primary = storage_devices[0]
        mount_point = primary.get("mount_point")
        sid = f"sess_live_hardware_{primary.get('vendor_id', '0000')}_{primary.get('product_id', '0000')}"
        genome = forensic_dna_engine.synthesize_genome(sid, mount_point=mount_point, device_meta=primary)
        return {
            "is_connected": True,
            "device": primary,
            "genome": genome
        }

    # When no physical USB is connected, return strictly null
    return {
        "is_connected": False,
        "device": None,
        "genome": None
    }

@router.post("/clear")
def clear_all_fingerprints():
    """Purges all cataloged DNA fingerprints so the analyst has a clean slate."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM fingerprints")
    conn.commit()
    conn.close()
    return {"status": "CLEARED", "message": "All forensic fingerprints purged"}

@router.get("/compare")
def compare_fingerprints(
    source: str = Query(..., description="Source session ID"),
    target: str = Query(..., description="Target session ID")
):
    comparison = fingerprint_engine.compare_fingerprints(source, target)
    return comparison

@router.get("/{session_id}/dna")
def get_session_dna(session_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT session_id, genome_json, cluster_family FROM fingerprints WHERE session_id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        genome = forensic_dna_engine.synthesize_genome(session_id)
        return genome

    if row["genome_json"]:
        try:
            return json.loads(row["genome_json"])
        except Exception:
            pass

    return forensic_dna_engine.synthesize_genome(session_id)
