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
  FileCode
} from 'lucide-react';

export function NetworkMonitorPage() {
  // Navigation Section: 'dpi' (Wireshark-style DPI Triage) | 'sockets' (Resource Monitor) | 'adapters' (Hardware)
  const [activeSection, setActiveSection] = useState('dpi');

  // Live Telemetry & Hardware State
  const [telemetry, setTelemetry] = useState(null);
  const [connections, setConnections] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Packet Sniffer (Wireshark-style DPI) State
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

  // Expanded layers in Packet Dissection Tree
  const [expandedLayers, setExpandedLayers] = useState({
    frame: true,
    ethernet: false,
    ip: true,
    transport: true,
    application: true,
    threat_intel: true
  });

  // Active Sockets Table Filter State
  const [socketSearch, setSocketSearch] = useState('');
  const [socketStateFilter, setSocketStateFilter] = useState('ALL');
  const [socketProtoFilter, setSocketProtoFilter] = useState('ALL');
  const [socketSubTab, setSocketSubTab] = useState('connections'); // 'connections' | 'processes' | 'listening'

  // Process Kill Modal State
  const [killModalProc, setKillModalProc] = useState(null);
  const [killingPid, setKillingPid] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const packetListEndRef = useRef(null);
  const isCapturingRef = useRef(isCapturing);
  isCapturingRef.current = isCapturing;

  const showToast = (type, text) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Format bytes helper
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

  // 1-Second Telemetry & Sockets Polling Loop
  useEffect(() => {
    let mounted = true;

    const fetchTelemetry = async () => {
      try {
        const [telRes, connRes, procRes] = await Promise.all([
          fetch(`http://${window.location.hostname}:8001/api/network/telemetry`),
          fetch(`http://${window.location.hostname}:8001/api/network/connections?limit=250`),
          fetch(`http://${window.location.hostname}:8001/api/network/processes`)
        ]);

        if (telRes.ok && mounted) {
          const telData = await telRes.json();
          setTelemetry(telData);
        }
        if (connRes.ok && mounted) {
          const connData = await connRes.json();
          setConnections(connData);
        }
        if (procRes.ok && mounted) {
          const procData = await procRes.json();
          setProcesses(procData);
        }
      } catch (err) {
        console.error("Failed to fetch network telemetry:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 1000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // 1-Second Packet Sniffer (Wireshark DPI) Polling Loop
  const fetchPackets = useCallback(async () => {
    if (!isCapturingRef.current) return;
    try {
      const params = new URLSearchParams();
      params.append('limit', '140');
      if (packetFilterProto !== 'ALL') params.append('protocol', packetFilterProto);
      if (attackOnly) params.append('attack_only', 'true');
      if (packetSearch.trim()) params.append('search', packetSearch.trim());

      const res = await fetch(`http://${window.location.hostname}:8001/api/network/packets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPackets(data);

        // Select latest packet if none currently selected
        setSelectedPacket((prev) => {
          if (!prev && data.length > 0) {
            return data[data.length - 1];
          }
          // If previous exists, keep it or refresh with latest matching frame
          if (prev) {
            const found = data.find(p => p.no === prev.no);
            return found || prev;
          }
          return null;
        });
      }
    } catch (err) {
      console.error("Failed to fetch packet frames:", err);
    }
  }, [packetFilterProto, attackOnly, packetSearch]);

  useEffect(() => {
    fetchPackets();
    const interval = setInterval(fetchPackets, 1000);
    return () => clearInterval(interval);
  }, [fetchPackets]);

  // Auto-scroll packet list pane to bottom when new frames arrive
  useEffect(() => {
    if (autoScroll && packetListEndRef.current && activeSection === 'dpi') {
      packetListEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [packets, autoScroll, activeSection]);

  // Toggle Sniffer Capture
  const handleToggleCapture = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/network/capture/toggle`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setIsCapturing(data.capturing);
        showToast('success', data.capturing ? 'Packet sniffer active (capturing live frames).' : 'Packet sniffer paused.');
      }
    } catch (err) {
      showToast('error', 'Failed to toggle capture: ' + err.message);
    }
  };

  // Clear Packet Buffer
  const handleClearPackets = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/network/capture/clear`, {
        method: 'POST'
      });
      if (res.ok) {
        setPackets([]);
        setSelectedPacket(null);
        showToast('success', 'Packet capture buffer cleared.');
      }
    } catch (err) {
      showToast('error', 'Failed to clear packet buffer: ' + err.message);
    }
  };

  // Simulate Cyber Attack Injection
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
        showToast('success', `🚨 Attack Injected: ${data.attack_type} (${data.frames_injected} frames)`);
        // Immediately refresh packets and auto-select the injected attack packet
        await fetchPackets();
        if (data.packets && data.packets.length > 0) {
          const firstAttackPkt = data.packets[0];
          setSelectedPacket(firstAttackPkt);
          // Auto-expand threat intel layer
          setExpandedLayers(prev => ({ ...prev, threat_intel: true, application: true, transport: true }));
        }
      } else {
        showToast('error', data.detail || 'Failed to simulate attack.');
      }
    } catch (err) {
      showToast('error', 'Error injecting attack: ' + err.message);
    } finally {
      setSimulatingAttack(null);
    }
  };

  // Toggle Dissection Tree Accordion Layer
  const toggleLayer = (layerKey) => {
    setExpandedLayers(prev => ({
      ...prev,
      [layerKey]: !prev[layerKey]
    }));
  };

  // Copy Hex Dump to Clipboard
  const handleCopyHex = () => {
    if (!selectedPacket || !selectedPacket.hex_dump) return;
    const hexText = selectedPacket.hex_dump.map(r => `${r.offset}  ${r.hex.join(' ')}  ${r.ascii}`).join('\n');
    navigator.clipboard.writeText(hexText);
    setCopiedHex(true);
    setTimeout(() => setCopiedHex(false), 2000);
    showToast('success', 'Hex dump copied to clipboard.');
  };

  // Kill Process Action
  const handleKillProcess = async (pid) => {
    setKillingPid(pid);
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/network/kill/${pid}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', data.message || `Process ${pid} terminated.`);
        setConnections(prev => prev.filter(c => c.pid !== pid));
        setProcesses(prev => prev.filter(p => p.pid !== pid));
      } else {
        showToast('error', data.detail || `Failed to terminate PID ${pid}.`);
      }
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setKillingPid(null);
      setKillModalProc(null);
    }
  };

  // Export CSV of active connections
  const exportConnectionsCSV = () => {
    if (!connections.length) return;
    const headers = ['PID', 'Process', 'Protocol', 'Local Address', 'Remote Address', 'State', 'Risk'];
    const rows = connections.map(c => [
      c.pid,
      `"${c.process_name || ''}"`,
      c.protocol,
      `"${c.local_address || ''}"`,
      `"${c.remote_address || ''}"`,
      c.status,
      c.risk_level
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `phantom_network_sockets_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate 60s SVG Graph Dimensions and Path
  const historyData = telemetry?.history || [];
  const graphWidth = 900;
  const graphHeight = 160;
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

  // Filter Active Connections for Resource Monitor Tab
  const filteredConnections = useMemo(() => {
    return connections.filter(c => {
      if (socketSubTab === 'listening' && c.status !== 'LISTEN') return false;
      if (socketStateFilter !== 'ALL' && c.status?.toUpperCase() !== socketStateFilter) return false;
      if (socketProtoFilter !== 'ALL' && c.protocol?.toUpperCase() !== socketProtoFilter) return false;
      if (!socketSearch.trim()) return true;

      const q = socketSearch.toLowerCase();
      return (
        c.process_name?.toLowerCase().includes(q) ||
        c.pid?.toString().includes(q) ||
        c.local_address?.toLowerCase().includes(q) ||
        c.remote_address?.toLowerCase().includes(q) ||
        c.status?.toLowerCase().includes(q)
      );
    });
  }, [connections, socketSubTab, socketStateFilter, socketProtoFilter, socketSearch]);

  const filteredProcesses = useMemo(() => {
    if (!socketSearch.trim()) return processes;
    const q = socketSearch.toLowerCase();
    return processes.filter(p =>
      p.process_name?.toLowerCase().includes(q) ||
      p.pid?.toString().includes(q)
    );
  }, [processes, socketSearch]);

  const current = telemetry?.current || {};
  const totals = telemetry?.totals || {};
  const primaryAdapter = telemetry?.primary_adapter || {};
  const adapters = telemetry?.adapters || [];

  const attackPacketsCount = useMemo(() => {
    return packets.filter(p => p.is_attack).length;
  }, [packets]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none text-white font-sans">
      
      {/* ACTION BANNER / TOAST */}
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

      {/* TOP BAR / HEADER */}
      <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FDE047]/10 border border-[#FDE047]/30 flex items-center justify-center text-[#FDE047] shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-bold text-white tracking-wide uppercase">Deep Packet Inspector & Network Triage</h1>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#FDE047]/10 text-[#FDE047] border border-[#FDE047]/30 font-extrabold flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isCapturing ? 'bg-[#FDE047] animate-pulse' : 'bg-neutral-500'}`} />
                  {isCapturing ? '1.0s REAL-TIME DPI' : 'CAPTURE PAUSED'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Live packet sniffer, multi-layer OSI dissection, hex/ASCII inspector, and autonomous cyber attack hunt.
              </p>
            </div>
          </div>
        </div>

        {/* Global Sniffer & Export Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={handleToggleCapture}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${
              isCapturing
                ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white border-white/[0.1]'
                : 'bg-[#FDE047] text-black border-[#FDE047] hover:bg-[#FACC15]'
            }`}
            title={isCapturing ? "Pause packet sniffer capture" : "Resume packet sniffer capture"}
          >
            {isCapturing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-black" />}
            <span>{isCapturing ? 'Pause Capture' : 'Resume Capture'}</span>
          </button>

          <button
            onClick={handleClearPackets}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-white border border-white/[0.1] transition-all cursor-pointer"
            title="Clear captured packet buffer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
            <span>Clear Buffer</span>
          </button>

          <button
            onClick={exportConnectionsCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-white border border-white/[0.1] transition-all cursor-pointer"
            title="Export socket telemetry as CSV"
          >
            <Download className="w-3.5 h-3.5 text-neutral-300" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS GRID (TASK MANAGER STYLE) */}
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

        {/* Packet Velocity */}
        <div className="bg-[#141414] border border-white/[0.08] rounded-[24px] p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono uppercase mb-2">
            <span>Packet Cadence</span>
            <Radio className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {Math.round((current.packets_sent_sec || 0) + (current.packets_recv_sec || 0)).toLocaleString()}{' '}
            <span className="text-xs text-neutral-400 font-normal">pkts/s</span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mt-2">
            <span>↑ {Math.round(current.packets_sent_sec || 0)} pkts</span>
            <span>↓ {Math.round(current.packets_recv_sec || 0)} pkts</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-700" />
        </div>

        {/* Captured Frames & Threats */}
        <div className="bg-[#141414] border border-white/[0.08] rounded-[24px] p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-neutral-400 text-xs font-mono uppercase mb-2">
            <span>Captured Frames</span>
            <Terminal className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight flex items-center justify-between">
            <span>{packets.length}</span>
            {attackPacketsCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#FDE047] text-black font-extrabold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 fill-black" />
                {attackPacketsCount} ATTACK{attackPacketsCount > 1 ? 'S' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mt-2">
            <span>Sockets Tracked:</span>
            <span className="text-white font-bold">{connections.length}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FDE047]" />
        </div>
      </div>

      {/* 60-SECOND SCROLLING THROUGHPUT GRAPH */}
      <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
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

          {/* Graph Legend */}
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

        {/* SVG Live Canvas */}
        <div className="relative w-full overflow-hidden bg-[#0A0A0A] rounded-2xl border border-white/[0.06] p-4">
          <svg
            viewBox={`0 0 ${graphWidth} ${graphHeight}`}
            className="w-full h-40 sm:h-48 overflow-visible"
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

            {/* Gridlines */}
            {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
              const y = padding + (graphHeight - padding * 2) * (1 - ratio);
              return (
                <g key={ratio}>
                  <line
                    x1={padding}
                    y1={y}
                    x2={graphWidth - padding}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={padding + 4}
                    y={y - 4}
                    fill="rgba(255,255,255,0.25)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {formatRate(maxRate * ratio)}
                  </text>
                </g>
              );
            })}

            {/* Area Fills */}
            {recvArea && <path d={recvArea} fill="url(#whiteAreaGrad)" />}
            {sendArea && <path d={sendArea} fill="url(#yellowAreaGrad)" />}

            {/* Stroke Lines */}
            {recvPath && <path d={recvPath} fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />}
            {sendPath && <path d={sendPath} fill="none" stroke="#FDE047" strokeWidth="2.2" strokeLinecap="round" />}

            {/* Hover hit points & interactive scrubber */}
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

            {/* Active Hover Crosshair */}
            {hoveredPoint && (
              <g>
                <line
                  x1={hoveredPoint.x}
                  y1={padding}
                  x2={hoveredPoint.x}
                  y2={graphHeight - padding}
                  stroke="#FDE047"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
                <circle cx={hoveredPoint.x} cy={hoveredPoint.ySend} r="4" fill="#FDE047" stroke="#000" strokeWidth="1.5" />
                <circle cx={hoveredPoint.x} cy={hoveredPoint.yRecv} r="4" fill="#FFFFFF" stroke="#000" strokeWidth="1.5" />
              </g>
            )}
          </svg>

          {/* Hover Tooltip Overlay */}
          {hoveredPoint && (
            <div
              className="absolute pointer-events-none px-3 py-2 rounded-xl bg-[#141414] border border-[#FDE047]/40 shadow-2xl text-[11px] font-mono z-20 space-y-1 transform -translate-x-1/2 -translate-y-full"
              style={{
                left: `${(hoveredPoint.x / graphWidth) * 100}%`,
                top: '30%'
              }}
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

          {/* Bottom Time Axis */}
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 pt-2 px-4 border-t border-white/[0.04]">
            <span>-60 seconds</span>
            <span>-45s</span>
            <span>-30s</span>
            <span>-15s</span>
            <span className="text-[#FDE047] font-bold">Real-time (Now)</span>
          </div>
        </div>
      </div>

      {/* SECTION NAVIGATOR TABS */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center p-1 bg-[#141414] rounded-full border border-white/[0.08]">
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
            {attackPacketsCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                activeSection === 'dpi' ? 'bg-black text-[#FDE047]' : 'bg-[#FDE047] text-black'
              }`}>
                {attackPacketsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSection('sockets')}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'sockets'
                ? 'bg-[#FDE047] text-black shadow-lg shadow-[#FDE047]/10'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Active Sockets & Ports ({connections.length})</span>
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
            <span>Hardware Adapters ({adapters.length})</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-neutral-400">
          <span>Buffer: <span className="text-white font-bold">{packets.length}</span> / 1,500</span>
          <span>•</span>
          <span>Auto-Scroll: <button onClick={() => setAutoScroll(!autoScroll)} className={`font-bold hover:underline cursor-pointer ${autoScroll ? 'text-[#FDE047]' : 'text-neutral-500'}`}>{autoScroll ? 'ON' : 'OFF'}</button></span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: DEEP PACKET INSPECTOR (AUTHENTIC 3-PANE WIRESHARK ENGINE) */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'dpi' && (
        <div className="space-y-4">
          
          {/* TOOLBAR: DISPLAY FILTER BAR & ATTACK SIMULATOR */}
          <div className="bg-[#141414] border border-white/[0.08] rounded-[24px] p-4 shadow-xl space-y-3">
            
            {/* Row 1: Protocol Filters & Display Filter Input */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              
              {/* Display Filter Search Bar */}
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Apply display filter... (e.g. 192.168, port 4444, powershell, reverse_shell)"
                  value={packetSearch}
                  onChange={(e) => setPacketSearch(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/[0.1] rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-[#FDE047]"
                />
                {packetSearch && (
                  <button onClick={() => setPacketSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Protocol Quick-Pill Switchers */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 font-mono text-[11px]">
                {['ALL', 'DNS', 'TLS', 'HTTP', 'TCP', 'UDP', 'REVERSE_SHELL'].map((proto) => {
                  const isActive = packetFilterProto === proto;
                  return (
                    <button
                      key={proto}
                      onClick={() => setPacketFilterProto(proto)}
                      className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap border ${
                        isActive
                          ? 'bg-[#FDE047] text-black border-[#FDE047]'
                          : 'bg-white/[0.04] text-neutral-400 border-white/[0.08] hover:text-white hover:border-white/20'
                      }`}
                    >
                      {proto}
                    </button>
                  );
                })}

                {/* Attacks Only Toggle */}
                <button
                  onClick={() => setAttackOnly(!attackOnly)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap border ${
                    attackOnly
                      ? 'bg-[#FDE047] text-black border-[#FDE047]'
                      : 'bg-white/[0.04] text-neutral-300 border-white/[0.08] hover:border-[#FDE047]/40'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Attacks Only</span>
                  {attackPacketsCount > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                      attackOnly ? 'bg-black text-[#FDE047]' : 'bg-[#FDE047] text-black'
                    }`}>
                      {attackPacketsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Row 2: Live Attack Injection Suite (Real Attack Forensics) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-white/[0.04]">
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                <Zap className="w-3.5 h-3.5 text-[#FDE047]" />
                <span className="text-white font-bold uppercase tracking-wider text-[11px]">Inject Threat Vector:</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleSimulateAttack('REVERSE_SHELL')}
                  disabled={simulatingAttack !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-[#FDE047]/10 text-white hover:text-[#FDE047] border border-white/[0.1] hover:border-[#FDE047]/40 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
                  title="Simulate Meterpreter payload on port 4444"
                >
                  <span>⚡ Reverse Shell (Port 4444)</span>
                </button>

                <button
                  onClick={() => handleSimulateAttack('PORT_SCAN')}
                  disabled={simulatingAttack !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-[#FDE047]/10 text-white hover:text-[#FDE047] border border-white/[0.1] hover:border-[#FDE047]/40 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
                  title="Simulate Nmap Stealth SYN Port Scan probe burst"
                >
                  <span>⚡ Nmap SYN Scan Probe</span>
                </button>

                <button
                  onClick={() => handleSimulateAttack('DNS_TUNNEL')}
                  disabled={simulatingAttack !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-[#FDE047]/10 text-white hover:text-[#FDE047] border border-white/[0.1] hover:border-[#FDE047]/40 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
                  title="Simulate high-entropy DNS tunnel exfiltration"
                >
                  <span>⚡ DNS Exfiltration</span>
                </button>

                <button
                  onClick={() => handleSimulateAttack('CLEARTEXT_CREDS')}
                  disabled={simulatingAttack !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-[#FDE047]/10 text-white hover:text-[#FDE047] border border-white/[0.1] hover:border-[#FDE047]/40 text-xs font-mono font-bold transition-all cursor-pointer disabled:opacity-50"
                  title="Simulate cleartext password leak via unencrypted HTTP"
                >
                  <span>⚡ Cleartext Creds Leak</span>
                </button>
              </div>
            </div>
          </div>

          {/* PANE 1: PACKET LIST VIEW (TOP PANE) */}
          <div className="bg-[#141414] border border-white/[0.08] rounded-[24px] overflow-hidden shadow-2xl">
            <div className="p-3 bg-[#0F0F0F] border-b border-white/[0.08] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-[#FDE047]" />
                <span className="font-bold text-white uppercase tracking-wider">Packet Capture Stream</span>
                <span className="text-neutral-500 text-[10px]">({packets.length} frames visible)</span>
              </div>
              <div className="flex items-center gap-3 text-neutral-400 text-[11px]">
                <span>Click any row to dissect OSI layers & view raw hex dump</span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[340px] overflow-y-auto font-mono text-[11px] divide-y divide-white/[0.02]">
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
                  {packets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-neutral-500">
                        {isCapturing ? 'Listening on network interface... Awaiting packet frames.' : 'Packet capture paused.'}
                      </td>
                    </tr>
                  ) : (
                    packets.map((pkt) => {
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
                          <td className="py-2 px-3 text-center text-neutral-400 font-mono text-[10px]">
                            {pkt.no}
                          </td>
                          <td className="py-2 px-3 text-neutral-400 whitespace-nowrap">
                            {pkt.timestamp}
                          </td>
                          <td className="py-2 px-4 text-white truncate max-w-[170px]" title={pkt.source}>
                            {pkt.source}
                          </td>
                          <td className="py-2 px-4 text-neutral-300 truncate max-w-[170px]" title={pkt.destination}>
                            {pkt.destination}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                              isAttack
                                ? 'bg-[#FDE047] text-black shadow-sm'
                                : pkt.protocol === 'TLSv1.3' || pkt.protocol === 'TLS'
                                ? 'bg-white/10 text-white border border-white/20'
                                : pkt.protocol === 'DNS'
                                ? 'bg-white/5 text-[#FDE047] border border-[#FDE047]/20'
                                : pkt.protocol === 'HTTP'
                                ? 'bg-white/10 text-white border border-white/10'
                                : 'bg-white/[0.04] text-neutral-400'
                            }`}>
                              {pkt.protocol}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-neutral-400 font-mono">
                            {pkt.length} B
                          </td>
                          <td className="py-2 px-4 truncate max-w-[400px]" title={pkt.info}>
                            <span className={isAttack ? 'text-[#FDE047] font-bold' : 'text-neutral-300'}>
                              {pkt.info}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                  <div ref={packetListEndRef} />
                </tbody>
              </table>
            </div>
          </div>

          {/* LOWER TWO-PANE GRID: PROTOCOL DISSECTION TREE & RAW HEX DUMP */}
          {selectedPacket ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* PANE 2: PROTOCOL DISSECTION TREE */}
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

                <div className="p-4 space-y-2.5 overflow-y-auto max-h-[380px] font-mono text-xs">
                  {selectedPacket.dissection && Object.entries(selectedPacket.dissection).map(([layerKey, layerData]) => {
                    const isExpanded = expandedLayers[layerKey] ?? false;
                    const isThreatLayer = layerKey === 'threat_intel';

                    return (
                      <div
                        key={layerKey}
                        className={`rounded-xl border transition-all ${
                          isThreatLayer
                            ? 'bg-[#FDE047]/10 border-[#FDE047]/40 text-[#FDE047]'
                            : 'bg-[#0A0A0A] border-white/[0.06]'
                        }`}
                      >
                        {/* Layer Header Accordion Button */}
                        <button
                          onClick={() => toggleLayer(layerKey)}
                          className="w-full flex items-center justify-between p-3 text-left font-bold cursor-pointer hover:bg-white/[0.02]"
                        >
                          <div className="flex items-center gap-2 text-xs truncate max-w-[90%]">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[#FDE047]" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-neutral-400" />
                            )}
                            <span className={isThreatLayer ? 'text-[#FDE047] font-extrabold' : 'text-neutral-200'}>
                              {layerData.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-500 uppercase">
                            {isExpanded ? 'Collapse' : 'Expand'}
                          </span>
                        </button>

                        {/* Layer Key-Value Dissection Fields */}
                        {isExpanded && (
                          <div className="px-4 pb-3 pt-1 border-t border-white/[0.04] space-y-1.5 text-[11px]">
                            {Object.entries(layerData.fields || {}).map(([key, val]) => (
                              <div key={key} className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 py-0.5">
                                <span className={isThreatLayer ? 'text-[#FDE047] font-semibold' : 'text-neutral-400'}>
                                  {key}:
                                </span>
                                <span className="text-white font-mono text-right break-all">
                                  {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PANE 3: RAW PACKET DUMP (AUTHENTIC HEX & ASCII INSPECTOR) */}
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

                {/* Fixed-Width Monospace Hex/ASCII Viewport */}
                <div className="p-4 bg-[#0A0A0A] overflow-x-auto overflow-y-auto max-h-[380px] font-mono text-[11px] leading-relaxed">
                  {selectedPacket.hex_dump && selectedPacket.hex_dump.length > 0 ? (
                    <div className="space-y-1 select-text">
                      {selectedPacket.hex_dump.map((row, rIdx) => {
                        const firstHalf = row.hex.slice(0, 8);
                        const secondHalf = row.hex.slice(8, 16);

                        return (
                          <div key={row.offset} className="flex items-center gap-3 hover:bg-white/[0.02] py-0.5 px-1 rounded">
                            {/* Column 1: Offset */}
                            <span className="text-neutral-500 font-bold w-12 shrink-0 select-none">
                              {row.offset}
                            </span>

                            {/* Column 2: 16 Hex Bytes (Split in 8-byte halves) */}
                            <div className="flex items-center gap-1.5 w-[280px] shrink-0">
                              <span className="text-white space-x-1">
                                {firstHalf.map((b, bIdx) => (
                                  <span
                                    key={bIdx}
                                    onMouseEnter={() => setHoveredByte(`${rIdx}-${bIdx}`)}
                                    onMouseLeave={() => setHoveredByte(null)}
                                    className={`px-0.5 rounded cursor-pointer ${
                                      hoveredByte === `${rIdx}-${bIdx}` ? 'bg-[#FDE047] text-black font-bold' : ''
                                    }`}
                                  >
                                    {b}
                                  </span>
                                ))}
                              </span>
                              <span className="text-neutral-600 select-none">|</span>
                              <span className="text-white space-x-1">
                                {secondHalf.map((b, bIdx) => {
                                  const actualIdx = bIdx + 8;
                                  return (
                                    <span
                                      key={actualIdx}
                                      onMouseEnter={() => setHoveredByte(`${rIdx}-${actualIdx}`)}
                                      onMouseLeave={() => setHoveredByte(null)}
                                      className={`px-0.5 rounded cursor-pointer ${
                                        hoveredByte === `${rIdx}-${actualIdx}` ? 'bg-[#FDE047] text-black font-bold' : ''
                                      }`}
                                    >
                                      {b}
                                    </span>
                                  );
                                })}
                              </span>
                            </div>

                            {/* Column 3: ASCII Printable Representation */}
                            <span className="text-[#FDE047] border-l border-white/[0.08] pl-3 tracking-widest truncate">
                              {row.ascii}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-neutral-500 py-12 text-center">
                      No raw byte stream available for Frame #{selectedPacket.no}.
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="p-8 text-center bg-[#141414] border border-white/[0.08] rounded-[24px] text-neutral-400 font-mono text-xs">
              Select any packet in the stream above to dissect its protocol layers and examine raw hex.
            </div>
          )}

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: ACTIVE SOCKETS & PROCESSES (RESOURCE MONITOR / TASK MGR) */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSection === 'sockets' && (
        <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] overflow-hidden shadow-2xl">
          {/* Controls Bar */}
          <div className="p-6 border-b border-white/[0.06] space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              {/* Sub-Tabs Switcher */}
              <div className="flex items-center p-1 bg-[#0A0A0A] rounded-full border border-white/[0.08]">
                <button
                  onClick={() => setSocketSubTab('connections')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    socketSubTab === 'connections'
                      ? 'bg-[#FDE047] text-black shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Active Sockets ({connections.length})
                </button>
                <button
                  onClick={() => setSocketSubTab('processes')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    socketSubTab === 'processes'
                      ? 'bg-[#FDE047] text-black shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Processes ({processes.length})
                </button>
                <button
                  onClick={() => setSocketSubTab('listening')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    socketSubTab === 'listening'
                      ? 'bg-[#FDE047] text-black shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Listening Ports ({connections.filter(c => c.status === 'LISTEN').length})
                </button>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter process, PID, IP, port..."
                    value={socketSearch}
                    onChange={(e) => setSocketSearch(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-white/[0.1] rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder-neutral-500 font-mono focus:outline-none focus:border-[#FDE047]"
                  />
                  {socketSearch && (
                    <button onClick={() => setSocketSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {socketSubTab === 'connections' && (
                  <select
                    value={socketStateFilter}
                    onChange={(e) => setSocketStateFilter(e.target.value)}
                    className="bg-[#0A0A0A] border border-white/[0.1] rounded-full px-3 py-1.5 text-xs text-neutral-300 font-mono focus:outline-none focus:border-[#FDE047] cursor-pointer"
                  >
                    <option value="ALL">All States</option>
                    <option value="ESTABLISHED">ESTABLISHED</option>
                    <option value="LISTEN">LISTEN</option>
                    <option value="TIME_WAIT">TIME_WAIT</option>
                    <option value="CLOSE_WAIT">CLOSE_WAIT</option>
                  </select>
                )}

                {socketSubTab === 'connections' && (
                  <select
                    value={socketProtoFilter}
                    onChange={(e) => setSocketProtoFilter(e.target.value)}
                    className="bg-[#0A0A0A] border border-white/[0.1] rounded-full px-3 py-1.5 text-xs text-neutral-300 font-mono focus:outline-none focus:border-[#FDE047] cursor-pointer"
                  >
                    <option value="ALL">All Proto</option>
                    <option value="TCP">TCP</option>
                    <option value="UDP">UDP</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Connections Table */}
          {(socketSubTab === 'connections' || socketSubTab === 'listening') && (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead className="sticky top-0 bg-[#0F0F0F] border-b border-white/[0.08] text-neutral-400 text-[10px] uppercase tracking-wider z-10">
                  <tr>
                    <th className="py-3 px-5">Process</th>
                    <th className="py-3 px-4">PID</th>
                    <th className="py-3 px-4">Protocol</th>
                    <th className="py-3 px-5">Local Address</th>
                    <th className="py-3 px-5">Remote Address</th>
                    <th className="py-3 px-4">State</th>
                    <th className="py-3 px-4 text-center">Threat Risk</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredConnections.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-neutral-500 font-mono">
                        No matching network socket connections found.
                      </td>
                    </tr>
                  ) : (
                    filteredConnections.map((c, idx) => {
                      const isThreat = c.risk_level === 'HIGH' || c.risk_level === 'ELEVATED';
                      return (
                        <tr
                          key={`${c.pid}-${c.local_address}-${c.remote_address}-${idx}`}
                          className={`hover:bg-white/[0.02] transition-colors group ${
                            isThreat ? 'bg-[#FDE047]/5' : ''
                          }`}
                        >
                          <td className="py-3 px-5 font-bold text-white flex items-center gap-2">
                            <Cpu className="w-3.5 h-3.5 text-neutral-400 group-hover:text-[#FDE047]" />
                            <span className="truncate max-w-[160px]" title={c.process_name}>{c.process_name}</span>
                          </td>
                          <td className="py-3 px-4 text-neutral-300 font-bold">{c.pid || '-'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${
                              c.protocol === 'TCP'
                                ? 'bg-white/5 text-white border-white/20'
                                : 'bg-white/[0.02] text-neutral-400 border-white/10'
                            }`}>
                              {c.protocol}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-neutral-200">{c.local_address}</td>
                          <td className="py-3 px-5 text-neutral-300">{c.remote_address}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              c.status === 'ESTABLISHED'
                                ? 'bg-white/10 text-white border-white/20'
                                : c.status === 'LISTEN'
                                ? 'bg-[#FDE047]/10 text-[#FDE047] border-[#FDE047]/30'
                                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isThreat ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FDE047] text-black text-[9px] font-extrabold">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                {c.threat_tags[0] || 'SUSPICIOUS'}
                              </span>
                            ) : (
                              <span className="text-neutral-500 text-[10px]">Normal</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {c.pid && c.pid > 4 && (
                              <button
                                onClick={() => setKillModalProc(c)}
                                className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-600 hover:border-neutral-400 transition-all cursor-pointer"
                                title={`Kill process ${c.process_name} (PID: ${c.pid})`}
                              >
                                Kill
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Grouped Processes Table */}
          {socketSubTab === 'processes' && (
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead className="sticky top-0 bg-[#0F0F0F] border-b border-white/[0.08] text-neutral-400 text-[10px] uppercase tracking-wider z-10">
                  <tr>
                    <th className="py-3 px-5">Process Name</th>
                    <th className="py-3 px-4">PID</th>
                    <th className="py-3 px-4">Total Sockets</th>
                    <th className="py-3 px-4">Established</th>
                    <th className="py-3 px-4">Listening</th>
                    <th className="py-3 px-5">Active Ports</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredProcesses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-neutral-500 font-mono">
                        No active processes holding network sockets.
                      </td>
                    </tr>
                  ) : (
                    filteredProcesses.map((p) => (
                      <tr key={p.pid} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-5 font-bold text-white flex items-center gap-2">
                          <Cpu className="w-3.5 h-3.5 text-[#FDE047]" />
                          <span>{p.process_name}</span>
                        </td>
                        <td className="py-3 px-4 text-neutral-300 font-bold">{p.pid || '-'}</td>
                        <td className="py-3 px-4 text-white font-bold">{p.socket_count}</td>
                        <td className="py-3 px-4 text-neutral-200">{p.established_count}</td>
                        <td className="py-3 px-4 text-neutral-300">{p.listening_count}</td>
                        <td className="py-3 px-5 text-neutral-400">
                          {p.ports.map(port => (
                            <span key={port} className="inline-block mr-1.5 px-2 py-0.5 rounded bg-white/[0.04] text-neutral-300 text-[10px]">
                              :{port}
                            </span>
                          ))}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {p.pid && p.pid > 4 && (
                            <button
                              onClick={() => setKillModalProc(p)}
                              className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-600 transition-all cursor-pointer"
                            >
                              Kill Process
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="p-4 bg-[#0F0F0F] border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-neutral-400 gap-2">
            <div>
              Showing <span className="text-white font-bold">{socketSubTab === 'processes' ? filteredProcesses.length : filteredConnections.length}</span> entries
            </div>
            <div className="flex items-center gap-4 text-neutral-500">
              <span>Refresh rate: 1000ms</span>
              <span>Platform: Windows Subsystem</span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 3: HARDWARE ADAPTERS INVENTORY */}
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

      {/* SURGICAL KILL CONFIRMATION MODAL */}
      {killModalProc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/[0.15] rounded-[28px] max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-white">
              <div className="w-10 h-10 rounded-2xl bg-neutral-800 border border-neutral-600 flex items-center justify-center text-white shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#FDE047]" />
              </div>
              <div>
                <h4 className="text-sm font-bold uppercase">Terminate Network Process</h4>
                <p className="text-xs text-neutral-400 font-mono">Surgical Socket Severance</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-white/[0.06] text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-500">Process:</span>
                <span className="text-white font-bold">{killModalProc.process_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">PID:</span>
                <span className="text-neutral-300">{killModalProc.pid}</span>
              </div>
              {killModalProc.remote_address && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Target Socket:</span>
                  <span className="text-[#FDE047]">{killModalProc.remote_address}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Are you sure you want to terminate this process? This will immediately sever all active TCP/UDP sockets associated with PID {killModalProc.pid}.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setKillModalProc(null)}
                className="px-4 py-2 rounded-full text-xs font-bold bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.1] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleKillProcess(killModalProc.pid)}
                disabled={killingPid === killModalProc.pid}
                className="px-4 py-2 rounded-full text-xs font-bold bg-[#FDE047] hover:bg-[#FACC15] text-black shadow-lg shadow-[#FDE047]/10 transition-all cursor-pointer disabled:opacity-50"
              >
                {killingPid === killModalProc.pid ? 'Killing...' : 'Sever Socket & Kill'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
