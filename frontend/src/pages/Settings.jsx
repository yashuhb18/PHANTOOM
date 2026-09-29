import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Usb, Cpu, Sparkles, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { LoadingState } from '../components/common/LoadingState';
import { safeJson } from '../utils/api';

export function Settings() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiStatus, setAiStatus] = useState(null);
  const [testingAi, setTestingAi] = useState(false);

  const loadDevices = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/devices`);
      const data = await safeJson(res, []);
      if (Array.isArray(data)) setDevices(data);
    } catch (e) {
      console.error("Error loading devices:", e);
    } finally {
      setLoading(false);
    }
  };

  const checkAiStatus = async () => {
    setTestingAi(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/ai/status`);
      const data = await safeJson(res);
      if (res.ok && data) {
        setAiStatus(data);
      } else {
        setAiStatus({ status: 'error', error: 'AI server responded with error' });
      }
    } catch (e) {
      setAiStatus({ status: 'offline', error: e.message });
    } finally {
      setTestingAi(false);
    }
  };

  useEffect(() => {
    loadDevices();
    checkAiStatus();
  }, []);

  const handleTrustChange = async (deviceId, status) => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/devices/${deviceId}/trust?trust_status=${status}`, {
        method: 'POST'
      });
      if (res.ok) {
        loadDevices();
      }
    } catch (e) {
      console.error("Error updating device trust:", e);
    }
  };

  if (loading) return <LoadingState message="Querying system configuration and hardware inventory..." />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Overview Banner */}
      <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 flex items-center gap-4 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-[#FDE047] shrink-0">
          <SettingsIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight uppercase">System Settings & Engine Management</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Manage peripheral trust rules, local AI reasoning engine connections, and autonomous threat containment policies.
          </p>
        </div>
      </div>

      {/* Local AI Engine Status Card */}
      <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] overflow-hidden shadow-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FDE047]/10 border border-[#FDE047]/30 flex items-center justify-center text-[#FDE047] shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wide">Local AI Reasoning Engine (Qwen 2.5 Coder)</h3>
                <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                  aiStatus?.status === 'online'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                  {aiStatus?.status === 'online' ? 'ACTIVE & CONNECTED' : 'OFFLINE'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                High-speed local Ollama-backed LLM powering real-time script de-obfuscation, MITRE mapping, and SecOps Copilot.
              </p>
            </div>
          </div>

          <button
            onClick={checkAiStatus}
            disabled={testingAi}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-white border border-white/[0.1] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingAi ? 'animate-spin' : ''}`} />
            <span>{testingAi ? 'Testing Latency...' : 'Ping Engine'}</span>
          </button>
        </div>

        {/* Engine Specs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-[#0F0F0F] border border-white/[0.04]">
            <span className="text-[10px] font-mono text-neutral-400 uppercase">Configured Model</span>
            <div className="text-sm font-bold text-white font-mono mt-1">
              {aiStatus?.model || 'qwen2.5-coder:3b'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F0F0F] border border-white/[0.04]">
            <span className="text-[10px] font-mono text-neutral-400 uppercase">Ollama Endpoint</span>
            <div className="text-sm font-bold text-neutral-300 font-mono mt-1">
              http://localhost:11434
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0F0F0F] border border-white/[0.04]">
            <span className="text-[10px] font-mono text-neutral-400 uppercase">Response Latency</span>
            <div className="text-sm font-bold text-[#FDE047] font-mono mt-1">
              {aiStatus?.latency_ms ? `${aiStatus.latency_ms} ms` : '—'}
            </div>
          </div>
        </div>

        {aiStatus?.installed_models && (
          <div className="text-xs text-neutral-400 flex items-center gap-2 pt-1">
            <span className="text-[10px] font-mono uppercase text-neutral-500">Available in Ollama:</span>
            <div className="flex gap-2">
              {aiStatus.installed_models.map((m) => (
                <span key={m} className="px-2 py-0.5 rounded-md bg-neutral-900 border border-white/[0.08] font-mono text-white text-[11px]">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Device Hardware Inventory */}
      <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between bg-[#0F0F0F]">
          <h3 className="text-xs font-bold text-white uppercase tracking-wide">Known Peripheral Registry</h3>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/[0.04] text-neutral-300 border border-white/[0.08]">
            {devices.length} Devices Registered
          </span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {devices.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-500">
              No USB devices registered yet. Attach a USB device or run a demo simulation.
            </div>
          ) : (
            devices.map((dev) => (
              <div key={dev.id} className="p-4 px-6 hover:bg-white/[0.02] transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-neutral-900 border border-white/[0.08] text-[#FDE047] flex items-center justify-center">
                    <Usb className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">{dev.device_name}</span>
                      <span className="text-[10px] font-mono bg-neutral-900 px-2 py-0.5 rounded-full border border-white/[0.08] text-neutral-400">
                        VID:{dev.vendor_id} PID:{dev.product_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400">
                      <span>First seen: {dev.first_seen?.slice(0, 10)}</span>
                      <span>•</span>
                      <span>Total sessions: {dev.session_count}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => handleTrustChange(dev.id, 'TRUSTED')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      dev.trust_status === 'TRUSTED'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-md'
                        : 'bg-white/[0.02] text-neutral-400 border-white/[0.08] hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    Trusted
                  </button>
                  <button
                    onClick={() => handleTrustChange(dev.id, 'UNTRUSTED')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      dev.trust_status === 'UNTRUSTED'
                        ? 'bg-[#FDE047]/15 text-[#FDE047] border-[#FDE047]/30 shadow-md'
                        : 'bg-white/[0.02] text-neutral-400 border-white/[0.08] hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    Untrusted
                  </button>
                  <button
                    onClick={() => handleTrustChange(dev.id, 'BLOCKED')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      dev.trust_status === 'BLOCKED'
                        ? 'bg-red-500/15 text-red-400 border-red-500/30 shadow-md'
                        : 'bg-white/[0.02] text-neutral-400 border-white/[0.08] hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    Blocked
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
