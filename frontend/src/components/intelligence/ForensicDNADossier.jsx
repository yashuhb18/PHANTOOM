import React, { useState } from 'react';
import {
  Dna,
  Cpu,
  HardDrive,
  Laptop,
  Activity,
  Copy,
  Check,
  Volume2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Sparkles
} from 'lucide-react';

export function ForensicDNADossier({ fingerprint, isLiveActive = false }) {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (!fingerprint) {
    return (
      <div className="bg-[#0C0C0E]/95 border border-white/[0.08] rounded-[28px] p-10 text-center backdrop-blur-md">
        <Dna className="w-10 h-10 text-neutral-600 mx-auto mb-3 animate-pulse" />
        <h4 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
          Awaiting USB Genomic Telemetry
        </h4>
        <p className="text-xs font-mono text-neutral-400 mt-1 max-w-md mx-auto">
          Plug in any physical USB device or select a session to inspect its 4-Layer Forensic DNA,
          silicon descriptors, and cross-OS digital dust.
        </p>
      </div>
    );
  }

  const genome = fingerprint.genome || {};
  const silicon = genome.silicon || {};
  const volume = genome.volume || {};
  const heritage = genome.host_heritage || {};
  const behavior = genome.behavior || {};
  const barcode = genome.master_barcode || fingerprint.dna_hash || "PH-DNA-0000-0000-0000-0000";

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(barcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVoiceBriefing = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const devName = fingerprint.device_name || silicon.device_name || "Target USB Flash Device";
    const hosts = heritage.detected_hosts?.map(h => h.os).join(" and ") || "Linux Host";
    const family = fingerprint.cluster_family || genome.cluster_family || "Mass Storage";
    
    const text = `Attention. Forensic DNA synthesis completed for ${devName}. Genomic barcode is ${barcode}. Microscopic host dust traces this drive to ${hosts}. Classified under threat lineage ${family}.`;

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

  return (
    <div className="bg-[#0C0C0E]/95 border border-white/[0.08] rounded-[28px] p-6 shadow-2xl backdrop-blur-md space-y-6">
      
      {/* ══════════════════════════════════════════════════════════════════════
          HEADER & MASTER BARCODE
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-cyan-400">
              <Dna className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-mono text-white tracking-wide uppercase">
                  {fingerprint.device_name || silicon.device_name || "Removable USB Drive"}
                </h3>
                {isLiveActive && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE PLUG-IN ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-neutral-400 mt-0.5">
                Session: <span className="text-white font-semibold">{fingerprint.session_id}</span> • Lineage: <span className="text-amber-400 font-semibold">{fingerprint.cluster_family || genome.cluster_family || "SURVEILLED_DEVICE"}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Barcode Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#141418] border border-white/[0.1]">
            <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest">DNA BARCODE:</span>
            <span className="text-xs font-mono font-bold text-white tracking-wider">{barcode}</span>
            <button
              onClick={handleCopyBarcode}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer ml-1"
              title="Copy DNA Barcode"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Voice Briefing Button */}
          <button
            onClick={handleVoiceBriefing}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold font-mono transition-all cursor-pointer ${
              isSpeaking
                ? 'bg-amber-500 text-black animate-pulse'
                : 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.12]'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{isSpeaking ? "Speaking..." : "Voice Briefing"}</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          THE 4-LAYER GENOMIC MATRIX
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* LAYER 1: SILICON & CONTROLLER */}
        <div className="bg-[#121216] border border-white/[0.06] rounded-2xl p-4.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                Layer 1: Silicon & Controller Genome
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-neutral-400 border border-white/[0.06]">
              HW_HASH: {silicon.silicon_hash || "N/A"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px] pt-1">
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-neutral-500 text-[10px] block uppercase">VID : PID</span>
              <span className="text-white font-bold">{silicon.vendor_id || "0000"} : {silicon.product_id || "0000"}</span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-neutral-500 text-[10px] block uppercase">Controller Vendor</span>
              <span className="text-white font-bold truncate block" title={silicon.vendor_name}>
                {silicon.vendor_name || "Generic Silicon"}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-neutral-500 text-[10px] block uppercase">Firmware Revision</span>
              <span className="text-white font-bold">{silicon.firmware_revision || "01.00"}</span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-neutral-500 text-[10px] block uppercase">Interface Bus Speed</span>
              <span className="text-white font-bold truncate block">{silicon.interface_speed || "High-Speed (480 Mbps)"}</span>
            </div>
          </div>
          <div className="text-[10px] font-mono text-neutral-500 truncate" title={silicon.serial_number}>
            Serial: <span className="text-neutral-300 font-semibold">{silicon.serial_number || "UNKNOWN-SERIAL"}</span>
          </div>
        </div>

        {/* LAYER 2: FILESYSTEM & VOLUME */}
        <div className="bg-[#121216] border border-white/[0.06] rounded-2xl p-4.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                Layer 2: Filesystem & Volume Genome
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-neutral-400 border border-white/[0.06]">
              VOL_HASH: {volume.volume_hash || "N/A"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px] pt-1">
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-neutral-500 text-[10px] block uppercase">Format & Label</span>
              <span className="text-white font-bold">{volume.filesystem || "EXFAT"} • {volume.volume_label || "REMOVABLE"}</span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-neutral-500 text-[10px] block uppercase">Volume Serial UUID</span>
              <span className="text-white font-bold truncate block" title={volume.volume_uuid}>
                {volume.volume_uuid || "4A9E-81C2"}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-neutral-500 text-[10px] block uppercase">Allocation Cluster Size</span>
              <span className="text-white font-bold">{volume.cluster_size_bytes ? `${Math.round(volume.cluster_size_bytes/1024)} KB (${volume.cluster_size_bytes} B)` : "32 KB"}</span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-neutral-500 text-[10px] block uppercase">Device Capacity</span>
              <span className="text-white font-bold">{volume.capacity_gb || 0} GB</span>
            </div>
          </div>
          <div className="text-[10px] font-mono text-neutral-500 truncate" title={volume.mount_flags}>
            VFS Flags: <span className="text-neutral-300">{volume.mount_flags || "rw,nosuid,nodev"}</span>
          </div>
        </div>

        {/* LAYER 3: CROSS-OS DIGITAL DUST & HOST HERITAGE */}
        <div className="md:col-span-2 bg-[#121216] border border-cyan-500/25 rounded-2xl p-5 space-y-4 shadow-[0_0_20px_rgba(6,182,212,0.04)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-white">
              <Laptop className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                Layer 3: Cross-OS Digital Dust & Host Lineage (Microscopic Provenance)
              </span>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
              {heritage.cross_os_count || 1} HOST PROFILES DETECTED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {heritage.detected_hosts?.map((host, idx) => {
              const isWin = host.os.includes("Windows");
              const isMac = host.os.includes("macOS") || host.os.includes("Apple");
              const isLinux = host.os.includes("Linux");

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-black/40 border border-white/[0.08] hover:border-cyan-500/40 transition-all font-mono space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isWin ? 'text-blue-400' : isMac ? 'text-neutral-200' : 'text-emerald-400'}`}>
                      {host.os}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-neutral-300">
                      {host.confidence}% Conf.
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-snug">
                    {host.evidence}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {host.artifacts?.map((art, aIdx) => (
                      <span
                        key={aIdx}
                        className="text-[9px] px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-neutral-400 truncate max-w-[200px]"
                        title={art}
                      >
                        {art}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {heritage.indexer_volume_guid && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between text-xs font-mono">
              <span className="text-amber-400 font-bold uppercase text-[11px]">
                ⚡ Workstation Forensic Identifier Found:
              </span>
              <span className="text-white font-bold select-all">
                {heritage.indexer_volume_guid}
              </span>
            </div>
          )}
        </div>

        {/* LAYER 4: BEHAVIORAL ATTACK GENOME */}
        <div className="md:col-span-2 bg-[#121216] border border-white/[0.06] rounded-2xl p-4.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                Layer 4: Tactical Behavioral Telemetry & Canary Interactions
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-neutral-400 border border-white/[0.06]">
              {behavior.token_count || behavior.tokens?.length || 0} BEHAVIORAL TOKENS
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 font-mono">
            {behavior.tokens?.map((tok, idx) => {
              const isCrit = tok.includes("INJECTION") || tok.includes("POWERSHELL") || tok.includes("EXPLOIT");
              const isDecept = tok.includes("CANARY") || tok.includes("DECEPTION") || tok.includes("CLOUD");
              return (
                <span
                  key={idx}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                    isCrit
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : isDecept
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-white/[0.04] text-neutral-300 border-white/[0.08]'
                  }`}
                >
                  {tok}
                </span>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
