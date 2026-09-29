import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Volume2,
  VolumeX,
  ShieldCheck,
  Zap,
  Terminal,
  Flame,
  Bot,
  CheckCircle2,
  Lock
} from 'lucide-react';

const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    badge: 'WELCOME TO PHANTOM',
    title: "Hey there! I'm PHANTOM 👻",
    tagline: 'Your autonomous hardware bodyguard & SOC companion.',
    speech:
      "Welcome! Most security tools only watch the internet or your software. But what happens if someone plugs a malicious USB drive, a rogue keystroke injector, or an electrical killer into your computer? That's where I take over.",
    icon: Sparkles,
    highlight: 'Physical Zero-Day Defense',
    funFact: 'Did you know? Over 68% of enterprise breaches involve an unmonitored physical peripheral or rogue cable.'
  },
  {
    id: 'reflex',
    badge: 'AUTONOMOUS SENTINEL',
    title: 'The 380ms Reflex Rule ⚡',
    tagline: 'Faster than any human analyst could ever react.',
    speech:
      "The exact millisecond any USB device hits your port, I wake up. I analyze its keystroke burst speed, electrical profile, and firmware DNA. If it's a BadUSB trying to type hidden PowerShell payloads at 800 words per minute, I instantly sever its connection before it can do harm.",
    icon: Zap,
    highlight: 'Sub-Second Containment (<382ms)',
    funFact: 'Standard antiviruses take minutes to detect malicious scripts. PHANTOM isolates hardware in milliseconds.'
  },
  {
    id: 'siem',
    badge: 'MISSION CONTROL',
    title: 'Your SIEM Threat Radar 📡',
    tagline: 'Live event streaming, MITRE matrix, and search.',
    speech:
      "Hop over to the SIEM Hunt Board anytime. It is your live cockpit — think SPLUNK meets hardware threat hunting. You can filter by severity, search raw logs, view MITRE ATT&CK techniques, and all timestamps are synchronized to Indian Standard Time (IST).",
    icon: Terminal,
    highlight: 'Splunk-Style Telemetry & Analysis',
    funFact: 'Every keystroke burst, mount event, and process spawn is cryptographically fingerprinted in real-time.'
  },
  {
    id: 'deception',
    badge: 'DECEPTION GRID',
    title: 'The Honeypot Trapdoor 🍯',
    tagline: 'Catching threat actors before they steal a single file.',
    speech:
      "Here is my favorite stealth trick: I plant invisible decoy canary files (like fake AWS credentials and juicy password sheets) on attached drives. If an attacker's automated script so much as touches them, BAM! Instant alarm, and host quarantine is enforced.",
    icon: Flame,
    highlight: '0% False Positive Canary Deception',
    funFact: 'Attackers cannot resist opening sensitive-looking files. Once opened, their attack chain is blown.'
  },
  {
    id: 'copilot',
    badge: 'CYBER AI COPILOT',
    title: "I'm Always in Your Corner 🦾",
    tagline: 'Powered by local DeepSeek-R1 Cyber Intelligence.',
    speech:
      "Got a suspicious obfuscated script or need forensic incident breakdown? Just click my glowing floating badge in the bottom corner. My local DeepSeek-R1 Copilot runs right on your GPU to answer questions and analyze threat DNA instantly.",
    icon: Bot,
    highlight: 'Local RTX GPU Accelerated AI',
    funFact: 'Your sensitive incident data never leaves your workstation — all AI reasoning stays 100% on-premise.'
  },
  {
    id: 'finish',
    badge: 'YOU ARE READY',
    title: "You're All Set, Threat Hunter! 🎯",
    tagline: 'Your workstation hardware is officially locked down.',
    speech:
      "That's all you need to know to get started! Your USB ports are now armed with autonomous surveillance. Feel free to explore the cockpit, inspect port topologies, or run a simulated test. Let's hunt some threats!",
    icon: ShieldCheck,
    highlight: 'Autonomous Protection Active',
    funFact: 'You can replay this tutorial anytime by clicking the Tour button in the top navigation bar.'
  }
];

