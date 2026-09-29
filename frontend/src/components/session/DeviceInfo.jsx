import React from 'react';
import { Usb, ShieldAlert } from 'lucide-react';
import { AlertBadge } from '../common/AlertBadge';
import { formatISTFull } from '../../utils/time';

export function DeviceInfo({ session }) {
  if (!session) return null;

  return (
    <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] p-6 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-[#FDE047]">
            <Usb className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">{session.device_name}</h2>
            <p className="text-xs font-mono text-neutral-400 mt-0.5">
              VID:{session.vendor_id} • PID:{session.product_id} • S/N:{session.serial_number || 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-neutral-400 uppercase">RISK SCORE:</span>
          <span className={`text-xl font-bold font-mono ${session.risk_score >= 60 ? 'text-red-400' : 'text-neutral-200'}`}>
            {session.risk_score}/100
          </span>
          <AlertBadge severity={session.risk_score >= 60 ? 'CRITICAL' : session.risk_score >= 30 ? 'HIGH' : 'LOW'} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-white/[0.06] text-xs">
        <div>
          <span className="text-neutral-500 block mb-1 font-mono uppercase text-[10px]">Session ID</span>
          <span className="font-mono font-semibold text-white">{session.session_id}</span>
        </div>
        <div>
          <span className="text-neutral-500 block mb-1 font-mono uppercase text-[10px]">Physical Mount Point</span>
          <span className="font-mono font-semibold text-white">{session.mount_point || 'HID / Virtual CDC'}</span>
        </div>
        <div>
          <span className="text-neutral-500 block mb-1 font-mono uppercase text-[10px]">Insertion Time</span>
          <span className="font-mono font-semibold text-white">{formatISTFull(session.inserted_at)}</span>
        </div>
        <div>
          <span className="text-neutral-500 block mb-1 font-mono uppercase text-[10px]">Session Status</span>
          <span className="font-mono font-bold text-[#FDE047]">{session.status}</span>
        </div>
      </div>
    </div>
  );
}
