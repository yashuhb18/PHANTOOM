import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Zap, Lock, Smartphone, ExternalLink } from 'lucide-react';
import { AlertBadge } from '../components/common/AlertBadge';
import { LoadingState } from '../components/common/LoadingState';
import { formatISTFull } from '../utils/time';
import { safeJson } from '../utils/api';

export function AlertsActions() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState(null);

  const loadAlerts = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/alerts`);
      const data = await safeJson(res, []);
      if (Array.isArray(data)) setAlerts(data);
    } catch (e) {
      console.error("Failed to load alerts:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const triggerAction = async (actionType) => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/actions/isolate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: 'sess_demo_stage1_ducky',
          action_type: actionType,
          target: 'PRIMARY_NIC'
        })
      });
      if (res.ok) {
        setActionStatus(`Executed ${actionType} successfully.`);
        loadAlerts();
        setTimeout(() => setActionStatus(null), 4000);
      }
    } catch (e) {
      console.error("Action error:", e);
    }
  };

  const [testPushLoading, setTestPushLoading] = useState(false);

  const sendTestPush = async () => {
    setTestPushLoading(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/whatsapp/send_test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threat_type: 'KEYSTROKE_INJECTION',
          severity: 'CRITICAL',
          details: 'High-frequency keystroke burst injected into powershell.exe host.',
          target: 'powershell.exe (PID: 4921)'
        })
      });
      if (res.ok) {
        setActionStatus('📱 Push alert with PHANTOM logo delivered to ntfy.sh/phantom_alerts');
        setTimeout(() => setActionStatus(null), 5000);
      }
    } catch (e) {
      console.error('Failed to send test push:', e);
    } finally {
      setTestPushLoading(false);
    }
  };

  if (loading) return <LoadingState message="Loading security alerts and incident actions..." />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Mobile Lock-screen Channel Banner */}
      <div className="bg-[#141414] border border-white/[0.06] rounded-[24px] px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-neutral-400 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#FDE047]/10 border border-[#FDE047]/20 flex items-center justify-center text-[#FDE047] shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <span className="text-white font-semibold">Live Push Channel: </span>
            <span className="font-mono text-[#FDE047]">ntfy.sh/phantom_alerts</span>
            <span className="text-neutral-500 ml-2 hidden sm:inline">• Real-time lock-screen alerts with PHANTOM logo & action buttons</span>
          </div>
        </div>
        <a
          href="https://ntfy.sh/phantom_alerts"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[#FDE047] hover:underline shrink-0"
        >
          <span>Open Web Feed</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Containment Actions Card */}
      <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-[#FDE047] shrink-0">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight uppercase">Autonomous Containment Actions</h2>
            <p className="text-xs text-neutral-400 mt-1">
              Surgical endpoint defense triggers. Sever outbound network sockets or isolate host while keeping telemetry open.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={sendTestPush}
            disabled={testPushLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-bold border border-white/[0.1] shadow-lg transition-all pill-button cursor-pointer disabled:opacity-50"
            title="Dispatch a live test notification with PHANTOM logo to ntfy.sh"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#FDE047]" />
            <span>{testPushLoading ? 'Dispatching...' : 'Test Mobile Push'}</span>
          </button>
          <button
            onClick={() => triggerAction('SOCKET_SEVER')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-500/20 transition-all pill-button cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Sever Sockets</span>
          </button>
          <button
            onClick={() => triggerAction('MICRO_ISOLATE')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FDE047] hover:bg-[#FACC15] text-black text-xs font-bold shadow-lg shadow-[#FDE047]/10 transition-all pill-button cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Micro-Isolate Host</span>
          </button>
        </div>
      </div>

      {actionStatus && (
        <div className="p-4 px-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-2xl font-semibold flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{actionStatus}</span>
        </div>
      )}

      {/* Alerts Table */}
      <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between bg-[#0F0F0F]">
          <h3 className="text-xs font-bold text-white uppercase tracking-wide">Triggered Incident Alerts</h3>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/[0.04] text-neutral-300 border border-white/[0.08]">
            {alerts.length} ALERTS
          </span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {alerts.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-500">
              No active security alerts recorded.
            </div>
          ) : (
            alerts.map((alert) => {
              const isCrit = alert.severity === 'CRITICAL';
              const stripeColor = isCrit ? 'border-l-red-500' : 'border-l-amber-500';
              return (
                <div
                  key={alert.id}
                  className={`p-4 px-6 hover:bg-white/[0.02] transition-colors border-l-4 ${stripeColor} flex items-center justify-between`}
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-xs text-white">{alert.title}</span>
                      {alert.mitre_technique && (
                        <span className="text-[10px] font-mono bg-neutral-900 text-[#FDE047] px-2 py-0.5 rounded-full border border-white/[0.08]">
                          MITRE: {alert.mitre_technique}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">{alert.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] text-neutral-500 font-mono">
                      <span>{formatISTFull(alert.created_at)}</span>
                      <span>•</span>
                      <span>Target: {alert.session_id}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold">{alert.status}</span>
                    </div>
                  </div>

                  <AlertBadge severity={alert.severity} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
