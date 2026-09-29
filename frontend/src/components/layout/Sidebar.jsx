import React from 'react';
import {
  LayoutDashboard,
  Activity,
  GitCommit,
  Dna,
  ShieldAlert,
  Flame,
  FileText,
  Settings,
  LogOut,
  ShieldCheck,
  Usb,
  ArrowUpRight,
  BarChart3,
  Fingerprint,
  Terminal,
  Camera
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export function Sidebar({ currentTab, setTab, onOpenCopilot }) {
  const { logout, user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scanner', label: 'AI Hardware Scanner', icon: Camera, badge: 'VISION' },
    { id: 'siem', label: 'SIEM Hunt Board', icon: Terminal, badge: 'SPLUNK' },
    { id: 'ports', label: 'Hardware & Ports', icon: Usb, badge: 'PORTS' },
    { id: 'footprints', label: 'USB Footprints', icon: Fingerprint, badge: 'FILES' },
    { id: 'live', label: 'Live Monitor', icon: Activity, badge: 'LIVE' },
    { id: 'analytics', label: 'Threat Analytics', icon: BarChart3, badge: 'GRAPH' },
    { id: 'sessions', label: 'Session Detail', icon: GitCommit },
    { id: 'threat-intel', label: 'Threat Intel & DNA', icon: Dna },
    { id: 'deception', label: 'Deception Traps', icon: Flame },
    { id: 'alerts', label: 'Alerts & Actions', icon: ShieldAlert },
    { id: 'reports', label: 'Incident Reports', icon: FileText },
    { id: 'settings', label: 'Hardware Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0A0A0A] border-r border-white/[0.08] flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
      <div>
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <img
              src="/phantom-logo-white.png"
              alt="PHANTOM"
              className="h-6 w-auto object-contain select-none"
            />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FDE047] text-black">
            v1.0
          </span>
        </div>

        {/* Product Website Quick Jump */}
        <div className="p-3 space-y-2">
          <button
            onClick={() => setTab('landing')}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-bold bg-[#FDE047]/10 hover:bg-[#FDE047]/20 text-[#FDE047] border border-[#FDE047]/30 transition-all cursor-pointer group"
          >
            <span>Product Website</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>

          <button
            onClick={onOpenCopilot}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs font-bold bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.1] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FDE047] animate-pulse" />
              <span>SecOps Copilot</span>
            </div>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#FDE047] text-black font-extrabold">
              AI
            </span>
          </button>
        </div>


        {/* Navigation */}
        <nav className="px-3 py-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-[#FDE047] text-black shadow-lg shadow-[#FDE047]/10'
                    : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-black' : 'text-neutral-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-extrabold ${
                    active ? 'bg-black text-[#FDE047]' : 'bg-[#FDE047] text-black'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile */}
      <div className="p-4 border-t border-white/[0.08]">
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#141414] border border-white/[0.06]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-[#FDE047] text-black flex items-center justify-center font-black text-xs shrink-0">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user?.username || 'SecOps Lead'}</p>
              <p className="text-[10px] text-neutral-400 truncate">{user?.role || 'Autonomous Enforcement'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-neutral-400 hover:text-white transition-colors rounded-full hover:bg-white/10 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
