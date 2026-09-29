import React from 'react';
import { AlertBadge } from '../common/AlertBadge';
import { formatISTTime } from '../../utils/time';

export function Timeline({ events, activeIndex }) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] p-8 text-center text-xs text-neutral-500">
        No timeline events recorded.
      </div>
    );
  }

  return (
    <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] p-6 shadow-2xl">
      <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-5">Event Sequence</h3>
      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/[0.08]">
        {events.map((evt, idx) => {
          const isSelected = activeIndex === undefined || idx <= activeIndex;
          return (
            <div key={evt.event_id || idx} className={`relative transition-opacity ${isSelected ? 'opacity-100' : 'opacity-25'}`}>
              <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 bg-[#141414] ${
                evt.severity === 'CRITICAL' ? 'border-red-500 bg-red-500' : 'border-[#FDE047] bg-[#FDE047]'
              }`} />
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white tracking-tight">{evt.event_type}</span>
                <AlertBadge severity={evt.severity} />
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400">
                <span className="font-mono">{formatISTTime(evt.timestamp, { withSuffix: true })}</span>
                <span>•</span>
                <span>Subsystem: {evt.source}</span>
                {evt.risk_score_delta > 0 && (
                  <span className="text-red-400 font-mono font-bold">+{evt.risk_score_delta} risk</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