export function PhantomWalkthrough({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechSynthRef = useRef(null);

  // Setup Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthRef.current = window.speechSynthesis;
    }
    return () => {
      if (speechSynthRef.current) {
        speechSynthRef.current.cancel();
      }
    };
  }, []);

  // Speak current step text if audio enabled
  useEffect(() => {
    if (!isOpen) {
      if (speechSynthRef.current) speechSynthRef.current.cancel();
      setIsSpeaking(false);
      return;
    }

    if (audioEnabled && speechSynthRef.current) {
      speechSynthRef.current.cancel();
      const step = TUTORIAL_STEPS[currentStep];
      const textToSpeak = `${step.title}. ${step.speech}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Select natural English voice if available
      const voices = speechSynthRef.current.getVoices();
      const friendlyVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
      if (friendlyVoice) utterance.voice = friendlyVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      speechSynthRef.current.speak(utterance);
    } else {
      if (speechSynthRef.current) speechSynthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, [currentStep, audioEnabled, isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleComplete();
      if (e.key === 'ArrowRight' || e.key === 'Enter') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    if (speechSynthRef.current) speechSynthRef.current.cancel();
    try {
      localStorage.setItem('phantom_walkthrough_seen', 'true');
    } catch (e) {}
    onClose();
  };

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-2xl transition-all duration-500 font-sans selection:bg-[#FDE047] selection:text-black">

      {/* Cyber Grid Background Matrix */}
      <div className="absolute inset-0 bg-[radial-gradient(#FDE047_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.06] pointer-events-none" />

      {/* Dialog Box Container */}
      <div className="relative w-full max-w-2xl bg-[#0F0F12] border border-[#FDE047]/30 rounded-[32px] p-6 sm:p-8 shadow-[0_0_60px_rgba(253,224,71,0.15)] flex flex-col items-center text-center overflow-hidden animate-scaleUp">

        {/* Top Controls Bar */}
        <div className="w-full flex items-center justify-between mb-2">
          {/* Audio TTS Voice Toggle */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              audioEnabled
                ? 'bg-[#FDE047]/20 border-[#FDE047] text-[#FDE047]'
                : 'bg-white/[0.04] border-white/[0.1] text-neutral-400 hover:text-white'
            }`}
            title={audioEnabled ? "Mute PHANTOM voice" : "Enable PHANTOM voice reading"}
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{audioEnabled ? 'Voice Aloud: ON' : 'Voice Aloud: OFF'}</span>
          </button>

          {/* Step Pill */}
          <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-[#1A1A1F] border border-white/[0.08] text-neutral-300">
            Step {currentStep + 1} of {TUTORIAL_STEPS.length}
          </span>

          {/* Close Button */}
          <button
            onClick={handleComplete}
            className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] text-neutral-400 hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
            title="Skip Walkthrough"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Glowing Animated Speaking PHANTOM Avatar ────────────────── */}
        <div className="relative my-6 flex flex-col items-center">
          {/* Concentric Aura Rings */}
          <div className="absolute -inset-4 rounded-full bg-[#FDE047]/15 blur-xl animate-pulse -z-10" />
          <div className="absolute -inset-8 rounded-full bg-[#FDE047]/5 blur-2xl -z-20" />

          {/* Circular Talking Emblem */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#17171C] border-2 border-[#FDE047] flex items-center justify-center shadow-[0_0_30px_rgba(253,224,71,0.3)] transition-transform duration-300 hover:scale-105">
            {/* Animated Talking Wave Ring */}
            <span className={`absolute -inset-1.5 rounded-full border-2 border-[#FDE047]/40 ${isSpeaking ? 'animate-ping' : ''}`} />

            {/* Glowing Logo */}
            <img
              src="/phantom-icon-yellow.png"
              alt="PHANTOM AI"
              className={`w-14 h-14 sm:w-16 sm:h-16 object-contain select-none transition-transform duration-300 ${
                isSpeaking ? 'scale-110 drop-shadow-[0_0_12px_rgba(253,224,71,0.8)]' : ''
              }`}
            />
          </div>

          {/* Live Soundwave Audio Visualizer Bars */}
          <div className="flex items-center gap-1 mt-3 h-4">
            <span className={`w-1 bg-[#FDE047] rounded-full transition-all duration-200 ${isSpeaking ? 'h-4 animate-pulse' : 'h-1 opacity-40'}`} />
            <span className={`w-1 bg-[#FDE047] rounded-full transition-all duration-200 delay-75 ${isSpeaking ? 'h-3 animate-pulse' : 'h-1.5 opacity-40'}`} />
            <span className={`w-1 bg-[#FDE047] rounded-full transition-all duration-200 delay-150 ${isSpeaking ? 'h-5 animate-pulse' : 'h-2 opacity-50'}`} />
            <span className={`w-1 bg-[#FDE047] rounded-full transition-all duration-200 delay-75 ${isSpeaking ? 'h-3 animate-pulse' : 'h-1.5 opacity-40'}`} />
            <span className={`w-1 bg-[#FDE047] rounded-full transition-all duration-200 ${isSpeaking ? 'h-4 animate-pulse' : 'h-1 opacity-40'}`} />
          </div>
        </div>

        {/* ── Dialog Content ─────────────────────────────────────────── */}
        <div className="space-y-3 max-w-lg">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDE047]/10 border border-[#FDE047]/25 text-[10px] font-mono font-extrabold text-[#FDE047] uppercase tracking-wider">
            <StepIcon className="w-3 h-3 text-[#FDE047]" />
            <span>{step.badge}</span>
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            {step.title}
          </h2>

          {/* Tagline */}
          <p className="text-xs sm:text-sm font-semibold text-[#FDE047] font-mono">
            {step.tagline}
          </p>

          {/* Friendly Conversational Speech */}
          <p className="text-sm text-neutral-300 leading-relaxed pt-1 font-sans">
            {step.speech}
          </p>

          {/* Highlight Card */}
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between text-left text-xs font-mono">
            <span className="text-neutral-400 text-[11px]">Key Defense Capability:</span>
            <span className="font-bold text-[#FDE047] text-[11px]">{step.highlight}</span>
          </div>

          {/* Fun Fact / Pro Tip */}
          <p className="text-[11px] text-neutral-500 italic pt-1">
            💡 {step.funFact}
          </p>
        </div>

        {/* ── Step Dots Indicator ────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 my-6">
          {TUTORIAL_STEPS.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentStep
                  ? 'w-8 bg-[#FDE047]'
                  : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
              title={`Jump to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* ── Action Buttons Footer ──────────────────────────────────── */}
        <div className="w-full flex items-center justify-between gap-4 pt-4 border-t border-white/[0.08]">
          {/* Back Button */}
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              currentStep === 0
                ? 'opacity-0 pointer-events-none'
                : 'text-neutral-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          {/* Next / Finish Button */}
          <button
            onClick={handleNext}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-7 py-3 rounded-full text-xs font-black uppercase tracking-wider bg-[#FDE047] hover:bg-[#FACC15] text-black shadow-lg shadow-[#FDE047]/20 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>{isLastStep ? 'Enter PHANTOM Console' : 'Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Skip Link */}
          <button
            onClick={handleComplete}
            className="text-xs font-semibold text-neutral-500 hover:text-neutral-300 hover:underline cursor-pointer"
          >
            Skip
          </button>
        </div>

      </div>

    </div>
  );
}
