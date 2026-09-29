import React from 'react';
import { Activity } from 'lucide-react';
import { AlertBadge } from '../common/AlertBadge';
import { formatISTTime } from '../../utils/time';

export function LiveTicker({ events }) {
  const displayEvents = events?.slice(0, 6) || [];

  return (
    <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] overflow-hidden shadow-2xl">
      <div className="px-6 py-4 border-b border-white/[0.06] bg-[#0F0F0F] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-[#FDE047]" />
          <h3 className="text-xs font-bold text-white tracking-wide uppercase">Live Telemetry</h3>
        </div>
        <span className="text-[10px] font-mono text-neutral-400 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.08]">
          BUFFER ACTIVE
        </span>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {displayEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            Awaiting endpoint telemetry. Run a simulation or attach a device.
          </div>
        ) : (
          displayEvents.map((evt, idx) => (
            <div key={evt.event_id || idx} className="p-3.5 px-6 flex items-center justify-between text-xs hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="text-[11px] font-mono text-neutral-500 shrink-0">
                  {evt.timestamp ? formatISTTime(evt.timestamp, { withSuffix: true }) : '00:00:00'}
                </span>
                <span className="px-2 py-0.5 rounded-full font-mono text-[9px] bg-neutral-900 text-neutral-300 border border-white/[0.08] shrink-0 font-bold">
                  {evt.source}
                </span>
                <span className="font-semibold text-white truncate">{evt.event_type}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {evt.risk_score_delta > 0 && (
                  <span className="text-[10px] font-mono text-red-400 font-bold">
                    +{evt.risk_score_delta}
                  </span>
                )}
                <AlertBadge severity={evt.severity} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
