import io
from fastapi import APIRouter, HTTPException, Response
from typing import List, Dict, Any
from backend.core.ai_analyst import ai_analyst
from backend.core.session_manager import session_manager
from backend.core.pdf_report_generator import pdf_report_generator

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("")
def list_reports():
    sessions = session_manager.list_sessions()
    reports = []
    for s in sessions:
        if s.get("risk_score", 0) >= 40:
            reports.append({
                "session_id": s["session_id"],
                "device_name": s["device_name"],
                "risk_score": s["risk_score"],
                "status": s["status"],
                "inserted_at": s["inserted_at"]
            })
    return reports

@router.get("/latest/pdf")
def download_latest_pdf_report():
    """Generates and returns the latest high-res incident PDF with graphs in one click."""
    try:
        pdf_bytes = pdf_report_generator.generate_pdf("latest")
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": 'attachment; filename="PHANTOM_Latest_Incident_Report.pdf"',
                "Content-Type": "application/pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate latest PDF report: {e}")

@router.get("/{session_id}/pdf")
def download_incident_pdf_report(session_id: str):
    """Generates and returns publication-grade cyber incident forensic PDF report."""
    try:
        pdf_bytes = pdf_report_generator.generate_pdf(session_id)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="PHANTOM_Incident_Report_{session_id}.pdf"',
                "Content-Type": "application/pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF report for {session_id}: {e}")

@router.get("/{session_id}")
def get_incident_report(session_id: str):
    report = ai_analyst.generate_incident_report(session_id)
    if "error" in report:
        raise HTTPException(status_code=404, detail=report["error"])
    return report

