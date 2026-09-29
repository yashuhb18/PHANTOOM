import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  User, 
  Mail, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  HelpCircle, 
  FileText, 
  X, 
  Zap, 
  Radio, 
  ShieldAlert,
  Terminal,
  Cpu,
  CheckCircle2,
  Shield,
  Fingerprint,
  Scan
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

/* ─── Floating Particle Canvas ────────────────────────────────────── */
function ParticleField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create particles
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(253, 224, 71, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // Draw and move particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(253, 224, 71, ${p.opacity})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
    />
  );
}

/* ─── Main Login Component ────────────────────────────────────────── */
export function Login({ onLoginSuccess, onBackToLanding }) {
  const [isRegister, setIsRegister] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);

  // Registration state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const { login, loginWithGoogle, register } = useAuth();

  // Live clock
  const [clock, setClock] = useState('');
  useEffect(() => {
    const tick = () => {
      setClock(new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your username/email and password.');
      return;
    }

    const res = login(identifier, password);
    if (res.success) {
      if (onLoginSuccess) onLoginSuccess();
    } else {
      setError(res.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const res = register({
      username: regUsername,
      email: regEmail,
      password: regPassword,
      role: 'Analyst'
    });

    if (res.success) {
      setSuccessMsg('Account created successfully! Entering console...');
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess();
      }, 700);
    } else {
      setError(res.error || 'Registration failed.');
    }
  };

  const handleGoogleSignIn = () => {
    setError('');
    const res = loginWithGoogle();
    if (res.success) {
      if (onLoginSuccess) onLoginSuccess();
    }
  };

  const quickFillAdmin = () => {
    setIdentifier('admin');
    setPassword('phantom2026');
    setError('');
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#060608] text-white font-sans selection:bg-[#FDE047] selection:text-black relative">

      {/* ─── Background Layers ────────────────────────────────────── */}
      <ParticleField />

      {/* Large radial blurs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#FDE047]/[0.04] rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] bg-[#FDE047]/[0.03] rounded-full blur-[160px] pointer-events-none" />

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none z-0" />

      {/* ─── Top Bar ──────────────────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-20 px-6 sm:px-10 py-5 flex items-center justify-between">
        {/* Left: Back + Logo */}
        <div className="flex items-center gap-4">
          {onBackToLanding && (
            <button
              onClick={onBackToLanding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-neutral-400 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
          <img
            src="/phantom-logo-yellow.png"
            alt="PHANTOM"
            className="h-7 w-auto object-contain drop-shadow-[0_0_20px_rgba(253,224,71,0.25)]"
          />
        </div>

        {/* Right: How It Works + Rules + Clock */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHowItWorksModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-neutral-400 hover:text-[#FDE047] transition-all cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#FDE047]/70" />
            <span>How It Works</span>
          </button>

          <button
            onClick={() => setShowRulesModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-neutral-400 hover:text-white transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Rules</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] font-mono text-neutral-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{clock} IST</span>
          </div>
        </div>
      </header>

      {/* ─── Centered Card ────────────────────────────────────────── */}
      <div className="relative z-10 h-full flex items-center justify-center px-4">
        <div className="w-full max-w-[420px]">

          {/* Logo + Tagline (above card) */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FDE047]/[0.08] border border-[#FDE047]/20 mb-5 shadow-[0_0_40px_rgba(253,224,71,0.08)]">
              <Shield className="w-8 h-8 text-[#FDE047]" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Welcome to <span className="text-[#FDE047]">PHANTOM</span>
            </h1>
            <p className="text-sm text-neutral-500 mt-1.5">
              Autonomous USB Threat Defense Platform
            </p>
          </div>

          {/* Glass Card */}
          <div className="bg-[#0E0E11]/80 backdrop-blur-2xl border border-white/[0.08] rounded-[24px] p-6 sm:p-8 shadow-[0_8px_60px_rgba(0,0,0,0.5)]">

            {/* Mode Tabs */}
            <div className="flex items-center p-1 bg-[#141416] rounded-full border border-white/[0.08] mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer ${
                  !isRegister
                    ? 'bg-[#FDE047] text-black shadow-md shadow-amber-500/20'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError('');
                  setSuccessMsg('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer ${
                  isRegister
                    ? 'bg-[#FDE047] text-black shadow-md shadow-amber-500/20'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error & Success Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/25 text-red-300 text-xs rounded-xl flex items-center gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span className="leading-snug">{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs rounded-xl flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Google SSO Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.1] hover:border-white/[0.2] text-sm font-medium text-white transition-all cursor-pointer flex items-center justify-center gap-3 mb-5 group"
            >
              <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center mb-5">
              <div className="border-t border-white/[0.06] w-full" />
              <span className="bg-[#0E0E11] px-3 text-[10px] font-mono uppercase text-neutral-600 tracking-wider shrink-0">
                or
              </span>
              <div className="border-t border-white/[0.06] w-full" />
            </div>

            {/* ─── Sign In Form ─────────────────────────────────── */}
            {!isRegister ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1.5 ml-1">
                    Username or Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#141416] border border-white/[0.08] rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047]/60 focus:ring-1 focus:ring-[#FDE047]/30 transition-all"
                      placeholder="Enter your username or email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5 ml-1">
                    <label className="text-[11px] font-medium text-neutral-400">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={quickFillAdmin}
                      className="text-[10px] font-medium text-[#FDE047]/70 hover:text-[#FDE047] hover:underline cursor-pointer transition-colors"
                    >
                      Use demo credentials
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3 bg-[#141416] border border-white/[0.08] rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047]/60 focus:ring-1 focus:ring-[#FDE047]/30 transition-all"
                      placeholder="••••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-[#FDE047] hover:bg-[#FACC15] text-black font-bold text-sm tracking-wide transition-all duration-200 cursor-pointer shadow-lg shadow-amber-500/15 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              /* ─── Registration Form ───────────────────────────── */
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1.5 ml-1">
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#141416] border border-white/[0.08] rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047]/60 focus:ring-1 focus:ring-[#FDE047]/30 transition-all"
                      placeholder="Pick a username"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1.5 ml-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#141416] border border-white/[0.08] rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047]/60 focus:ring-1 focus:ring-[#FDE047]/30 transition-all"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1.5 ml-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3 bg-[#141416] border border-white/[0.08] rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047]/60 focus:ring-1 focus:ring-[#FDE047]/30 transition-all"
                      placeholder="Min 6 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-[#FDE047] hover:bg-[#FACC15] text-black font-bold text-sm tracking-wide transition-all duration-200 cursor-pointer shadow-lg shadow-amber-500/15 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Bottom links (mobile) */}
          <div className="sm:hidden flex items-center justify-center gap-4 mt-5">
            <button
              onClick={() => setShowHowItWorksModal(true)}
              className="text-[11px] text-neutral-500 hover:text-[#FDE047] transition-colors cursor-pointer flex items-center gap-1"
            >
              <HelpCircle className="w-3 h-3" /> How It Works
            </button>
            <button
              onClick={() => setShowRulesModal(true)}
              className="text-[11px] text-neutral-500 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            >
              <FileText className="w-3 h-3" /> Rules
            </button>
          </div>

          {/* Three Feature Pills */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[10px] text-neutral-500">
              <Zap className="w-3 h-3 text-[#FDE047]/50" />
              <span>Sub-45ms Kill</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[10px] text-neutral-500">
              <Scan className="w-3 h-3 text-[#FDE047]/50" />
              <span>Zero-Trust Bus</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[10px] text-neutral-500">
              <Cpu className="w-3 h-3 text-[#FDE047]/50" />
              <span>DeepSeek-R1 AI</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* RULES & REGULATIONS MODAL                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#111113] border border-white/[0.1] rounded-[24px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-[#FDE047]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Rules of Engagement & Platform Regulations
                </h3>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-5 space-y-4 font-mono text-xs leading-relaxed text-neutral-300 pr-1">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                <h4 className="text-[#FDE047] font-bold mb-1">
                  1. Autonomous Kernel Interception & Containment
                </h4>
                <p className="text-neutral-400 text-[11px]">
                  PHANTOM operates in active autonomous mode. It continuously audits physical USB insertions, hardware descriptors, and process execution trees. Detected rogue payloads will be surgically neutralized via <code className="text-white">SIGKILL</code> with zero human latency.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                <h4 className="text-[#FDE047] font-bold mb-1">
                  2. Synthetic Keystroke Velocity Enforcement
                </h4>
                <p className="text-neutral-400 text-[11px]">
                  Typing cadence exceeding human biological thresholds (20 characters/sec or ~1000 CPM) is classified as synthetic DuckyScript / BadUSB automation. The endpoint keyboard buffer will be instantly micro-isolated to prevent payload completion.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                <h4 className="text-[#FDE047] font-bold mb-1">
                  3. Canary Deception Grid Compliance
                </h4>
                <p className="text-neutral-400 text-[11px]">
                  Decoy credential files (<code className="text-white">passwords.xlsx</code>, <code className="text-white">.aws_creds_canary</code>) are dynamically seeded inside temporary decoy mounts. Any unprompted read or write access trips high-priority MITRE T1083 honeypot alerts and severs associated socket connections.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                <h4 className="text-[#FDE047] font-bold mb-1">
                  4. Multi-Tenant Confidentiality
                </h4>
                <p className="text-neutral-400 text-[11px]">
                  All behavioral DNA token hashes, incident reports, and SIEM logs remain strictly localized within your cluster database. Zero telemetry is forwarded to external public cloud endpoints.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between shrink-0">
              <span className="text-[10px] font-mono text-neutral-500">
                Compliance: NIST SP 800-86 / MITRE ATT&CK
              </span>
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-5 py-2 rounded-xl bg-[#FDE047] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#FACC15] transition-all cursor-pointer"
              >
                I Understand & Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HOW IT WORKS MODAL                                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {showHowItWorksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#111113] border border-white/[0.1] rounded-[24px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-[#FDE047]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  How PHANTOM Works — 4-Stage Defense
                </h3>
              </div>
              <button
                onClick={() => setShowHowItWorksModal(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-5 space-y-3.5 font-mono text-xs leading-relaxed text-neutral-300 pr-1">
              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[#FDE047] flex items-center justify-center shrink-0 font-bold text-xs">
                  1
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs mb-0.5">
                    Zero-Trust Hardware Bus Auditing
                  </h4>
                  <p className="text-neutral-400 text-[11px]">
                    The moment any USB device connects to the hardware bus, PHANTOM inspects its Vendor ID (VID), Product ID (PID), and interface descriptors before the operating system mounts executables. Devices masquerading as keyboards are isolated.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[#FDE047] flex items-center justify-center shrink-0 font-bold text-xs">
                  2
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs mb-0.5">
                    Synthetic Keystroke Velocity Interception
                  </h4>
                  <p className="text-neutral-400 text-[11px]">
                    Hardware attacks like RubberDucky and BadUSB inject pre-programmed keystrokes at hundreds of words per minute. PHANTOM tracks cadence in real time: any burst exceeding 20 CPS triggers an immediate hardware cutoff.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[#FDE047] flex items-center justify-center shrink-0 font-bold text-xs">
                  3
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs mb-0.5">
                    Surgical Process Tree Annihilation
                  </h4>
                  <p className="text-neutral-400 text-[11px]">
                    If unauthorized scripts attempt to spawn (e.g. reverse shells, PowerShell download cradles, or autorun exploits), the Autonomous Sentinel executes recursive <code className="text-red-400">SIGKILL</code> in &lt;45 milliseconds and dismounts the storage volume.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[#FDE047] flex items-center justify-center shrink-0 font-bold text-xs">
                  4
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs mb-0.5">
                    SIEM Threat Hunting & DeepSeek-R1 AI Co-Pilot
                  </h4>
                  <p className="text-neutral-400 text-[11px]">
                    Events are ingested into the Splunk-style Threat Hunt Board. Analysts can execute SPL queries or chat peer-to-peer with the fine-tuned DeepSeek-R1 cybersecurity model running directly on your local GPU.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end shrink-0">
              <button
                onClick={() => setShowHowItWorksModal(false)}
                className="px-5 py-2 rounded-xl bg-[#FDE047] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#FACC15] transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
