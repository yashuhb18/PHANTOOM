import React from 'react';
import { Dna, Laptop, HardDrive } from 'lucide-react';
import { AlertBadge } from '../common/AlertBadge';

export function FingerprintList({ fingerprints, selectedId, onSelect }) {
  if (!fingerprints || fingerprints.length === 0) {
    return (
      <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-10 text-center text-xs text-neutral-500 shadow-2xl">
        No Attack DNA signatures cataloged yet.
      </div>
    );
  }

  return (
    <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] overflow-hidden shadow-2xl">
      
      {/* Header */}
      <div className="px-6 py-4.5 border-b border-white/[0.06] flex items-center justify-between bg-[#0F0F0F]">
        <div className="flex items-center gap-2.5">
          <Dna className="w-4 h-4 text-[#FDE047]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
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
                  ? 'bg-[#FDE047]/10 border-l-4 border-[#FDE047]'
                  : 'hover:bg-white/[0.02]'
              }`}
            >
              {/* Top Row: Family & Risk Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">
                    {fp.cluster_family || genome.cluster_family || "PHYSICAL_USB"}
                  </span>
                  <span className="text-[10px] font-mono bg-neutral-900 px-2 py-0.5 rounded border border-white/[0.08] text-[#FDE047] font-bold">
                    {barcode}
                  </span>
                </div>
                <AlertBadge severity={fp.risk_score >= 60 ? 'CRITICAL' : 'HIGH'} />
              </div>

              {/* Sub-row: Device Name & Hardware ID */}
              <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-neutral-400">
                <span className="text-white font-semibold">{fp.device_name || silicon.device_name || "USB Device"}</span>
                <span>•</span>
                <span className="font-mono text-neutral-500">{fp.session_id}</span>
                {volume.filesystem && (
                  <>
                    <span>•</span>
                    <span className="text-neutral-300 font-mono">{volume.filesystem} ({volume.capacity_gb || 0} GB)</span>
                  </>
                )}
              </div>

              {/* Host Heritage Radar Pills */}
              {heritage.detected_hosts && heritage.detected_hosts.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                  <span className="text-[10px] text-neutral-500 uppercase flex items-center gap-1 mr-1">
                    <Laptop className="w-3 h-3 text-[#FDE047]" />
                    <span>HOST DUST:</span>
                  </span>
                  {heritage.detected_hosts.map((host, hIdx) => (
                    <span
                      key={hIdx}
                      className="text-[9px] font-mono px-2 py-0.5 rounded border font-semibold bg-neutral-900 text-neutral-300 border-white/[0.08]"
                      title={host.evidence}
                    >
                      {host.os.split(" ")[0]}
                    </span>
                  ))}
                  {heritage.indexer_volume_guid && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#FDE047]/10 text-[#FDE047] border border-[#FDE047]/30 font-bold">
                      GUID IDENTIFIED
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
                      className="px-2 py-0.5 rounded text-[9px] font-mono bg-neutral-900 text-neutral-400 border border-white/[0.06]"
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
