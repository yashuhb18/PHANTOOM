import React, { useState, useEffect } from 'react';
import {
  Usb,
  FileText,
  AlertTriangle,
  CheckCircle,
  Eye,
  Copy,
  Check,
  RefreshCw,
  Volume2,
  HardDrive,
  Terminal,
  ShieldAlert,
  FolderOpen,
  Monitor,
  ExternalLink,
  ChevronRight,
  FileDown,
  X
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

export function USBFootprintsPage() {
  const { liveEvents } = useWebSocket();
  const [footprints, setFootprints] = useState(null);
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Fetch live footprints from backend
  const fetchFootprints = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/devices/footprints`);
      if (res.ok) {
        const data = await res.json();
        setFootprints(data);
        setIsLoading(false);
      }
    } catch (e) {
      console.debug("Failed to load hardware footprints:", e);
    }
  };

  useEffect(() => {
    fetchFootprints();
    const interval = setInterval(fetchFootprints, 3500);
    return () => clearInterval(interval);
  }, []);

  // Re-fetch on live WebSocket event
  useEffect(() => {
    if (liveEvents && liveEvents.length > 0) {
      fetchFootprints();
    }
  }, [liveEvents]);

  const handleCopy = (text, fieldKey) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSpeakBriefing = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const deviceName = footprints?.device?.name || "Removable USB Flash Drive";
    const totalFiles = footprints?.summary?.total_artifacts || 0;
    const threats = footprints?.summary?.critical_threats || 0;
    const mountPoint = footprints?.device?.mount_point || "/run/media/yashz/KIOXIA_USB";

    const text = `Attention. Physical hardware footprint detected on ${deviceName}, mounted at ${mountPoint}. ${totalFiles} insertion artifacts were discovered on the system, including ${threats} critical security payloads. Have a look into the created files now.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const neuralVoice = voices.find(v => v.name.includes("Natural") || v.name.includes("Neural") || v.name.includes("Google") || v.lang.startsWith("en"));
    if (neuralVoice) utterance.voice = neuralVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const artifacts = footprints?.artifacts || [];
  const device = footprints?.device;
  const summary = footprints?.summary || {
    total_artifacts: 0,
    critical_threats: 0,
    suspicious_scripts: 0,
    verified_audit_logs: 0
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full overflow-hidden pb-16">
      <div className="max-w-[1140px] mx-auto space-y-6 relative z-10">
        
        {/* ══════════════════════════════════════════════════════════════════════
            HEADER & ACTIONS
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0C0C0E]/95 border border-white/[0.08] rounded-[28px] p-6 backdrop-blur-md shadow-2xl">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white">
                <Usb className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold font-mono text-white tracking-wide uppercase">
                  USB Hardware Footprints & Evidence
                </h1>
                <p className="text-xs font-mono text-neutral-400 mt-0.5 tracking-wider uppercase">
                  Real-time insertion artifacts & file creation inspection
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141418] border border-white/[0.08]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span className="text-emerald-400 font-mono text-[11px] font-bold tracking-widest uppercase">
                {footprints?.is_device_connected ? "MOUNT ACTIVE" : "SURVEILLANCE LIVE"}
              </span>
            </div>

            {/* Voice Briefing Button */}
            <button
              onClick={handleSpeakBriefing}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold font-mono transition-all cursor-pointer ${
                isSpeaking
                  ? 'bg-amber-500 text-black animate-pulse shadow-[0_0_15px_#f59e0b]'
                  : 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.12] hover:shadow-lg'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>{isSpeaking ? "Speaking..." : "Voice Briefing"}</span>
            </button>

            {/* Refresh */}
            <button
              onClick={fetchFootprints}
              className="p-2.5 rounded-full bg-[#18181D] hover:bg-[#222228] text-neutral-300 border border-white/[0.1] transition-all cursor-pointer"
              title="Refresh Footprints"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>


        {/* ══════════════════════════════════════════════════════════════════════
            DEVICE FORENSIC SNAPSHOT & SUMMARY KPIS
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Hardware Device Identity Card */}
          <div className="md:col-span-6 bg-[#0C0C0E]/95 border border-white/[0.08] rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-4 h-4 text-white" />
                <span className="text-xs font-mono font-bold text-white tracking-widest uppercase">
                  DETECTED HARDWARE TARGET
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-neutral-300 border border-white/10">
                ZERO-TRUST TRIAGE
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-mono text-neutral-400 block uppercase">Device Identity</span>
                <span className="text-base font-bold font-mono text-white block">
                  {footprints?.is_device_connected ? (device?.name || "Removable Storage Device") : "NO USB HARDWARE DETECTED"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.08] font-mono text-xs">
                <div>
                  <span className="text-neutral-500 text-[10px] block uppercase">Mount Point</span>
                  <span className="text-neutral-200 font-bold truncate block" title={device?.mount_point}>
                    {footprints?.is_device_connected ? (device?.mount_point || "Active VFS") : "Disconnected"}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] block uppercase">Serial Number</span>
                  <span className="text-neutral-200 font-bold truncate block" title={device?.serial}>
                    {footprints?.is_device_connected ? (device?.serial || "N/A") : "None"}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] block uppercase">Filesystem & Size</span>
                  <span className="text-neutral-200 font-bold block">
                    {footprints?.is_device_connected ? `${device?.filesystem?.toUpperCase() || "N/A"} • ${device?.capacity_gb || 0} GB` : "No Media"}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] block uppercase">Hardware Node</span>
                  <span className="text-neutral-200 font-bold block">
                    {footprints?.is_device_connected ? (device?.pnp_id || "USB Bus") : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Footprint Metrics */}
          <div className="md:col-span-6 grid grid-cols-3 gap-4">
            <div className="bg-[#0C0C0E]/95 border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between shadow-xl">
              <span className="text-[11px] font-mono text-neutral-400 font-bold tracking-wider uppercase">
                TOTAL ARTIFACTS
              </span>
              <div className="my-2">
                <span className="text-3xl font-extrabold font-mono text-white">
                  {summary.total_artifacts}
                </span>
                <span className="text-xs font-mono text-neutral-400 block mt-0.5">Files Created / Detected</span>
              </div>
              <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>SURVEILLANCE ACTIVE</span>
              </div>
            </div>

            <div className="bg-[#0C0C0E]/95 border border-red-500/30 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
              <span className="text-[11px] font-mono text-red-400 font-bold tracking-wider uppercase">
                CRITICAL PAYLOADS
              </span>
              <div className="my-2">
                <span className="text-3xl font-extrabold font-mono text-red-500">
                  {summary.critical_threats}
                </span>
                <span className="text-xs font-mono text-neutral-400 block mt-0.5">Rogue Scripts Discovered</span>
              </div>
              <div className="text-[10px] font-mono text-red-400 font-bold uppercase flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>SIGKILL READY</span>
              </div>
            </div>

            <div className="bg-[#0C0C0E]/95 border border-emerald-500/30 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
              <span className="text-[11px] font-mono text-emerald-400 font-bold tracking-wider uppercase">
                VERIFIED LOGS
              </span>
              <div className="my-2">
                <span className="text-3xl font-extrabold font-mono text-emerald-400">
                  {summary.verified_audit_logs}
                </span>
                <span className="text-xs font-mono text-neutral-400 block mt-0.5">Insertion Proof Files</span>
              </div>
              <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>HARDWARE VERIFIED</span>
              </div>
            </div>
          </div>
        </div>


        {/* ══════════════════════════════════════════════════════════════════════
            "HAVE A LOOK INTO WHAT WAS CREATED!" ARTIFACTS LIST
        ══════════════════════════════════════════════════════════════════════ */}
        <div className="bg-[#0C0C0E]/95 border border-white/[0.08] rounded-[32px] p-8 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-white" />
                <h2 className="text-lg font-bold font-mono text-white tracking-wider uppercase">
                  Created Files & Insertion Artifacts
                </h2>
              </div>
              <p className="text-xs font-mono text-neutral-400 mt-1 uppercase">
                Take a look into the files created on plug-in — inspect raw content, SHA256 hashes & threat scores
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-neutral-300 font-bold hidden sm:inline-block">
                {artifacts.length} ARTIFACTS FOUND
              </span>
              <a
                href={`http://${window.location.hostname}:8001/api/reports/latest/pdf`}
                download="PHANTOM_Latest_Incident_Report.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 hover:from-red-500 hover:to-yellow-400 text-white transition-all cursor-pointer pill-button shadow-lg shadow-red-500/20"
                title="Download complete forensic incident report PDF with all graphs in one click"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Download Forensic PDF</span>
              </a>
            </div>
          </div>

          <div className="space-y-4">
            {artifacts.map((art, idx) => {
              const isThreat = art.threat_score >= 40;
              const isSuspicious = art.threat_score >= 20 && art.threat_score < 40;
              const isAudit = art.threat_score < 20;

              return (
                <div
                  key={idx}
                  className={`border rounded-2xl p-5 transition-all duration-200 ${
                    isThreat
                      ? 'bg-red-500/[0.04] border-red-500/35 hover:border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.06)]'
                      : isSuspicious
                      ? 'bg-white/[0.02] border-white/[0.1] hover:border-white/[0.2]'
                      : 'bg-[#121216] border-white/[0.08] hover:border-white/[0.2]'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* File Meta */}
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-3 rounded-xl shrink-0 mt-0.5 ${
                          isThreat
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : isSuspicious
                            ? 'bg-white/[0.06] text-neutral-300 border border-white/[0.1]'
                            : 'bg-white/[0.06] text-neutral-300 border border-white/[0.1]'
                        }`}
                      >
                        {art.file_name.toLowerCase().endsWith('.exe') ? (
                          <ShieldAlert className="w-5 h-5 text-red-400" />
                        ) : art.file_name.endsWith('.sh') ? (
                          <Terminal className="w-5 h-5" />
                        ) : art.origin_type === 'DESKTOP' ? (
                          <Monitor className="w-5 h-5" />
                        ) : (
                          <FileText className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-base font-bold font-mono text-white">
                            {art.file_name}
                          </span>
                          
                          {/* Verdict Pill */}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase ${
                              isThreat
                                ? 'bg-red-500 text-white shadow-sm'
                                : isSuspicious
                                ? 'bg-white/10 text-neutral-300 border border-white/10'
                                : 'bg-white/10 text-neutral-300 border border-white/10'
                            }`}
                          >
                            {art.verdict.replace(/_/g, ' ')}
                          </span>

                          {isThreat && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-950 text-red-400 border border-red-800">
                              SCORE: {art.threat_score} / 100
                            </span>
                          )}
                        </div>

                        {/* File Path & Origin */}
                        <div className="flex items-center gap-4 text-xs font-mono text-neutral-400">
                          <span className="flex items-center gap-1.5 text-neutral-300">
                            <FolderOpen className="w-3.5 h-3.5 text-neutral-500" />
                            {art.origin_label}
                          </span>
                          <span>•</span>
                          <span>{art.file_size_formatted}</span>
                          <span>•</span>
                          <span>{art.modified_time}</span>
                        </div>

                        {/* Indicators tags */}
                        {art.indicators && art.indicators.length > 0 && (
                          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                            {art.indicators.map((ind, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded text-[9px] font-mono bg-red-500/15 text-red-300 border border-red-500/30"
                              >
                                {ind}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action: "HAVE A LOOK" Button */}
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => setSelectedArtifact(art)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
                          isThreat
                            ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                            : 'bg-white hover:bg-neutral-200 text-black shadow-md'
                        }`}
                      >
                        <Eye className="w-4 h-4" />
                        <span>HAVE A LOOK</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>


      {/* ══════════════════════════════════════════════════════════════════════
          FORENSIC FILE INSPECTOR MODAL: "HAVE A LOOK INTO WHAT WAS CREATED"
      ══════════════════════════════════════════════════════════════════════ */}
      {selectedArtifact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0E0E12] border border-white/[0.12] rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#141418]">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white">
                  <FileText className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold font-mono text-white">
                    {selectedArtifact.file_name}
                  </h3>
                  <span className="text-[11px] font-mono text-neutral-400">
                    {selectedArtifact.origin_label}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedArtifact(null)}
                className="p-1.5 rounded-full hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto font-mono text-xs">
              
              {/* Verdict Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  selectedArtifact.threat_score >= 40
                    ? 'bg-red-500/10 border-red-500/30 text-red-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {selectedArtifact.threat_score >= 40 ? (
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold block text-sm">
                      {selectedArtifact.threat_score >= 40
                        ? `CRITICAL ADVERSARY PAYLOAD DETECTED (Score: ${selectedArtifact.threat_score})`
                        : "AUTHENTIC HARDWARE INSERTION VERIFICATION ARTIFACT"}
                    </span>
                    <span className="text-[11px] opacity-80 block mt-0.5">
                      {selectedArtifact.threat_score >= 40
                        ? "File contains unauthorized execution patterns. Targeted for containment."
                        : "Automatically generated proof file confirming physical USB insertion."}
                    </span>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase shrink-0 ${
                    selectedArtifact.threat_score >= 40 ? 'bg-red-500 text-white' : 'bg-white/10 text-white border border-white/10'
                  }`}
                >
                  {selectedArtifact.verdict.replace(/_/g, ' ')}
                </span>
              </div>

              {/* File Specs & Checksum */}
              <div className="bg-[#141418] border border-white/[0.06] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-neutral-400">
                  <span>Absolute Path:</span>
                  <span className="text-white font-bold truncate max-w-[420px]" title={selectedArtifact.file_path}>
                    {selectedArtifact.file_path}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-400">
                  <span>File Size & Modified:</span>
                  <span className="text-white">
                    {selectedArtifact.file_size_formatted} ({selectedArtifact.file_size_bytes} bytes) • {selectedArtifact.modified_time}
                  </span>
                </div>
                <div className="flex items-center justify-between text-neutral-400 pt-1 border-t border-white/[0.04]">
                  <span>SHA-256 Checksum:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">
                      {selectedArtifact.sha256}
                    </span>
                    <button
                      onClick={() => handleCopy(selectedArtifact.sha256, 'sha')}
                      className="p-1 hover:text-white text-neutral-400 transition-colors"
                      title="Copy SHA256"
                    >
                      {copiedField === 'sha' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Raw File Content Terminal Box */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-400 font-bold uppercase text-[11px] flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-white" />
                    <span>RAW FILE CONTENT (WHAT WAS CREATED)</span>
                  </span>
                  <button
                    onClick={() => handleCopy(selectedArtifact.content_snippet, 'content')}
                    className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white transition-colors"
                  >
                    {copiedField === 'content' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-[#08080B] border border-white/[0.1] rounded-xl p-4 font-mono text-xs overflow-x-auto text-neutral-200 leading-relaxed shadow-inner max-h-[280px]">
                  <pre className="whitespace-pre-wrap font-mono">
                    {selectedArtifact.content_snippet || "(Empty file)"}
                  </pre>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/[0.08] bg-[#141418]">
              <span className="text-[11px] font-mono text-neutral-500">
                PHANTOM Autonomous Zero-Trust Forensic Verification Engine
              </span>
              <button
                onClick={() => setSelectedArtifact(null)}
                className="px-5 py-2 rounded-full font-mono text-xs font-bold bg-white hover:bg-neutral-200 text-black transition-all cursor-pointer shadow-sm"
              >
                Close Inspector
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
