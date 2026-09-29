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

export function PhantomCornerBuddy({ currentTab, onOpenCopilot }) {
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

  if (isDismissed) return null;

  return (
    <div
      onClick={handleNext}
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 bg-black/95 backdrop-blur-xl border border-white/20 rounded-2xl px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.85)] max-w-[280px] sm:max-w-[340px] cursor-pointer hover:border-white/40 transition-all duration-300 group select-none"
      title="Click to see next explanation"
    >
      {/* Small White Logo on Black Background */}
      <div
        onClick={(e) => {
          if (onOpenCopilot) {
            e.stopPropagation();
            onOpenCopilot();
          }
        }}
        className="w-7 h-7 rounded-full bg-black border border-white/25 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform"
        title="Open PHANTOM Copilot"
      >
        <img
          src="/phantom-icon-white.png"
          alt="PHANTOM"
          className="w-4 h-4 object-contain select-none"
        />
      </div>

      {/* Only White Text on Black Background, with smooth animation from one section to another */}
      <div className="flex-1 min-w-0 pr-1 overflow-hidden">
        <p
          key={`${currentTab}-${subIndex}`}
          className="text-white text-[11px] sm:text-xs leading-snug font-normal anim-text-fade"
        >
          {currentText}
        </p>
      </div>

      {/* Subtle next chevron if multiple explanations */}
      {explanations.length > 1 && (
        <button
          onClick={handleNext}
          className="p-1 text-white/40 hover:text-white transition-colors shrink-0 cursor-pointer"
          title="Next tip"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Tiny close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsDismissed(true);
        }}
        className="p-0.5 text-white/30 hover:text-white transition-colors shrink-0 cursor-pointer"
        title="Dismiss"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
