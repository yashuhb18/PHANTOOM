import React from 'react';
import { EventFeed } from '../components/monitor/EventFeed';
import { NarratorPanel } from '../components/monitor/NarratorPanel';
import { useWebSocket } from '../hooks/useWebSocket';
import { Activity, ShieldAlert, Zap, Radio, Trash2 } from 'lucide-react';

export function LiveMonitor() {
  const { liveEvents, narratorMessages, clearEvents, clearNarrator, isLiveConnected, isNarratorConnected } = useWebSocket();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Threat Hunting HUD Banner */}
      <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-white shrink-0 shadow-lg shadow-black/40">
            <Activity className="w-6 h-6 text-sky-400 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-sm font-bold text-white tracking-tight uppercase">
                Autonomous Threat Hunting & AI Commentary Console
              </h2>
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                HARDWARE LISTENER ACTIVE
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/[0.06] text-neutral-300 border border-white/[0.12]">
                <Radio className="w-3 h-3 text-sky-400 animate-pulse" />
                LOCAL AI: DEEPSEEK-R1 CYBER
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Observing physical USB insertions, hardware descriptors, keystroke bursts, process spawns, and canary traps in real time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              clearEvents();
              if (clearNarrator) clearNarrator();
            }}
            className="px-4 py-2 rounded-full text-xs font-semibold text-neutral-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Feeds</span>
          </button>
        </div>
      </div>

      {/* Split Screen Telemetry & AI Forensic Narrator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EventFeed events={liveEvents} onClear={clearEvents} />
        <NarratorPanel messages={narratorMessages} />
      </div>
    </div>
  );
}
