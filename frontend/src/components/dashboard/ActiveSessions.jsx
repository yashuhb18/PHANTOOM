import React from 'react';
import { Usb, ArrowRight } from 'lucide-react';
import { AlertBadge } from '../common/AlertBadge';
import { formatISTTime } from '../../utils/time';

export function ActiveSessions({ sessions, onSelectSession }) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] p-8 text-center text-neutral-400">
        <Usb className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
        <p className="text-xs">No active USB peripheral sessions registered.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] overflow-hidden shadow-2xl">
      <div className="px-6 py-4 border-b border-white/[0.06] bg-[#0F0F0F] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Usb className="w-4 h-4 text-[#FDE047]" />
          <h3 className="text-xs font-bold text-white tracking-wide uppercase">Monitored USB Sessions</h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-neutral-300 border border-white/[0.08]">
          {sessions.length} ACTIVE
        </span>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {sessions.map((sess) => {
          const isCritical = sess.risk_score >= 60;
          return (
            <div
              key={sess.session_id}
              onClick={() => onSelectSession && onSelectSession(sess.session_id)}
              className="p-4 px-6 hover:bg-white/[0.02] transition-colors cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                  isCritical
                    ? 'bg-red-500/10 border-red-500/25 text-red-400'
                    : 'bg-neutral-900 border-white/[0.06] text-neutral-300'
                }`}>
                  <Usb className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white tracking-tight">{sess.device_name}</span>
                    <span className="text-[10px] font-mono text-neutral-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                      VID:{sess.vendor_id} PID:{sess.product_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400">
                    <span className="font-mono text-neutral-500">{sess.session_id}</span>
                    <span>•</span>
                    <span className="font-mono">{formatISTTime(sess.inserted_at, { withSuffix: true })}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className={`text-xs font-mono font-bold ${isCritical ? 'text-red-400' : 'text-neutral-300'}`}>
                      {sess.risk_score}/100
                    </span>
                    <AlertBadge severity={isCritical ? 'CRITICAL' : sess.risk_score >= 30 ? 'HIGH' : 'LOW'} />
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {sess.event_count || 0} events recorded
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/[0.04] group-hover:bg-[#FDE047] text-neutral-400 group-hover:text-black flex items-center justify-center transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
