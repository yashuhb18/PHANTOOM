import React, { useState, useEffect } from 'react';
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
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

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
      setError(res.error || 'Authentication failed.');
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
      setSuccessMsg('Account created! Entering console...');
      setTimeout(() => { if (onLoginSuccess) onLoginSuccess(); }, 700);
    } else {
      setError(res.error || 'Registration failed.');
    }
  };

  const handleGoogleSignIn = () => {
    setError('');
    const res = loginWithGoogle();
    if (res.success && onLoginSuccess) onLoginSuccess();
  };

  const quickFillAdmin = () => {
    setIdentifier('admin');
    setPassword('phantom2026');
    setError('');
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col lg:flex-row bg-[#0A0A0A] text-white font-sans selection:bg-[#FDE047] selection:text-black">

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* LEFT HALF — BRANDING PANEL                                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex w-1/2 bg-[#080808] relative overflow-hidden items-center justify-center">
        {/* Ambient golden glow behind logo */}
        <div className="absolute w-[400px] h-[400px] bg-[#FDE047]/[0.06] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute w-[200px] h-[200px] bg-[#FDE047]/[0.04] rounded-full blur-[80px] pointer-events-none translate-y-20" />

        {/* Subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

        {/* Border line on right edge */}
        <div className="absolute right-0 top-0 bottom-0 w-px bg-white/[0.06]" />

        {/* Branding Content */}
        <div className="relative z-10 text-center px-12">
          <img
            src="/phantom-logo-yellow.png"
            alt="PHANTOM"
            className="h-28 w-auto object-contain mx-auto drop-shadow-[0_0_40px_rgba(253,224,71,0.3)]"
          />
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-[#FDE047] mt-8">
            PHANTOM
          </h1>
          <p className="text-base text-neutral-500 mt-3 max-w-sm mx-auto leading-relaxed">
            Autonomous USB Threat Defense
          </p>

          {/* Three small feature tags */}
          <div className="flex items-center justify-center gap-3 mt-10">
            <div className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-neutral-500 font-medium">
              Zero-Trust Bus Audit
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-neutral-500 font-medium">
              Sub-45ms Kill
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-neutral-500 font-medium">
              AI-Powered
            </div>
          </div>
        </div>

        {/* Back to landing button — bottom-left */}
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="absolute bottom-8 left-8 flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-neutral-400 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* RIGHT HALF — AUTH FORM                                        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-1/2 h-full flex flex-col bg-[#0E0E10] relative overflow-y-auto">

        {/* Top bar — How It Works + Rules */}
        <header className="flex items-center justify-between px-6 sm:px-10 py-5 shrink-0">
          {/* Mobile: Back + Logo */}
          <div className="flex items-center gap-3 lg:hidden">
            {onBackToLanding && (
              <button
                onClick={onBackToLanding}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-neutral-400 hover:text-white transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <img
              src="/phantom-logo-yellow.png"
              alt="PHANTOM"
              className="h-6 w-auto object-contain drop-shadow-[0_0_12px_rgba(253,224,71,0.2)]"
            />
          </div>

          {/* Desktop: empty left */}
          <div className="hidden lg:block" />

          {/* Right: info buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHowItWorksModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-neutral-400 hover:text-[#FDE047] transition-all cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#FDE047]/60" />
              <span className="hidden sm:inline">How It Works</span>
            </button>
            <button
              onClick={() => setShowRulesModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-neutral-400 hover:text-white transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rules</span>
            </button>
          </div>
        </header>

        {/* Centered form area */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 pb-8">
          <div className="w-full max-w-[380px]">

            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {isRegister ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-sm text-neutral-500 mt-2">
                {isRegister
                  ? 'Set up your credentials to access the platform.'
                  : 'Sign in to access your threat defense console.'}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center p-1 bg-[#141416] rounded-full border border-white/[0.08] mb-7">
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer ${
                  !isRegister
                    ? 'bg-[#FDE047] text-black shadow-md shadow-[#FDE047]/15'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(''); setSuccessMsg(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer ${
                  isRegister
                    ? 'bg-[#FDE047] text-black shadow-md shadow-[#FDE047]/15'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Alerts */}
            {error && (
              <div className="mb-5 p-3 bg-red-500/10 border border-red-500/25 text-red-300 text-xs rounded-xl flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-5 p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Google SSO */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-white/[0.2] text-sm font-medium text-white transition-all cursor-pointer flex items-center justify-center gap-3 mb-6"
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
            <div className="relative flex items-center justify-center mb-6">
              <div className="border-t border-white/[0.06] w-full" />
              <span className="bg-[#0E0E10] px-4 text-[11px] text-neutral-600 shrink-0">or</span>
              <div className="border-t border-white/[0.06] w-full" />
            </div>

            {/* ── Sign In Form ────────────────────────────────── */}
            {!isRegister ? (
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-2">
                    Username or Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#141416] border border-white/[0.08] rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047]/50 focus:ring-1 focus:ring-[#FDE047]/20 transition-all"
                      placeholder="Enter your username or email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-neutral-400">Password</label>
                    <button
                      type="button"
                      onClick={quickFillAdmin}
                      className="text-[11px] text-[#FDE047]/60 hover:text-[#FDE047] cursor-pointer transition-colors"
                    >
                      Demo credentials
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3 bg-[#141416] border border-white/[0.08] rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047]/50 focus:ring-1 focus:ring-[#FDE047]/20 transition-all"
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

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#FDE047] hover:bg-[#FACC15] text-black font-bold text-sm tracking-wide transition-all duration-200 cursor-pointer shadow-lg shadow-[#FDE047]/10 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                >
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* ── Registration Form ──────────────────────────── */
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-2">Username</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#141416] border border-white/[0.08] rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047]/50 focus:ring-1 focus:ring-[#FDE047]/20 transition-all"
                      placeholder="Pick a username"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#141416] border border-white/[0.08] rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047]/50 focus:ring-1 focus:ring-[#FDE047]/20 transition-all"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3 bg-[#141416] border border-white/[0.08] rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047]/50 focus:ring-1 focus:ring-[#FDE047]/20 transition-all"
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

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#FDE047] hover:bg-[#FACC15] text-black font-bold text-sm tracking-wide transition-all duration-200 cursor-pointer shadow-lg shadow-[#FDE047]/10 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                >
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* RULES MODAL                                                    */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#111113] border border-white/[0.1] rounded-[24px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-[#FDE047]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Rules & Platform Regulations
                </h3>
              </div>
              <button onClick={() => setShowRulesModal(false)} className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-5 space-y-4 text-xs leading-relaxed text-neutral-300 pr-1">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                <h4 className="text-[#FDE047] font-bold mb-1">1. Autonomous Kernel Interception & Containment</h4>
                <p className="text-neutral-400 text-[11px]">PHANTOM operates in active autonomous mode. It continuously audits physical USB insertions, hardware descriptors, and process execution trees. Detected rogue payloads will be surgically neutralized via <code className="text-white">SIGKILL</code> with zero human latency.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                <h4 className="text-[#FDE047] font-bold mb-1">2. Synthetic Keystroke Velocity Enforcement</h4>
                <p className="text-neutral-400 text-[11px]">Typing cadence exceeding human biological thresholds (20 characters/sec or ~1000 CPM) is classified as synthetic DuckyScript / BadUSB automation. The endpoint keyboard buffer will be instantly micro-isolated.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                <h4 className="text-[#FDE047] font-bold mb-1">3. Canary Deception Grid Compliance</h4>
                <p className="text-neutral-400 text-[11px]">Decoy credential files are dynamically seeded inside temporary decoy mounts. Any unprompted access trips high-priority MITRE T1083 honeypot alerts.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                <h4 className="text-[#FDE047] font-bold mb-1">4. Multi-Tenant Confidentiality</h4>
                <p className="text-neutral-400 text-[11px]">All behavioral DNA token hashes, incident reports, and SIEM logs remain strictly localized within your cluster database. Zero telemetry is forwarded to external endpoints.</p>
              </div>
            </div>
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between shrink-0">
              <span className="text-[10px] font-mono text-neutral-500">NIST SP 800-86 / MITRE ATT&CK</span>
              <button onClick={() => setShowRulesModal(false)} className="px-5 py-2 rounded-xl bg-[#FDE047] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#FACC15] transition-all cursor-pointer">
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HOW IT WORKS MODAL                                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showHowItWorksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#111113] border border-white/[0.1] rounded-[24px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-[#FDE047]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  How PHANTOM Works — 4-Stage Defense
                </h3>
              </div>
              <button onClick={() => setShowHowItWorksModal(false)} className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-5 space-y-3.5 text-xs leading-relaxed text-neutral-300 pr-1">
              {[
                { n: '1', title: 'Zero-Trust Hardware Bus Auditing', desc: 'The moment any USB device connects, PHANTOM inspects its VID, PID, and interface descriptors before the OS mounts executables. Devices masquerading as keyboards are isolated.' },
                { n: '2', title: 'Synthetic Keystroke Velocity Interception', desc: 'BadUSB attacks inject keystrokes at hundreds of WPM. PHANTOM tracks cadence in real time — any burst exceeding 20 CPS triggers an immediate hardware cutoff.' },
                { n: '3', title: 'Surgical Process Tree Annihilation', desc: 'If unauthorized scripts spawn (reverse shells, download cradles), the Autonomous Sentinel executes recursive SIGKILL in <45ms and dismounts the volume.' },
                { n: '4', title: 'SIEM Threat Hunting & DeepSeek-R1 AI', desc: 'Events are ingested into the Threat Hunt Board. Analysts can execute SPL queries or chat with the DeepSeek-R1 cybersecurity model running on your local GPU.' },
              ].map((stage) => (
                <div key={stage.n} className="flex items-start gap-3.5 p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                  <div className="w-7 h-7 rounded-lg bg-[#FDE047]/10 border border-[#FDE047]/25 text-[#FDE047] flex items-center justify-center shrink-0 font-bold text-xs">
                    {stage.n}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-xs mb-0.5">{stage.title}</h4>
                    <p className="text-neutral-400 text-[11px]">{stage.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end shrink-0">
              <button onClick={() => setShowHowItWorksModal(false)} className="px-5 py-2 rounded-xl bg-[#FDE047] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#FACC15] transition-all cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
