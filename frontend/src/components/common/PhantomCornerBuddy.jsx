import React, { useState, useEffect } from 'react';
import { ChevronRight, X } from 'lucide-react';

const TAB_EXPLANATIONS = {
  dashboard: [
    "Guarding USB ports in real-time. Sub-second reflex active.",
    "BadUSB defense: Synthesized keystroke bursts are blocked instantly.",
    "Canary decoys armed: Credential honeypots catch intruders with 0% false positives.",
    "Attack DNA: Identifying repeat threat actors across different USB drives."
  ],
  siem: [
    "SIEM Hunt Board: Live streaming security events and MITRE ATT&CK matrix.",
    "Query raw hardware logs and inspect cryptographic hashes in real-time."
  ],
  ports: [
    "Hardware & Ports: Live USB topology and root hub bus audit.",
    "Inspect connected flash storage, mount points, and device descriptors."
  ],
  footprints: [
    "USB Footprints: Auditing file reads, writes, and potential exfiltration trails."
  ],
  live: [
    "Live Threat Monitor: Continuous keystroke speed tracking & AI narrator."
  ],
  analytics: [
    "Threat Analytics: Visual attack graphs and behavioral correlation."
  ],
  sessions: [
    "Session Forensics: Time-travel replay of USB connection lifecycles."
  ],
  'threat-intel': [
    "Attack DNA: Matching persistent threat actors with 82.4% accuracy."
  ],
  deception: [
    "Deception Traps: Canary decoys active with 0% false-positive tripwires."
  ],
  alerts: [
    "Autonomous Containment: Micro-isolated sockets and killed processes."
  ],
  reports: [
    "Incident Reports: Boardroom-ready cryptographic audit dossiers."
  ],
  settings: [
    "Hardware Settings: Zero-trust policies and kernel watchdog parameters."
  ]
};

export function PhantomCornerBuddy({ currentTab, onOpenCopilot, isCopilotOpen }) {
  const [subIndex, setSubIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  // Whenever tab changes, reset subIndex to 0 and trigger text animation
  useEffect(() => {
    setSubIndex(0);
  }, [currentTab]);

  const explanations = TAB_EXPLANATIONS[currentTab] || TAB_EXPLANATIONS.dashboard;
  const currentText = explanations[subIndex % explanations.length];

  const handleNext = (e) => {
    e.stopPropagation();
    setSubIndex((prev) => (prev + 1) % explanations.length);
  };

  return (
    <aside
      aria-label="PHANTOM AI Assistant and Status"
      className="fixed bottom-6 right-6 z-40 flex items-center group pointer-events-auto font-sans"
    >
      {/* ── Left: Very Small Text Pill (Black BG, White Logo, Animated White Text) ── */}
      {!isDismissed && (
        <div
          onClick={handleNext}
          className="mr-3 flex items-center gap-2.5 bg-black/95 backdrop-blur-xl border border-white/20 rounded-2xl px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.85)] max-w-[260px] sm:max-w-[320px] cursor-pointer hover:border-white/40 transition-all duration-300 select-none"
          title="Click to see next section explanation"
        >
          {/* Small White Logo on Black Background */}
          <div className="w-6 h-6 rounded-full bg-black border border-white/25 flex items-center justify-center shrink-0 shadow-inner">
            <img
              src="/phantom-icon-white.png"
              alt="PHANTOM"
              className="w-3.5 h-3.5 object-contain select-none"
            />
          </div>

          {/* Only White Text on Black Background, with smooth animation between sections */}
          <div className="flex-1 min-w-0 overflow-hidden pr-0.5">
            <p
              key={`${currentTab}-${subIndex}`}
              className="text-white text-[11px] sm:text-xs leading-snug font-normal anim-text-fade"
            >
              {currentText}
            </p>
          </div>

          {/* Subtle next chevron */}
          {explanations.length > 1 && (
            <button
              onClick={handleNext}
              className="p-0.5 text-white/40 hover:text-white transition-colors shrink-0 cursor-pointer"
              title="Next tip"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          )}

          {/* Tiny close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDismissed(true);
            }}
            className="p-0.5 text-white/30 hover:text-white transition-colors shrink-0 cursor-pointer"
            title="Dismiss text"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      )}

      {/* ── Right: Distinct Circular AI Chat Bot Logo Button ────────────── */}
      <button
        onClick={onOpenCopilot}
        aria-label="Toggle PHANTOM AI Chat Bot"
        className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#0D0D0D] border-2 transition-all duration-300 flex items-center justify-center cursor-pointer shadow-2xl ${
          isCopilotOpen
            ? 'border-white/40 scale-95 shadow-black'
            : 'border-[#FDE047] hover:scale-105 hover:shadow-[0_0_25px_rgba(253,224,71,0.35)] shadow-[#FDE047]/20'
        }`}
        title="Open PHANTOM AI Copilot Chat"
      >
        {/* Glow Ring */}
        <span className="absolute -inset-1 rounded-full bg-[#FDE047]/20 blur-sm -z-10 group-hover:opacity-100 transition-opacity" />

        {/* Circular Phantom AI Logo */}
        <img
          src="/phantom-icon-yellow.png"
          alt="PHANTOM AI"
          className="w-7 h-7 sm:w-8 sm:h-8 object-contain select-none transition-transform group-hover:scale-105"
        />

        {/* Live Yellow Status Badge with ping */}
        <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FDE047] opacity-60" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#FDE047] border-2 border-black" />
        </span>
      </button>
    </aside>
  );
}
