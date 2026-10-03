import React, { useState, useEffect } from 'react';
import { IncidentReport } from '../components/reports/IncidentReport';
import { LoadingState } from '../components/common/LoadingState';
import { Sparkles, RefreshCw, Cpu, FileDown } from 'lucide-react';

export function IncidentReports({ initialSessionId = 'sess_demo_stage1_ducky' }) {
  const [reports, setReports] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId);
  const [currentReport, setCurrentReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    async function loadReports() {
      try {
        const res = await fetch(`http://${window.location.hostname}:8001/api/reports`);
        if (res.ok) {
          const data = await res.json();
          setReports(data);
        }
      } catch (e) {
        console.error("Error fetching reports:", e);
      }
    }
    loadReports();
  }, []);

  const loadSingleReport = async (sessionId) => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/reports/${sessionId}`);
      if (res.ok) {
        setCurrentReport(await res.json());
      }
    } catch (e) {
      console.error("Error loading report detail:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSingleReport(selectedSessionId);
  }, [selectedSessionId]);

  const handleRegenerateWithAI = async () => {
    if (!selectedSessionId || regenerating) return;
    setRegenerating(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/ai/regenerate-report/${selectedSessionId}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentReport(data);
      }
    } catch (e) {
      console.error("Error regenerating report with AI:", e);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Session Report Selector */}
      <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-bold text-white uppercase tracking-wider">Select Incident:</span>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="text-xs bg-[#0A0A0A] border border-white/[0.1] rounded-full px-4 py-2 text-white font-mono focus:outline-none focus:border-[#FDE047]"
          >
            <option value="sess_demo_stage1_ducky">sess_demo_stage1_ducky (RubberDucky)</option>
            <option value="sess_demo_stage2_bunny">sess_demo_stage2_bunny (BashBunny)</option>
            {reports.map((r) => (
              <option key={r.session_id} value={r.session_id}>
                {r.session_id} ({r.device_name})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {currentReport?.engine && (
            <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-white/[0.04] text-neutral-300 border border-white/[0.08] flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-[#FDE047]" />
              {currentReport.engine}
            </span>
          )}

          <a
            href={`http://${window.location.hostname}:8001/api/reports/${selectedSessionId}/pdf`}
            download={`PHANTOM_Incident_Report_${selectedSessionId}.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-black px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 hover:from-red-500 hover:to-yellow-400 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-red-500/20"
            title="Download executive incident PDF dossier with all forensic charts in one click"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </a>

          <button
            onClick={handleRegenerateWithAI}
            disabled={regenerating}
            className="text-xs font-bold px-4 py-1.5 rounded-full bg-[#FDE047]/15 hover:bg-[#FDE047]/25 text-[#FDE047] border border-[#FDE047]/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Force local AI to analyze telemetry and generate fresh executive brief"
          >
            <Sparkles className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            <span>{regenerating ? 'AI Generating...' : 'Regenerate Brief with AI'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Querying forensic telemetry and rendering incident brief..." />
      ) : (
        <IncidentReport report={currentReport} />
      )}
    </div>
  );
}
