import React from 'react';
import { GitCompare, CheckCircle, AlertTriangle, Cpu, HardDrive, Laptop, Activity, ShieldCheck, ShieldAlert } from 'lucide-react';

export function SimilarityGraph({ comparison }) {
  if (!comparison) {
    return (
      <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-12 text-center text-xs text-neutral-500 shadow-2xl">
        Select two sessions to compare cross-device Forensic DNA & Lineage.
      </div>
    );
  }

  const percentage = Math.round((comparison.similarity_score || 0) * 100);
  const isMatch = comparison.is_match;
  const layers = comparison.layer_breakdown || {
    silicon_match: 0.15,
    volume_match: 0.85,
    host_heritage_match: 0.98,
    behavior_match: 0.95
  };

  return (
    <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 shadow-2xl space-y-6">
      
      {/* ══════════════════════════════════════════════════════════════════════
          HEADER & VERDICT
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <GitCompare className="w-5 h-5 text-[#FDE047]" />
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Cross-Device Forensic DNA & Lineage Matrix
            </h3>
            <span className="text-[11px] text-neutral-400">
              Correlating operator provenance across disparate USB devices
            </span>
          </div>
        </div>
        
        <span className={`text-[10px] font-mono px-3 py-1 rounded-full font-bold uppercase border tracking-wider ${
          isMatch
            ? 'bg-red-500/15 text-red-400 border-red-500/30'
            : 'bg-white/[0.04] text-neutral-300 border-white/[0.08]'
        }`}>
          {isMatch ? "ATTACKER LINK IDENTIFIED" : "DISTINCT ATTACK PROFILE"}
        </span>
      </div>

      {/* Forensic Verdict Banner */}
      <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${
        isMatch
          ? 'bg-red-500/[0.06] border-red-500/30 text-neutral-200'
          : 'bg-neutral-900 border-white/[0.08] text-neutral-400'
      }`}>
        <div className="flex items-start gap-2.5">
          {isMatch ? (
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-bold uppercase text-[11px] block text-white mb-0.5">
              Forensic Attribution Verdict:
            </span>
            <span>{comparison.verdict || "No correlation found between profiles."}</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SIMILARITY DIAL & SESSIONS COMPARED (PHANTOM YELLOW THEME)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row items-center gap-8 py-2">
        {/* Donut similarity indicator */}
        <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-neutral-900"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={isMatch ? 'text-[#FDE047]' : 'text-neutral-400'}
              strokeDasharray={`${percentage}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className={`text-3xl font-extrabold font-mono tracking-tight ${isMatch ? 'text-[#FDE047]' : 'text-white'}`}>
              {percentage}%
            </span>
            <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest mt-0.5 font-bold">
              DNA MATCH
            </span>
          </div>
        </div>

        {/* Sessions compared */}
        <div className="flex-1 w-full space-y-3">
          <div className="p-3 bg-[#181818] border border-white/[0.06] rounded-xl text-xs flex items-center justify-between">
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase font-medium">Profile #1 (Source)</span>
              <span className="font-mono font-bold text-white">{comparison.source_session_id}</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-900 text-neutral-300">
              {comparison.source_genome?.silicon?.device_name || "Device A"}
            </span>
          </div>
          <div className="p-3 bg-[#181818] border border-white/[0.06] rounded-xl text-xs flex items-center justify-between">
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase font-medium">Profile #2 (Target)</span>
              <span className="font-mono font-bold text-white">{comparison.target_session_id}</span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-neutral-900 text-neutral-300">
              {comparison.target_genome?.silicon?.device_name || "Device B"}
            </span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          THE 4-LAYER GENOMIC MATCH BREAKDOWN
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
          Genomic Layer Alignment Breakdown
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          
          {/* Layer 1: Silicon */}
          <div className="p-3 rounded-xl bg-[#181818] border border-white/[0.06] space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-neutral-300 font-medium">
                <Cpu className="w-3.5 h-3.5 text-[#FDE047]" />
                <span>Layer 1: Silicon & Controller</span>
              </span>
              <span className="font-bold text-white font-mono">{Math.round(layers.silicon_match * 100)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-neutral-900 overflow-hidden">
              <div
                className="h-full bg-[#FDE047] rounded-full transition-all duration-500"
                style={{ width: `${Math.round(layers.silicon_match * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-neutral-500 block">
              {layers.silicon_match < 0.4 ? "Different physical hardware chipsets" : "Matching physical controller"}
            </span>
          </div>

          {/* Layer 2: Volume */}
          <div className="p-3 rounded-xl bg-[#181818] border border-white/[0.06] space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-neutral-300 font-medium">
                <HardDrive className="w-3.5 h-3.5 text-[#FDE047]" />
                <span>Layer 2: Filesystem & Volume</span>
              </span>
              <span className="font-bold text-white font-mono">{Math.round(layers.volume_match * 100)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-neutral-900 overflow-hidden">
              <div
                className="h-full bg-[#FDE047] rounded-full transition-all duration-500"
                style={{ width: `${Math.round(layers.volume_match * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-neutral-500 block">
              Matching cluster size & format scheme
            </span>
          </div>

          {/* Layer 3: Host Heritage */}
          <div className="p-3 rounded-xl bg-[#181818] border border-white/[0.06] space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-neutral-300 font-medium">
                <Laptop className="w-3.5 h-3.5 text-[#FDE047]" />
                <span>Layer 3: Host Dust & Provenance</span>
              </span>
              <span className="font-bold text-[#FDE047] font-mono">{Math.round(layers.host_heritage_match * 100)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-neutral-900 overflow-hidden">
              <div
                className="h-full bg-[#FDE047] rounded-full transition-all duration-500"
                style={{ width: `${Math.round(layers.host_heritage_match * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-neutral-400 block font-medium">
              Workstation provenance & OS remnants
            </span>
          </div>

          {/* Layer 4: Behavior */}
          <div className="p-3 rounded-xl bg-[#181818] border border-white/[0.06] space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-neutral-300 font-medium">
                <Activity className="w-3.5 h-3.5 text-[#FDE047]" />
                <span>Layer 4: Attack Telemetry</span>
              </span>
              <span className="font-bold text-white font-mono">{Math.round(layers.behavior_match * 100)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-neutral-900 overflow-hidden">
              <div
                className="h-full bg-[#FDE047] rounded-full transition-all duration-500"
                style={{ width: `${Math.round(layers.behavior_match * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-neutral-500 block">
              Matching injection vectors & payload flags
            </span>
          </div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          COMMON VS DIVERGENT TOKENS
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/[0.08]">
        <div>
          <h4 className="text-xs font-bold text-emerald-400 mb-2.5 flex items-center gap-1.5 uppercase">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Shared Behavioral Genes ({comparison.common_subgraphs?.length || 0})</span>
          </h4>
          <div className="space-y-1.5">
            {comparison.common_subgraphs?.map((token, idx) => (
              <div key={idx} className="p-2 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] font-mono text-emerald-300">
                {token}
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-neutral-400 mb-2.5 flex items-center gap-1.5 uppercase">
            <AlertTriangle className="w-3.5 h-3.5 text-[#FDE047]" />
            <span>Divergent Tokens ({comparison.divergence_points?.length || 0})</span>
          </h4>
          <div className="space-y-1.5">
            {comparison.divergence_points?.map((token, idx) => (
              <div key={idx} className="p-2 px-3 bg-[#181818] border border-white/[0.06] rounded-xl text-[10px] font-mono text-neutral-400">
                {token}
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
