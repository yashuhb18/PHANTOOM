import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Mail, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle, 
  FileText, 
  X, 
  Zap, 
  Activity, 
  Radio, 
  ShieldAlert,
  Terminal,
  Cpu
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
  const [regRole, setRegRole] = useState('SOC Threat Hunter');

  const { login, loginWithGoogle, register } = useAuth();

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!identifier.trim() || !password.trim()) {
      setError('Please enter both identifier and password.');
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
      role: regRole
    });

    if (res.success) {
      setSuccessMsg('Account registered successfully! Redirecting to SOC console...');
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
    <div className="min-h-screen w-full bg-[#0A0A0A] text-white flex flex-col justify-between selection:bg-[#FDE047] selection:text-black relative overflow-hidden font-sans">
      {/* Subtle Background Glow & Cyber Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(253,224,71,0.12),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Top Header / Navigation */}
      <header className="relative z-10 w-full px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          {onBackToLanding && (
            <button
              onClick={onBackToLanding}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-neutral-300 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Overview</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHowItWorksModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-neutral-300 hover:text-[#FDE047] transition-all cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#FDE047]" />
            <span>How It Works</span>
          </button>

          <button
            onClick={() => setShowRulesModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-neutral-300 hover:text-white transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Rules & Regulations</span>
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md">
          {/* Brand Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-3">
              <img
                src="/phantom-logo-yellow.png"
                alt="PHANTOM"
                className="h-9 w-auto object-contain select-none drop-shadow-[0_0_15px_rgba(253,224,71,0.25)]"
              />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FDE047]/15 text-[#FDE047] border border-[#FDE047]/30">
                v2.0 AUTONOMOUS SOC
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                RTX 3050 GPU READY
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              Autonomous USB Threat Hunting, Canary Deception Grid & SIEM
            </p>
          </div>

          {/* Card Body */}
          <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            {/* Ambient accent bar at top of card */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FDE047] to-transparent opacity-80" />

            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 bg-black/60 rounded-full border border-white/[0.06] mb-6">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError('');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  !isRegister
                    ? 'bg-[#FDE047] text-black shadow-md'
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
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                  isRegister
                    ? 'bg-[#FDE047] text-black shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error & Success Banners */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-2xl flex items-center gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span className="leading-snug">{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-2xl flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Google Single Sign-On Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] hover:border-white/[0.25] text-xs font-semibold text-white transition-all cursor-pointer flex items-center justify-center gap-3 shadow-sm hover:shadow-md mb-5 group"
            >
              {/* Official Google 'G' SVG Logo */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Sign in with Google Workspace</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center mb-5">
              <div className="border-t border-white/[0.08] w-full" />
              <span className="bg-[#141414] px-3 text-[10px] font-mono uppercase text-neutral-500 tracking-wider shrink-0">
                Or with credentials
              </span>
              <div className="border-t border-white/[0.08] w-full" />
            </div>

            {/* Sign In Form */}
            {!isRegister ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 mb-1.5 uppercase tracking-wider">
                    Analyst ID or Corporate Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-white/[0.1] rounded-2xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047] focus:ring-1 focus:ring-[#FDE047] transition-all font-mono"
                      placeholder="admin or user@phantom.sec"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={quickFillAdmin}
                      className="text-[10px] font-mono text-[#FDE047] hover:underline cursor-pointer"
                    >
                      Fill Demo Credentials
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-black/60 border border-white/[0.1] rounded-2xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047] focus:ring-1 focus:ring-[#FDE047] transition-all font-mono"
                      placeholder="••••••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-neutral-500 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-full bg-[#FDE047] hover:bg-[#FACC15] text-black font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <span>Authenticate & Access Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              /* Create Account Form */
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 mb-1 uppercase tracking-wider">
                    Analyst Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-black/60 border border-white/[0.1] rounded-2xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047] transition-all font-mono"
                      placeholder="e.g. hunter_yash"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 mb-1 uppercase tracking-wider">
                    Corporate Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-black/60 border border-white/[0.1] rounded-2xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047] transition-all font-mono"
                      placeholder="analyst@enterprise.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 mb-1 uppercase tracking-wider">
                    SOC Role / Clearance
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value)}
                    className="w-full px-4 py-2 bg-black/60 border border-white/[0.1] rounded-2xl text-xs text-neutral-200 focus:outline-none focus:border-[#FDE047] transition-all font-mono cursor-pointer"
                  >
                    <option value="Lead Threat Hunter">Lead Threat Hunter (Full Containment)</option>
                    <option value="SOC Tier-2 Analyst">SOC Tier-2 Analyst (Triage & Hunting)</option>
                    <option value="Security Engineer">Security Engineer (Deception & Canaries)</option>
                    <option value="Incident Responder">Incident Responder (Forensics)</option>
                    <option value="Compliance Auditor">Compliance Auditor (Read-Only SIEM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 mb-1 uppercase tracking-wider">
                    Master Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 bg-black/60 border border-white/[0.1] rounded-2xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047] transition-all font-mono"
                      placeholder="Min 6 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-neutral-500 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-full bg-[#FDE047] hover:bg-[#FACC15] text-black font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <span>Create Analyst Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* Compliance Footer inside Card */}
            <div className="mt-6 pt-4 border-t border-white/[0.06] text-center">
              <p className="text-[10px] text-neutral-500 leading-relaxed">
                By accessing PHANTOM, you authorize kernel bus monitoring, synthetic keystroke velocity auditing, and autonomous process tree containment.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full px-6 py-4 border-t border-white/[0.04] bg-[#0A0A0A]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>PHANTOM Autonomous Defense Platform — Active On-Premise Host</span>
          </div>
          <div>
            <span>Model: babar_jamali/deepseek-r-11.5b-cyber (100% GPU)</span>
          </div>
        </div>
      </footer>

      {/* RULES & REGULATIONS / EULA MODAL */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#141414] border border-white/[0.12] rounded-[28px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-[#FDE047]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Rules of Engagement & Platform Regulations (EULA)
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
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06]">
                <h4 className="text-[#FDE047] font-bold mb-1 flex items-center gap-1.5">
                  <span>1. Autonomous Kernel Interception & Containment</span>
                </h4>
                <p className="text-neutral-400 text-[11px]">
                  PHANTOM operates in active autonomous mode. It continuously audits physical USB insertions, hardware descriptors, and process execution trees. Detected rogue payloads will be surgically neutralized via <code className="text-white">SIGKILL</code> with zero human latency.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06]">
                <h4 className="text-[#FDE047] font-bold mb-1 flex items-center gap-1.5">
                  <span>2. Synthetic Keystroke Velocity Enforcement</span>
                </h4>
                <p className="text-neutral-400 text-[11px]">
                  Typing cadence exceeding the human biological threshold (20 characters/sec or ~1000 CPM) is classified as synthetic DuckyScript / BadUSB automation. The endpoint keyboard buffer will be instantly micro-isolated to prevent payload completion.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06]">
                <h4 className="text-[#FDE047] font-bold mb-1 flex items-center gap-1.5">
                  <span>3. Canary Deception Grid Compliance</span>
                </h4>
                <p className="text-neutral-400 text-[11px]">
                  Decoy credential files (<code className="text-white">passwords.xlsx</code>, <code className="text-white">.aws_creds_canary</code>) are dynamically seeded inside temporary decoy mounts. Any unprompted read, copy, or write access immediately trips high-priority MITRE T1083 honeypot alerts and severs associated socket connections.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06]">
                <h4 className="text-[#FDE047] font-bold mb-1 flex items-center gap-1.5">
                  <span>4. On-Premise SOC Telemetry & Confidentiality</span>
                </h4>
                <p className="text-neutral-400 text-[11px]">
                  All behavioral DNA token hashes, incident reports, and SIEM logs remain strictly localized within your SQLite database and the on-premise DeepSeek-R1 inference engine on your local NVIDIA GPU. Zero telemetry is forwarded to external public cloud endpoints.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between shrink-0">
              <span className="text-[10px] font-mono text-neutral-500">
                Compliance Standard: NIST SP 800-86 / MITRE ATT&CK
              </span>
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-5 py-2 rounded-full bg-[#FDE047] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#FACC15] transition-all cursor-pointer"
              >
                I Understand & Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOW IT WORKS / PRODUCT WALKTHROUGH MODAL */}
      {showHowItWorksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#141414] border border-white/[0.12] rounded-[28px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] shrink-0">
              <div className="flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-[#FDE047]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  How PHANTOM Works — 4-Stage Autonomous Defense
                </h3>
              </div>
              <button
                onClick={() => setShowHowItWorksModal(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-5 space-y-4 font-mono text-xs leading-relaxed text-neutral-300 pr-1">
              {/* Stage 1 */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-black/40 border border-white/[0.06]">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[#FDE047] flex items-center justify-center shrink-0 font-bold">
                  1
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs mb-1">
                    Zero-Trust Hardware Bus Auditing
                  </h4>
                  <p className="text-neutral-400 text-[11px]">
                    The moment any USB device connects to the hardware bus, PHANTOM inspects its Vendor ID (VID), Product ID (PID), and interface descriptors before the operating system mounts executables. Devices masquerading as keyboards are isolated.
                  </p>
                </div>
              </div>

              {/* Stage 2 */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-black/40 border border-white/[0.06]">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[#FDE047] flex items-center justify-center shrink-0 font-bold">
                  2
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs mb-1">
                    Synthetic Keystroke Velocity Interception
                  </h4>
                  <p className="text-neutral-400 text-[11px]">
                    Hardware attacks like RubberDucky and BadUSB inject pre-programmed keystrokes at hundreds of words per minute. PHANTOM tracks cadence in real time: any burst exceeding 20 CPS triggers an immediate hardware cutoff.
                  </p>
                </div>
              </div>

              {/* Stage 3 */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-black/40 border border-white/[0.06]">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[#FDE047] flex items-center justify-center shrink-0 font-bold">
                  3
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs mb-1">
                    Surgical Process Tree Annihilation
                  </h4>
                  <p className="text-neutral-400 text-[11px]">
                    If unauthorized scripts attempt to spawn (e.g. reverse shells, PowerShell download cradles, or autorun exploits), the Autonomous Sentinel executes recursive <code className="text-red-400">SIGKILL</code> in &lt;45 milliseconds and dismounts the storage volume.
                  </p>
                </div>
              </div>

              {/* Stage 4 */}
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-black/40 border border-white/[0.06]">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[#FDE047] flex items-center justify-center shrink-0 font-bold">
                  4
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs mb-1">
                    SIEM Threat Hunting & DeepSeek-R1 AI Co-Pilot
                  </h4>
                  <p className="text-neutral-400 text-[11px]">
                    Events are ingested into the Splunk-style Threat Hunt Board. Analysts can execute SPL queries or chat peer-to-peer with the fine-tuned DeepSeek-R1 cybersecurity model running directly on your local NVIDIA RTX 3050 GPU.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end shrink-0">
              <button
                onClick={() => setShowHowItWorksModal(false)}
                className="px-5 py-2 rounded-full bg-[#FDE047] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#FACC15] transition-all cursor-pointer"
              >
                Close Walkthrough
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
