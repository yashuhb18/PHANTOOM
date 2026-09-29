import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Terminal,
  ArrowRight,
  Activity,
  Dna,
  Flame,
  Lock,
  Zap,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Cpu,
  Layers,
  Radio,
  Clock,
  Sparkles,
  FileText,
  AlertTriangle,
  Download,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Check,
  TrendingUp,
  Shield,
  ArrowUpRight,
  Globe
} from 'lucide-react';
import { UsbPhantomAssembly } from '../components/landing/UsbPhantomAssembly';
import { PhantomFloatingLogo } from '../components/ai/PhantomFloatingLogo';
import { SecOpsCopilotDrawer } from '../components/ai/SecOpsCopilotDrawer';
import { useAuth } from '../hooks/useAuth';

// Smooth Scroll-Reveal Wrapper using IntersectionObserver
function Reveal({ children, delay = 0, className = "" }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out transform ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function LandingPage({ onLaunchConsole, onOpenLogin, onOpenRegister }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [terminalStep, setTerminalStep] = useState(0);
  const [isTerminalPlaying, setIsTerminalPlaying] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const terminalLogs = [
    { t: "00:00.12", lvl: "INFO", src: "RAW-USB", msg: "USB Bus Enumeration: VID_0483&PID_5740 (Class 03: HID Keyboard)" },
    { t: "00:00.24", lvl: "WARN", src: "KBD-HOOK", msg: "Keystroke burst: 84 WPM -> 760 WPM (Jitter: 0.4ms). Synthetic injection flagged." },
    { t: "00:00.48", lvl: "WARN", src: "PROC-MON", msg: "Process spawned: powershell.exe -NoP -NonI -W Hidden -Enc SUVY..." },
    { t: "00:01.02", lvl: "CRIT", src: "CANARY", msg: "DECEPTION TRIPWIRE BREACH: Unauthorized access to .aws/credentials.canary" },
    { t: "00:01.18", lvl: "KILL", src: "CONTAIN", msg: "AUTONOMOUS ISOLATION TRIGGERED: Outbound TCP socket severed. Host micro-isolated." },
    { t: "00:01.32", lvl: "INFO", src: "DNA-ENG", msg: "Attack DNA synthesized: #e93b12. Match: 82.4% with known Actor 'APT-COVERT-PERIPHERAL'" }
  ];

  useEffect(() => {
    if (!isTerminalPlaying) return;
    const interval = setInterval(() => {
      setTerminalStep((prev) => (prev + 1) % terminalLogs.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [isTerminalPlaying, terminalLogs.length]);

  const copyTelemetry = () => {
    const text = terminalLogs.map(l => `[${l.t}] [${l.src}] ${l.msg}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans selection:bg-[#FDE047] selection:text-black">
      
      {/* Floating Glassmorphic Navigation Capsule */}
      <header className="fixed top-3 sm:top-5 inset-x-0 z-50 flex justify-center px-4 sm:px-6 pointer-events-none anim-nav">
        <div
          className={`pointer-events-auto w-full max-w-7xl transition-all duration-500 rounded-full flex items-center justify-between px-6 sm:px-8 py-2.5 sm:py-3 ${
            isScrolled
              ? 'bg-[#0A0A0A]/85 backdrop-blur-2xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.7)] text-white'
              : 'bg-black/5 hover:bg-black/10 backdrop-blur-xl border border-black/10 text-black shadow-md'
          }`}
        >
          <a href="#" className="flex items-center gap-2 cursor-pointer group">
            <img
              src={isScrolled ? "/phantom-logo-white.png" : "/phantom-logo.png"}
              alt="PHANTOM"
              className="h-8 sm:h-9 md:h-10 w-auto object-contain transition-all duration-300 group-hover:scale-105 select-none"
            />
          </a>

          <nav className={`hidden md:flex items-center gap-7 text-xs sm:text-sm font-semibold transition-colors ${
            isScrolled ? 'text-neutral-300' : 'text-black/80'
          }`}>
            <a href="#features" className={`transition-colors ${isScrolled ? 'hover:text-[#FDE047]' : 'hover:text-black'}`}>Features</a>
            <a href="#architecture" className={`transition-colors ${isScrolled ? 'hover:text-[#FDE047]' : 'hover:text-black'}`}>Architecture</a>
            <a href="#attack-dna" className={`transition-colors ${isScrolled ? 'hover:text-[#FDE047]' : 'hover:text-black'}`}>Attack DNA</a>
            <a href="#benchmarks" className={`transition-colors ${isScrolled ? 'hover:text-[#FDE047]' : 'hover:text-black'}`}>Benchmarks</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCopilotOpen(true)}
              className={`font-semibold text-xs sm:text-sm px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-full border transition-all duration-300 hover:scale-105 flex items-center gap-2 cursor-pointer shadow-sm ${
                isScrolled
                  ? 'bg-white/10 hover:bg-white/15 text-[#FDE047] border-[#FDE047]/30'
                  : 'bg-black/5 hover:bg-black/10 text-black border-black/15'
              }`}
              title="Open PHANTOM SecOps Copilot"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FDE047]" />
              <span className="hidden sm:inline">Copilot</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-[#FDE047] text-black font-extrabold">
                AI
              </span>
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onLaunchConsole}
                  className={`font-bold text-xs sm:text-sm px-4 sm:px-5 py-1.5 sm:py-2 rounded-full pill-button shadow-md flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 ${
                    isScrolled
                      ? 'bg-[#FDE047] hover:bg-[#FACC15] text-black shadow-[0_0_15px_rgba(253,224,71,0.3)]'
                      : 'bg-black hover:bg-neutral-900 text-white'
                  }`}
                >
                  <span>Open Console</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={logout}
                  className={`text-xs font-semibold px-2.5 py-1.5 rounded-full transition-all cursor-pointer ${
                    isScrolled ? 'text-neutral-400 hover:text-white' : 'text-black/60 hover:text-black'
                  }`}
                  title="Sign Out"
                >
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className={`font-bold text-xs sm:text-sm px-4 sm:px-5 py-1.5 sm:py-2 rounded-full pill-button shadow-md flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 ${
                  isScrolled
                    ? 'bg-[#FDE047] hover:bg-[#FACC15] text-black shadow-[0_0_15px_rgba(253,224,71,0.3)]'
                    : 'bg-black hover:bg-neutral-900 text-white'
                }`}
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          SECTION 1: THE HERO SECTION (Cyber Yellow #FDE047)
          Balanced symmetrical curvature at bottom
          ========================================================================= */}
      <section id="hero" className="bg-[#FDE047] text-black relative z-10 rounded-b-[60px] md:rounded-b-[80px] pb-24 md:pb-36 pt-24 sm:pt-28 md:pt-32 px-6 md:px-12 shadow-2xl overflow-hidden">

        {/* Hero Body: 2 Columns */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Massive Headline & Value Proposition */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/10 border border-black/10 text-black text-xs font-bold uppercase tracking-wider mb-6 anim-badge">
              <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
              <span>NEXT GEN HARDWARE DEFENSE</span>
            </div>

            {/* Bold Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-6xl font-black text-black tracking-tight leading-[0.95] mb-6 anim-title">
              TRUST NOTHING.<br />
              PLUG ANYTHING.
            </h1>

            {/* Sub-header */}
            <p className="text-sm sm:text-base md:text-lg text-black/85 font-medium leading-relaxed max-w-xl mb-10 anim-desc">
              PHANTOM automatically detects and neutralizes USB-based threats the
              moment a device is plugged in — no manual intervention needed.
              From rogue keyboards to data-stealing implants, every attack is
              identified, isolated, and reported in under a second.
            </p>

            {/* Pill CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 mb-12 anim-buttons">
              <button
                onClick={isAuthenticated ? onLaunchConsole : onOpenLogin}
                className="bg-black hover:bg-neutral-900 text-white font-bold text-base px-8 py-4 rounded-full pill-button shadow-xl flex items-center gap-2.5 cursor-pointer"
              >
                <span>{isAuthenticated ? 'Open Console' : 'Get Started'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <a
                href="#demo"
                className="bg-transparent hover:bg-black/5 text-black font-bold text-base px-8 py-4 rounded-full border-2 border-black/20 hover:border-black/40 pill-button transition-all inline-flex items-center gap-2"
              >
                <span>View Demo</span>
              </a>
            </div>

            {/* Trust Badges & Avatars */}
            <div className="flex items-center gap-4 pt-2 border-t border-black/10 w-full max-w-md anim-trust">
              <div className="flex -space-x-2">
                <div className="w-10 h-10 rounded-full bg-black text-[#FDE047] font-bold text-xs flex items-center justify-center ring-2 ring-[#FDE047]">
                  CISO
                </div>
                <div className="w-10 h-10 rounded-full bg-neutral-900 text-white font-bold text-xs flex items-center justify-center ring-2 ring-[#FDE047]">
                  SOC
                </div>
                <div className="w-10 h-10 rounded-full bg-neutral-800 text-white font-bold text-xs flex items-center justify-center ring-2 ring-[#FDE047]">
                  EDR
                </div>
              </div>
              <div>
                <span className="text-sm font-black text-black block leading-none">2M+ Devices Protected</span>
                <span className="text-xs font-semibold text-black/70">82.4% Attack DNA Match • 0% FP</span>
              </div>
            </div>

          </div>

          {/* Right Column: Dynamic 20x USB Sentinel PHANTOM Assembly */}
          <div className="lg:col-span-5 relative flex justify-center lg:justify-end anim-card">
            <UsbPhantomAssembly />
          </div>

        </div>

      </section>


      {/* =========================================================================
          SECTION 2: THE DARK VOID (Deep Onyx #0A0A0A)
          Matching Screenshot 2: Features, Massive Headline, Charcoal Rounded Cards
          ========================================================================= */}
      <section id="features" className="bg-[#0A0A0A] py-24 md:py-36 px-6 md:px-12 relative">
        
        {/* Tech Stack Horizontal Moving Marquee */}
        <div id="kernel-defense" className="max-w-7xl mx-auto mb-20 pb-12 border-b border-white/[0.06]">
          <span className="text-xs font-mono text-neutral-500 uppercase tracking-widest block text-center mb-8">
            ENTERPRISE KERNEL DEFENSE INFRASTRUCTURE
          </span>

          {/* Horizontal Moving Marquee Container */}
          <div className="relative overflow-hidden w-full py-2">
            {/* Left Fade Mask */}
            <div className="absolute left-0 inset-y-0 w-16 sm:w-28 md:w-36 bg-gradient-to-r from-[#0A0A0A] to-transparent z-10 pointer-events-none" />
            {/* Right Fade Mask */}
            <div className="absolute right-0 inset-y-0 w-16 sm:w-28 md:w-36 bg-gradient-to-l from-[#0A0A0A] to-transparent z-10 pointer-events-none" />

            {/* Continuous Horizontal Ticker */}
            <div className="animate-marquee-horizontal flex items-center select-none">
              {[
                "KERNEL-HOOK (WH_KEYBOARD_LL)",
                "RAW-USB (SETUPAPI)",
                "NETWORKX CAUSAL-DAG",
                "JACCARD-DNA MATRIX",
                "CANARY KERNEL-WATCHDOG",
                "AUTONOMOUS MICRO-ISOLATION",
                "KERNEL-HOOK (WH_KEYBOARD_LL)",
                "RAW-USB (SETUPAPI)",
                "NETWORKX CAUSAL-DAG",
                "JACCARD-DNA MATRIX",
                "CANARY KERNEL-WATCHDOG",
                "AUTONOMOUS MICRO-ISOLATION"
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center mx-6 sm:mx-8 md:mx-10 font-mono text-base sm:text-lg md:text-xl font-bold uppercase tracking-[0.2em] text-neutral-400 hover:text-[#FDE047] transition-colors duration-200 cursor-default whitespace-nowrap"
                >
                  <span>{item}</span>
                  <span className="ml-12 md:ml-16 text-neutral-700 font-light select-none">/</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section Header (Matching Screenshot 2) */}
        <div className="max-w-7xl mx-auto mb-16">
          <Reveal>
            <span className="text-[#FDE047] font-bold text-xs md:text-sm tracking-widest uppercase mb-4 block">
              FEATURES
            </span>
            <h2 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white tracking-tight leading-[1.05] max-w-3xl">
              Everything you need.<br />
              Nothing you don't.
            </h2>
          </Reveal>
        </div>

        {/* Features Card Grid (Matching Screenshot 2: Large Rounded Charcoal Cards with Yellow Icons) */}
        {/* Features Card Grid */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          
          {/* Feature 1 */}
          <Reveal delay={100}>
            <div data-narrator="feat-rogue" className="bg-[#141414] hover:bg-[#FDE047] border border-white/[0.06] hover:border-[#FDE047] p-6 sm:p-7 rounded-[24px] relative group transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_16px_36px_rgba(253,224,71,0.22)] h-full flex flex-col justify-between cursor-pointer">
              <div>
                <div className="w-11 h-11 rounded-xl bg-neutral-900 border border-white/[0.08] text-[#FDE047] group-hover:bg-black group-hover:text-[#FDE047] flex items-center justify-center mb-4 transition-colors shadow-sm">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-black mb-2.5 tracking-tight transition-colors">
                  Instant Rogue Device Detection
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 group-hover:text-black/85 leading-relaxed transition-colors">
                  Catches fake keyboards, RubberDuckies, and rogue USB injectors the millisecond they plug in — stopping hardware attacks before any malicious code can execute.
                </p>
              </div>
              <div className="mt-6 flex justify-end">
                <div className="w-8 h-8 rounded-full bg-[#FDE047]/10 text-[#FDE047] group-hover:bg-black group-hover:text-[#FDE047] flex items-center justify-center transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Reveal>

          {/* Feature 2 */}
          <Reveal delay={200}>
            <div data-narrator="feat-map" className="bg-[#141414] hover:bg-[#FDE047] border border-white/[0.06] hover:border-[#FDE047] p-6 sm:p-7 rounded-[24px] relative group transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_16px_36px_rgba(253,224,71,0.22)] h-full flex flex-col justify-between cursor-pointer">
              <div>
                <div className="w-11 h-11 rounded-xl bg-neutral-900 border border-white/[0.08] text-[#FDE047] group-hover:bg-black group-hover:text-[#FDE047] flex items-center justify-center mb-4 transition-colors shadow-sm">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-black mb-2.5 tracking-tight transition-colors">
                  Live Visual Attack Map
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 group-hover:text-black/85 leading-relaxed transition-colors">
                  Traces the full journey of a threat from physical USB insertion to network connections and file access, giving you an interactive, real-time visual map.
                </p>
              </div>
              <div className="mt-6 flex justify-end">
                <div className="w-8 h-8 rounded-full bg-[#FDE047]/10 text-[#FDE047] group-hover:bg-black group-hover:text-[#FDE047] flex items-center justify-center transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Reveal>

          {/* Feature 3 */}
          <Reveal delay={300}>
            <div data-narrator="feat-dna" className="bg-[#141414] hover:bg-[#FDE047] border border-white/[0.06] hover:border-[#FDE047] p-6 sm:p-7 rounded-[24px] relative group transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_16px_36px_rgba(253,224,71,0.22)] h-full flex flex-col justify-between cursor-pointer">
              <div>
                <div className="w-11 h-11 rounded-xl bg-neutral-900 border border-white/[0.08] text-[#FDE047] group-hover:bg-black group-hover:text-[#FDE047] flex items-center justify-center mb-4 transition-colors shadow-sm">
                  <Dna className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-black mb-2.5 tracking-tight transition-colors">
                  Attacker DNA Fingerprinting
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 group-hover:text-black/85 leading-relaxed transition-colors">
                  Recognizes repeat threat actors by their unique behavioral signature with 82%+ accuracy, spotting them even if they plug in a completely different flash drive.
                </p>
              </div>
              <div className="mt-6 flex justify-end">
                <div className="w-8 h-8 rounded-full bg-[#FDE047]/10 text-[#FDE047] group-hover:bg-black group-hover:text-[#FDE047] flex items-center justify-center transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Reveal>

          {/* Feature 4 */}
          <Reveal delay={400}>
            <div data-narrator="feat-canary" className="bg-[#141414] hover:bg-[#FDE047] border border-white/[0.06] hover:border-[#FDE047] p-6 sm:p-7 rounded-[24px] relative group transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_16px_36px_rgba(253,224,71,0.22)] h-full flex flex-col justify-between cursor-pointer">
              <div>
                <div className="w-11 h-11 rounded-xl bg-neutral-900 border border-white/[0.08] text-[#FDE047] group-hover:bg-black group-hover:text-[#FDE047] flex items-center justify-center mb-4 transition-colors shadow-sm">
                  <Flame className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-black mb-2.5 tracking-tight transition-colors">
                  Smart Decoy Traps
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 group-hover:text-black/85 leading-relaxed transition-colors">
                  Deploys invisible honeypot files like fake passwords and server keys. The second an intruder opens bait, alarms sound with 100% certainty and zero false alarms.
                </p>
              </div>
              <div className="mt-6 flex justify-end">
                <div className="w-8 h-8 rounded-full bg-[#FDE047]/10 text-[#FDE047] group-hover:bg-black group-hover:text-[#FDE047] flex items-center justify-center transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Reveal>

          {/* Feature 5 */}
          <Reveal delay={500}>
            <div data-narrator="feat-isolation" className="bg-[#141414] hover:bg-[#FDE047] border border-white/[0.06] hover:border-[#FDE047] p-6 sm:p-7 rounded-[24px] relative group transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_16px_36px_rgba(253,224,71,0.22)] h-full flex flex-col justify-between cursor-pointer">
              <div>
                <div className="w-11 h-11 rounded-xl bg-neutral-900 border border-white/[0.08] text-[#FDE047] group-hover:bg-black group-hover:text-[#FDE047] flex items-center justify-center mb-4 transition-colors shadow-sm">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-black mb-2.5 tracking-tight transition-colors">
                  Sub-Second Auto-Isolation
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 group-hover:text-black/85 leading-relaxed transition-colors">
                  Instantly severs rogue connections and locks down compromised USB ports in under 382 milliseconds — neutralizing the danger without disrupting your normal work.
                </p>
              </div>
              <div className="mt-6 flex justify-end">
                <div className="w-8 h-8 rounded-full bg-[#FDE047]/10 text-[#FDE047] group-hover:bg-black group-hover:text-[#FDE047] flex items-center justify-center transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Reveal>

          {/* Feature 6 */}
          <Reveal delay={600}>
            <div data-narrator="feat-reports" className="bg-[#141414] hover:bg-[#FDE047] border border-white/[0.06] hover:border-[#FDE047] p-6 sm:p-7 rounded-[24px] relative group transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_16px_36px_rgba(253,224,71,0.22)] h-full flex flex-col justify-between cursor-pointer">
              <div>
                <div className="w-11 h-11 rounded-xl bg-neutral-900 border border-white/[0.08] text-[#FDE047] group-hover:bg-black group-hover:text-[#FDE047] flex items-center justify-center mb-4 transition-colors shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-black mb-2.5 tracking-tight transition-colors">
                  Executive Audit Reports
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 group-hover:text-black/85 leading-relaxed transition-colors">
                  Automatically compiles boardroom-ready incident summaries with second-by-second timelines and compliance mappings, downloadable with a single click.
                </p>
              </div>
              <div className="mt-6 flex justify-end">
                <div className="w-8 h-8 rounded-full bg-[#FDE047]/10 text-[#FDE047] group-hover:bg-black group-hover:text-[#FDE047] flex items-center justify-center transition-all">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          </Reveal>

        </div>

      </section>


      {/* =========================================================================
          SECTION 3: EDR BLIND SPOT COMPARISON (High-Contrast Void)
          ========================================================================= */}
      <section id="edr-blindspot" className="bg-[#0A0A0A] py-20 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          
          <Reveal>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-[#FDE047] font-bold text-xs tracking-widest uppercase mb-2 block">
                THE PHYSICAL BLIND SPOT
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                Why Traditional EDR Fails Against Rogue Hardware
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Traditional EDR Card */}
            <Reveal delay={100}>
              <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Conventional EDR / XDR</h3>
                    <p className="text-xs text-neutral-400">CrowdStrike, SentinelOne, Defender ATP</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm text-neutral-300">
                  <div className="flex items-start gap-3 p-3 bg-neutral-900/60 rounded-xl border border-white/[0.04]">
                    <span className="text-red-400 font-bold">✕</span>
                    <span><strong>Blind to Keystroke Speed:</strong> Assumes all keyboard input is an authorized human typing at the keyboard.</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-neutral-900/60 rounded-xl border border-white/[0.04]">
                    <span className="text-red-400 font-bold">✕</span>
                    <span><strong>No Cross-Hardware DNA:</strong> Cannot identify the same attacker when they swap physical USB sticks.</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-neutral-900/60 rounded-xl border border-white/[0.04]">
                    <span className="text-red-400 font-bold">✕</span>
                    <span><strong>Passive Post-Breach Alerting:</strong> Triggers alerts minutes or hours after data exfiltration has occurred.</span>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* PHANTOM Autonomous Card */}
            <Reveal delay={200}>
              <div className="bg-[#141414] border-2 border-[#FDE047]/30 rounded-[28px] p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FDE047]/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#FDE047] text-black">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">PHANTOM Autonomous Defense</h3>
                      <p className="text-xs text-[#FDE047]">Real-Time Hardware Zero-Day Engine</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#FDE047] text-black font-extrabold uppercase">
                    SUB-SECOND
                  </span>
                </div>

                <div className="space-y-4 text-sm text-neutral-200">
                  <div className="flex items-start gap-3 p-3 bg-neutral-900/80 rounded-xl border border-white/[0.06]">
                    <CheckCircle2 className="w-5 h-5 text-[#FDE047] shrink-0" />
                    <span><strong>Sub-Millisecond Jitter Detection:</strong> Spots non-human typing cadence in &lt;100 characters.</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-neutral-900/80 rounded-xl border border-white/[0.06]">
                    <CheckCircle2 className="w-5 h-5 text-[#FDE047] shrink-0" />
                    <span><strong>Cross-Device Attack DNA:</strong> Synthesizes behavioral fingerprints to track persistent actors.</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-neutral-900/80 rounded-xl border border-white/[0.06]">
                    <CheckCircle2 className="w-5 h-5 text-[#FDE047] shrink-0" />
                    <span><strong>Sub-382ms Autonomous Kill:</strong> Automatically severs sockets without waiting for human SOC analysts.</span>
                  </div>
                </div>
              </div>
            </Reveal>

          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 4: LIVE TERMINAL DEFENSE SIMULATOR (Interactive Demo)
          ========================================================================= */}
      <section id="demo" className="bg-[#0A0A0A] py-20 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          
          <Reveal>
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-4">
              <div>
                <span className="text-[#FDE047] font-bold text-xs tracking-widest uppercase mb-2 block">
                  LIVE TELEMETRY STREAM
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                  Watch Autonomous Defense in Real-Time
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsTerminalPlaying(!isTerminalPlaying)}
                  className="px-4 py-2 rounded-full border border-white/10 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-white flex items-center gap-1.5 pill-button cursor-pointer"
                >
                  {isTerminalPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isTerminalPlaying ? "Pause Feed" : "Resume Feed"}</span>
                </button>
                <button
                  onClick={copyTelemetry}
                  className="px-4 py-2 rounded-full border border-white/10 bg-neutral-900 hover:bg-neutral-800 text-xs font-semibold text-white flex items-center gap-1.5 pill-button cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied" : "Copy Logs"}</span>
                </button>
              </div>
            </div>
          </Reveal>

          {/* Terminal Console Card */}
          <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] overflow-hidden shadow-2xl font-mono text-xs">
            
            {/* Terminal Window Header */}
            <div className="bg-[#0F0F0F] px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-neutral-400 text-xs ml-3 font-mono">phantom-kernel-enforcer.sys • live-telemetry</span>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#FDE047]/10 text-[#FDE047] border border-[#FDE047]/20 font-bold">
                SUB-SECOND INTERCEPT
              </span>
            </div>

            {/* Terminal Log Rows */}
            <div className="p-6 md:p-8 space-y-3 bg-[#0A0A0A]/90 min-h-[280px]">
              {terminalLogs.slice(0, terminalStep + 1).map((log, idx) => {
                const isKill = log.lvl === "KILL";
                const isCrit = log.lvl === "CRIT";
                const isWarn = log.lvl === "WARN";
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-2.5 rounded-xl transition-all duration-300 ${
                      idx === terminalStep
                        ? isKill
                          ? "bg-red-950/40 border border-red-500/40"
                          : "bg-neutral-900 border border-white/10"
                        : "opacity-80"
                    }`}
                  >
                    <span className="text-neutral-500 shrink-0 font-mono text-[11px]">{log.t}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 font-mono ${
                        isKill
                          ? "bg-red-500 text-black font-extrabold"
                          : isCrit
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : isWarn
                          ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                          : "bg-neutral-800 text-neutral-300"
                      }`}
                    >
                      {log.src}
                    </span>
                    <span
                      className={`leading-relaxed text-xs ${
                        isKill ? "text-red-300 font-bold" : isCrit ? "text-red-300" : isWarn ? "text-yellow-100" : "text-neutral-300"
                      }`}
                    >
                      {log.msg}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Terminal Footer with Action Pill */}
            <div className="p-4 px-6 bg-[#0F0F0F] border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-mono">
                Frame {terminalStep + 1} of {terminalLogs.length} • Autonomous enforcer armed
              </span>
              <button
                onClick={isAuthenticated ? onLaunchConsole : onOpenLogin}
                className="bg-[#FDE047] hover:bg-[#FACC15] text-black font-bold text-xs px-5 py-2 rounded-full pill-button transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>{isAuthenticated ? 'Launch Full Console' : 'Get Started'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 5: BENCHMARKS & METRICS ROW
          ========================================================================= */}
      <section id="benchmarks" className="bg-[#0A0A0A] py-20 px-6 md:px-12 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          
          <div className="bg-[#141414] border border-white/[0.04] p-6 rounded-[28px] text-center">
            <span className="text-3xl sm:text-4xl md:text-5xl font-black text-[#FDE047] font-mono block mb-1">&lt;382ms</span>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Median Containment Time</span>
          </div>

          <div className="bg-[#141414] border border-white/[0.04] p-6 rounded-[28px] text-center">
            <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-mono block mb-1">0%</span>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Canary False Positives</span>
          </div>

          <div className="bg-[#141414] border border-white/[0.04] p-6 rounded-[28px] text-center">
            <span className="text-3xl sm:text-4xl md:text-5xl font-black text-[#FDE047] font-mono block mb-1">82.4%</span>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Jaccard DNA Match</span>
          </div>

          <div className="bg-[#141414] border border-white/[0.04] p-6 rounded-[28px] text-center">
            <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-mono block mb-1">100%</span>
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Autonomous Execution</span>
          </div>

        </div>
      </section>


      {/* =========================================================================
          SECTION 6: LIQUID CTA BANNER (Asymmetrical Yellow Curve)
          ========================================================================= */}
      <section id="cta" className="bg-[#0A0A0A] py-16 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#FDE047] text-black rounded-[40px] md:rounded-[60px] p-10 md:p-16 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
            
            <div className="max-w-xl text-left">
              <span className="text-black/70 font-bold text-xs uppercase tracking-widest mb-2 block">
                TRY PHANTOM LIVE
              </span>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-black tracking-tight leading-[0.95] mb-4">
                Secure your hardware blind spot today.
              </h2>
              <p className="text-base text-black/80 font-medium">
                Experience sub-second autonomous hardware zero-day defense in your own browser sandbox.
              </p>
            </div>

            <div className="shrink-0">
              <button
                onClick={isAuthenticated ? onLaunchConsole : (onOpenRegister || onOpenLogin)}
                className="bg-black hover:bg-neutral-900 text-white font-bold text-base px-9 py-4 rounded-full pill-button shadow-2xl flex items-center gap-3 cursor-pointer"
              >
                <span>{isAuthenticated ? 'Launch Live Console' : 'Get Started Now'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

          </div>
        </div>
      </section>


      {/* =========================================================================
          SECTION 7: THE VOID FOOTER
          ========================================================================= */}
      <footer className="bg-[#0A0A0A] py-12 px-6 md:px-12 border-t border-white/[0.06] text-neutral-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-3">
            <img
              src="/phantom-logo-white.png"
              alt="PHANTOM"
              className="h-7 md:h-8 w-auto object-contain select-none"
            />
            <span className="text-neutral-600">|</span>
            <span>Autonomous Peripheral Zero-Day Defense</span>
          </div>

          <div className="flex items-center gap-6 font-medium">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#benchmarks" className="hover:text-white transition-colors">Benchmarks</a>
            <button onClick={isAuthenticated ? onLaunchConsole : onOpenLogin} className="text-[#FDE047] hover:underline font-bold">
              {isAuthenticated ? 'Console →' : 'Get Started →'}
            </button>
          </div>

          <div>
            © 2026 PHANTOM Cybersecurity. All rights reserved.
          </div>

        </div>
      </footer>

      {/* Circular Floating PHANTOM Logo Button */}
      <PhantomFloatingLogo
        isOpen={copilotOpen}
        onClick={() => setCopilotOpen(!copilotOpen)}
      />

      {/* SecOps Copilot Drawer */}
      <SecOpsCopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />

    </div>
  );
}
