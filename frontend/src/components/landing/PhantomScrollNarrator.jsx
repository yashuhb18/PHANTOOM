import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const NARRATOR_SECTIONS = [
  {
    id: 'hero',
    selector: '#hero',
    badge: '01 / WELCOME TO PHANTOM',
    title: "Hey there! I'm PHANTOM 👻",
    text: "I'm your autonomous hardware bodyguard. Traditional antiviruses only inspect software and networks. But what happens if someone plugs a rogue USB or BadUSB into your machine? That's where I take over.",
    voiceText: "Hey there! I'm PHANTOM. I'm your autonomous hardware bodyguard. I watch the physical USB ports where rogue hardware exploits enter your computer."
  },
  {
    id: 'kernel-defense',
    selector: '#kernel-defense',
    badge: '02 / KERNEL ENFORCEMENT',
    title: 'Direct Hardware Bus Audit ⚡',
    text: "I hook straight into Windows SetupAPI and low-level keyboard bus rings. The exact microsecond a device is plugged in, its hardware descriptors are verified against zero-trust policies.",
    voiceText: "I hook directly into low-level keyboard bus rings and hardware APIs. No hardware implant slips past without being fingerprinted."
  },
  {
    id: 'feat-rogue',
    selector: '[data-narrator="feat-rogue"]',
    badge: '03 / ROGUE DEVICE SENTINEL',
    title: 'Instant BadUSB Interception 🛡️',
    text: "Notice that fake keyboard or RubberDucky? The second it connects and tries typing at 800 words per minute, I spot non-human cadence and drop the hammer before a terminal opens.",
    voiceText: "BadUSB tools try typing stealth payloads at 800 words per minute. I spot that non-human typing speed and block it instantly."
  },
  {
    id: 'feat-map',
    selector: '[data-narrator="feat-map"]',
    badge: '04 / ATTACK GRAPH',
    title: 'Live Threat Journey Mapping 🌐',
    text: "I trace the entire journey: from physical USB insertion to process execution trees and network sockets, giving you an interactive, real-time causal graph.",
    voiceText: "I trace every step of the threat: from the physical port plug-in, to the spawned process, to attempted network connections."
  },
  {
    id: 'feat-dna',
    selector: '[data-narrator="feat-dna"]',
    badge: '05 / DNA FINGERPRINTING',
    title: 'Recognizing Repeat Attackers 🧬',
    text: "Attackers often swap physical flash drives to fool traditional antivirus. But their behavioral token sequence is 82.4% consistent — I identify the repeat threat actor across different hardware.",
    voiceText: "Even if an attacker swaps physical USB drives, their behavioral DNA is 82% unique. I recognize the same attacker across different devices."
  },
  {
    id: 'feat-canary',
    selector: '[data-narrator="feat-canary"]',
    badge: '06 / DECEPTION GRID',
    title: 'Zero False Positive Tripwires 🍯',
    text: "I plant invisible canary files like fake AWS credentials and juicy password sheets on drives. The moment an automated script touches them, sirens trigger with 100% certainty.",
    voiceText: "I plant decoy canary files like fake AWS credentials. The moment malware touches them, sirens fire with zero false alarms."
  },
  {
    id: 'feat-isolation',
    selector: '[data-narrator="feat-isolation"]',
    badge: '07 / AUTONOMOUS KILL',
    title: 'The 380ms Reflex Rule ⚡',
    text: "No waiting for a human SOC analyst. In under 382 milliseconds, the rogue device's TCP socket and USB bus are completely severed — neutralizing the threat instantly.",
    voiceText: "No waiting for human analysts. In under 382 milliseconds, the rogue device's network connection and USB port are severed."
  },
  {
    id: 'feat-reports',
    selector: '[data-narrator="feat-reports"]',
    badge: '08 / FORENSIC AUDITING',
    title: 'Boardroom-Ready Reports 📄',
    text: "Generate cryptographic incident dossiers with exact MITRE ATT&CK mappings and second-by-second forensic timelines with a single click.",
    voiceText: "You can download cryptographic incident dossiers with exact MITRE ATT&CK mappings and second-by-second forensic timelines."
  },
  {
    id: 'edr-blindspot',
    selector: '#edr-blindspot',
    badge: '09 / THE EDR BLIND SPOT',
    title: 'Why Traditional EDR Fails Here ⚠️',
    text: "Conventional tools like Defender and CrowdStrike assume all USB keystrokes are human. I analyze microsecond jitter to catch synthetic keystroke injection before damage occurs.",
    voiceText: "Traditional antivirus assumes all keyboard input is an authorized human. PHANTOM solves this physical zero-day blind spot."
  },
  {
    id: 'simulator',
    selector: '#demo',
    badge: '10 / LIVE TELEMETRY STREAM',
    title: 'Watch Autonomous Defense in Real-Time 💻',
    text: "Watch this live kernel log feed: from USB bus enumeration to socket severance took only 380ms — autonomous containment without waiting on humans.",
    voiceText: "Watch this live telemetry stream. From USB enumeration to socket severance took only 380 milliseconds."
  },
  {
    id: 'benchmarks',
    selector: '#benchmarks',
    badge: '11 / PROVEN METRICS',
    title: 'Sub-382ms Speed & 0% False Positives 📊',
    text: "Tested and verified: under 382ms median isolation time, zero false positives on canary decoys, and 100% autonomous execution without human fatigue.",
    voiceText: "Under 382 milliseconds median isolation time, zero false positives on canaries, and 100% autonomous execution."
  },
  {
    id: 'cta',
    selector: '#cta',
    badge: '12 / READY TO ROLL',
    title: "Let's Lock Down Your Workstation 🎯",
    text: "Your USB ports can be armed with autonomous surveillance right now. Click Get Started to enter the console. I've got your back!",
    voiceText: "Ready to lock down your ports? Click Get Started to enter the console. I've got your back!"
  }
];

