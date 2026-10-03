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
  Flame
} from 'lucide-react';

export function NetworkMonitorPage() {
  // Navigation Sections:
  // 'story'    -> Threat Story & Interactive Attack Graph (The Signature Correlation Feature)
  // 'proc_net' -> Process ↔ Network Map (UDP & TCP Trees, SHA256, File Attribution)
  // 'dpi'      -> Deep Packet Inspector (Wireshark 3-pane: Stream, Dissection, Hex)
  // 'dns'      -> DNS Monitor & Resolver Intelligence (Process -> DNS -> IP -> Connection)
  // 'evidence' -> PCAP-style Network Evidence & Protocol Distribution
  // 'adapters' -> Physical NIC Hardware Adapters
  const [activeSection, setActiveSection] = useState('story');

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

  // Interactive Selection State
  const [selectedGraphNode, setSelectedGraphNode] = useState(null);
  const [selectedSocketEvent, setSelectedSocketEvent] = useState(null);
  const [selectedProcessFilter, setSelectedProcessFilter] = useState('');
  const [socketTypeFilter, setSocketTypeFilter] = useState('ALL'); // 'ALL' | 'UDP' | 'TCP'
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [isContaining, setIsContaining] = useState(false);

  // Deep Packet Inspector (DPI) State
  const [packets, setPackets] = useState([]);
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [isCapturing, setIsCapturing] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
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

  // EDR Data Polling Loop (Process Trees, DNS, Stories, Graph, Evidence)
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

  useEffect(() => {
    if (autoScroll && packetListEndRef.current && activeSection === 'dpi') {
      packetListEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [packets, autoScroll, activeSection]);

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
      } else {
        showToast('error', data.detail || 'Failed to trigger demo chain.');
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
      } else {
        showToast('error', data.detail || 'Containment failed.');
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

  // Export Forensic Evidence
  const exportForensicEvidence = () => {
    const payload = {
      timestamp: new Date().toISOString(),
      threat_stories: threatStories,
      process_network_tree: processTrees,
      dns_ledger: dnsLedger,
      evidence: evidenceData
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute("href", dataStr);
    dl.setAttribute("download", `phantom_edr_forensic_evidence_${Date.now()}.json`);
    document.body.appendChild(dl);
    dl.click();
    dl.remove();
    showToast('success', 'Forensic evidence JSON exported successfully.');
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

  // Filtered Process Trees for Section 2
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
      if (socketTypeFilter === 'UDP') {
        return p.udp_count > 0;
      }
      if (socketTypeFilter === 'TCP') {
        return p.tcp_count > 0;
      }
      return true;
    });
  }, [processTrees, selectedProcessFilter, socketTypeFilter]);

  const current = telemetry?.current || {};
  const totals = telemetry?.totals || {};
  const primaryAdapter = telemetry?.primary_adapter || {};
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
                  CORRELATION ONLINE
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Autonomous correlation: <span className="text-white font-semibold">PROCESS ↔ FILE ↔ NETWORK (UDP/TCP/DNS) ↔ USB ↔ RESPONSE</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Demo Trigger */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={handleTriggerDemoChain}
            disabled={isDemoRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FDE047] text-black hover:bg-[#FACC15] text-xs font-mono font-extrabold transition-all cursor-pointer shadow-lg shadow-[#FDE047]/10 disabled:opacity-50"
            title="Simulate full USB ↔ Process ↔ UDP Exfil ↔ Canary Threat Chain"
          >
            <Zap className="w-3.5 h-3.5 fill-black" />
            <span>{isDemoRunning ? 'Simulating...' : '⚡ Run Threat Chain Demo'}</span>
          </button>

          <button
            onClick={exportForensicEvidence}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-white border border-white/[0.1] transition-all cursor-pointer"
            title="Export complete forensic evidence snapshot as JSON"
          >
            <Download className="w-3.5 h-3.5 text-neutral-300" />
            <span>Export Evidence</span>
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

        {/* Process ↔ Network Tracking */}
        <div className="bg-[#141414] border border-white/[0.08] rounded-[24px] p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono uppercase mb-2">
            <span>Mapped Processes</span>
            <Cpu className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {processTrees.length} <span className="text-xs text-neutral-400 font-normal">nodes</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mt-2">
            <span>UDP Sockets: <span className="text-white font-bold">{processTrees.reduce((acc, p) => acc + p.udp_count, 0)}</span></span>
            <span>TCP: <span className="text-[#FDE047] font-bold">{processTrees.reduce((acc, p) => acc + p.tcp_count, 0)}</span></span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-700" />
        </div>

        {/* Behavioral Threat Score */}
        <div className="bg-[#141414] border border-white/[0.08] rounded-[24px] p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono uppercase mb-2">
            <span>Peak Incident Risk</span>
            <AlertTriangle className="w-4 h-4 text-[#FDE047]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#FDE047] tracking-tight flex items-center justify-between">
            <span>{primaryThreat ? `${primaryThreat.risk_score}/100` : '0/100'}</span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
              primaryThreat?.status === 'CONTAINED' ? 'bg-white/10 text-white' : 'bg-[#FDE047] text-black'
            }`}>
              {primaryThreat?.status || 'NORMAL'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mt-2">
            <span>Correlated Chain:</span>
            <span className="text-white font-bold truncate max-w-[110px]">{primaryThreat?.incident_id || 'NONE'}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FDE047]" />
        </div>
      </div>

      {/* 60-SECOND ROLLING THROUGHPUT GRAPH */}
      <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Network Throughput (Last 60 Seconds)</h2>
              <span className="text-[10px] font-mono text-neutral-400 bg-white/[0.04] px-2.5 py-0.5 rounded-full border border-white/[0.06]">
                Peak: {formatRate(maxRate)}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Live hardware throughput delta calculated every 1000ms.
            </p>
          </div>

          <div className="flex items-center gap-5 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[#FDE047] inline-block shadow-sm" />
              <span className="text-neutral-300">Upload (Send)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-white inline-block shadow-sm" />
              <span className="text-neutral-300">Download (Recv)</span>
            </div>
          </div>
        </div>

        <div className="relative w-full overflow-hidden bg-[#0A0A0A] rounded-2xl border border-white/[0.06] p-4">
          <svg
            viewBox={`0 0 ${graphWidth} ${graphHeight}`}
            className="w-full h-36 sm:h-44 overflow-visible"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="yellowAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FDE047" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#FDE047" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="whiteAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
              const y = padding + (graphHeight - padding * 2) * (1 - ratio);
              return (
                <g key={ratio}>
                  <line x1={padding} y1={y} x2={graphWidth - padding} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" strokeWidth="1" />
                  <text x={padding + 4} y={y - 4} fill="rgba(255,255,255,0.25)" fontSize="9" fontFamily="monospace">
                    {formatRate(maxRate * ratio)}
                  </text>
                </g>
              );
            })}

            {recvArea && <path d={recvArea} fill="url(#whiteAreaGrad)" />}
            {sendArea && <path d={sendArea} fill="url(#yellowAreaGrad)" />}
            {recvPath && <path d={recvPath} fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />}
            {sendPath && <path d={sendPath} fill="none" stroke="#FDE047" strokeWidth="2.2" strokeLinecap="round" />}

            {points.map((p, idx) => (
              <rect
                key={idx}
                x={p.x - 7}
                y={padding}
                width="14"
                height={graphHeight - padding * 2}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredPoint(p)}
              />
            ))}

            {hoveredPoint && (
              <g>
                <line x1={hoveredPoint.x} y1={padding} x2={hoveredPoint.x} y2={graphHeight - padding} stroke="#FDE047" strokeWidth="1.2" strokeDasharray="3 3" />
                <circle cx={hoveredPoint.x} cy={hoveredPoint.ySend} r="4" fill="#FDE047" stroke="#000" strokeWidth="1.5" />
                <circle cx={hoveredPoint.x} cy={hoveredPoint.yRecv} r="4" fill="#FFFFFF" stroke="#000" strokeWidth="1.5" />
              </g>
            )}
          </svg>

          {hoveredPoint && (
            <div
              className="absolute pointer-events-none px-3 py-2 rounded-xl bg-[#141414] border border-[#FDE047]/40 shadow-2xl text-[11px] font-mono z-20 space-y-1 transform -translate-x-1/2 -translate-y-full"
              style={{ left: `${(hoveredPoint.x / graphWidth) * 100}%`, top: '25%' }}
            >
              <div className="text-neutral-400 border-b border-white/[0.08] pb-1">
                Time: {hoveredPoint.data.timestamp}
              </div>
              <div className="flex items-center gap-2 text-[#FDE047] font-bold">
                <span>↑ Upload:</span>
                <span>{formatRate(hoveredPoint.data.bytes_sent_sec)}</span>
              </div>
              <div className="flex items-center gap-2 text-white font-bold">
                <span>↓ Download:</span>
                <span>{formatRate(hoveredPoint.data.bytes_recv_sec)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION NAVIGATOR TABS */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 overflow-x-auto">
        <div className="flex items-center p-1 bg-[#141414] rounded-full border border-white/[0.08] min-w-max">
          <button
            onClick={() => setActiveSection('story')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'story'
                ? 'bg-[#FDE047] text-black shadow-lg shadow-[#FDE047]/10'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Threat Story & Attack Graph</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-black text-[#FDE047]">
              HOT
            </span>
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
            <span className="text-[10px] text-neutral-400 font-mono">({processTrees.length})</span>
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
      {/* SECTION 1: THREAT STORY & ENDPOINT ATTACK GRAPH (THE GOATED FEATURE) */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'story' && primaryThreat && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Incident Banner & Containment Action */}
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
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-mono font-extrabold transition-all cursor-pointer ${
                  primaryThreat.status === 'CONTAINED'
                    ? 'bg-white/5 text-neutral-400 border border-white/10 cursor-not-allowed'
                    : 'bg-[#FDE047] hover:bg-[#FACC15] text-black shadow-lg shadow-[#FDE047]/20'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{primaryThreat.status === 'CONTAINED' ? 'Threat Contained' : '🛑 Surgically Annihilate & Sever'}</span>
              </button>
            </div>
          </div>

          {/* TWO COLUMN GRID: ATTACK GRAPH (LEFT) & THREAT STORY (RIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT (7 COLS): INTERACTIVE ENDPOINT ATTACK GRAPH */}
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
                <p className="text-xs text-neutral-400">
                  Directed causal DAG linking USB vector, rogue executable, DNS lookup, UDP bursts, canary bait, and containment.
                </p>
              </div>

              {/* SVG Attack Graph Canvas */}
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

                  {/* Edges */}
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

                  {/* Nodes */}
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

              {/* Selected Node Evidence Inspector Drawer */}
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

            {/* RIGHT (5 COLS): FORENSIC "THREAT STORY" TIMELINE */}
            <div className="lg:col-span-5 bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 shadow-2xl space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <Flame className="w-4 h-4 text-[#FDE047]" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Forensic Threat Story Timeline
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[#FDE047] font-bold">
                    {primaryThreat.timeline?.length || 0} Forensic Milestones
                  </span>
                </div>
                <p className="text-xs text-neutral-400">
                  Chronological progression of the compromise chain from physical insertion to automated containment.
                </p>
              </div>

              {/* Vertical Timeline Ledger */}
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
                          isContainment
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isCritical
                            ? 'bg-[#FDE047] text-black'
                            : 'bg-white/5 text-neutral-400'
                        }`}>
                          {step.stage}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white mb-0.5">{step.title}</h4>
                      <p className="text-[11px] text-neutral-300 leading-snug">{step.detail}</p>
                      
                      {step.evidence && (
                        <div className="mt-1.5 pt-1 border-t border-white/[0.06] text-[10px] font-mono text-[#FDE047] truncate">
                          {step.evidence}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Risk Engine Breakdown Footer */}
              <div className="p-3 bg-[#0A0A0A] rounded-2xl border border-white/[0.06] space-y-1.5 font-mono text-[10px]">
                <div className="flex justify-between font-bold text-white border-b border-white/[0.06] pb-1">
                  <span>Behavioral Risk Factors:</span>
                  <span className="text-[#FDE047]">Score: 86 / 100</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {primaryThreat.risk_breakdown?.map((rf, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-white/[0.04] text-neutral-300 border border-white/[0.08]" title={rf.reason}>
                      {rf.factor} <strong className="text-[#FDE047]">+{rf.points}</strong>
                    </span>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: PROCESS ↔ NETWORK MAP (UDP & TCP SOCKET TREES) */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'proc_net' && (
        <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] overflow-hidden shadow-2xl space-y-4 p-6">
          
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
            <div>
              <div className="flex items-center gap-2.5">
                <Cpu className="w-4 h-4 text-[#FDE047]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Process-to-Network Map (UDP & TCP Trees)
                </h3>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Full process attribution: Binary path, SHA-256 hash, signature verification, and granular socket trees.
              </p>
            </div>

            {/* Filter Bar */}
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

          {/* Process Hierarchy Cards */}
          <div className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
            {filteredProcessTrees.map((proc) => {
              const isHighRisk = proc.risk_score >= 70;
              const isThreat = proc.is_threat;

              return (
                <div
                  key={proc.pid}
                  className={`p-5 rounded-2xl border transition-all ${
                    isHighRisk
                      ? 'bg-[#141414] border-[#FDE047]/40 shadow-xl'
                      : 'bg-[#0A0A0A] border-white/[0.06] hover:border-white/20'
                  }`}
                >
                  {/* Top Row: Process Info & Badges */}
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
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                            proc.is_signed
                              ? 'bg-white/5 text-neutral-300 border-white/10'
                              : 'bg-[#FDE047]/10 text-[#FDE047] border-[#FDE047]/30'
                          }`}>
                            {proc.is_signed ? 'SIGNED' : 'UNSIGNED'}
                          </span>
                          {proc.is_usb_origin && (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold bg-[#FDE047] text-black">
                              USB ORIGIN
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-neutral-400 mt-0.5 truncate max-w-lg" title={proc.exe_path}>
                          Path: {proc.exe_path}
                        </p>
                      </div>
                    </div>

                    {/* Behavioral Risk Badge & Sockets Count */}
                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono text-xs">
                        <div className="text-neutral-400">Behavioral Risk:</div>
                        <div className={`font-extrabold text-sm ${isHighRisk ? 'text-[#FDE047]' : 'text-neutral-200'}`}>
                          {proc.risk_score} / 100 ({proc.risk_level})
                        </div>
                      </div>
                      {isHighRisk && proc.status !== 'CONTAINED' && (
                        <button
                          onClick={() => handleContainThreat(proc.pid)}
                          className="px-3 py-1.5 rounded-full bg-[#FDE047] hover:bg-[#FACC15] text-black text-xs font-mono font-bold transition-all cursor-pointer"
                        >
                          Kill Tree
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: SHA-256 Hash & Child Processes */}
                  <div className="py-2.5 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-neutral-400 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2 truncate max-w-md">
                      <span className="text-neutral-500">SHA-256:</span>
                      <span className="text-white truncate" title={proc.sha256}>{proc.sha256}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(proc.sha256);
                          showToast('success', 'SHA-256 hash copied.');
                        }}
                        className="text-neutral-500 hover:text-white"
                        title="Copy SHA-256"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>

                    {proc.child_processes && proc.child_processes.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[#FDE047] font-bold">Child Process:</span>
                        {proc.child_processes.map(cp => (
                          <span key={cp.pid} className="px-2 py-0.5 rounded bg-white/[0.04] text-white">
                            {cp.name} (PID: {cp.pid})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Sockets Breakdown Tree */}
                  <div className="pt-3 space-y-1.5 font-mono text-xs">
                    <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">
                      Active Socket Tree ({proc.sockets.length} descriptors):
                    </div>
                    {proc.sockets.map((s, sIdx) => {
                      const isUdp = s.protocol === 'UDP';
                      return (
                        <div
                          key={sIdx}
                          onClick={() => setSelectedSocketEvent({ ...s, process_name: proc.process_name, pid: proc.pid, exe_path: proc.exe_path, sha256: proc.sha256 })}
                          className={`p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                            s.is_suspicious
                              ? 'bg-[#FDE047]/10 border-[#FDE047]/40 text-[#FDE047] hover:bg-[#FDE047]/15'
                              : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05] text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${
                              isUdp ? 'bg-white/10 text-white border border-white/20' : 'bg-[#FDE047] text-black'
                            }`}>
                              {s.protocol}
                            </span>
                            <span className="text-white font-bold">{s.local_address}</span>
                            <span className="text-neutral-500">➔</span>
                            <span className="text-[#FDE047] font-bold">{s.remote_address}</span>
                            <span className="text-neutral-400 text-[11px]">({s.service})</span>
                          </div>

                          <div className="flex items-center gap-4 text-[11px] text-neutral-400">
                            <span>{s.packets_count} pkts ({formatBytes(s.bytes_count)})</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                              s.state === 'ESTABLISHED' || s.state === 'OUTBOUND'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-white/5 text-neutral-400 border-white/10'
                            }`}>
                              {s.state}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3: DEEP PACKET INSPECTOR (AUTHENTIC 3-PANE WIRESHARK ENGINE) */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'dpi' && (
        <div className="space-y-4">
          
          {/* DPI Toolbar */}
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
                      packetFilterProto === proto
                        ? 'bg-[#FDE047] text-black border-[#FDE047]'
                        : 'bg-white/[0.04] text-neutral-400 border-white/[0.08] hover:text-white'
                    }`}
                  >
                    {proto}
                  </button>
                ))}

                <button
                  onClick={() => setAttackOnly(!attackOnly)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap border ${
                    attackOnly
                      ? 'bg-[#FDE047] text-black border-[#FDE047]'
                      : 'bg-white/[0.04] text-neutral-300 border-white/[0.08]'
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
                <span className="text-white font-bold uppercase tracking-wider text-[11px]">Inject Packet Attack Signature:</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleSimulateAttack('REVERSE_SHELL')}
                  disabled={simulatingAttack !== null}
                  className="px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-[#FDE047]/10 text-white hover:text-[#FDE047] border border-white/[0.1] hover:border-[#FDE047]/40 text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  ⚡ Reverse Shell (Port 4444)
                </button>
                <button
                  onClick={() => handleSimulateAttack('PORT_SCAN')}
                  disabled={simulatingAttack !== null}
                  className="px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-[#FDE047]/10 text-white hover:text-[#FDE047] border border-white/[0.1] hover:border-[#FDE047]/40 text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  ⚡ Nmap SYN Scan Probe
                </button>
                <button
                  onClick={() => handleSimulateAttack('DNS_TUNNEL')}
                  disabled={simulatingAttack !== null}
                  className="px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-[#FDE047]/10 text-white hover:text-[#FDE047] border border-white/[0.1] hover:border-[#FDE047]/40 text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  ⚡ DNS Exfiltration
                </button>
                <button
                  onClick={() => handleSimulateAttack('CLEARTEXT_CREDS')}
                  disabled={simulatingAttack !== null}
                  className="px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-[#FDE047]/10 text-white hover:text-[#FDE047] border border-white/[0.1] hover:border-[#FDE047]/40 text-xs font-mono font-bold transition-all cursor-pointer"
                >
                  ⚡ Cleartext Creds Leak
                </button>
              </div>
            </div>
          </div>

          {/* Pane 1: Packet Stream */}
          <div className="bg-[#141414] border border-white/[0.08] rounded-[24px] overflow-hidden shadow-2xl">
            <div className="p-3 bg-[#0F0F0F] border-b border-white/[0.08] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#FDE047]" />
                <span className="font-bold text-white uppercase tracking-wider">Packet Capture Stream</span>
                <span className="text-neutral-500 text-[10px]">({packets.length} frames visible)</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleToggleCapture} className="text-xs font-bold hover:underline cursor-pointer text-[#FDE047]">
                  {isCapturing ? 'Pause Capture' : 'Resume Capture'}
                </button>
              </div>
            </div>

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
                        onClick={() => setSelectedPacket(pkt)}
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
                            isAttack
                              ? 'bg-[#FDE047] text-black shadow-sm'
                              : pkt.protocol === 'UDP'
                              ? 'bg-white/10 text-white border border-white/20'
                              : 'bg-white/[0.04] text-neutral-400'
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

          {/* Lower Two-Pane Grid: Dissection Tree & Hex Dump */}
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

              {/* Pane 3: Hex & ASCII Inspector */}
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

                <div className="p-4 bg-[#0A0A0A] overflow-x-auto overflow-y-auto max-h-[360px] font-mono text-[11px] leading-relaxed">
                  {selectedPacket.hex_dump?.map((row, rIdx) => (
                    <div key={row.offset} className="flex items-center gap-3 hover:bg-white/[0.02] py-0.5 px-1 rounded">
                      <span className="text-neutral-500 font-bold w-12 shrink-0 select-none">{row.offset}</span>
                      <div className="flex items-center gap-1.5 w-[280px] shrink-0 text-white">
                        <span>{row.hex.slice(0, 8).join(' ')}</span>
                        <span className="text-neutral-600">|</span>
                        <span>{row.hex.slice(8, 16).join(' ')}</span>
                      </div>
                      <span className="text-[#FDE047] border-l border-white/[0.08] pl-3 tracking-widest truncate">{row.ascii}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 4: DNS MONITOR & RESOLVER INTELLIGENCE */}
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
              Live Resolution Flow: <strong className="text-white">PROCESS ➔ DNS ➔ DOMAIN ➔ IP ➔ SOCKET</strong>
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
                {dnsLedger.map((d) => {
                  const isAnom = d.is_anomalous || d.entropy > 4.0;
                  return (
                    <tr key={d.query_id} className={`hover:bg-white/[0.02] transition-colors ${isAnom ? 'bg-[#FDE047]/5' : ''}`}>
                      <td className="py-3 px-4 text-neutral-400">{d.timestamp}</td>
                      <td className="py-3 px-5 font-bold text-white">{d.process_name}</td>
                      <td className="py-3 px-4 text-neutral-300">{d.pid}</td>
                      <td className="py-3 px-5 text-[#FDE047] font-bold truncate max-w-[220px]" title={d.domain}>{d.domain}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-neutral-300 border border-white/10 text-[9px] font-bold">
                          {d.record_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-neutral-400">{d.resolver}</td>
                      <td className="py-3 px-5 text-white font-bold">{d.resolved_ip}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                          isAnom ? 'bg-[#FDE047] text-black' : 'bg-white/5 text-neutral-400'
                        }`}>
                          {d.verdict} ({d.entropy})
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 5: PCAP EVIDENCE & PROTOCOL DISTRIBUTION */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'evidence' && evidenceData && (
        <div className="space-y-6">
          
          {/* Protocol Distribution Breakdown */}
          <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <Radio className="w-4 h-4 text-[#FDE047]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Network Protocol Distribution
                </h3>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">
                Calculated across captured hardware wire frames
              </span>
            </div>

            {/* Visual Multi-Segment Bar */}
            <div className="w-full h-4 rounded-full overflow-hidden flex bg-neutral-800">
              {evidenceData.protocol_distribution.map((p, idx) => (
                <div
                  key={idx}
                  style={{ width: `${p.percentage}%`, backgroundColor: p.color }}
                  title={`${p.protocol}: ${p.percentage}% (${p.packets} packets, ${p.bytes})`}
                  className="h-full transition-all"
                />
              ))}
            </div>

            {/* Protocol Distribution Cards */}
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

          {/* Top Destination Forensics */}
          <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2.5">
                <Activity className="w-4 h-4 text-[#FDE047]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Top Network Destinations & Target Forensics
                </h3>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto font-mono text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#0F0F0F] border-b border-white/[0.08] text-neutral-400 text-[10px] uppercase tracking-wider z-10">
                  <tr>
                    <th className="py-3 px-5">Target IP</th>
                    <th className="py-3 px-4">Port</th>
                    <th className="py-3 px-4">Protocol</th>
                    <th className="py-3 px-5">Service Attribution</th>
                    <th className="py-3 px-4">Packets</th>
                    <th className="py-3 px-4">Volume</th>
                    <th className="py-3 px-4 text-center">Threat Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {evidenceData.top_destinations.map((td, idx) => (
                    <tr key={idx} className={`hover:bg-white/[0.02] ${td.threat === 'CRITICAL' ? 'bg-[#FDE047]/5' : ''}`}>
                      <td className="py-3 px-5 font-bold text-white">{td.ip}</td>
                      <td className="py-3 px-4 text-neutral-300 font-bold">{td.port}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-white/5 text-neutral-300 text-[9px] font-bold">
                          {td.protocol}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-neutral-300">{td.service}</td>
                      <td className="py-3 px-4 text-white font-bold">{td.packets}</td>
                      <td className="py-3 px-4 text-neutral-400">{td.bytes}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                          td.threat === 'CRITICAL' ? 'bg-[#FDE047] text-black' : 'bg-white/5 text-neutral-400'
                        }`}>
                          {td.threat}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 6: PHYSICAL HARDWARE ADAPTERS */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'adapters' && (
        <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-[#FDE047]" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Hardware Network Adapters ({adapters.length})</h3>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              {adapters.filter(a => a.is_up).length} Active Link(s)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {adapters.map((adapter) => {
              const isUp = adapter.is_up;
              return (
                <div
                  key={adapter.interface}
                  className={`p-4 rounded-2xl border transition-all ${
                    isUp 
                      ? 'bg-[#0A0A0A] border-white/[0.1] hover:border-[#FDE047]/40 shadow-md' 
                      : 'bg-[#0A0A0A]/40 border-white/[0.04] opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white font-mono truncate max-w-[170px]" title={adapter.interface}>
                      {adapter.interface}
                    </span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                      isUp 
                        ? 'bg-white/10 text-white border-white/20 font-bold' 
                        : 'bg-neutral-800 text-neutral-500 border-neutral-700'
                    }`}>
                      {isUp ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-[11px] font-mono text-neutral-400">
                    <div className="flex justify-between">
                      <span>IP Address:</span>
                      <span className="text-neutral-200">{adapter.ipv4}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>MAC Address:</span>
                      <span className="text-neutral-300 truncate max-w-[130px]">{adapter.mac}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Link Speed:</span>
                      <span className="text-white">{adapter.speed_mbps ? `${adapter.speed_mbps} Mbps` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/[0.06] pt-1 mt-1 text-[10px] text-neutral-500">
                      <span>↑ {formatBytes(adapter.bytes_sent)}</span>
                      <span>↓ {formatBytes(adapter.bytes_recv)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PACKET / EVENT DETAIL MODAL (FILE + SHA256 ATTRIBUTION) */}
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
              <div className="flex justify-between">
                <span className="text-neutral-500">Process Name:</span>
                <span className="text-white font-bold">{selectedSocketEvent.process_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Process PID:</span>
                <span className="text-[#FDE047] font-bold">{selectedSocketEvent.pid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Protocol:</span>
                <span className="text-white font-bold">{selectedSocketEvent.protocol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Source:</span>
                <span className="text-neutral-300">{selectedSocketEvent.local_address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Destination:</span>
                <span className="text-[#FDE047] font-bold">{selectedSocketEvent.remote_address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Packets / Bytes:</span>
                <span className="text-white">{selectedSocketEvent.packets_count} pkts ({formatBytes(selectedSocketEvent.bytes_count)})</span>
              </div>
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
