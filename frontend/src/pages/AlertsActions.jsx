import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Zap, Lock } from 'lucide-react';
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

  if (loading) return <LoadingState message="Loading security alerts and incident actions..." />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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

        <div className="flex items-center gap-3">
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
