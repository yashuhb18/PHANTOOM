import React, { useState } from 'react';
import { Download, FileText, FileDown, RefreshCw, BarChart3, ShieldAlert, CheckCircle2, Cpu } from 'lucide-react';

export function IncidentReport({ report }) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (!report) {
    return (
      <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] p-12 text-center text-xs text-neutral-500">
        Select an incident to view its executive forensic brief.
      </div>
    );
  }

  const handleDownloadMarkdown = () => {
    const blob = new Blob([report.markdown || ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident_report_${report.session_id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    if (!report?.session_id) return;
    setDownloadingPdf(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/reports/${report.session_id}/pdf`);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PHANTOM_Incident_Report_${report.session_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF download error:", e);
      // Fallback direct window opening
      window.open(`http://${window.location.hostname}:8001/api/reports/${report.session_id}/pdf`, '_blank');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="p-5 px-8 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0F0F0F]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-[#FDE047] shadow-inner">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">{report.title}</h3>
            <span className="text-[10px] font-mono text-neutral-400">EXECUTIVE FORENSIC DOSSIER</span>
          </div>
        </div>

        {/* Action Buttons: 1-Click PDF + Markdown */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 hover:from-red-500 hover:to-yellow-400 text-white font-extrabold text-xs shadow-lg shadow-red-500/20 transition-all pill-button cursor-pointer disabled:opacity-50"
            title="Download complete publication-grade PDF report with forensic graphs and charts in one click"
          >
            {downloadingPdf ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 text-white" />
            )}
            <span>{downloadingPdf ? 'Generating PDF...' : 'Download Executive PDF Report'}</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 text-xs font-semibold border border-white/[0.1] transition-all pill-button cursor-pointer"
            title="Export raw Markdown text"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Markdown</span>
          </button>
        </div>
      </div>

      {/* Forensic Report Content */}
      <div className="p-8 md:p-10 max-w-5xl mx-auto text-sm leading-relaxed space-y-8">
        {/* Title & Metadata Badges */}
        <div className="border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
              TOP SECRET // FORENSIC DOSSIER
            </span>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              SURGICALLY CONTAINED
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-tight">{report.title}</h1>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
            <div className="p-3 rounded-2xl bg-neutral-900/80 border border-white/[0.06]">
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">Incident Session</span>
              <code className="font-mono text-white text-xs font-bold truncate block mt-0.5">{report.session_id}</code>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-900/80 border border-white/[0.06]">
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">Classification</span>
              <span className="text-red-400 font-bold font-mono text-xs block mt-0.5">CRITICAL LEVEL 1</span>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-900/80 border border-white/[0.06]">
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">Cluster Family</span>
              <code className="font-mono text-[#FDE047] font-bold text-xs block mt-0.5 truncate">{report.cluster_family || 'BADUSB_ATTACK'}</code>
            </div>
            <div className="p-3 rounded-2xl bg-neutral-900/80 border border-white/[0.06]">
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">Defense Action</span>
              <span className="text-emerald-400 font-bold font-mono text-xs block mt-0.5">AUTONOMOUS CONTAINMENT</span>
            </div>
          </div>
        </div>

        {/* PDF Feature Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Publication-Grade Charts Embedded in Downloadable PDF
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Features high-res Risk Score Speedometer Dial, Payload Threat Ranking (Glitch_Demo.exe, Error_Demo.exe, Run_All.bat), MITRE ATT&CK Polar Radar, and Chronological Event Timeline.
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-black text-xs font-extrabold transition-all cursor-pointer shrink-0 shadow-md shadow-amber-400/20 flex items-center gap-1.5"
          >
            <FileDown className="w-4 h-4" />
            <span>Download 1-Click PDF</span>
          </button>
        </div>

        {/* AI Brief Markdown Narrative */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-mono">
              DeepSeek-R1 AI Forensic Commentary & Telemetry Log
            </h3>
            <span className="text-[10px] font-mono text-[#FDE047] font-bold">
              VERIFIED AUTONOMOUS EXECUTION
            </span>
          </div>
          <div className="whitespace-pre-wrap font-mono text-xs text-neutral-300 leading-relaxed bg-[#0A0A0A] p-7 rounded-[24px] border border-white/[0.06] shadow-inner">
            {report.markdown}
          </div>
        </div>
      </div>
    </div>
  );
}
