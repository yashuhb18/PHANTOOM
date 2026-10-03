import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Activity,
  ArrowUp,
  ArrowDown,
  Wifi,
  HardDrive,
  ShieldAlert,
  Search,
  Pause,
  Play,
  RotateCcw,
  XCircle,
  Download,
  AlertTriangle,
  Server,
  Layers,
  CheckCircle2,
  Filter,
  Radio,
  Cpu,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Copy,
  Terminal,
  Zap,
  Crosshair,
  FileCode,
  FileText,
  Globe,
  ShieldCheck,
  Usb,
  GitCommit,
  Eye,
  Share2,
  Flame,
  Gauge
} from 'lucide-react';

export function NetworkMonitorPage() {
  // Navigation Sections:
  // 'arena'    -> Rogue .EXE Hunter-Killer Arena (High-CPU .exe detection & autonomous kill demo)
  // 'story'    -> Threat Story & Interactive Attack Graph
  // 'proc_net' -> Process ↔ Network Map (UDP & TCP Trees, SHA256, File Attribution)
  // 'dpi'      -> Deep Packet Inspector (Wireshark 3-pane: Stream, Dissection, Hex)
  // 'dns'      -> DNS Monitor & Resolver Intelligence
  // 'evidence' -> PCAP-style Network Evidence & Protocol Distribution
  // 'adapters' -> Physical NIC Hardware Adapters
  const [activeSection, setActiveSection] = useState('arena');

  // Core Hardware & Bandwidth Telemetry
  const [telemetry, setTelemetry] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // EDR Correlation State
  const [processTrees, setProcessTrees] = useState([]);
  const [dnsLedger, setDnsLedger] = useState([]);
  const [threatStories, setThreatStories] = useState([]);
  const [attackGraph, setAttackGraph] = useState({ nodes: [], edges: [] });
  const [evidenceData, setEvidenceData] = useState(null);

  // Rogue .EXE Hunter-Killer Arena State
  const [rogueStatus, setRogueStatus] = useState({
    is_running: false,
    pid: null,
    status: 'IDLE',
    process_cpu: 0,
    process_memory_mb: 0,
    threads_count: 0,
    system_cpu_total: 0,
    auto_kill_enabled: true,
    mitigation_time_seconds: null,
    logs: []
  });
  const [isLaunchingRogue, setIsLaunchingRogue] = useState(false);
  const [isKillingRogue, setIsKillingRogue] = useState(false);

  // Interactive Selection State
  const [selectedGraphNode, setSelectedGraphNode] = useState(null);
  const [selectedSocketEvent, setSelectedSocketEvent] = useState(null);
  const [selectedProcessFilter, setSelectedProcessFilter] = useState('');
  const [socketTypeFilter, setSocketTypeFilter] = useState('ALL');
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [isContaining, setIsContaining] = useState(false);

  // Deep Packet Inspector (DPI) State
  const [packets, setPackets] = useState([]);
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [isCapturing, setIsCapturing] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true); // Auto-scroll toggle
  const [packetFilterProto, setPacketFilterProto] = useState('ALL');
  const [attackOnly, setAttackOnly] = useState(false);
  const [packetSearch, setPacketSearch] = useState('');
  const [simulatingAttack, setSimulatingAttack] = useState(null);
  const [hoveredByte, setHoveredByte] = useState(null);
  const [copiedHex, setCopiedHex] = useState(false);
  const [expandedLayers, setExpandedLayers] = useState({
    frame: true,
    ethernet: false,
    ip: true,
    transport: true,
    application: true,
    threat_intel: true
  });

  const packetListEndRef = useRef(null);
  const isCapturingRef = useRef(isCapturing);
  isCapturingRef.current = isCapturing;

  const showToast = (type, text) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatRate = (bytesSec) => {
    if (!bytesSec || bytesSec <= 0) return '0 B/s';
    if (bytesSec < 1024) return `${bytesSec.toFixed(0)} B/s`;
    if (bytesSec < 1024 * 1024) return `${(bytesSec / 1024).toFixed(1)} KB/s`;
    return `${(bytesSec / (1024 * 1024)).toFixed(2)} MB/s`;
  };

  // 1.0s Hardware Telemetry Polling Loop
  useEffect(() => {
    let mounted = true;
    const fetchTelemetry = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8001/api/network/telemetry`);
        if (res.ok && mounted) {
          const data = await res.json();
          setTelemetry(data);
        }
      } catch (err) {
        console.error("Failed to fetch network telemetry:", err);
      }
    };
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Poll Rogue .EXE Status (Faster 600ms polling for live CPU responsiveness)
  useEffect(() => {
    let mounted = true;
    const pollRogue = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:8001/api/network/edr/rogue-status`);
        if (res.ok && mounted) {
          const data = await res.json();
          setRogueStatus(data);
        }
      } catch (err) {
        // ignore in background
      }
    };
    pollRogue();
    const interval = setInterval(pollRogue, 600);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // EDR Data Polling Loop
  const fetchEdrData = useCallback(async () => {
    try {
      const [ptreeRes, dnsRes, storyRes, graphRes, evRes] = await Promise.all([
        fetch(`http://${window.location.hostname}:8001/api/network/edr/process-tree`),
        fetch(`http://${window.location.hostname}:8001/api/network/edr/dns-ledger`),
        fetch(`http://${window.location.hostname}:8001/api/network/edr/threat-story`),
        fetch(`http://${window.location.hostname}:8001/api/network/edr/attack-graph`),
        fetch(`http://${window.location.hostname}:8001/api/network/edr/evidence`)
      ]);

      if (ptreeRes.ok) setProcessTrees(await ptreeRes.json());
      if (dnsRes.ok) setDnsLedger(await dnsRes.json());
      if (storyRes.ok) setThreatStories(await storyRes.json());
      if (graphRes.ok) setAttackGraph(await graphRes.json());
      if (evRes.ok) setEvidenceData(await evRes.json());
    } catch (err) {
      console.error("Failed to fetch EDR correlation data:", err);
    }
  }, []);

  useEffect(() => {
    fetchEdrData();
    const interval = setInterval(fetchEdrData, 2000);
    return () => clearInterval(interval);
  }, [fetchEdrData]);

  // DPI Packet Sniffer Polling Loop
  const fetchPackets = useCallback(async () => {
    if (!isCapturingRef.current) return;
    try {
      const params = new URLSearchParams();
      params.append('limit', '120');
      if (packetFilterProto !== 'ALL') params.append('protocol', packetFilterProto);
      if (attackOnly) params.append('attack_only', 'true');
      if (packetSearch.trim()) params.append('search', packetSearch.trim());

      const res = await fetch(`http://${window.location.hostname}:8001/api/network/packets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPackets(data);
        // Only select latest if user hasn't manually selected one
        setSelectedPacket(prev => {
          if (!prev && data.length > 0) return data[data.length - 1];
          if (prev) {
            const found = data.find(p => p.no === prev.no);
            return found || prev;
          }
          return null;
        });
      }
    } catch (err) {
      console.error("Failed to fetch packets:", err);
    }
  }, [packetFilterProto, attackOnly, packetSearch]);

  useEffect(() => {
    fetchPackets();
    const interval = setInterval(fetchPackets, 1000);
    return () => clearInterval(interval);
  }, [fetchPackets]);

  // Auto-scroll ONLY when enabled AND not paused by user packet selection
  useEffect(() => {
    if (autoScroll && packetListEndRef.current && activeSection === 'dpi') {
      packetListEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [packets, autoScroll, activeSection]);

  // Launch Rogue .EXE
  const handleLaunchRogueExe = async () => {
    setIsLaunchingRogue(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/network/edr/launch-rogue-exe`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', `🚀 Rogue Binary Executed: phantom_rogue_payload.exe (PID: ${data.pid})! Watch CPU load.`);
      } else {
        showToast('error', data.error || 'Failed to launch rogue binary.');
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setIsLaunchingRogue(false);
    }
  };

  // Kill Rogue .EXE
  const handleKillRogueExe = async () => {
    setIsKillingRogue(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/network/edr/kill-rogue-exe`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('success', `🛑 Rogue Process PID ${data.pid} Annihilated! CPU restored to baseline.`);
      } else {
        showToast('error', data.message || 'Failed to terminate rogue process.');
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setIsKillingRogue(false);
    }
  };

  // Toggle Auto-Kill
  const handleToggleAutoKill = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/network/edr/toggle-auto-kill`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setRogueStatus(prev => ({ ...prev, auto_kill_enabled: data.auto_kill_enabled }));
        showToast('success', data.auto_kill_enabled ? 'Autonomous Auto-Kill Mode: ACTIVE' : 'Autonomous Auto-Kill: DISABLED (Manual Mode)');
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // Trigger Demo Attack Chain
  const handleTriggerDemoChain = async () => {
    setIsDemoRunning(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/network/edr/demo-chain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', '🚨 Live EDR Threat Chain Demo Triggered! Watch correlation timeline.');
        await fetchEdrData();
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setIsDemoRunning(false);
    }
  };

  // Surgical Containment Action
  const handleContainThreat = async (pid) => {
    setIsContaining(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/network/edr/contain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', `🛑 Threat Neutralized: PID ${pid} tree killed, active sockets severed.`);
        await fetchEdrData();
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setIsContaining(false);
    }
  };

  // Simulate DPI Attack
  const handleSimulateAttack = async (attackType) => {
    setSimulatingAttack(attackType);
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/network/simulate-attack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attack_type: attackType })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', `🚨 Attack Injected: ${data.attack_type}`);
        await fetchPackets();
        if (data.packets && data.packets.length > 0) {
          setSelectedPacket(data.packets[0]);
          setAutoScroll(false); // Stop moving so user can inspect!
          setExpandedLayers(prev => ({ ...prev, threat_intel: true, application: true }));
        }
      }
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSimulatingAttack(null);
    }
  };

  const handleToggleCapture = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/network/capture/toggle`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setIsCapturing(data.capturing);
        showToast('success', data.capturing ? 'Packet sniffer active.' : 'Packet capture paused.');
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const handleCopyHex = () => {
    if (!selectedPacket || !selectedPacket.hex_dump) return;
    const hexText = selectedPacket.hex_dump.map(r => `${r.offset}  ${r.hex.join(' ')}  ${r.ascii}`).join('\n');
    navigator.clipboard.writeText(hexText);
    setCopiedHex(true);
    setTimeout(() => setCopiedHex(false), 2000);
    showToast('success', 'Hex dump copied to clipboard.');
  };

  // 60-Second Throughput Graph Calculations
  const historyData = telemetry?.history || [];
  const graphWidth = 900;
  const graphHeight = 150;
  const padding = 20;

  const maxRate = useMemo(() => {
    if (!historyData.length) return 1024;
    const maxVal = Math.max(...historyData.map(d => Math.max(d.bytes_sent_sec || 0, d.bytes_recv_sec || 0)));
    return Math.max(maxVal * 1.15, 1024);
  }, [historyData]);

  const { sendPath, recvPath, sendArea, recvArea, points } = useMemo(() => {
    if (!historyData.length) return { sendPath: '', recvPath: '', sendArea: '', recvArea: '', points: [] };

    const usableWidth = graphWidth - padding * 2;
    const usableHeight = graphHeight - padding * 2;
    const stepX = usableWidth / Math.max(1, historyData.length - 1);

    const pts = historyData.map((d, i) => {
      const x = padding + i * stepX;
      const ySend = padding + usableHeight - ((d.bytes_sent_sec || 0) / maxRate) * usableHeight;
      const yRecv = padding + usableHeight - ((d.bytes_recv_sec || 0) / maxRate) * usableHeight;
      return { x, ySend, yRecv, data: d };
    });

    const sPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.ySend.toFixed(1)}`).join(' ');
    const rPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yRecv.toFixed(1)}`).join(' ');
    const groundY = padding + usableHeight;
    const sArea = `${sPath} L ${pts[pts.length - 1].x.toFixed(1)} ${groundY} L ${pts[0].x.toFixed(1)} ${groundY} Z`;
    const rArea = `${rPath} L ${pts[pts.length - 1].x.toFixed(1)} ${groundY} L ${pts[0].x.toFixed(1)} ${groundY} Z`;

    return { sendPath: sPath, recvPath: rPath, sendArea: sArea, recvArea: rArea, points: pts };
  }, [historyData, maxRate]);

  // Filtered Process Trees for Section 3
  const filteredProcessTrees = useMemo(() => {
    return processTrees.filter(p => {
      if (selectedProcessFilter.trim()) {
        const q = selectedProcessFilter.toLowerCase();
        const match = (
          p.process_name?.toLowerCase().includes(q) ||
          p.pid?.toString().includes(q) ||
          p.exe_path?.toLowerCase().includes(q) ||
          p.sha256?.toLowerCase().includes(q)
        );
        if (!match) return false;
      }
      if (socketTypeFilter === 'UDP') return p.udp_count > 0;
      if (socketTypeFilter === 'TCP') return p.tcp_count > 0;
      return true;
    });
  }, [processTrees, selectedProcessFilter, socketTypeFilter]);

  const current = telemetry?.current || {};
  const totals = telemetry?.totals || {};
  const adapters = telemetry?.adapters || [];
  const primaryThreat = threatStories[0] || null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none text-white font-sans">
      
      {/* TOAST / ACTION BANNER */}
      {actionMessage && (
        <div className={`p-4 rounded-2xl flex items-center justify-between border transition-all animate-fade-in ${
          actionMessage.type === 'success' 
            ? 'bg-[#141414] border-[#FDE047]/40 text-[#FDE047]' 
            : 'bg-[#141414] border-neutral-700 text-neutral-300'
        }`}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#FDE047]" />
            <span className="text-xs font-semibold">{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-neutral-500 hover:text-white">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FDE047]/10 border border-[#FDE047]/30 flex items-center justify-center text-[#FDE047] shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-bold text-white tracking-wide uppercase">
                  PHANTOM 2.0 · Endpoint Threat Hunter & Network EDR
                </h1>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#FDE047]/10 text-[#FDE047] border border-[#FDE047]/30 font-extrabold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FDE047] animate-pulse" />
                  CORRELATION & HUNTER-KILLER ACTIVE
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Autonomous Hunter-Killer agent: Detects high-CPU spikes from rogue binaries and executes surgical severance.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={() => setActiveSection('arena')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-extrabold transition-all cursor-pointer border ${
              activeSection === 'arena'
                ? 'bg-[#FDE047] text-black border-[#FDE047] shadow-lg shadow-[#FDE047]/20'
                : 'bg-white/[0.04] text-white border-white/[0.1] hover:bg-white/[0.08]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Rogue .EXE Arena</span>
          </button>

          <button
            onClick={handleTriggerDemoChain}
            disabled={isDemoRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.1] text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 text-[#FDE047]" />
            <span>{isDemoRunning ? 'Simulating...' : 'Threat Chain Demo'}</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Recv Throughput */}
        <div className="bg-[#141414] border border-white/[0.08] rounded-[24px] p-5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono uppercase mb-2">
            <span>Download (Recv)</span>
            <ArrowDown className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {formatRate(current.bytes_recv_sec)}
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mt-2">
            <span>Total Recv:</span>
            <span className="text-neutral-300 font-bold">{totals.total_gb_recv ? `${totals.total_gb_recv} GB` : formatBytes(totals.total_bytes_recv)}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20" />
        </div>

        {/* Send Throughput */}
        <div className="bg-[#141414] border border-white/[0.08] rounded-[24px] p-5 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-[#FDE047] text-xs font-mono uppercase mb-2">
            <span>Upload (Send)</span>
            <ArrowUp className="w-4 h-4 text-[#FDE047]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#FDE047] tracking-tight">
            {formatRate(current.bytes_sent_sec)}
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mt-2">
            <span>Total Sent:</span>
            <span className="text-[#FDE047] font-bold">{totals.total_gb_sent ? `${totals.total_gb_sent} GB` : formatBytes(totals.total_bytes_sent)}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FDE047]" />
        </div>

        {/* Live Processor Load (System CPU) */}
        <div className="bg-[#141414] border border-white/[0.08] rounded-[24px] p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono uppercase mb-2">
            <span>System CPU Load</span>
            <Gauge className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight flex items-center justify-between">
            <span>{rogueStatus.system_cpu_total}%</span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              rogueStatus.system_cpu_total > 50 ? 'bg-[#FDE047] text-black animate-pulse' : 'bg-white/10 text-white'
            }`}>
              {rogueStatus.system_cpu_total > 50 ? 'HIGH SPIKE' : 'NORMAL'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mt-2">
            <span>Rogue Process CPU:</span>
            <span className={`font-bold ${rogueStatus.process_cpu > 40 ? 'text-[#FDE047]' : 'text-neutral-400'}`}>
              {rogueStatus.process_cpu}%
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-700" />
        </div>

        {/* Behavioral Threat Score */}
        <div className="bg-[#141414] border border-white/[0.08] rounded-[24px] p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono uppercase mb-2">
            <span>Peak Threat Risk</span>
            <AlertTriangle className="w-4 h-4 text-[#FDE047]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#FDE047] tracking-tight flex items-center justify-between">
            <span>{rogueStatus.is_running ? '98/100' : '86/100'}</span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              rogueStatus.is_running ? 'bg-[#FDE047] text-black' : 'bg-white/10 text-white'
            }`}>
              {rogueStatus.is_running ? 'CRITICAL' : 'CONTAINED'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mt-2">
            <span>Hunter Status:</span>
            <span className="text-white font-bold">{rogueStatus.status}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FDE047]" />
        </div>
      </div>

      {/* SECTION NAVIGATOR TABS */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 overflow-x-auto">
        <div className="flex items-center p-1 bg-[#141414] rounded-full border border-white/[0.08] min-w-max">
          <button
            onClick={() => setActiveSection('arena')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'arena'
                ? 'bg-[#FDE047] text-black shadow-lg shadow-[#FDE047]/10'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>🔥 Rogue .EXE Hunter Arena</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-black text-[#FDE047]">
              DEMO
            </span>
          </button>

          <button
            onClick={() => setActiveSection('story')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'story'
                ? 'bg-[#FDE047] text-black shadow-lg shadow-[#FDE047]/10'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Threat Story & Graph</span>
          </button>

          <button
            onClick={() => setActiveSection('proc_net')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'proc_net'
                ? 'bg-[#FDE047] text-black shadow-lg shadow-[#FDE047]/10'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Process ↔ Network Map</span>
          </button>

          <button
            onClick={() => setActiveSection('dpi')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'dpi'
                ? 'bg-[#FDE047] text-black shadow-lg shadow-[#FDE047]/10'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Deep Packet Inspector (DPI)</span>
          </button>

          <button
            onClick={() => setActiveSection('dns')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'dns'
                ? 'bg-[#FDE047] text-black shadow-lg shadow-[#FDE047]/10'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>DNS Monitor</span>
          </button>

          <button
            onClick={() => setActiveSection('evidence')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'evidence'
                ? 'bg-[#FDE047] text-black shadow-lg shadow-[#FDE047]/10'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>PCAP Evidence</span>
          </button>

          <button
            onClick={() => setActiveSection('adapters')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'adapters'
                ? 'bg-[#FDE047] text-black shadow-lg shadow-[#FDE047]/10'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Hardware Adapters</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: ROGUE .EXE HIGH-CPU & AUTONOMOUS HUNTER-KILLER ARENA */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'arena' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Main Mission Control Card */}
          <div className="bg-[#141414] border border-[#FDE047]/30 rounded-[28px] p-6 shadow-2xl space-y-6">
            
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
              <div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-[#FDE047] text-black text-xs font-mono font-extrabold flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 fill-black" />
                    LIVE COMBAT DEMO
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                    rogueStatus.is_running
                      ? 'bg-[#FDE047]/10 text-[#FDE047] border-[#FDE047] animate-pulse'
                      : rogueStatus.status === 'TERMINATED'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-white/5 text-neutral-400 border-white/10'
                  }`}>
                    {rogueStatus.is_running ? '🔥 ANOMALY ACTIVE · HIGH CPU SPIKE' : rogueStatus.status === 'TERMINATED' ? '✅ THREAT NEUTRALIZED' : 'STANDBY'}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mt-2">
                  Rogue Executable (.EXE) High-CPU Detection & Autonomous Hunter-Killer
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  Spawns standalone binary <code className="text-[#FDE047]">phantom_rogue_payload.exe</code> ➔ Multi-core CPU spikes to 75-95% ➔ PHANTOM detects anomaly and executes autonomous kill.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full lg:w-auto justify-end flex-wrap">
                <button
                  onClick={handleLaunchRogueExe}
                  disabled={isLaunchingRogue || rogueStatus.is_running}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FDE047] hover:bg-[#FACC15] text-black text-xs font-mono font-extrabold transition-all cursor-pointer shadow-lg shadow-[#FDE047]/20 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>{isLaunchingRogue ? 'Launching...' : '🚀 Launch Rogue .EXE'}</span>
                </button>

                <button
                  onClick={handleKillRogueExe}
                  disabled={isKillingRogue || !rogueStatus.is_running}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.1] text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-40"
                >
                  <XCircle className="w-4 h-4 text-[#FDE047]" />
                  <span>{isKillingRogue ? 'Killing...' : '🛑 Manual Kill Now'}</span>
                </button>

                <button
                  onClick={handleToggleAutoKill}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-bold transition-all cursor-pointer border ${
                    rogueStatus.auto_kill_enabled
                      ? 'bg-[#FDE047]/10 text-[#FDE047] border-[#FDE047]/40'
                      : 'bg-white/[0.02] text-neutral-400 border-white/[0.08]'
                  }`}
                  title="Toggle whether PHANTOM autonomously kills rogue processes within 2.5s"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Auto-Kill: {rogueStatus.auto_kill_enabled ? 'ON (2.5s Auto)' : 'OFF (Manual)'}</span>
                </button>
              </div>
            </div>

            {/* Live CPU & Anomaly Telemetry Gauges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Gauge 1: Process CPU Load */}
              <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] relative overflow-hidden font-mono">
                <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                  <span>Rogue Process CPU Load</span>
                  <Cpu className="w-4 h-4 text-[#FDE047]" />
                </div>
                <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
                  <span className={rogueStatus.process_cpu > 40 ? 'text-[#FDE047]' : 'text-white'}>
                    {rogueStatus.process_cpu}%
                  </span>
                  <span className="text-xs text-neutral-400 font-normal">core load</span>
                </div>
                {/* Visual Bar */}
                <div className="w-full bg-neutral-800 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-[#FDE047] transition-all duration-300"
                    style={{ width: `${Math.min(100, rogueStatus.process_cpu)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-neutral-500 mt-2">
                  <span>PID: {rogueStatus.pid || 'None'}</span>
                  <span>Threads: {rogueStatus.threads_count}</span>
                </div>
              </div>

              {/* Gauge 2: Overall System Processor */}
              <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] relative overflow-hidden font-mono">
                <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                  <span>Total System Processor</span>
                  <Gauge className="w-4 h-4 text-white" />
                </div>
                <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
                  <span>{rogueStatus.system_cpu_total}%</span>
                  <span className="text-xs text-neutral-400 font-normal">all cores</span>
                </div>
                <div className="w-full bg-neutral-800 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-300"
                    style={{ width: `${Math.min(100, rogueStatus.system_cpu_total)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-neutral-500 mt-2">
                  <span>Baseline: ~2.5%</span>
                  <span>Threshold: 50.0%</span>
                </div>
              </div>

              {/* Metric 3: Time to Mitigate */}
              <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-white/[0.08] relative overflow-hidden font-mono">
                <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                  <span>Mitigation Benchmark</span>
                  <ShieldCheck className="w-4 h-4 text-[#FDE047]" />
                </div>
                <div className="text-3xl font-extrabold text-[#FDE047] tracking-tight flex items-baseline gap-2">
                  <span>{rogueStatus.mitigation_time_seconds ? `${rogueStatus.mitigation_time_seconds}s` : (rogueStatus.is_running ? 'Hunting...' : 'Standby')}</span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-2 leading-relaxed">
                  Autonomous surveillance loop reaction time from anomaly identification to full socket and process severance.
                </p>
              </div>

            </div>

            {/* Target Process Forensic Blueprint */}
            <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/[0.06] font-mono text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Terminal className="w-3.5 h-3.5 text-[#FDE047]" />
                  <span>Target Process Blueprint: phantom_rogue_payload.exe</span>
                </div>
                <span className="text-[#FDE047] font-bold">Classification: CRYPTOMINER / RESOURCE HIJACK</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[11px] pt-1">
                <div>
                  <span className="text-neutral-500 block">Process PID:</span>
                  <span className="text-white font-bold">{rogueStatus.pid || 'Inactive'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Memory Footprint:</span>
                  <span className="text-white font-bold">{rogueStatus.process_memory_mb} MB</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Digital Signature:</span>
                  <span className="text-[#FDE047] font-bold">UNSIGNED (Heuristic Match)</span>
                </div>
                <div>
                  <span className="text-neutral-500 block">Execution Path:</span>
                  <span className="text-neutral-300 truncate block">d:\PHANTOOM\tools\phantom_rogue_payload.exe</span>
                </div>
              </div>
            </div>

            {/* Forensic Hunter-Killer Audit Ledger */}
            <div className="space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs text-neutral-400 border-b border-white/[0.06] pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#FDE047]" />
                  <span className="font-bold text-white uppercase tracking-wider">Hunter-Killer Execution Timeline</span>
                </div>
                <span>{rogueStatus.logs.length} Milestones Recorded</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {rogueStatus.logs.length === 0 ? (
                  <div className="p-6 text-center text-neutral-500 text-xs">
                    Click <strong>Launch Rogue .EXE</strong> above to trigger the live high-CPU anomaly and watch PHANTOM's hunter-killer agent execute real-time containment.
                  </div>
                ) : (
                  rogueStatus.logs.map((log, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#0A0A0A] border border-white/[0.06] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-neutral-500 text-[10px]">{log.time}</span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-bold ${
                          log.type === 'KILL' ? 'bg-[#FDE047] text-black font-extrabold' : 'bg-white/5 text-[#FDE047]'
                        }`}>
                          {log.type}
                        </span>
                        <span className="text-white font-bold">{log.title}</span>
                      </div>
                      <span className="text-neutral-400 text-[11px] truncate max-w-sm">{log.detail}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: THREAT STORY & ENDPOINT ATTACK GRAPH */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'story' && primaryThreat && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#141414] border border-[#FDE047]/30 rounded-[28px] p-6 shadow-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-[#FDE047] text-black text-xs font-mono font-extrabold">
                  {primaryThreat.incident_id}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                  primaryThreat.status === 'CONTAINED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-[#FDE047]/10 text-[#FDE047] border-[#FDE047]/40'
                }`}>
                  STATUS: {primaryThreat.status}
                </span>
                <span className="text-xs font-mono text-neutral-400">
                  Risk Score: <span className="text-[#FDE047] font-extrabold">{primaryThreat.risk_score}/100</span> ({primaryThreat.risk_level})
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-1.5">{primaryThreat.title}</h2>
              <p className="text-xs text-neutral-400 font-mono mt-0.5">
                Primary Vector: <span className="text-white font-bold">{primaryThreat.usb_device}</span> ➔ Spawned Binary: <span className="text-[#FDE047] font-bold">{primaryThreat.primary_process} (PID: {primaryThreat.primary_pid})</span>
              </p>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
              <button
                onClick={() => handleContainThreat(primaryThreat.primary_pid)}
                disabled={isContaining || primaryThreat.status === 'CONTAINED'}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FDE047] hover:bg-[#FACC15] text-black text-xs font-mono font-extrabold transition-all cursor-pointer shadow-lg shadow-[#FDE047]/20 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{primaryThreat.status === 'CONTAINED' ? 'Threat Contained' : '🛑 Surgically Annihilate & Sever'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 shadow-2xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <Share2 className="w-4 h-4 text-[#FDE047]" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Endpoint Attack Graph (NetworkX Execution Topology)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">
                    Click node to inspect forensic evidence
                  </span>
                </div>
              </div>

              <div className="relative w-full h-[360px] bg-[#0A0A0A] rounded-2xl border border-white/[0.06] overflow-hidden flex items-center justify-center p-2">
                <svg viewBox="0 0 860 380" className="w-full h-full">
                  <defs>
                    <marker id="arrowHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1 L 8 5 L 0 9 z" fill="#FDE047" />
                    </marker>
                    <marker id="arrowMuted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1 L 8 5 L 0 9 z" fill="#737373" />
                    </marker>
                  </defs>

                  {attackGraph.edges.map((e, idx) => {
                    const srcNode = attackGraph.nodes.find(n => n.id === e.source);
                    const dstNode = attackGraph.nodes.find(n => n.id === e.target);
                    if (!srcNode || !dstNode) return null;
                    const isHighlight = selectedGraphNode?.id === srcNode.id || selectedGraphNode?.id === dstNode.id;
                    return (
                      <g key={idx}>
                        <line
                          x1={srcNode.x + 40}
                          y1={srcNode.y + 20}
                          x2={dstNode.x + 40}
                          y2={dstNode.y + 20}
                          stroke={isHighlight ? "#FDE047" : "rgba(255,255,255,0.18)"}
                          strokeWidth={isHighlight ? "2.2" : "1.2"}
                          strokeDasharray={e.relation === "EXFILTRATES" ? "4 3" : undefined}
                          markerEnd={isHighlight ? "url(#arrowHead)" : "url(#arrowMuted)"}
                        />
                        <text
                          x={(srcNode.x + dstNode.x) / 2 + 40}
                          y={(srcNode.y + dstNode.y) / 2 + 15}
                          fill={isHighlight ? "#FDE047" : "rgba(255,255,255,0.35)"}
                          fontSize="8.5"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {e.label}
                        </text>
                      </g>
                    );
                  })}

                  {attackGraph.nodes.map((node) => {
                    const isSelected = selectedGraphNode?.id === node.id;
                    const isRiskNode = node.risk >= 80;
                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={() => setSelectedGraphNode(node)}
                        className="cursor-pointer group"
                      >
                        <rect
                          width="110"
                          height="44"
                          rx="10"
                          fill={isSelected ? "#1F1F1F" : "#141414"}
                          stroke={isSelected ? "#FDE047" : isRiskNode ? "#FDE047" : "rgba(255,255,255,0.15)"}
                          strokeWidth={isSelected ? "2" : "1"}
                          className="transition-all"
                        />
                        <text x="10" y="18" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                          {node.label}
                        </text>
                        <text x="10" y="32" fill="#A3A3A3" fontSize="8" fontFamily="monospace">
                          {node.sublabel.length > 18 ? node.sublabel.slice(0, 18) + '...' : node.sublabel}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {selectedGraphNode ? (
                <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-[#FDE047]/40 space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                    <span className="text-white font-bold">{selectedGraphNode.label} ({selectedGraphNode.type})</span>
                    <span className="text-[#FDE047] font-bold">Status: {selectedGraphNode.status}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {Object.entries(selectedGraphNode.details || {}).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span className="text-neutral-400">{k}:</span>
                        <span className="text-white font-bold truncate max-w-[170px]" title={String(v)}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-[#0A0A0A] rounded-xl border border-white/[0.04] text-[11px] font-mono text-neutral-400 text-center">
                  Click any node above to inspect its forensic fingerprint and evidence.
                </div>
              )}
            </div>

            <div className="lg:col-span-5 bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 shadow-2xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <Flame className="w-4 h-4 text-[#FDE047]" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Forensic Threat Story Timeline
                    </h3>
                  </div>
                </div>
              </div>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {primaryThreat.timeline?.map((step) => {
                  const isCritical = step.severity === 'CRITICAL';
                  const isContainment = step.stage === 'CONTAINMENT' || step.stage === 'INCIDENT_CONTAINED';
                  return (
                    <div
                      key={step.step}
                      className={`p-3 rounded-2xl border transition-all ${
                        isContainment
                          ? 'bg-emerald-500/5 border-emerald-500/30'
                          : isCritical
                          ? 'bg-[#FDE047]/10 border-[#FDE047]/40 text-white'
                          : 'bg-[#0A0A0A] border-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span className={isCritical ? 'text-[#FDE047] font-bold' : 'text-neutral-400'}>
                          Step {step.step} · {step.time}
                        </span>
                        <span className={`px-2 py-0.2 rounded-full font-extrabold text-[9px] ${
                          isContainment ? 'bg-emerald-500/20 text-emerald-400' : isCritical ? 'bg-[#FDE047] text-black' : 'bg-white/5 text-neutral-400'
                        }`}>
                          {step.stage}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white mb-0.5">{step.title}</h4>
                      <p className="text-[11px] text-neutral-300 leading-snug">{step.detail}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3: PROCESS ↔ NETWORK MAP (UDP & TCP TREES) */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'proc_net' && (
        <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] overflow-hidden shadow-2xl space-y-4 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-[#FDE047]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Process-to-Network Map (UDP & TCP Trees)
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter process, PID, hash..."
                  value={selectedProcessFilter}
                  onChange={(e) => setSelectedProcessFilter(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/[0.1] rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-[#FDE047]"
                />
              </div>

              <div className="flex items-center p-1 bg-[#0A0A0A] rounded-full border border-white/[0.08] font-mono text-[11px]">
                {['ALL', 'UDP', 'TCP'].map(st => (
                  <button
                    key={st}
                    onClick={() => setSocketTypeFilter(st)}
                    className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                      socketTypeFilter === st ? 'bg-[#FDE047] text-black shadow-sm' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
            {filteredProcessTrees.map((proc) => {
              const isHighRisk = proc.risk_score >= 70;
              return (
                <div
                  key={proc.pid}
                  className={`p-5 rounded-2xl border transition-all ${
                    isHighRisk ? 'bg-[#141414] border-[#FDE047]/40 shadow-xl' : 'bg-[#0A0A0A] border-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                        isHighRisk ? 'bg-[#FDE047] text-black' : 'bg-white/5 text-white'
                      }`}>
                        {proc.process_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white font-mono">{proc.process_name}</h4>
                          <span className="text-xs font-mono text-neutral-400">PID: <strong className="text-white">{proc.pid}</strong></span>
                        </div>
                        <p className="text-[11px] font-mono text-neutral-400 mt-0.5 truncate max-w-lg" title={proc.exe_path}>
                          Path: {proc.exe_path}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 space-y-1.5 font-mono text-xs">
                    {proc.sockets.map((s, sIdx) => (
                      <div
                        key={sIdx}
                        onClick={() => setSelectedSocketEvent({ ...s, process_name: proc.process_name, pid: proc.pid, exe_path: proc.exe_path, sha256: proc.sha256 })}
                        className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between text-xs cursor-pointer hover:bg-white/[0.05]"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-white/10 text-white">{s.protocol}</span>
                          <span className="text-white font-bold">{s.local_address}</span>
                          <span className="text-neutral-500">➔</span>
                          <span className="text-[#FDE047] font-bold">{s.remote_address}</span>
                        </div>
                        <span className="text-neutral-400 text-[11px]">{s.packets_count} pkts ({formatBytes(s.bytes_count)})</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 4: DEEP PACKET INSPECTOR (WIRESHARK 3-PANE WITH FIXES) */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'dpi' && (
        <div className="space-y-4">
          
          {/* DPI Filter & Action Bar */}
          <div className="bg-[#141414] border border-white/[0.08] rounded-[24px] p-4 shadow-xl space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Apply display filter... (e.g. 192.168, port 4444, powershell, udp)"
                  value={packetSearch}
                  onChange={(e) => setPacketSearch(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/[0.1] rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-[#FDE047]"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 font-mono text-[11px]">
                {['ALL', 'DNS', 'TLS', 'HTTP', 'TCP', 'UDP', 'REVERSE_SHELL'].map((proto) => (
                  <button
                    key={proto}
                    onClick={() => setPacketFilterProto(proto)}
                    className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap border ${
                      packetFilterProto === proto ? 'bg-[#FDE047] text-black border-[#FDE047]' : 'bg-white/[0.04] text-neutral-400 border-white/[0.08]'
                    }`}
                  >
                    {proto}
                  </button>
                ))}

                <button
                  onClick={() => setAttackOnly(!attackOnly)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap border ${
                    attackOnly ? 'bg-[#FDE047] text-black border-[#FDE047]' : 'bg-white/[0.04] text-neutral-300 border-white/[0.08]'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Attacks Only</span>
                </button>
              </div>
            </div>

            {/* Attack Injections */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-white/[0.04]">
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                <Zap className="w-3.5 h-3.5 text-[#FDE047]" />
                <span className="text-white font-bold uppercase tracking-wider text-[11px]">Inject Packet Signature:</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleSimulateAttack('REVERSE_SHELL')}
                  disabled={simulatingAttack !== null}
                  className="px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-[#FDE047]/10 text-white hover:text-[#FDE047] border border-white/[0.1] text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  ⚡ Reverse Shell (Port 4444)
                </button>
                <button
                  onClick={() => handleSimulateAttack('PORT_SCAN')}
                  disabled={simulatingAttack !== null}
                  className="px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-[#FDE047]/10 text-white hover:text-[#FDE047] border border-white/[0.1] text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  ⚡ Nmap SYN Scan Probe
                </button>
                <button
                  onClick={() => handleSimulateAttack('DNS_TUNNEL')}
                  disabled={simulatingAttack !== null}
                  className="px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-[#FDE047]/10 text-white hover:text-[#FDE047] border border-white/[0.1] text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  ⚡ DNS Exfiltration
                </button>
                <button
                  onClick={() => handleSimulateAttack('CLEARTEXT_CREDS')}
                  disabled={simulatingAttack !== null}
                  className="px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-[#FDE047]/10 text-white hover:text-[#FDE047] border border-white/[0.1] text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  ⚡ Cleartext Creds Leak
                </button>
              </div>
            </div>
          </div>

          {/* Pane 1: Packet Stream with Auto-Scroll Pause Control */}
          <div className="bg-[#141414] border border-white/[0.08] rounded-[24px] overflow-hidden shadow-2xl">
            <div className="p-3 bg-[#0F0F0F] border-b border-white/[0.08] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#FDE047]" />
                <span className="font-bold text-white uppercase tracking-wider">Packet Capture Stream</span>
                <span className="text-neutral-500 text-[10px]">({packets.length} frames visible)</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
                    autoScroll
                      ? 'bg-white/10 text-white border-white/20'
                      : 'bg-[#FDE047] text-black border-[#FDE047]'
                  }`}
                >
                  {autoScroll ? 'Auto-Scroll: ON' : '⏸️ Auto-Scroll: PAUSED'}
                </button>
                <button onClick={handleToggleCapture} className="text-xs font-bold hover:underline cursor-pointer text-[#FDE047]">
                  {isCapturing ? 'Pause Capture' : 'Resume Capture'}
                </button>
              </div>
            </div>

            {/* When Auto-Scroll is Paused because user selected a packet */}
            {!autoScroll && selectedPacket && (
              <div className="bg-[#FDE047]/10 border-b border-[#FDE047]/30 px-4 py-2 flex items-center justify-between text-xs font-mono">
                <span className="text-[#FDE047] flex items-center gap-2 font-bold">
                  <span>⏸️</span>
                  <span>Inspection Mode Active on Frame #{selectedPacket.no} (Auto-scroll paused)</span>
                </span>
                <button
                  onClick={() => setAutoScroll(true)}
                  className="px-3 py-1 rounded-full bg-[#FDE047] text-black font-extrabold text-[10px] hover:bg-[#FACC15] cursor-pointer"
                >
                  ▶ Resume Live Stream
                </button>
              </div>
            )}

            <div className="overflow-x-auto max-h-[300px] overflow-y-auto font-mono text-[11px] divide-y divide-white/[0.02]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#121212] border-b border-white/[0.08] text-neutral-400 text-[10px] uppercase tracking-wider z-10 select-none">
                  <tr>
                    <th className="py-2.5 px-3 w-16 text-center">No.</th>
                    <th className="py-2.5 px-3 w-24">Time</th>
                    <th className="py-2.5 px-4 w-44">Source</th>
                    <th className="py-2.5 px-4 w-44">Destination</th>
                    <th className="py-2.5 px-3 w-28 text-center">Protocol</th>
                    <th className="py-2.5 px-3 w-20 text-right">Length</th>
                    <th className="py-2.5 px-4">Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {packets.map((pkt) => {
                    const isSelected = selectedPacket?.no === pkt.no;
                    const isAttack = pkt.is_attack;
                    return (
                      <tr
                        key={pkt.no}
                        onClick={() => {
                          setSelectedPacket(pkt);
                          setAutoScroll(false); // CRITICAL FIX: STOP CONTINUOUS MOVING ON PACKET SELECTION!
                        }}
                        className={`cursor-pointer transition-colors group select-none ${
                          isSelected
                            ? 'bg-white/10 ring-1 ring-[#FDE047]/50 text-white font-semibold'
                            : isAttack
                            ? 'bg-[#FDE047]/10 text-[#FDE047] hover:bg-[#FDE047]/15'
                            : 'hover:bg-white/[0.03] text-neutral-300'
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-neutral-400 font-mono text-[10px]">{pkt.no}</td>
                        <td className="py-2 px-3 text-neutral-400 whitespace-nowrap">{pkt.timestamp}</td>
                        <td className="py-2 px-4 text-white truncate max-w-[170px]">{pkt.source}</td>
                        <td className="py-2 px-4 text-neutral-300 truncate max-w-[170px]">{pkt.destination}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                            isAttack ? 'bg-[#FDE047] text-black shadow-sm' : pkt.protocol === 'UDP' ? 'bg-white/10 text-white border border-white/20' : 'bg-white/[0.04] text-neutral-400'
                          }`}>
                            {pkt.protocol}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-neutral-400 font-mono">{pkt.length} B</td>
                        <td className="py-2 px-4 truncate max-w-[380px]" title={pkt.info}>
                          <span className={isAttack ? 'text-[#FDE047] font-bold' : 'text-neutral-300'}>{pkt.info}</span>
                        </td>
                      </tr>
                    );
                  })}
                  <div ref={packetListEndRef} />
                </tbody>
              </table>
            </div>
          </div>

          {/* Lower Two-Pane Grid: Dissection Tree & Fixed-Width Non-Overlapping Hex Dump */}
          {selectedPacket && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Pane 2: Dissection Tree */}
              <div className="bg-[#141414] border border-white/[0.08] rounded-[24px] overflow-hidden shadow-2xl flex flex-col">
                <div className="p-3 bg-[#0F0F0F] border-b border-white/[0.08] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-[#FDE047]" />
                    <span className="font-bold text-white uppercase tracking-wider">
                      Protocol Dissection (Frame #{selectedPacket.no})
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                    {selectedPacket.protocol} · {selectedPacket.length} bytes
                  </span>
                </div>

                <div className="p-4 space-y-2 overflow-y-auto max-h-[360px] font-mono text-xs">
                  {selectedPacket.dissection && Object.entries(selectedPacket.dissection).map(([layerKey, layerData]) => {
                    const isExpanded = expandedLayers[layerKey] ?? false;
                    const isThreatLayer = layerKey === 'threat_intel';
                    return (
                      <div
                        key={layerKey}
                        className={`rounded-xl border transition-all ${
                          isThreatLayer ? 'bg-[#FDE047]/10 border-[#FDE047]/40 text-[#FDE047]' : 'bg-[#0A0A0A] border-white/[0.06]'
                        }`}
                      >
                        <button
                          onClick={() => setExpandedLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }))}
                          className="w-full flex items-center justify-between p-3 text-left font-bold cursor-pointer hover:bg-white/[0.02]"
                        >
                          <div className="flex items-center gap-2 text-xs truncate max-w-[90%]">
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#FDE047]" /> : <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />}
                            <span className={isThreatLayer ? 'text-[#FDE047] font-extrabold' : 'text-neutral-200'}>{layerData.title}</span>
                          </div>
                          <span className="text-[10px] text-neutral-500 uppercase">{isExpanded ? 'Collapse' : 'Expand'}</span>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-3 pt-1 border-t border-white/[0.04] space-y-1.5 text-[11px]">
                            {Object.entries(layerData.fields || {}).map(([key, val]) => (
                              <div key={key} className="flex justify-between gap-2 py-0.5">
                                <span className={isThreatLayer ? 'text-[#FDE047] font-semibold' : 'text-neutral-400'}>{key}:</span>
                                <span className="text-white font-mono text-right break-all">{String(val)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pane 3: Hex & ASCII Inspector (CRITICAL FIX: PURE CSS GRID PREVENTING ANY OVERLAP) */}
              <div className="bg-[#141414] border border-white/[0.08] rounded-[24px] overflow-hidden shadow-2xl flex flex-col">
                <div className="p-3 bg-[#0F0F0F] border-b border-white/[0.08] flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-3.5 h-3.5 text-[#FDE047]" />
                    <span className="font-bold text-white uppercase tracking-wider">
                      Raw Hex & ASCII Dump ({selectedPacket.length} bytes)
                    </span>
                  </div>
                  <button
                    onClick={handleCopyHex}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.1] text-[10px] font-bold transition-all cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedHex ? 'Copied!' : 'Copy Hex'}</span>
                  </button>
                </div>

                {/* Fixed Grid Viewport: Col 1 (55px Offset) | Col 2 (310px Hex) | Col 3 (Dedicated ASCII Box) */}
                <div className="p-4 bg-[#0A0A0A] overflow-x-auto overflow-y-auto max-h-[360px] font-mono text-[11px] leading-tight space-y-1">
                  {selectedPacket.hex_dump?.map((row, rIdx) => (
                    <div
                      key={row.offset}
                      className="grid grid-cols-[55px_310px_1fr] items-center gap-3 hover:bg-white/[0.03] py-1 px-2 rounded border-b border-white/[0.02]"
                    >
                      {/* Column 1: Offset */}
                      <span className="text-neutral-500 font-bold select-none">{row.offset}</span>

                      {/* Column 2: 16 Hex Bytes with center divider */}
                      <div className="flex items-center gap-1.5 text-neutral-200 font-mono tracking-wide select-text">
                        <span className="space-x-1">{row.hex.slice(0, 8).join(' ')}</span>
                        <span className="text-neutral-600 font-bold select-none px-1">│</span>
                        <span className="space-x-1">{row.hex.slice(8, 16).join(' ')}</span>
                      </div>

                      {/* Column 3: ASCII printable representation in its own isolated column */}
                      <div className="text-[#FDE047] font-mono tracking-widest border-l border-white/[0.1] pl-3 select-text truncate">
                        {row.ascii}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 5: DNS MONITOR & RESOLVER INTELLIGENCE */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'dns' && (
        <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] overflow-hidden shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-[#FDE047]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                DNS Query Ledger & Domain Intelligence
              </h3>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              Live Flow: <strong className="text-white">PROCESS ➔ DNS ➔ DOMAIN ➔ IP ➔ SOCKET</strong>
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto font-mono text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0F0F0F] border-b border-white/[0.08] text-neutral-400 text-[10px] uppercase tracking-wider z-10">
                <tr>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-5">Process</th>
                  <th className="py-3 px-4">PID</th>
                  <th className="py-3 px-5">Query Domain</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-4">Resolver</th>
                  <th className="py-3 px-5">Resolved IP</th>
                  <th className="py-3 px-4 text-center">Entropy & Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {dnsLedger.map((d) => (
                  <tr key={d.query_id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 text-neutral-400">{d.timestamp}</td>
                    <td className="py-3 px-5 font-bold text-white">{d.process_name}</td>
                    <td className="py-3 px-4 text-neutral-300">{d.pid}</td>
                    <td className="py-3 px-5 text-[#FDE047] font-bold truncate max-w-[220px]" title={d.domain}>{d.domain}</td>
                    <td className="py-3 px-3"><span className="px-2 py-0.5 rounded bg-white/5 text-neutral-300 border border-white/10 text-[9px] font-bold">{d.record_type}</span></td>
                    <td className="py-3 px-4 text-neutral-400">{d.resolver}</td>
                    <td className="py-3 px-5 text-white font-bold">{d.resolved_ip}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-white/5 text-neutral-400">
                        {d.verdict} ({d.entropy})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 6: PCAP EVIDENCE */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'evidence' && evidenceData && (
        <div className="space-y-6">
          <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <Radio className="w-4 h-4 text-[#FDE047]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Network Protocol Distribution</h3>
              </div>
            </div>

            <div className="w-full h-4 rounded-full overflow-hidden flex bg-neutral-800">
              {evidenceData.protocol_distribution.map((p, idx) => (
                <div key={idx} style={{ width: `${p.percentage}%`, backgroundColor: p.color }} className="h-full" />
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              {evidenceData.protocol_distribution.map((p, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/[0.06] font-mono">
                  <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                    <span className="font-bold text-white">{p.protocol}</span>
                  </div>
                  <div className="text-xl font-bold text-white">{p.percentage}%</div>
                  <div className="text-[11px] text-neutral-500 mt-1">{p.packets} pkts · {p.bytes}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 7: ADAPTERS */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'adapters' && (
        <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-[#FDE047]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Hardware Network Adapters ({adapters.length})</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {adapters.map((adapter) => (
              <div key={adapter.interface} className="p-4 rounded-2xl border bg-[#0A0A0A] border-white/[0.1]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white font-mono">{adapter.interface}</span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white font-bold">
                    {adapter.is_up ? 'CONNECTED' : 'DISCONNECTED'}
                  </span>
                </div>
                <div className="space-y-1 text-[11px] font-mono text-neutral-400">
                  <div className="flex justify-between"><span>IP:</span><span className="text-neutral-200">{adapter.ipv4}</span></div>
                  <div className="flex justify-between"><span>Speed:</span><span className="text-white">{adapter.speed_mbps ? `${adapter.speed_mbps} Mbps` : 'N/A'}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PACKET / EVENT DETAIL MODAL */}
      {selectedSocketEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#FDE047]/40 rounded-[28px] max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FDE047]/10 border border-[#FDE047]/30 flex items-center justify-center text-[#FDE047]">
                  <Crosshair className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-mono uppercase">Packet & Event Detail</h4>
                  <p className="text-xs text-neutral-400 font-mono">Process ↔ Binary ↔ Network Correlation</p>
                </div>
              </div>
              <button onClick={() => setSelectedSocketEvent(null)} className="text-neutral-500 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/[0.06] space-y-2.5 font-mono text-xs">
              <div className="flex justify-between"><span className="text-neutral-500">Process Name:</span><span className="text-white font-bold">{selectedSocketEvent.process_name}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Process PID:</span><span className="text-[#FDE047] font-bold">{selectedSocketEvent.pid}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Protocol:</span><span className="text-white font-bold">{selectedSocketEvent.protocol}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Source:</span><span className="text-neutral-300">{selectedSocketEvent.local_address}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Destination:</span><span className="text-[#FDE047] font-bold">{selectedSocketEvent.remote_address}</span></div>
              <div className="border-t border-white/[0.06] pt-2 space-y-1">
                <span className="text-neutral-500 block">Associated File:</span>
                <span className="text-white text-[11px] break-all">{selectedSocketEvent.exe_path}</span>
              </div>
              <div className="space-y-1">
                <span className="text-neutral-500 block">SHA-256 Hash:</span>
                <span className="text-[#FDE047] text-[11px] break-all">{selectedSocketEvent.sha256}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedSocketEvent(null)}
                className="px-5 py-2 rounded-full text-xs font-bold bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.1] transition-all cursor-pointer"
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
