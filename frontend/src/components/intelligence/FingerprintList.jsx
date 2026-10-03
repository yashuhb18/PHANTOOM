import React from 'react';
import { Dna, Laptop, HardDrive, ShieldAlert, Cpu } from 'lucide-react';
import { AlertBadge } from '../common/AlertBadge';

export function FingerprintList({ fingerprints, selectedId, onSelect }) {
  if (!fingerprints || fingerprints.length === 0) {
    return (
      <div className="bg-[#0C0C0E]/95 border border-white/[0.08] rounded-[28px] p-10 text-center font-mono text-xs text-neutral-500 backdrop-blur-md">
        No Attack DNA signatures cataloged yet.
      </div>
    );
  }

  return (
    <div className="bg-[#0C0C0E]/95 border border-white/[0.08] rounded-[28px] overflow-hidden shadow-2xl backdrop-blur-md">
      
      {/* Header */}
      <div className="px-6 py-4.5 border-b border-white/[0.08] flex items-center justify-between bg-[#121216]">
        <div className="flex items-center gap-2.5">
          <Dna className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
            Cataloged USB Forensic DNA Profiles
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/[0.04] text-neutral-300 border border-white/[0.08]">
          {fingerprints.length} Profiles Recorded
        </span>
      </div>

      {/* List */}
      <div className="divide-y divide-white/[0.04] max-h-[620px] overflow-y-auto">
        {fingerprints.map((fp) => {
          const isSelected = selectedId === fp.session_id;
          const genome = fp.genome || {};
          const silicon = genome.silicon || {};
          const volume = genome.volume || {};
          const heritage = genome.host_heritage || {};
          const barcode = genome.master_barcode || fp.dna_hash;

          return (
            <div
              key={fp.session_id}
              onClick={() => onSelect && onSelect(fp)}
              className={`p-5 px-6 cursor-pointer transition-all ${
                isSelected
                  ? 'bg-cyan-500/[0.06] border-l-4 border-cyan-400'
                  : 'hover:bg-white/[0.02]'
              }`}
            >
              {/* Top Row: Family & Risk Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs font-mono text-white">
                    {fp.cluster_family || genome.cluster_family || "SURVEILLED_USB"}
                  </span>
                  <span className="text-[10px] font-mono bg-[#18181D] px-2 py-0.5 rounded border border-white/[0.08] text-neutral-300 font-bold">
                    {barcode}
                  </span>
                </div>
                <AlertBadge severity={fp.risk_score >= 60 ? 'CRITICAL' : 'HIGH'} />
              </div>

              {/* Sub-row: Device Name & Hardware ID */}
              <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] font-mono text-neutral-400">
                <span className="text-white font-semibold">{fp.device_name || silicon.device_name || "USB Device"}</span>
                <span>•</span>
                <span className="text-neutral-500">{fp.session_id}</span>
                {volume.filesystem && (
                  <>
                    <span>•</span>
                    <span className="text-purple-400">{volume.filesystem} ({volume.capacity_gb || 0} GB)</span>
                  </>
                )}
              </div>

              {/* Host Heritage Radar Pills */}
              {heritage.detected_hosts && heritage.detected_hosts.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase flex items-center gap-1 mr-1">
                    <Laptop className="w-3 h-3 text-cyan-400" />
                    <span>HOST DUST:</span>
                  </span>
                  {heritage.detected_hosts.map((host, hIdx) => {
                    const isWin = host.os.includes("Windows");
                    const isMac = host.os.includes("macOS") || host.os.includes("Apple");
                    return (
                      <span
                        key={hIdx}
                        className={`text-[9px] font-mono px-2 py-0.5 rounded border font-semibold ${
                          isWin
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            : isMac
                            ? 'bg-neutral-200/10 text-neutral-200 border-neutral-300/30'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        }`}
                        title={host.evidence}
                      >
                        {host.os.split(" ")[0]}
                      </span>
                    );
                  })}
                  {heritage.indexer_volume_guid && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                      GUID MATCHED
                    </span>
                  )}
                </div>
              )}

              {/* Behavioral Tokens */}
              {fp.tokens && fp.tokens.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {fp.tokens.slice(0, 3).map((token, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[9px] font-mono bg-white/[0.04] text-neutral-300 border border-white/[0.06]"
                    >
                      {token}
                    </span>
                  ))}
                  {fp.tokens.length > 3 && (
                    <span className="text-[9px] font-mono text-neutral-500 self-center">
                      +{fp.tokens.length - 3} more
                    </span>
                  )}
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}
