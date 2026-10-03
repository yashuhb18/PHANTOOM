import React, { useState } from 'react';
import {
  Dna,
  Cpu,
  HardDrive,
  Laptop,
  Activity,
  Copy,
  Check,
  Volume2
} from 'lucide-react';

export function ForensicDNADossier({ fingerprint, isLiveActive = false }) {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (!fingerprint) {
    return (
      <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-10 text-center shadow-2xl">
        <Dna className="w-10 h-10 text-neutral-600 mx-auto mb-3 animate-pulse" />
        <h4 className="text-sm font-bold text-white uppercase tracking-tight">
          Awaiting USB Genomic Telemetry
        </h4>
        <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
          Plug in any physical USB device to inspect its 4-layer hardware silicon descriptors,
          filesystem geometry, and cross-OS digital dust.
        </p>
      </div>
    );
  }

  const genome = fingerprint.genome || {};
  const silicon = genome.silicon || {};
  const volume = genome.volume || {};
  const heritage = genome.host_heritage || {};
  const behavior = genome.behavior || {};
  const barcode = genome.master_barcode || fingerprint.dna_hash || "N/A";

  const handleCopyBarcode = () => {
    navigator.clipboard.writeText(barcode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVoiceBriefing = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const devName = fingerprint.device_name || silicon.device_name || "Removable USB Device";
    const hosts = heritage.detected_hosts?.map(h => h.os).join(" and ") || "Storage";
    const family = fingerprint.cluster_family || genome.cluster_family || "Physical USB";
    
    const text = `Attention. Forensic DNA synthesis completed for ${devName}. Genomic barcode is ${barcode}. Host provenance traces this drive to ${hosts}. Threat classification is ${family}.`;

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
    <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 shadow-2xl space-y-6">
      
      {/* ══════════════════════════════════════════════════════════════════════
          HEADER & MASTER BARCODE (PHANTOM YELLOW & BLACK)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-[#FDE047] shrink-0">
              <Dna className="w-5 h-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight uppercase">
                  {fingerprint.device_name || silicon.device_name || "Removable USB Drive"}
                </h3>
                {isLiveActive ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE HARDWARE MOUNTED
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-white/[0.04] text-neutral-400 border border-white/[0.08]">
                    HISTORICAL PROFILE
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Session: <span className="text-neutral-200 font-mono">{fingerprint.session_id}</span> • Lineage: <span className="text-[#FDE047] font-semibold">{fingerprint.cluster_family || genome.cluster_family || "PHYSICAL_USB"}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Barcode Pill */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-900 border border-white/[0.08]">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">DNA BARCODE:</span>
            <span className="text-xs font-mono font-bold text-[#FDE047] tracking-wider">{barcode}</span>
            <button
              onClick={handleCopyBarcode}
              className="text-neutral-400 hover:text-white transition-colors cursor-pointer ml-1"
              title="Copy DNA Barcode"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Voice Briefing Button (Signature Yellow) */}
          <button
            onClick={handleVoiceBriefing}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              isSpeaking
                ? 'bg-amber-400 text-black animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                : 'bg-[#FDE047] hover:bg-[#fef08a] text-black shadow-lg shadow-[#FDE047]/10'
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
        <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Cpu className="w-4 h-4 text-[#FDE047]" />
              <span className="text-xs font-bold uppercase tracking-wide">
                Layer 1: Silicon & Controller Genome
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-white/[0.06]">
              HW_HASH: {silicon.silicon_hash || "N/A"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
            <div className="p-2.5 rounded-xl bg-neutral-900/70 border border-white/[0.04]">
              <span className="text-neutral-500 text-[10px] block uppercase font-medium">VID : PID</span>
              <span className="text-white font-mono font-bold">{silicon.vendor_id || "0000"} : {silicon.product_id || "0000"}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-900/70 border border-white/[0.04]">
              <span className="text-neutral-500 text-[10px] block uppercase font-medium">Controller Vendor</span>
              <span className="text-white font-semibold truncate block" title={silicon.vendor_name}>
                {silicon.vendor_name || "Generic Controller"}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-900/70 border border-white/[0.04]">
              <span className="text-neutral-500 text-[10px] block uppercase font-medium">Firmware Revision</span>
              <span className="text-white font-mono font-bold">{silicon.firmware_revision || "01.00"}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-900/70 border border-white/[0.04]">
              <span className="text-neutral-500 text-[10px] block uppercase font-medium">Bus Speed</span>
              <span className="text-white font-semibold truncate block">{silicon.interface_speed || "High-Speed"}</span>
            </div>
          </div>
          <div className="text-[11px] text-neutral-400 truncate" title={silicon.serial_number}>
            Serial: <span className="text-white font-mono">{silicon.serial_number || "None"}</span>
          </div>
        </div>

        {/* LAYER 2: FILESYSTEM & VOLUME */}
        <div className="bg-[#181818] border border-white/[0.06] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <HardDrive className="w-4 h-4 text-[#FDE047]" />
              <span className="text-xs font-bold uppercase tracking-wide">
                Layer 2: Filesystem & Volume Genome
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-white/[0.06]">
              VOL_HASH: {volume.volume_hash || "N/A"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs pt-1">
            <div className="p-2.5 rounded-xl bg-neutral-900/70 border border-white/[0.04]">
              <span className="text-neutral-500 text-[10px] block uppercase font-medium">Filesystem & Label</span>
              <span className="text-white font-bold">{volume.filesystem || "RAW"} • {volume.volume_label || "UNLABELED"}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-900/70 border border-white/[0.04]">
              <span className="text-neutral-500 text-[10px] block uppercase font-medium">Volume Serial UUID</span>
              <span className="text-white font-mono font-bold truncate block" title={volume.volume_uuid}>
                {volume.volume_uuid || "NONE"}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-900/70 border border-white/[0.04]">
              <span className="text-neutral-500 text-[10px] block uppercase font-medium">Cluster Block Size</span>
              <span className="text-white font-bold">{volume.cluster_size_bytes ? `${Math.round(volume.cluster_size_bytes/1024)} KB` : "4 KB"}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-900/70 border border-white/[0.04]">
              <span className="text-neutral-500 text-[10px] block uppercase font-medium">Total Capacity</span>
              <span className="text-white font-bold">{volume.capacity_gb || 0} GB</span>
            </div>
          </div>
          <div className="text-[11px] text-neutral-400 truncate" title={volume.mount_flags}>
            VFS Flags: <span className="text-white font-mono text-[10px]">{volume.mount_flags || "rw"}</span>
          </div>
        </div>

        {/* LAYER 3: CROSS-OS DIGITAL DUST & HOST HERITAGE */}
        <div className="md:col-span-2 bg-[#181818] border border-white/[0.06] rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-white">
              <Laptop className="w-4 h-4 text-[#FDE047]" />
              <span className="text-xs font-bold uppercase tracking-wide">
                Layer 3: Cross-OS Digital Dust & Host Lineage (Microscopic Provenance)
              </span>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-neutral-900 text-[#FDE047] border border-white/[0.08] font-bold">
              {heritage.cross_os_count || 1} HOST ARTIFACT PROFILES
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {heritage.detected_hosts?.map((host, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-neutral-900/80 border border-white/[0.06] space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    {host.os}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-neutral-400">
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
                      className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-neutral-400 truncate max-w-[200px]"
                      title={art}
                    >
                      {art}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {heritage.indexer_volume_guid && (
            <div className="p-3 rounded-xl bg-neutral-900 border border-[#FDE047]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="text-[#FDE047] font-bold uppercase text-[11px]">
                Workstation Volume GUID Discovered:
              </span>
              <span className="text-white font-mono font-bold select-all">
                {heritage.indexer_volume_guid}
              </span>
            </div>
          )}
        </div>

        {/* LAYER 4: BEHAVIORAL ATTACK GENOME */}
        <div className="md:col-span-2 bg-[#181818] border border-white/[0.06] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Activity className="w-4 h-4 text-[#FDE047]" />
              <span className="text-xs font-bold uppercase tracking-wide">
                Layer 4: Tactical Behavioral Telemetry & Injection Vectors
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-white/[0.06]">
              {behavior.token_count || behavior.tokens?.length || 0} BEHAVIORAL TOKENS
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {behavior.tokens?.map((tok, idx) => {
              const isCrit = tok.includes("INJECTION") || tok.includes("POWERSHELL") || tok.includes("EXPLOIT");
              const isDecept = tok.includes("CANARY") || tok.includes("DECEPTION") || tok.includes("CLOUD");
              return (
                <span
                  key={idx}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold border ${
                    isCrit
                      ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : isDecept
                      ? 'bg-[#FDE047]/10 text-[#FDE047] border-[#FDE047]/30'
                      : 'bg-neutral-900 text-neutral-300 border-white/[0.06]'
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