export function PhantomScrollNarrator({ onGetStarted, isAuthenticated, onLaunchConsole }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const speechSynthRef = useRef(null);
  const prevIndexRef = useRef(0);

  // Setup Web Speech API for voice-aloud
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthRef.current = window.speechSynthesis;
    }
    return () => {
      if (speechSynthRef.current) speechSynthRef.current.cancel();
    };
  }, []);

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const viewportCenter = window.innerHeight * 0.45;
      let closestIdx = 0;
      let minDistance = Infinity;

      NARRATOR_SECTIONS.forEach((item, index) => {
        const el = document.querySelector(item.selector);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        
        // Element is currently visible around viewport center
        if (rect.top <= viewportCenter && rect.bottom >= viewportCenter) {
          closestIdx = index;
          minDistance = 0;
        } else {
          // Distance from viewport center to closest edge of element
          const distance = Math.min(
            Math.abs(rect.top - viewportCenter),
            Math.abs(rect.bottom - viewportCenter)
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestIdx = index;
          }
        }
      });

      if (closestIdx !== currentIndex) {
        setCurrentIndex(closestIdx);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount to find current section
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentIndex]);

  // Handle Speech reading when index changes & audio is enabled
  useEffect(() => {
    if (!speechSynthRef.current) return;

    if (audioEnabled) {
      speechSynthRef.current.cancel();
      const current = NARRATOR_SECTIONS[currentIndex];
      const textToSpeak = current.voiceText || current.text;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Select friendly English voice
      const voices = speechSynthRef.current.getVoices();
      const friendlyVoice = voices.find(
        v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
      );
      if (friendlyVoice) utterance.voice = friendlyVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      speechSynthRef.current.speak(utterance);
    } else {
      speechSynthRef.current.cancel();
      setIsSpeaking(false);
    }
    prevIndexRef.current = currentIndex;
  }, [currentIndex, audioEnabled]);

  // Jump to specific section on click
  const scrollToSection = (index) => {
    const safeIdx = Math.max(0, Math.min(index, NARRATOR_SECTIONS.length - 1));
    const target = NARRATOR_SECTIONS[safeIdx];
    const el = document.querySelector(target.selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setCurrentIndex(safeIdx);
    }
  };

  const current = NARRATOR_SECTIONS[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === NARRATOR_SECTIONS.length - 1;

  return (
    <aside
      aria-label="PHANTOM Companion Walkthrough"
      className="fixed bottom-4 sm:bottom-6 inset-x-0 z-40 flex justify-center px-3 sm:px-6 pointer-events-none font-sans"
    >
      <div
        className={`pointer-events-auto w-full max-w-3xl transition-all duration-300 ease-out ${
          isCollapsed
            ? 'bg-black/95 backdrop-blur-2xl border border-white/20 rounded-full py-2 px-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex items-center justify-between'
            : 'bg-black/95 backdrop-blur-2xl border border-white/20 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-[0_16px_50px_rgba(0,0,0,0.9)] flex flex-col gap-3'
        }`}
      >
        {/* ── Top Bar / Header Row ──────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 w-full">
          {/* Left: Small White Logo on Black Background */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black border border-white/25 flex items-center justify-center shrink-0 shadow-md">
              {/* Subtle talking pulse ring */}
              <span
                className={`absolute -inset-1 rounded-full border border-white/20 ${
                  isSpeaking ? 'animate-ping opacity-60' : 'animate-pulse opacity-20'
                }`}
              />

              {/* White PHANTOM Logo */}
              <img
                src="/phantom-icon-white.png"
                alt="PHANTOM"
                className={`w-5 h-5 sm:w-6 sm:h-6 object-contain select-none transition-transform duration-200 ${
                  isSpeaking ? 'scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]' : ''
                }`}
              />
            </div>

            {/* Speaking visualizer soundwave bars */}
            <div className="flex items-center gap-0.5 sm:gap-1 h-3.5" title={isSpeaking ? "Speaking" : "Active"}>
              <span className={`w-0.5 sm:w-1 bg-white rounded-full transition-all duration-150 ${isSpeaking ? 'h-3.5 animate-pulse' : 'h-1.5 opacity-40'}`} />
              <span className={`w-0.5 sm:w-1 bg-white rounded-full transition-all duration-150 delay-75 ${isSpeaking ? 'h-2.5 animate-pulse' : 'h-1 opacity-40'}`} />
              <span className={`w-0.5 sm:w-1 bg-white rounded-full transition-all duration-150 delay-150 ${isSpeaking ? 'h-4 animate-pulse' : 'h-2 opacity-50'}`} />
              <span className={`w-0.5 sm:w-1 bg-white rounded-full transition-all duration-150 delay-75 ${isSpeaking ? 'h-2.5 animate-pulse' : 'h-1 opacity-40'}`} />
              <span className={`w-0.5 sm:w-1 bg-white rounded-full transition-all duration-150 ${isSpeaking ? 'h-3.5 animate-pulse' : 'h-1.5 opacity-40'}`} />
            </div>

            {/* Section Tag in Collapsed Mode */}
            {isCollapsed && (
              <span className="text-white text-xs font-bold truncate max-w-[180px] sm:max-w-xs">
                {current.title}
              </span>
            )}
          </div>

          {/* Right Controls: Voice Toggle, Step Dots, Prev/Next, Minimize */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Voice Toggle */}
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                audioEnabled
                  ? 'bg-white text-black border-white shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                  : 'bg-black/60 text-white/70 border-white/15 hover:text-white hover:border-white/30'
              }`}
              title={audioEnabled ? "Mute Voice" : "Listen to PHANTOM explain aloud"}
            >
              {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline text-[11px] font-mono">
                {audioEnabled ? 'Voice ON' : 'Voice OFF'}
              </span>
            </button>

            {/* Step Counter Badge */}
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/10 select-none">
              {currentIndex + 1}/{NARRATOR_SECTIONS.length}
            </span>

            {/* Previous Section */}
            <button
              onClick={() => scrollToSection(currentIndex - 1)}
              disabled={isFirst}
              className={`p-1 rounded-full border transition-all cursor-pointer ${
                isFirst
                  ? 'text-white/20 border-white/5 cursor-not-allowed'
                  : 'text-white/80 border-white/15 hover:text-white hover:bg-white/10'
              }`}
              title="Previous feature"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Next Section */}
            <button
              onClick={() => scrollToSection(currentIndex + 1)}
              disabled={isLast}
              className={`p-1 rounded-full border transition-all cursor-pointer ${
                isLast
                  ? 'text-white/20 border-white/5 cursor-not-allowed'
                  : 'text-white/80 border-white/15 hover:text-white hover:bg-white/10'
              }`}
              title="Next feature"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Collapse / Expand Toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-full text-white/60 hover:text-white border border-white/15 hover:bg-white/10 transition-colors cursor-pointer"
              title={isCollapsed ? "Expand Explanation" : "Minimize Companion"}
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ── Expanded Content Area: White text with Black Background ── */}
        {!isCollapsed && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1 border-t border-white/10">
            <div className="flex-1 space-y-1 pr-2">
              {/* Badge & Title */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/60">
                  {current.badge}
                </span>
                <span className="text-white/30">•</span>
                <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  {current.title}
                </h4>
              </div>

              {/* Friendly Explanation in Crisp White Text */}
              <p className="text-xs sm:text-[13px] text-white/90 leading-relaxed font-normal">
                {current.text}
              </p>
            </div>

            {/* Quick Action Pill on the right */}
            {isLast && (
              <button
                onClick={isAuthenticated ? onLaunchConsole : onGetStarted}
                className="shrink-0 px-4 py-2 rounded-full bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-all shadow-md flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
              >
                <span>{isAuthenticated ? 'Open Console' : 'Get Started'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
