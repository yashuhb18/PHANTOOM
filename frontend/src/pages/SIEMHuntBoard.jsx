import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Terminal,
  Activity,
  ShieldAlert,
  Flame,
  CheckCircle,
  AlertTriangle,
  Clock,
  Filter,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Layers,
  Cpu,
  Database,
  X,
  Play,
  Share2,
  Send,
  Bot,
  User,
  MessageSquare
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { formatISTTime, formatISTFull } from '../utils/time';

export function SIEMHuntBoard() {
  const { liveEvents } = useWebSocket();
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [timeRange, setTimeRange] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('');
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedField, setCopiedField] = useState(null);

  // AI Interactive Chat Drawer state
  const [triageEvent, setTriageEvent] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTriageLoading, setIsTriageLoading] = useState(false);
  const chatEndRef = useRef(null);

  // AI Query Bar state
  const [isAiQueryOpen, setIsAiQueryOpen] = useState(false);
  const [aiNaturalPrompt, setAiNaturalPrompt] = useState('');
  const [isAiQueryLoading, setIsAiQueryLoading] = useState(false);

  const searchInputRef = useRef(null);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTriageLoading]);

  // Fetch SIEM Events from backend
  const fetchEvents = async (query = activeQuery, range = timeRange, sev = severityFilter) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (range) params.append('time_range', range);
      if (sev) params.append('severity', sev);
      params.append('limit', '150');

      const res = await fetch(`http://${window.location.hostname}:8001/api/siem/events?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (e) {
      console.debug('Failed to fetch SIEM events:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch SIEM Stats & Histogram
  const fetchStats = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/siem/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.debug('Failed to fetch SIEM stats:', e);
    }
  };

  // Initial load
  useEffect(() => {
    fetchEvents(activeQuery, timeRange, severityFilter);
    fetchStats();
    const interval = setInterval(() => {
      fetchStats();
      fetchEvents(activeQuery, timeRange, severityFilter);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeQuery, timeRange, severityFilter]);

  // Refresh when new WebSocket events arrive
  useEffect(() => {
    if (liveEvents && liveEvents.length > 0) {
      fetchEvents(activeQuery, timeRange, severityFilter);
      fetchStats();
    }
  }, [liveEvents]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setActiveQuery(searchQuery);
    fetchEvents(searchQuery, timeRange, severityFilter);
  };

  // Handle Quick Filter Preset Click
  const handlePresetClick = (presetSpl) => {
    setSearchQuery(presetSpl);
    setActiveQuery(presetSpl);
    fetchEvents(presetSpl, timeRange, severityFilter);
  };

  // Handle AI Natural Language to SPL
  const handleGenerateSpl = async (e) => {
    if (e) e.preventDefault();
    if (!aiNaturalPrompt.trim()) return;

    setIsAiQueryLoading(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/siem/ai-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ natural_language_prompt: aiNaturalPrompt })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.spl_query) {
          setSearchQuery(data.spl_query);
          setActiveQuery(data.spl_query);
          setIsAiQueryOpen(false);
          setAiNaturalPrompt('');
          fetchEvents(data.spl_query, timeRange, severityFilter);
        }
      }
    } catch (e) {
      console.error('Failed to convert prompt to SPL:', e);
    } finally {
      setIsAiQueryLoading(false);
    }
  };

  // Open Interactive Chat anchored to a specific log
  const handleOpenTriage = async (evt) => {
    setTriageEvent(evt);
    setChatMessages([]);
    setChatInput('');
    setIsTriageLoading(true);

    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/siem/ai-triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: evt.event_id,
          event_code: evt.event_code,
          event_name: evt.event_name,
          sourcetype: evt.sourcetype,
          severity: evt.severity,
          timestamp: evt.timestamp,
          raw_log: evt.raw_log,
          extracted_fields: evt.extracted_fields,
          summary: evt.summary,
          user_message: null,
          chat_history: []
        })
      });

      if (res.ok) {
        const data = await res.json();
        const initialText = data.reply || data.ai_triage || 'Examining this log with you. What would you like to investigate?';
        setChatMessages([
          {
            id: Date.now(),
            role: 'assistant',
            content: initialText,
            timestamp: formatISTTime(new Date(), { withSuffix: true })
          }
        ]);
      } else {
        setChatMessages([
          {
            id: Date.now(),
            role: 'assistant',
            content: `Connected to Event ${evt.event_code} (${evt.event_name}). What would you like to investigate about this process or command?`,
            timestamp: formatISTTime(new Date(), { withSuffix: true })
          }
        ]);
      }
    } catch (e) {
      setChatMessages([
        {
          id: Date.now(),
          role: 'assistant',
          content: `Examining Event ${evt.event_code} (${evt.event_name}). Let me know what you would like to analyze about this payload.`,
          timestamp: formatISTTime(new Date(), { withSuffix: true })
        }
      ]);
    } finally {
      setIsTriageLoading(false);
    }
  };

  // Send message in the interactive chat
  const handleSendMessage = async (textToSend) => {
    const text = textToSend || chatInput;
    if (!text.trim() || !triageEvent) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text.trim(),
      timestamp: formatISTTime(new Date(), { withSuffix: true })
    };

    const updatedHistory = [...chatMessages, userMsg];
    setChatMessages(updatedHistory);
    setChatInput('');
    setIsTriageLoading(true);

    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/siem/ai-triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: triageEvent.event_id,
          event_code: triageEvent.event_code,
          event_name: triageEvent.event_name,
          sourcetype: triageEvent.sourcetype,
          severity: triageEvent.severity,
          timestamp: triageEvent.timestamp,
          raw_log: triageEvent.raw_log,
          extracted_fields: triageEvent.extracted_fields,
          summary: triageEvent.summary,
          user_message: text.trim(),
          chat_history: updatedHistory.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        const replyText = data.reply || data.ai_triage || 'Understood. What else would you like to check?';
        setChatMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            role: 'assistant',
            content: replyText,
            timestamp: formatISTTime(new Date(), { withSuffix: true })
          }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          {
            id: Date.now() + 1,
            role: 'assistant',
            content: 'Unable to query the AI engine right now. Please verify backend connectivity.',
            timestamp: formatISTTime(new Date(), { withSuffix: true })
          }
        ]);
      }
    } catch (e) {
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: `Error communicating with AI analyst: ${e.message}`,
          timestamp: formatISTTime(new Date(), { withSuffix: true })
        }
      ]);
    } finally {
      setIsTriageLoading(false);
    }
  };

  // Copy helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Severity style helper
  const getSeverityBadge = (sev) => {
    const s = (sev || 'INFO').toUpperCase();
    if (s === 'CRITICAL') {
      return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-950/80 text-red-400 border border-red-800/80">CRITICAL</span>;
    }
    if (s === 'HIGH') {
      return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-950/80 text-amber-400 border border-amber-800/80">HIGH</span>;
    }
    if (s === 'MEDIUM') {
      return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-yellow-950/80 text-yellow-400 border border-yellow-800/80">MEDIUM</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-950/80 text-blue-400 border border-blue-800/80">INFO</span>;
  };

  const getEventCodeColor = (code) => {
    if (code === 7001) return 'text-emerald-400 border-emerald-800/60 bg-emerald-950/50';
    if (code === 4688 || code === 4689) return 'text-red-400 border-red-800/60 bg-red-950/50';
    if (code === 2001 || code === 2002) return 'text-amber-400 border-amber-800/60 bg-amber-950/50';
    if (code === 5001) return 'text-amber-400 border-amber-800/60 bg-amber-950/50';
    if (code === 6001 || code === 6002) return 'text-pink-400 border-pink-800/60 bg-pink-950/50';
    return 'text-sky-400 border-sky-800/60 bg-sky-950/50';
  };

  const histogram = stats?.histogram || [];
  const maxHistogramCount = Math.max(...histogram.map(h => h.total), 1);

  return (
    <div className="relative min-h-[calc(100vh-80px)] w-full overflow-hidden pb-16 bg-[#0A0A0A] text-slate-200">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Header Bar */}
      <div className="relative border-b border-white/[0.08] bg-[#0E0E10]/90 backdrop-blur-md px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-black tracking-wider text-white uppercase font-mono">
                  SOC SIEM Threat Hunt Console
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FDE047] text-black">
                  SPLUNK MODE
                </span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE INGESTION
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Real-time EventCode indexing &bull; Field extraction &bull; Local GPU AI Incident Triage
              </p>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-white/[0.08] flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-sky-400" />
              <span className="text-slate-400">Total:</span>
              <span className="text-white font-bold">{stats?.total_events ?? '...'}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-red-900/40 flex items-center gap-2">
              <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
              <span className="text-slate-400">Critical:</span>
              <span className="text-red-400 font-bold">{stats?.critical_events ?? '0'}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-emerald-900/40 flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-slate-400">Kills (7001):</span>
              <span className="text-emerald-400 font-bold">{stats?.kill_events ?? '0'}</span>
            </div>
            <button
              onClick={() => { fetchEvents(); fetchStats(); }}
              className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.1] transition-all cursor-pointer"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="relative px-6 py-6 space-y-6 max-w-7xl mx-auto">
        
        {/* Splunk SPL Search Command Bar */}
        <div className="bg-[#111114] border border-white/[0.12] rounded-xl p-4 shadow-2xl relative">
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400 font-mono font-bold text-sm">
                  spl &gt;
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='e.g. sourcetype="PHANTOM:PROCESS" EventCode=4688 severity=CRITICAL or free-text *nc*'
                  className="w-full pl-16 pr-10 py-3 bg-[#08080A] border border-white/[0.1] rounded-lg text-sm font-mono text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/50 shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setActiveQuery(''); fetchEvents('', timeRange, severityFilter); }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center bg-[#08080A] border border-white/[0.1] rounded-lg p-1 font-mono text-xs">
                {['15m', '1h', '24h', 'all'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTimeRange(r)}
                    className={`px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${
                      timeRange === r
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {r === '15m' ? '15m' : r === '1h' ? '1h' : r === '24h' ? '24h' : 'All'}
                  </button>
                ))}
              </div>

              {/* Run Query Button */}
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-black text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Search className="h-4 w-4 stroke-[2.5]" />
                <span>SEARCH</span>
              </button>

              {/* AI Query Assistant Button (Styled in Cyber Yellow) */}
              <button
                type="button"
                onClick={() => setIsAiQueryOpen(!isAiQueryOpen)}
                className="flex items-center gap-1.5 px-3.5 py-3 rounded-lg bg-[#FDE047]/10 hover:bg-[#FDE047]/20 text-[#FDE047] border border-[#FDE047]/30 font-mono text-xs transition-all cursor-pointer"
                title="Ask AI to write SPL query"
              >
                <Sparkles className="h-4 w-4 text-[#FDE047]" />
                <span className="hidden sm:inline">Ask AI SPL</span>
              </button>
            </div>

            {/* Quick Filter Presets Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
              <span className="text-slate-500 text-[11px] uppercase tracking-wider">Presets:</span>
              <button
                type="button"
                onClick={() => handlePresetClick('EventCode=4688')}
                className="px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/40 transition-all cursor-pointer"
              >
                Event 4688 (Process Spawn)
              </button>
              <button
                type="button"
                onClick={() => handlePresetClick('EventCode=7001')}
                className="px-2.5 py-1 rounded bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/40 transition-all cursor-pointer"
              >
                Event 7001 (Surgical Kill)
              </button>
              <button
                type="button"
                onClick={() => handlePresetClick('EventCode=1001')}
                className="px-2.5 py-1 rounded bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 border border-sky-800/40 transition-all cursor-pointer"
              >
                Event 1001 (USB Ingest)
              </button>
              <button
                type="button"
                onClick={() => handlePresetClick('EventCode=5001')}
                className="px-2.5 py-1 rounded bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/40 transition-all cursor-pointer"
              >
                Event 5001 (Canary Trap)
              </button>
              <button
                type="button"
                onClick={() => handlePresetClick('EventCode=2001')}
                className="px-2.5 py-1 rounded bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/40 transition-all cursor-pointer"
              >
                Event 2001 (BadUSB Burst)
              </button>
              <button
                type="button"
                onClick={() => handlePresetClick('severity=CRITICAL')}
                className="px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-red-400 border border-white/[0.1] transition-all cursor-pointer"
              >
                severity=CRITICAL
              </button>
              {(activeQuery || searchQuery) && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setActiveQuery(''); fetchEvents('', timeRange, severityFilter); }}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </form>

          {/* AI SPL Query Translator Drawer (Cyber Gold Theme) */}
          {isAiQueryOpen && (
            <div className="mt-4 p-4 rounded-lg bg-[#08080A] border border-[#FDE047]/30 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-[#FDE047] font-bold">
                  <Sparkles className="h-4 w-4 text-[#FDE047]" />
                  <span>NATURAL LANGUAGE TO SPLUNK SPL TRANSLATOR (LOCAL GPU MODEL)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAiQueryOpen(false)}
                  className="text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleGenerateSpl} className="flex gap-2">
                <input
                  type="text"
                  value={aiNaturalPrompt}
                  onChange={(e) => setAiNaturalPrompt(e.target.value)}
                  placeholder="e.g. Find all reverse shells and killed processes originating from USB..."
                  className="flex-1 px-3 py-2 bg-black border border-white/[0.1] rounded text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#FDE047]"
                />
                <button
                  type="submit"
                  disabled={isAiQueryLoading}
                  className="px-4 py-2 bg-[#FDE047] hover:bg-[#FDE047]/90 text-black font-mono text-xs font-black rounded flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isAiQueryLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  <span>Generate SPL</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Splunk-Style Event Volume Histogram Bar Chart */}
        {histogram.length > 0 && (
          <div className="bg-[#111114] border border-white/[0.08] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Activity className="h-4 w-4 text-emerald-400" />
                <span className="font-bold text-slate-200">EVENT VOLUME HISTOGRAM</span>
                <span className="text-[11px] text-slate-500">(Time-bucketed distribution)</span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Critical
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> High
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" /> Other
                </span>
              </div>
            </div>

            {/* Bars Container */}
            <div className="h-20 w-full flex items-end gap-1.5 pt-3 pb-1 border-b border-white/[0.05]">
              {histogram.map((bucket, idx) => {
                const heightPct = Math.max((bucket.total / maxHistogramCount) * 100, 8);
                const critPct = (bucket.critical / (bucket.total || 1)) * 100;
                const highPct = (bucket.high / (bucket.total || 1)) * 100;
                const otherPct = 100 - critPct - highPct;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col justify-end h-full group relative cursor-pointer"
                    title={`${bucket.time_label}: ${bucket.total} events (${bucket.critical} critical)`}
                  >
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full rounded-t-sm flex flex-col overflow-hidden transition-all group-hover:brightness-125"
                    >
                      {critPct > 0 && <div style={{ height: `${critPct}%` }} className="bg-red-500 w-full" />}
                      {highPct > 0 && <div style={{ height: `${highPct}%` }} className="bg-amber-500 w-full" />}
                      {otherPct > 0 && <div style={{ height: `${otherPct}%` }} className="bg-sky-600/70 w-full" />}
                    </div>

                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 pointer-events-none">
                      <div className="bg-black/90 border border-white/[0.2] px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap text-white shadow-xl">
                        <div className="font-bold">{bucket.time_label}</div>
                        <div>Total: {bucket.total}</div>
                        {bucket.critical > 0 && <div className="text-red-400">Critical: {bucket.critical}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SIEM Log Stream Table */}
        <div className="bg-[#111114] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl">
          <div className="px-5 py-3 border-b border-white/[0.08] bg-[#0E0E10] flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white uppercase">Forensic Event Stream</span>
              <span className="text-slate-500">({events.length} records returned)</span>
            </div>
            {activeQuery && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                <span>Filter: {activeQuery}</span>
              </div>
            )}
          </div>

          {events.length === 0 ? (
            <div className="p-12 text-center space-y-3 font-mono">
              <Terminal className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-sm text-slate-400 font-bold">No SIEM events match the query criteria.</p>
              <p className="text-xs text-slate-600">Try clearing your search bar or selecting "All Time".</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {events.map((evt) => {
                const isExpanded = expandedEventId === evt.event_id;
                const codeClass = getEventCodeColor(evt.event_code);

                return (
                  <div key={evt.event_id} className="transition-all hover:bg-white/[0.02]">
                    {/* Log Main Row */}
                    <div
                      onClick={() => setExpandedEventId(isExpanded ? null : evt.event_id)}
                      className="px-4 py-3 flex items-start gap-3 cursor-pointer select-none"
                    >
                      {/* Expand Arrow */}
                      <button className="pt-0.5 text-slate-500 hover:text-white transition-transform">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>

                      {/* Timestamp */}
                      <div className="w-36 shrink-0 font-mono text-xs text-slate-400">
                        {evt.timestamp ? formatISTTime(evt.timestamp, { withSuffix: true }) : '--:--:--'}
                      </div>

                      {/* Event Code Badge */}
                      <div className="w-24 shrink-0 font-mono">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${codeClass}`}>
                          {evt.event_code}
                        </span>
                      </div>

                      {/* Sourcetype */}
                      <div className="w-48 shrink-0 font-mono text-xs text-slate-400 truncate" title={evt.sourcetype}>
                        {evt.sourcetype}
                      </div>

                      {/* Severity */}
                      <div className="w-20 shrink-0 font-mono">
                        {getSeverityBadge(evt.severity)}
                      </div>

                      {/* Summary / Command Preview */}
                      <div className="flex-1 font-mono text-xs text-slate-200 truncate">
                        {evt.summary}
                      </div>

                      {/* Quick AI Triage Button (Cyber Gold Theme) */}
                      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenTriage(evt)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#FDE047]/10 hover:bg-[#FDE047]/20 text-[#FDE047] border border-[#FDE047]/30 hover:border-[#FDE047]/60 font-mono text-[11px] font-bold transition-all shadow-sm cursor-pointer"
                        >
                          <Sparkles className="h-3 w-3 text-[#FDE047]" />
                          <span>AI Triage</span>
                        </button>
                      </div>
                    </div>

                    {/* Expanded Splunk Field Inspector Row */}
                    {isExpanded && (
                      <div className="px-6 py-4 bg-[#08080A] border-t border-b border-white/[0.08] space-y-4 font-mono text-xs">
                        
                        {/* Extracted Fields Table */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                            <span>Splunk Extracted Fields</span>
                            <span className="text-slate-600">Click field value to filter</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-[#0E0E12] p-3 rounded-lg border border-white/[0.06]">
                            {Object.entries(evt.extracted_fields || {}).map(([k, v]) => {
                              if (!v && v !== 0) return null;
                              return (
                                <div key={k} className="flex items-baseline justify-between p-1.5 rounded hover:bg-white/[0.04]">
                                  <span className="text-slate-400 font-bold">{k}:</span>
                                  <span
                                    onClick={() => handlePresetClick(`${k}="${v}"`)}
                                    className="text-emerald-400 font-mono truncate max-w-[200px] cursor-pointer hover:underline"
                                    title={`Filter by ${k}="${v}"`}
                                  >
                                    {String(v)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Raw Syslog Log Line */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                            <span>Raw Telemetry String</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleCopy(evt.raw_log, `raw_${evt.event_id}`)}
                                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                              >
                                {copiedField === `raw_${evt.event_id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                <span>Copy Raw</span>
                              </button>
                              <button
                                onClick={() => handleCopy(JSON.stringify(evt, null, 2), `json_${evt.event_id}`)}
                                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                              >
                                {copiedField === `json_${evt.event_id}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                                <span>Copy JSON</span>
                              </button>
                            </div>
                          </div>
                          <div className="p-3 bg-black rounded-lg border border-white/[0.08] text-slate-300 font-mono text-[11px] leading-relaxed break-all select-all">
                            {evt.raw_log}
                          </div>
                        </div>

                        {/* Actions Strip */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenTriage(evt)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#FDE047] hover:bg-[#FDE047]/90 text-black font-bold text-xs transition-all shadow-md shadow-[#FDE047]/10 cursor-pointer font-mono"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-black" />
                              <span>Chat with AI About This Event</span>
                            </button>
                            <button
                              onClick={() => handlePresetClick(`EventCode=${evt.event_code}`)}
                              className="px-3 py-1.5 rounded bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border border-white/[0.1] text-xs transition-all cursor-pointer"
                            >
                              Filter EventCode={evt.event_code}
                            </button>
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            EventID: {evt.event_id} &bull; Session: {evt.session_id}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* AI Interactive Chat Drawer Anchored to the Specific Log */}
      {triageEvent && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-[#0D0D10] border-l border-white/[0.15] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-white/[0.1] bg-[#111115] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#FDE047]/10 border border-[#FDE047]/30 text-[#FDE047]">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-black font-mono text-white uppercase tracking-wider">
                      SOC AI Incident Investigation
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FDE047]/20 text-[#FDE047] border border-[#FDE047]/40">
                      LIVE CHAT
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Analyzing EventCode {triageEvent.event_code} &bull; {triageEvent.event_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTriageEvent(null)}
                className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Event Reference Card */}
            <div className="px-5 py-3 bg-black/60 border-b border-white/[0.08] font-mono text-xs space-y-1 shrink-0">
              <div className="flex items-center justify-between text-slate-400">
                <span>Time: {formatISTFull(triageEvent.timestamp)}</span>
                <span>Host: {triageEvent.host}</span>
                <span>PID: {triageEvent.extracted_fields?.PID || triageEvent.extracted_fields?.TargetPID || 'N/A'}</span>
              </div>
              <div className="text-emerald-400 truncate font-mono">
                Command: {triageEvent.extracted_fields?.CommandLine || triageEvent.summary}
              </div>
            </div>

            {/* Chat Message History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
              {chatMessages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="h-7 w-7 rounded-lg bg-[#FDE047] text-black font-bold flex items-center justify-center shrink-0 text-[10px] shadow-sm">
                        AI
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 leading-relaxed whitespace-pre-wrap max-w-[85%] ${
                        isUser
                          ? 'bg-[#1C1C24] border border-white/[0.12] text-slate-100 rounded-tr-sm'
                          : 'bg-[#121216] border border-white/[0.08] text-slate-200 rounded-tl-sm shadow-inner'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-1 text-[10px] text-slate-500">
                        <span className="font-bold text-slate-400">{isUser ? 'Investigator (You)' : 'Lead Threat Hunter (AI)'}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      {msg.content}
                    </div>
                    {isUser && (
                      <div className="h-7 w-7 rounded-lg bg-white/[0.1] text-slate-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                        YOU
                      </div>
                    )}
                  </div>
                );
              })}

              {isTriageLoading && (
                <div className="flex items-center gap-2 text-slate-400 p-3 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#FDE047]" />
                  <span className="text-xs font-mono">AI SOC Analyst is examining log telemetry and replying...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Prompt Suggestion Chips */}
            <div className="px-4 py-2 bg-[#0E0E12] border-t border-white/[0.05] flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono shrink-0">
              <span className="text-slate-500 text-[10px] uppercase shrink-0">Suggested:</span>
              <button
                type="button"
                onClick={() => handleSendMessage('Is this process still active or has it been killed?')}
                className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] shrink-0 cursor-pointer transition-all hover:text-[#FDE047]"
              >
                Is this process still active?
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Explain what this command line parameter does')}
                className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] shrink-0 cursor-pointer transition-all hover:text-[#FDE047]"
              >
                Explain command parameters
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('Give me a Splunk search query to find other instances')}
                className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] shrink-0 cursor-pointer transition-all hover:text-[#FDE047]"
              >
                Splunk query for this
              </button>
              <button
                type="button"
                onClick={() => handleSendMessage('How do I surgically terminate this process and block its IP?')}
                className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] shrink-0 cursor-pointer transition-all hover:text-[#FDE047]"
              >
                Kill & Block command
              </button>
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 border-t border-white/[0.1] bg-[#111115] shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask the AI investigator about this log (e.g. 'Where is it connecting?')..."
                  className="flex-1 px-3.5 py-2.5 bg-black border border-white/[0.12] rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#FDE047] transition-all"
                />
                <button
                  type="submit"
                  disabled={isTriageLoading || !chatInput.trim()}
                  className="px-4 py-2.5 rounded-lg bg-[#FDE047] hover:bg-[#FDE047]/90 text-black font-mono font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#FDE047]/10"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
