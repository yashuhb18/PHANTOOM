import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import HOST, PORT, DEBUG
from backend.database import init_db, get_db
from backend.db.mongo import init_mongo, check_mongo_health
from backend.core.canary_manager import canary_manager
from backend.api.routes_sessions import router as sessions_router
from backend.api.routes_alerts import router as alerts_router
from backend.api.routes_fingerprints import router as fingerprints_router
from backend.api.routes_canary import router as canary_router
from backend.api.routes_reports import router as reports_router
from backend.api.routes_devices import router as devices_router
from backend.api.routes_simulate import router as simulate_router
from backend.api.routes_scans import router as scans_router
from backend.api.routes_ai import router as ai_router
from backend.api.routes_siem import router as siem_router
from backend.api.routes_auth import router as auth_router
from backend.api.routes_whatsapp import router as whatsapp_router
from backend.api.routes_network import router as network_router
from backend.api.ws_routes import router as ws_router

import asyncio
from backend.agent.usb_monitor import usb_monitor
from backend.agent.process_monitor import process_monitor
from backend.agent.autorun_guardian import autorun_guardian
from backend.core.network_monitor import network_monitor
from backend.core.packet_engine import packet_engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("phantom.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing PHANTOM Database (SQLite)...")
    init_db()
    logger.info("Connecting to MongoDB Atlas Cluster...")
    init_mongo()
    # Clean up stale active sessions from previous runs
    try:
        from backend.database import get_db
        conn = get_db()
        conn.cursor().execute("UPDATE sessions SET status = 'CLOSED_AT_BOOT' WHERE status = 'ACTIVE'")
        conn.commit()
        conn.close()
    except Exception as e:
        logger.debug(f"Error resetting stale sessions: {e}")
    logger.info("Starting Canary Deception Watcher...")
    canary_manager.start_monitoring()
    logger.info("Starting Autonomous Hardware & USB Monitor Daemon...")
    loop = asyncio.get_running_loop()
    usb_monitor.start(loop=loop)
    logger.info("Starting Autonomous Process Surveillance & Containment Agent...")
    process_monitor.start(loop=loop)
    logger.info("Starting Autorun Guardian Agent...")
    autorun_guardian.start(loop=loop)
    logger.info("Starting High-Frequency 1.0s Network Telemetry Engine...")
    network_monitor.start()
    logger.info("Starting Deep Packet Inspection (DPI) & Traffic Triage Engine...")
    packet_engine.start()
    logger.info(f"PHANTOM Platform ready on http://{HOST}:{PORT}")
    logger.info("═══════════════════════════════════════════════════════════")
    logger.info("  PHANTOM AUTONOMOUS AGENTS ONLINE:")
    logger.info("    ✅ Hardware & USB Monitor Daemon")
    logger.info("    ✅ Process Surveillance & Containment Agent")
    logger.info("    ✅ Autorun Guardian Agent")
    logger.info("    ✅ High-Frequency 1.0s Network Telemetry Engine")
    logger.info("    ✅ Deep Packet Inspection (DPI) & Sniffer Engine")
    logger.info("    ✅ Threat Scanner (on-demand per USB insertion)")
    logger.info("    ✅ Canary Deception Grid")
    logger.info("    ✅ Local AI Threat Intelligence & Copilot")
    logger.info("  All agents operating in FULL AUTONOMOUS MODE")
    logger.info("  Zero human intervention required.")
    logger.info("═══════════════════════════════════════════════════════════")
    yield
    # Shutdown
    logger.info("Shutting down Packet Sniffer Engine...")
    packet_engine.stop()
    logger.info("Shutting down Network Telemetry Engine...")
    network_monitor.stop()
    logger.info("Shutting down Autorun Guardian Agent...")
    autorun_guardian.stop()
    logger.info("Shutting down Autonomous Process Surveillance Agent...")
    process_monitor.stop()
    logger.info("Shutting down Hardware & USB Monitor Daemon...")
    usb_monitor.stop()
    logger.info("Shutting down Canary Deception Watcher...")
    canary_manager.stop_monitoring()

app = FastAPI(
    title="PHANTOM: Autonomous USB Threat Hunting & Deception Platform",
    description="Precision USB threat hunting, behavioral DNA fingerprinting, deception grid, and autonomous containment API.",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(sessions_router)
app.include_router(alerts_router)
app.include_router(fingerprints_router)
app.include_router(canary_router)
app.include_router(reports_router)
app.include_router(devices_router)
app.include_router(simulate_router)
app.include_router(scans_router)
app.include_router(ai_router)
app.include_router(siem_router)
app.include_router(auth_router)
app.include_router(whatsapp_router)
app.include_router(network_router)
app.include_router(ws_router)

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/api/db/status")
def get_db_status():
    return {
        "sqlite": {"status": "online"},
        "mongodb": check_mongo_health()
    }

@app.get("/api/stats")
def get_system_stats():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM alerts WHERE alert_type LIKE '%CONTAINMENT%' OR alert_type LIKE '%ISOLATE%' OR title LIKE '%Containment%' OR alert_type LIKE '%PROCESS_TERMINATION%' OR alert_type LIKE '%FILE_QUARANTINE%' OR alert_type LIKE '%AUTORUN%' OR alert_type LIKE '%PROCESS_TREE%'")
    containment_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM canary_hits")
    canary_hits = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(DISTINCT cluster_family) FROM fingerprints")
    cluster_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM sessions")
    total_sessions = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM sessions WHERE status = 'ACTIVE'")
    active_sessions = cursor.fetchone()[0]
    
    # New: file scan stats
    quarantined_files = 0
    threats_detected = 0
    try:
        cursor.execute("SELECT COUNT(*) FROM file_scans WHERE action_taken = 'QUARANTINED'")
        quarantined_files = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM file_scans WHERE threat_score >= 25")
        threats_detected = cursor.fetchone()[0]
    except Exception:
        pass  # Table may not exist yet
    
    conn.close()
    return {
        "containmentCount": containment_count,
        "canaryHits": canary_hits,
        "clusterCount": cluster_count,
        "totalSessions": total_sessions,
        "activeSessions": active_sessions,
        "quarantinedFiles": quarantined_files,
        "threatsDetected": threats_detected
    }

from fastapi.responses import FileResponse

@app.get("/api/download/app")
def download_app():
    exe_path = Path(__file__).resolve().parent.parent / "dist" / "PHANTOM.exe"
    if exe_path.exists():
        return FileResponse(
            path=str(exe_path),
            filename="PHANTOM-Desktop-v1.0.exe",
            media_type="application/octet-stream"
        )
    # If compiling or fallback, provide launcher batch
    start_bat_path = Path(__file__).resolve().parent.parent / "start.bat"
    return FileResponse(
        path=str(start_bat_path),
        filename="PHANTOM-Launcher.bat",
        media_type="application/octet-stream"
    )

# Mount React frontend static build if available
import sys
from pathlib import Path
from fastapi.staticfiles import StaticFiles

dist_dir = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if hasattr(sys, "_MEIPASS"):
    bundled_dist = Path(sys._MEIPASS) / "frontend" / "dist"
    if bundled_dist.exists():
        dist_dir = bundled_dist

if dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="frontend")
else:
    @app.get("/")
    def root():
        return {
            "platform": "PHANTOM",
            "status": "OPERATIONAL",
            "version": "2.0.0",
            "docs": "/docs",
            "agents": [
                "USB Monitor Daemon",
                "Process Surveillance & Containment",
                "Autorun Guardian",
                "Threat Scanner",
                "Canary Deception Grid"
            ]
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=DEBUG)
