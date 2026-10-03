import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  ShieldAlert,
  Smartphone,
  CheckCheck,
  Zap,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Usb,
  Radio,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Bot
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

const API_BASE = `http://${window.location.hostname || 'localhost'}:8001/api/whatsapp`;

export function WhatsAppBotPage() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    enabled: true,
    target_phone: '',
    gateway_mode: 'CALLMEBOT',
    callmebot_apikey: '',
    openwa_rest_url: 'http://127.0.0.1:8085/api/sendText'
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const messagesEndRef = useRef(null);
  const { liveEvents } = useWebSocket();
  const lastEvent = liveEvents?.[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    fetchMessages();
    fetchConfig();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen to live WebSocket events to stream WhatsApp alerts
  useEffect(() => {
    if (!lastEvent) return;
    if (lastEvent.source === 'WHATSAPP_BOT' || lastEvent.event_type?.includes('WHATSAPP')) {
      fetchMessages();
    }
    // If a critical threat happens in real-time, refresh chat after a brief moment
    if (lastEvent.severity === 'CRITICAL' || lastEvent.event_type?.includes('CONTAINMENT')) {
      setTimeout(fetchMessages, 1200);
    }
  }, [lastEvent]);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/config`);
      if (res.ok) {
        const data = await res.json();
        if (data) setConfig(data);
      }
    } catch (err) {
      console.error('Failed to load WhatsApp config', err);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`${API_BASE}/messages?limit=60`);
      if (res.ok) {
        const data = await res.json();
        if (data) setMessages(data);
      }
    } catch (err) {
      console.error('Failed to load WhatsApp messages', err);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setConfigSaving(true);
    setConfigSuccess(false);
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setConfigSuccess(true);
        setTimeout(() => {
          setConfigSuccess(false);
          setShowConfigModal(false);
        }, 1200);
      }
    } catch (err) {
      console.error('Failed to save config', err);
    } finally {
      setConfigSaving(false);
    }
  };

  const handleSendMessage = async (textToSend = inputText) => {
    if (!textToSend.trim() || loading) return;
    const text = textToSend.trim();
    setInputText('');
    setLoading(true);

    // Optimistic UI update
    const tempMsg = {
      id: Date.now(),
      direction: 'INBOUND',
      sender: 'Analyst',
      message: text,
      timestamp: new Date().toISOString(),
      status: 'DELIVERED'
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sender: 'Analyst' })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.history) {
          setMessages(data.history);
        } else {
          fetchMessages();
        }
      } else {
        fetchMessages();
      }
    } catch (err) {
      console.error('Failed to send WhatsApp message', err);
      fetchMessages();
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestAlert = async () => {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/send_test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threat_type: 'USB_TRIGGERED_SCRIPT_HOST',
          severity: 'CRITICAL',
          details: 'Simulated autorun payload intercepted and isolated from /run/media/yashz/KIOXIA_USB',
          target: 'bash (PID: 1188214)'
        })
      });
      if (res.ok) {
        setTestResult({
          success: true,
          text: 'Alert successfully dispatched to WhatsApp Bot!'
        });
        fetchMessages();
      } else {
        setTestResult({
          success: false,
          text: 'Failed to dispatch test alert.'
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        text: 'Failed to dispatch test alert.'
      });
    } finally {
      setTestSending(false);
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-[#0b141a] rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative select-none">
      {/* Top Header: WhatsApp Style */}
      <div className="bg-[#202c33] px-6 py-3.5 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-[#00a884]/20 border border-[#00a884]/40 flex items-center justify-center text-white">
              <Bot className="w-6 h-6 text-[#00a884]" />
            </div>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#00a884] border-2 border-[#202c33] rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-white text-base tracking-wide flex items-center gap-1.5">
                PHANTOM SOC Sentinel
                <span className="bg-[#00a884] text-black text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                  VERIFIED BOT
                </span>
              </h2>
            </div>
            <p className="text-xs text-[#8696a0] flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-[#00a884] animate-pulse" />
              Real-Time End-to-End Encrypted Threat Channel • No Login Required
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSendTestAlert}
            disabled={testSending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2a3942] hover:bg-[#32434d] text-xs font-medium text-white transition-all border border-white/10"
            title="Dispatch a mock critical threat alert"
          >
            <Zap className={`w-3.5 h-3.5 text-[#FDE047] ${testSending ? 'animate-spin' : ''}`} />
            Send Test Alert
          </button>

          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00a884] hover:bg-[#008f72] text-xs font-semibold text-black transition-all shadow-md shadow-[#00a884]/20"
          >
            <Smartphone className="w-3.5 h-3.5" />
            WhatsApp Settings
          </button>
        </div>
      </div>

      {/* Test Banner Feedback */}
      {testResult && (
        <div className={`px-6 py-2 text-xs flex items-center justify-between font-mono ${testResult.success ? 'bg-[#00a884]/20 text-[#00a884] border-b border-[#00a884]/30' : 'bg-red-500/20 text-red-400 border-b border-red-500/30'}`}>
          <span>{testResult.text}</span>
          <button onClick={() => setTestResult(null)} className="hover:underline">✕</button>
        </div>
      )}

      {/* Main Container: Chat + Quick Actions Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Quick Channels / SOC Shortcuts */}
        <div className="w-64 bg-[#111b21] border-r border-white/5 flex flex-col justify-between hidden md:flex shrink-0">
          <div className="p-3 space-y-1 overflow-y-auto">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#8696a0] px-3 py-2 font-semibold">
              Live Threat Channels
            </div>

            <div className="p-3 rounded-xl bg-[#202c33] border border-white/5 cursor-pointer flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-semibold text-white truncate">Endpoint Defense</h4>
                  <span className="text-[10px] text-[#00a884]">Active</span>
                </div>
                <p className="text-[11px] text-[#8696a0] truncate">Automatic Alerts Live</p>
              </div>
            </div>

            <div className="pt-4 px-3 text-[11px] font-mono uppercase tracking-wider text-[#8696a0] font-semibold">
              Quick Bot Prompts
            </div>

            <div className="space-y-1.5 pt-1">
              {[
                { cmd: 'status', label: '📊 System Status', desc: 'Get health & containment counts' },
                { cmd: 'alerts', label: '🚨 Latest Threats', desc: 'Show recent 3 intercepts' },
                { cmd: 'eject', label: '⏏️ Eject USB Drive', desc: 'Emergency unmount device' },
                { cmd: 'help', label: '❓ Command Guide', desc: 'View all SOC bot commands' },
              ].map((item) => (
                <button
                  key={item.cmd}
                  onClick={() => handleSendMessage(item.cmd)}
                  className="w-full text-left p-2.5 rounded-lg hover:bg-[#202c33] transition-all border border-transparent hover:border-white/5 group"
                >
                  <div className="text-xs font-medium text-[#e9edef] group-hover:text-[#00a884]">
                    {item.label}
                  </div>
                  <div className="text-[10px] text-[#8696a0] truncate">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom Gateway Status */}
          <div className="p-3.5 bg-[#182229] border-t border-white/5">
            <div className="text-[11px] font-mono text-[#8696a0] flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#00a884] animate-pulse" />
              Mode: <span className="text-white font-semibold">{config.gateway_mode}</span>
            </div>
            <div className="text-[10px] text-[#8696a0] mt-1 truncate">
              {config.target_phone ? `Phone: ${config.target_phone}` : 'Real phone alerts: Not configured'}
            </div>
          </div>
        </div>

        {/* Right: WhatsApp Chat Stream */}
        <div className="flex-1 flex flex-col bg-[#0b141a] relative">
          {/* Subtle WhatsApp-style doodle background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 z-10">
            {/* Encryption notice banner */}
            <div className="flex justify-center">
              <div className="bg-[#182229] border border-white/5 text-[#8696a0] text-[11px] px-4 py-1.5 rounded-lg max-w-md text-center shadow">
                🔒 Messages and alerts dispatched by PHANTOM are monitored autonomously. Zero external login required.
              </div>
            </div>

            {messages.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-[#8696a0] space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#202c33] flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-[#00a884]" />
                </div>
                <div className="text-sm font-semibold text-white">No WhatsApp messages yet</div>
                <p className="text-xs max-w-sm">
                  Click <span className="text-[#00a884] font-semibold">"Send Test Alert"</span> above or type <code className="text-[#FDE047]">status</code> below to chat with your PHANTOM SOC bot!
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isOutbound = msg.direction === 'OUTBOUND';
                const isAlert = msg.message?.includes('PHANTOM ZERO-TRUST SOC ALERT');

                return (
                  <div
                    key={msg.id || idx}
                    className={`flex ${isOutbound ? 'justify-start' : 'justify-end'} animate-in fade-in duration-200`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-md relative text-sm ${
                        isOutbound
                          ? isAlert
                            ? 'bg-[#182229] border border-[#ff3b30]/30 text-[#e9edef]'
                            : 'bg-[#202c33] text-[#e9edef] rounded-tl-sm'
                          : 'bg-[#005c4b] text-white rounded-tr-sm'
                      }`}
                    >
                      {/* Sender label */}
                      {isOutbound && (
                        <div className="text-[11px] font-semibold text-[#00a884] mb-1 flex items-center gap-1.5">
                          <span>{msg.sender || 'PHANTOM Sentinel'}</span>
                          {isAlert && (
                            <span className="bg-[#ff3b30]/20 text-[#ff3b30] text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                              CRITICAL
                            </span>
                          )}
                        </div>
                      )}

                      {/* Message Content */}
                      <div className="whitespace-pre-wrap leading-relaxed font-sans text-[13px]">
                        {msg.message}
                      </div>

                      {/* Interactive Buttons on Alert Messages */}
                      {isAlert && (
                        <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap gap-2">
                          <button
                            onClick={() => handleSendMessage('eject')}
                            className="px-2.5 py-1 bg-[#ff3b30]/20 hover:bg-[#ff3b30]/30 text-[#ff3b30] rounded text-xs font-mono font-semibold transition-all flex items-center gap-1"
                          >
                            <Usb className="w-3 h-3" /> Eject USB
                          </button>
                          <button
                            onClick={() => handleSendMessage('status')}
                            className="px-2.5 py-1 bg-white/10 hover:bg-white/15 text-white rounded text-xs font-mono transition-all"
                          >
                            System Status
                          </button>
                        </div>
                      )}

                      {/* Timestamp & Delivery Status */}
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#8696a0]">
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {!isOutbound && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Bar */}
          <div className="p-3 md:p-4 bg-[#202c33] border-t border-white/10 z-10">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 max-w-4xl mx-auto"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a WhatsApp command ('status', 'alerts', 'eject', 'help')..."
                className="flex-1 bg-[#2a3942] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884] transition-all"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || loading}
                className="w-10 h-10 rounded-xl bg-[#00a884] hover:bg-[#008f72] disabled:opacity-40 disabled:hover:bg-[#00a884] text-black flex items-center justify-center transition-all shrink-0 font-bold"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Settings Modal (Configure Real WhatsApp Phone / OpenWA) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111b21] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#00a884]" />
                <h3 className="font-semibold text-white text-base">WhatsApp Alert Configuration</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-[#8696a0] hover:text-white transition-all text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-[#8696a0] mb-1.5 font-semibold">
                  Gateway Mode
                </label>
                <select
                  value={config.gateway_mode}
                  onChange={(e) => setConfig({ ...config, gateway_mode: e.target.value })}
                  className="w-full bg-[#202c33] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#00a884]"
                >
                  <option value="CALLMEBOT">CallMeBot (Direct to Real Phone - Zero Login!)</option>
                  <option value="OPENWA_REST">Open-WA REST Gateway (@open-wa/wa-automate)</option>
                  <option value="MOCK">In-App Chatbot Only (Presentation Mode)</option>
                </select>
                <p className="text-[11px] text-[#8696a0] mt-1">
                  {config.gateway_mode === 'CALLMEBOT' && '🚀 Recommended: Delivers alerts directly to your personal phone number with no local browser or WhatsApp login required.'}
                  {config.gateway_mode === 'OPENWA_REST' && '🌐 Connects to a local @open-wa/wa-automate REST daemon running on localhost:8085.'}
                  {config.gateway_mode === 'MOCK' && '💻 All alerts appear live in the web console WhatsApp widget without external delivery.'}
                </p>
              </div>

              {config.gateway_mode === 'CALLMEBOT' && (
                <>
                  <div>
                    <label className="block text-xs font-mono uppercase text-[#8696a0] mb-1.5 font-semibold">
                      Your Phone Number (with Country Code)
                    </label>
                    <input
                      type="text"
                      placeholder="+919876543210"
                      value={config.target_phone}
                      onChange={(e) => setConfig({ ...config, target_phone: e.target.value })}
                      className="w-full bg-[#202c33] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-[#8696a0] mb-1.5 font-semibold flex justify-between">
                      <span>CallMeBot Free API Key</span>
                      <a
                        href="https://www.callmebot.com/blog/free-api-whatsapp-messages/"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#00a884] hover:underline flex items-center gap-1 text-[11px]"
                      >
                        How to get free key <ExternalLink className="w-3 h-3" />
                      </a>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 123456"
                      value={config.callmebot_apikey}
                      onChange={(e) => setConfig({ ...config, callmebot_apikey: e.target.value })}
                      className="w-full bg-[#202c33] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
                    />
                    <div className="bg-[#202c33]/60 p-2.5 rounded-lg border border-white/5 mt-2 text-[11px] text-[#8696a0] space-y-1">
                      <div className="font-semibold text-white">To get your free key in 10 seconds:</div>
                      <div>1. Send <code className="text-[#00a884]">I allow callmebot to send me messages</code> to <strong>+34 644 44 24 53</strong> on WhatsApp.</div>
                      <div>2. It replies with your numeric API Key immediately. Paste it here!</div>
                    </div>
                  </div>
                </>
              )}

              {config.gateway_mode === 'OPENWA_REST' && (
                <div>
                  <label className="block text-xs font-mono uppercase text-[#8696a0] mb-1.5 font-semibold">
                    Open-WA REST API URL
                  </label>
                  <input
                    type="text"
                    value={config.openwa_rest_url}
                    onChange={(e) => setConfig({ ...config, openwa_rest_url: e.target.value })}
                    className="w-full bg-[#202c33] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#00a884]"
                  />
                  <p className="text-[11px] text-[#8696a0] mt-1">
                    Runs via: <code className="text-[#FDE047]">npx @open-wa/wa-automate --port 8085</code>
                  </p>
                </div>
              )}

              <div className="flex items-center gap-3 pt-3 border-t border-white/10 justify-end">
                {configSuccess && (
                  <span className="text-xs text-[#00a884] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#8696a0] hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={configSaving}
                  className="px-5 py-2 rounded-xl bg-[#00a884] hover:bg-[#008f72] text-black font-semibold text-xs transition-all shadow"
                >
                  {configSaving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
