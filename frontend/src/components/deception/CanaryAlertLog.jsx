import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { AlertBadge } from '../common/AlertBadge';
import { formatISTTime } from '../../utils/time';

export function CanaryAlertLog({ hits }) {
  return (
    <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] overflow-hidden shadow-2xl">
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between bg-[#0F0F0F]">
        <div className="flex items-center gap-2.5">
          <AlertOctagon className="w-4 h-4 text-red-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wide">Canary Tripwire Audit Log</h3>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 font-bold">
          ZERO FALSE POSITIVE
        </span>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {(!hits || hits.length === 0) ? (
          <div className="p-12 text-center text-xs text-neutral-500">
            No canary tripwire breaches recorded. Deception perimeter secure.
          </div>
        ) : (
          hits.map((hit) => (
            <div key={hit.id} className="p-4 px-6 hover:bg-white/[0.02] transition-colors flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-red-400 font-mono">TRIP: {hit.filename}</span>
                  <span className="text-[10px] font-mono bg-red-500/15 text-red-300 px-2 py-0.5 rounded-full border border-red-500/30 font-bold">
                    {hit.action}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-neutral-400">
                  <span className="font-mono">{formatISTTime(hit.timestamp, { withSuffix: true })}</span>
                  <span>•</span>
                  <span>Process: <code className="font-mono text-white bg-neutral-900 px-1.5 py-0.5 rounded-lg border border-white/[0.06]">{hit.process_name} (PID:{hit.process_id})</code></span>
                  {hit.session_id && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-[#FDE047]">{hit.session_id}</span>
                    </>
                  )}
                </div>
              </div>

              <AlertBadge severity="CRITICAL" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
