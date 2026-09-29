import React, { useState, useEffect } from 'react';
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
  HelpCircle, 
  FileText, 
  X, 
  Zap, 
  Activity, 
  Radio, 
  ShieldAlert,
  Terminal,
  Cpu,
  CheckCircle2,
  HardDrive,
  Flame,
  Layers
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

  // Simulated live telemetry feed in left-side cockpit
  const [terminalLogs, setTerminalLogs] = useState([
    { id: 1, time: '07:58:10', type: 'BUS_ENUM', msg: 'Hardware Sentinel listening on /dev/bus/usb/001' },
    { id: 2, time: '07:58:11', type: 'DEVICE_AUDIT', msg: 'Removable media attached (VID:0781 PID:5581)' },
    { id: 3, time: '07:58:12', type: 'VELOCITY_ALERT', msg: 'Keystroke injection rate: 850 CPS > 20 CPS limit' },
    { id: 4, time: '07:58:12', type: 'MITRE_T1056', msg: 'Synthetic BadUSB injection classified' },
    { id: 5, time: '07:58:13', type: 'AUTONOMOUS_KILL', msg: 'Recursive SIGKILL sent to PID 4182 (<32ms)' },
    { id: 6, time: '07:58:13', type: 'ISOLATION', msg: 'Physical port unmounted & quarantined successfully' }
  ]);

  useEffect(() => {
    const streamItems = [
      { type: 'CANARY_WATCH', msg: 'Decoy honeytoken /media/passwords.xlsx armed' },
      { type: 'ZERO_TRUST', msg: 'Hardware descriptor verified against known attack DNA' },
      { type: 'AI_ANALYST', msg: 'DeepSeek-R1 triage engine running on local GPU' },
      { type: 'CADENCE_CHECK', msg: 'Human typing cadence verified (nominal 14 CPS)' },
      { type: 'SENTINEL_PULSE', msg: 'Autonomous Process Sentinel heartbeat nominal' }
    ];

    const interval = setInterval(() => {
      const randomItem = streamItems[Math.floor(Math.random() * streamItems.length)];
      const now = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
      setTerminalLogs(prev => [
        ...prev.slice(1),
        { id: Date.now(), time: now, type: randomItem.type, msg: randomItem.msg }
      ]);
    }, 3800);

    return () => clearInterval(interval);
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
      role: regRole
    });

    if (res.success) {
      setSuccessMsg('Analyst account created! Accessing SOC console...');
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
    <div className="h-screen w-screen overflow-hidden flex flex-col lg:flex-row bg-[#0A0A0A] text-white font-sans selection:bg-[#FDE047] selection:text-black">
      
      {/* ========================================================================= */}
      {/* LEFT HALF: COMMAND COCKPIT & LIVE TELEMETRY SHOWCASE                       */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex w-1/2 bg-[#0B0B0C] border-r border-white/[0.08] relative overflow-hidden flex-col justify-between p-10 xl:p-14 select-none">
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#FDE047]/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#FDE047]/5 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        {/* Cockpit Top Bar */}
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/phantom-logo-yellow.png"
                alt="PHANTOM"
                className="h-8 w-auto object-contain drop-shadow-[0_0_15px_rgba(253,224,71,0.3)]"
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono font-bold text-emerald-400 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>AUTONOMOUS ENGINE ACTIVE</span>
            </div>
          </div>

          <div className="mt-8">
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Hardware Threat Hunting & <br />
              <span className="text-[#FDE047]">Autonomous Deception</span>
            </h1>
            <p className="text-xs xl:text-sm text-neutral-400 mt-2.5 max-w-lg leading-relaxed">
              Zero-Trust USB hardware bus auditing, real-time keystroke cadence defense, and surgical micro-isolation.
            </p>
          </div>
        </div>

        {/* Cockpit Middle: Live Simulated Terminal Feed */}
        <div className="relative z-10 my-6">
          <div className="bg-[#121214] border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl">
            {/* Terminal Window Header */}
            <div className="px-4 py-2.5 bg-[#171719] border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-[10px] font-mono text-neutral-400 flex items-center gap-1.5">
                  <Terminal className="w-3 h-3 text-[#FDE047]" />
                  <span>phantom-kernel-watcher.log</span>
                </span>
              </div>
              <span className="text-[9px] font-mono text-neutral-500 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                LIVE BUS
              </span>
            </div>

            {/* Terminal Log Lines */}
            <div className="p-4 space-y-2 font-mono text-[11px] h-[190px] overflow-hidden flex flex-col justify-end">
              {terminalLogs.map((log) => {
                const isAlert = log.type.includes('ALERT') || log.type.includes('KILL') || log.type.includes('MITRE');
                return (
                  <div key={log.id} className="flex items-start gap-2.5 leading-snug">
                    <span className="text-neutral-500 shrink-0">{log.time}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                        isAlert
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-amber-500/15 text-[#FDE047] border border-amber-500/30'
                      }`}
                    >
                      {log.type}
                    </span>
                    <span className={`truncate ${isAlert ? 'text-neutral-200 font-semibold' : 'text-neutral-400'}`}>
                      {log.msg}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cockpit Bottom: 3 Core Pillars */}
        <div className="relative z-10 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-6">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <Zap className="w-4 h-4 text-[#FDE047] mb-1.5" />
            <h4 className="text-xs font-bold text-white">Sub-45ms Kill</h4>
            <p className="text-[10px] text-neutral-400 mt-0.5">Autonomous process tree annihilation</p>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <Radio className="w-4 h-4 text-emerald-400 mb-1.5" />
            <h4 className="text-xs font-bold text-white">&gt;20 CPS Guard</h4>
            <p className="text-[10px] text-neutral-400 mt-0.5">BadUSB cadence velocity intercept</p>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <Cpu className="w-4 h-4 text-[#FDE047] mb-1.5" />
            <h4 className="text-xs font-bold text-white">DeepSeek-R1</h4>
            <p className="text-[10px] text-neutral-400 mt-0.5">On-premise cyber intelligence model</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT HALF: HIGH-PRECISION AUTHENTICATION PORTAL                           */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-1/2 h-full flex flex-col justify-between p-6 sm:p-10 lg:p-12 overflow-y-auto relative bg-[#0A0A0A]">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-[#FDE047]/5 rounded-full blur-[140px] pointer-events-none" />

        {/* Top Navigation */}
        <header className="flex items-center justify-between shrink-0 mb-6">
          <div>
            {onBackToLanding && (
              <button
                onClick={onBackToLanding}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-neutral-300 hover:text-white transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Overview</span>
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
              <span>Rules</span>
            </button>
          </div>
        </header>

        {/* Centered Form Body */}
        <div className="w-full max-w-sm mx-auto my-auto py-4">
          {/* Mobile Only Logo */}
          <div className="lg:hidden text-center mb-6">
            <img
              src="/phantom-logo-yellow.png"
              alt="PHANTOM"
              className="h-8 w-auto object-contain mx-auto mb-2 drop-shadow-[0_0_12px_rgba(253,224,71,0.25)]"
            />
            <p className="text-xs text-neutral-400">Autonomous USB Threat Hunting Platform</p>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {isRegister ? 'Create Analyst Profile' : 'SOC Analyst Login'}
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              {isRegister 
                ? 'Register your security credentials to access endpoint defense.' 
                : 'Authenticate to access live telemetry and threat hunting console.'}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center p-1 bg-[#141416] rounded-full border border-white/[0.08] mb-6">
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

          {/* Error & Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl flex items-center gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span className="leading-snug">{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google SSO Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 px-4 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.12] hover:border-white/[0.25] text-xs font-semibold text-white transition-all cursor-pointer flex items-center justify-center gap-3 shadow-sm hover:shadow-md mb-5 group"
          >
            {/* Google Logo */}
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
            <span>Continue with Google Workspace</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-5">
            <div className="border-t border-white/[0.08] w-full" />
            <span className="bg-[#0A0A0A] px-3 text-[10px] font-mono uppercase text-neutral-500 tracking-wider shrink-0">
              Or with credentials
            </span>
            <div className="border-t border-white/[0.08] w-full" />
          </div>

          {/* Sign In Form */}
          {!isRegister ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-neutral-400 mb-1.5 uppercase tracking-wider">
                  Analyst ID / Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#141416] border border-white/[0.1] rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047] focus:ring-1 focus:ring-[#FDE047] transition-all font-mono"
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
                    className="w-full pl-10 pr-10 py-2.5 bg-[#141416] border border-white/[0.1] rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047] focus:ring-1 focus:ring-[#FDE047] transition-all font-mono"
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
                  <span>Authenticate & Enter SOC</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            /* Registration Form */
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
                    className="w-full pl-10 pr-4 py-2 bg-[#141416] border border-white/[0.1] rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047] transition-all font-mono"
                    placeholder="e.g. yashz"
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
                    className="w-full pl-10 pr-4 py-2 bg-[#141416] border border-white/[0.1] rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047] transition-all font-mono"
                    placeholder="analyst@enterprise.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-neutral-400 mb-1 uppercase tracking-wider">
                  SOC Clearance Role
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full px-4 py-2 bg-[#141416] border border-white/[0.1] rounded-xl text-xs text-neutral-200 focus:outline-none focus:border-[#FDE047] transition-all font-mono cursor-pointer"
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
                    className="w-full pl-10 pr-10 py-2 bg-[#141416] border border-white/[0.1] rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047] transition-all font-mono"
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
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Minimal Bottom Bar */}
        <div className="text-center text-[11px] font-mono text-neutral-600 pt-2 shrink-0">
          <span>PHANTOM Autonomous Defense Platform • Connected</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RULES & REGULATIONS / EULA MODAL                                          */}
      {/* ========================================================================= */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#141416] border border-white/[0.12] rounded-[24px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[85vh] flex flex-col">
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
                  4. Multi-Tenant SOC Confidentiality
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
                className="px-5 py-2 rounded-full bg-[#FDE047] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#FACC15] transition-all cursor-pointer"
              >
                I Understand & Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HOW IT WORKS / PRODUCT WALKTHROUGH MODAL                                  */}
      {/* ========================================================================= */}
      {showHowItWorksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#141416] border border-white/[0.12] rounded-[24px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[85vh] flex flex-col">
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

            <div className="flex-1 overflow-y-auto py-5 space-y-3.5 font-mono text-xs leading-relaxed text-neutral-300 pr-1">
              {/* Stage 1 */}
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

              {/* Stage 2 */}
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

              {/* Stage 3 */}
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

              {/* Stage 4 */}
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
