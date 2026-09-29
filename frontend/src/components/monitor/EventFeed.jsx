import React, { useState } from 'react';
import { AlertBadge } from '../common/AlertBadge';
import { Filter, Trash2, Activity } from 'lucide-react';
import { formatISTTime } from '../../utils/time';

export function EventFeed({ events, onClear }) {
  const [filter, setFilter] = useState('ALL');

  const filtered = (events || []).filter((e) => {
    if (filter === 'ALL') return true;
    if (filter === 'CRITICAL') return e.severity === 'CRITICAL' || e.severity === 'HIGH';
    return e.source === filter;
  });

  return (
    <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] overflow-hidden flex flex-col h-[680px] shadow-2xl">
      <div className="p-4 px-6 border-b border-white/[0.06] flex items-center justify-between bg-[#0F0F0F]">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-[#FDE047]" />
          <span className="text-xs font-bold text-white uppercase tracking-wide">Raw Telemetry Feed</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-neutral-400 border border-white/[0.08]">
            {filtered.length} events
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs bg-[#1A1A1A] border border-white/[0.1] rounded-full px-3 py-1.5 text-neutral-300 focus:outline-none focus:border-[#FDE047] font-sans"
          >
            <option value="ALL">All Subsystems</option>
            <option value="CRITICAL">High/Critical Only</option>
            <option value="USB">USB Subsystem</option>
            <option value="KEYSTROKE">Keystroke Subsystem</option>
            <option value="PROCESS">Process Subsystem</option>
            <option value="CANARY_DECEPTION">Deception Layer</option>
          </select>
          {onClear && (
            <button
              onClick={onClear}
              title="Clear feed"
              className="p-1.5 text-neutral-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] font-mono text-xs">
        {filtered.length === 0 ? (
          <div className="p-16 text-center text-neutral-500">
            No telemetry events match current filter.
          </div>
        ) : (
          filtered.map((evt, idx) => (
            <div key={evt.event_id || idx} className="p-3.5 px-6 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500 text-[11px] font-mono">{formatISTTime(evt.timestamp, { withMs: false, withSuffix: true })}</span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] bg-neutral-900 text-neutral-300 border border-white/[0.08] font-bold">
                    {evt.source}
                  </span>
                </div>
                <AlertBadge severity={evt.severity} />
              </div>
              <p className="text-white font-medium font-sans text-xs">{evt.event_type}</p>
              {evt.details && (
                <pre className="text-[11px] text-neutral-400 mt-1 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {typeof evt.details === 'object' ? JSON.stringify(evt.details, null, 2) : evt.details}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
