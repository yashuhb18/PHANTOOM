import React, { useState, useEffect } from 'react';
import { ThreatSummary } from '../components/dashboard/ThreatSummary';
import { ActiveSessions } from '../components/dashboard/ActiveSessions';
import { LiveTicker } from '../components/dashboard/LiveTicker';
import { SimulateButton } from '../components/common/SimulateButton';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../hooks/useAuth';
import { Zap, ArrowRight, Clock, MapPin, HardDrive, LogOut, AlertTriangle, CheckCircle2, Trash2, RefreshCw, Camera } from 'lucide-react';
import { safeJson } from '../utils/api';

export function Dashboard({ setTab, setSelectedSessionId }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({
    containmentCount: 0,
    canaryHits: 0,
    clusterCount: 0,
  });
  const { liveEvents } = useWebSocket();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Local time formatted (24hr: HH:MM:SS)
  const localTime = time.toLocaleTimeString('en-GB', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // UTC time formatted (HH:MM:SS)
  const utcTime = time.toISOString().substring(11, 19);

  // Timezone abbreviation (e.g. IST, UTC, EST)
  const tzAbbr = (() => {
    try {
      const str = time.toLocaleTimeString('en-US', { timeZoneName: 'short' });
      const parts = str.split(' ');
      return parts[parts.length - 1] || 'IST';
    } catch {
      return 'IST';
    }
  })();

  // Location details with local terminal node
  const locationInfo = (() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz.includes('Calcutta') || tz.includes('Kolkata')) {
        return { name: 'Bengaluru, IN', node: 'HQ-01' };
      }
      if (tz.includes('/')) {
        const city = tz.split('/')[1].replace(/_/g, ' ');
        return { name: `${city}`, node: 'NODE-01' };
      }
    } catch {
      // fallback
    }
    return { name: 'Bengaluru, IN', node: 'HQ-01' };
  })();

  const displayName = user?.username
    ? user.username.charAt(0).toUpperCase() + user.username.slice(1)
    : 'Admin';

  const fetchStats = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/stats`);
      const data = await safeJson(res);
      if (data) {
        setStats(data);
      }
    } catch (e) {
      console.error("Stats fetch error:", e);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/sessions`);
      const data = await safeJson(res, []);
      if (Array.isArray(data)) {
        setSessions(data);
      }
    } catch (e) {
      console.error("Failed to fetch sessions:", e);
    }
  };

  const [topology, setTopology] = useState(null);
  const [ejectingMount, setEjectingMount] = useState(null);
  const [ejectToast, setEjectToast] = useState(null);

  const fetchTopology = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/devices/topology`);
      const data = await safeJson(res);
      if (data) {
        setTopology(data);
      }
    } catch (e) {
      console.error("Topology fetch error:", e);
    }
  };

  const handleEjectUsb = async (mountPoint) => {
    setEjectingMount(mountPoint);
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/devices/eject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mount_point: mountPoint,
          reason: 'User safe ejection from dashboard'
        })
      });
      const data = await safeJson(res, {});
      if (res.ok) {
        setEjectToast(`Drive ${mountPoint} safely ejected and unmounted.`);
        setTimeout(() => setEjectToast(null), 4000);
        fetchTopology();
        fetchSessions();
      } else {
        setEjectToast(`Eject failed: ${data.detail || data.details || 'Error dismounting'}`);
        setTimeout(() => setEjectToast(null), 4000);
      }
    } catch (e) {
      console.error("Eject error:", e);
      setEjectToast(`Error communicating with backend: ${e.message}`);
      setTimeout(() => setEjectToast(null), 4000);
    } finally {
      setEjectingMount(null);
    }
  };

  const [deletingThreat, setDeletingThreat] = useState(false);
  const [deletedSuccess, setDeletedSuccess] = useState(false);

  const handleDeleteThreat = async (mountPoint, filename) => {
    setDeletingThreat(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/devices/delete-threat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mount_point: mountPoint,
          filename: filename || 'something.bat'
        })
      });
      const data = await safeJson(res, {});
      if (res.ok && data.status === 'SUCCESS') {
        setDeletedSuccess(true);
        setEjectToast(`File "${filename || 'something.bat'}" successfully deleted from drive.`);
        setTimeout(() => setEjectToast(null), 4000);
      }
    } catch (e) {
      console.error("Delete threat error:", e);
    } finally {
      setDeletingThreat(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchTopology();
    fetchStats();
  }, []);

  // Update topology and stats on live events
  useEffect(() => {
    if (liveEvents && liveEvents.length > 0) {
      const latest = liveEvents[0];
      if (['PORT_TOPOLOGY_UPDATED', 'USB_INSERTED', 'USB_REMOVED', 'CANARY_TRAP_TRIPPED', 'CONTAINMENT_TRIGGERED', 'USB_THREAT_ACTION_REQUIRED', 'THREAT_FILE_DELETED'].includes(latest.event_type)) {
        fetchTopology();
        fetchSessions();
        fetchStats();
      }
    }
  }, [liveEvents]);

  // Periodic background check to synchronize manual file removals/deletions immediately
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchTopology();
    }, 2500);
    return () => clearInterval(pollInterval);
  }, []);

  const handleSessionClick = (id) => {
    setSelectedSessionId(id);
    setTab('sessions');
  };

  const storageCount = topology?.summary?.active_storage_devices || 0;
  const storageDevices = topology?.storage_devices || [];
  const periCount = topology?.summary?.active_peripherals || 0;
  const peripherals = topology?.peripherals || [];

  // Real-time threat status strictly derived from current physical drive filesystem state
  const primaryStorage = storageDevices[0] || null;
  const hasUsbThreat = Boolean(
    primaryStorage && 
    primaryStorage.has_threat && 
    primaryStorage.active_threats && 
    primaryStorage.active_threats.length > 0 && 
    !deletedSuccess
  );
  const threatFileName = hasUsbThreat 
    ? (primaryStorage.primary_threat || primaryStorage.active_threats[0] || 'something.bat')
    : null;

  useEffect(() => {
    if (primaryStorage && (!primaryStorage.has_threat || !primaryStorage.active_threats || primaryStorage.active_threats.length === 0)) {
      if (deletedSuccess) setDeletedSuccess(false);
    }
  }, [primaryStorage, deletedSuccess]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* =========================================================================
          DEDICATED SECTION: WELCOME BACK, LOCATION & SYSTEM TIMINGS
          Spacious, high-contrast, perfectly aligned
          ========================================================================= */}
      <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 shadow-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Greeting & Status */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-xl shrink-0 shadow-inner">
            👋
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Hello, Welcome back, <span className="text-[#FDE047]">{displayName}</span>
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                TERMINAL ONLINE
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 font-sans">
              Autonomous USB Threat Sentinel is active • Monitoring local bus topology and forensic activity.
            </p>
          </div>
        </div>

        {/* Right: Location & Timing Badges */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
          {/* Location Badge */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-neutral-900/90 border border-white/[0.08] text-xs font-mono shadow-inner min-w-[170px]">
            <div className="w-8 h-8 rounded-xl bg-[#FDE047]/10 border border-[#FDE047]/20 flex items-center justify-center text-[#FDE047] shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 block uppercase font-bold tracking-wider leading-none">
                Location
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-white font-semibold">{locationInfo.name}</span>
                <span className="text-[9px] font-bold text-[#FDE047] bg-[#FDE047]/15 px-1.5 py-0.5 rounded border border-[#FDE047]/30">
                  {locationInfo.node}
                </span>
              </div>
            </div>
          </div>

          {/* Timings Badge (Live Clock) */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-neutral-900/90 border border-white/[0.08] text-xs font-mono shadow-inner min-w-[210px]">
            <div className="w-8 h-8 rounded-xl bg-[#FDE047]/10 border border-[#FDE047]/20 flex items-center justify-center text-[#FDE047] shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 block uppercase font-bold tracking-wider leading-none">
                System Time
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-white font-bold tabular-nums">
                  {localTime} <span className="text-[#FDE047] text-[10px] font-bold">{tzAbbr}</span>
                </span>
                <span className="text-neutral-600 font-sans select-none">•</span>
                <span className="text-neutral-400 text-[11px] tabular-nums font-medium">
                  {utcTime} UTC
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Hardware & Port Status Overview Banner */}
      <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-[#FDE047] shrink-0">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-bold tracking-tight text-white">Laptop Hardware & Port Sentinel</h3>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                LIVE AGENT
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              {periCount} Peripherals Attached ({peripherals[0]?.name || 'Wireless Mouse Dongle'}) • {storageCount > 0 ? `${storageCount} Flash Storage Active` : 'Awaiting USB Flash Drive Insertion'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => setTab('scanner')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.1] transition-all cursor-pointer pill-button shadow-sm"
            title="Pre-plug AI photo triage of physical USB"
          >
            <Camera className="w-3.5 h-3.5 text-[#FDE047]" />
            <span>Scan USB Photo</span>
          </button>
          <button
            onClick={() => setTab('ports')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-[#FDE047] hover:bg-[#FACC15] text-black transition-all cursor-pointer pill-button shadow-lg shadow-[#FDE047]/10"
          >
            <span>View Port Topology</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Toast Notification for Eject/System actions */}
      {ejectToast && (
        <div className="p-4 px-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-2xl font-semibold flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{ejectToast}</span>
          </div>
        </div>
      )}

      {/* ACTIVE USB FLASH DRIVE & USER EJECT ACTION CARD */}
      {storageDevices.length > 0 && (
        <div className={`border rounded-[28px] p-6 shadow-2xl ${
          hasUsbThreat 
            ? 'bg-[#181010] border-red-500/50 shadow-red-950/30' 
            : 'bg-[#141414] border-[#FDE047]/30 shadow-yellow-950/10'
        }`}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0 shadow-lg ${
                hasUsbThreat
                  ? 'bg-red-500 text-white shadow-red-500/30'
                  : 'bg-[#FDE047] text-black shadow-[#FDE047]/20'
              }`}>
                {hasUsbThreat ? <AlertTriangle className="w-6 h-6" /> : <HardDrive className="w-6 h-6" />}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {hasUsbThreat ? 'Critical Threat Detected:' : 'Removable USB Storage Attached:'}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#FDE047]/15 text-[#FDE047] border border-[#FDE047]/30">
                    {storageDevices[0].mount_point} {storageDevices[0].device_name || storageDevices[0].model || 'Flash Drive'}
                  </span>
                  {hasUsbThreat ? (
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-red-500/25 text-red-300 border border-red-500/50 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-red-400" />
                      MALICIOUS SCRIPT ({threatFileName}) DETECTED
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      SECURED • ZERO-TRUST SURVEILLANCE
                    </span>
                  )}
                </div>

                {hasUsbThreat ? (
                  <div className="pt-1.5 space-y-1">
                    <p className="text-xs font-bold text-red-200">
                      ⚠️ Threat detected: <span className="underline text-white font-mono">{threatFileName}</span> is inside this folder.
                    </p>
                    <p className="text-xs font-black text-yellow-300">
                      You need to eject as early as possible or eject now.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Volume capacity: {storageDevices[0].capacity_gb || 'Active'} GB ({storageDevices[0].filesystem || 'FAT32'}). Zero-Trust memory isolation and canary traps armed.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end lg:self-center">
              {hasUsbThreat && !deletedSuccess && (
                <button
                  onClick={() => handleDeleteThreat(storageDevices[0].mount_point, threatFileName)}
                  disabled={deletingThreat}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold text-neutral-300 hover:text-white bg-white/[0.06] hover:bg-red-500/20 border border-white/[0.1] hover:border-red-500/30 transition-all cursor-pointer pill-button"
                  title="Permanently remove threat file from USB"
                >
                  {deletingThreat ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span>Remove {threatFileName}</span>
                </button>
              )}

              <button
                onClick={() => handleEjectUsb(storageDevices[0].mount_point)}
                disabled={ejectingMount === storageDevices[0].mount_point}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black transition-all cursor-pointer pill-button shadow-xl uppercase tracking-wider ${
                  hasUsbThreat
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                    : 'bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.15]'
                }`}
                title="Safely dismount and eject this USB drive"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>
                  {ejectingMount === storageDevices[0].mount_point 
                    ? 'Ejecting Drive...' 
                    : hasUsbThreat 
                      ? `Eject Now (${storageDevices[0].mount_point})` 
                      : `Safe Eject (${storageDevices[0].mount_point})`}
                </span>
              </button>

              <button
                onClick={() => setTab('ports')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold bg-[#FDE047] hover:bg-[#FACC15] text-black transition-all cursor-pointer pill-button shadow-lg shadow-[#FDE047]/10"
              >
                <span>Ports</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPI Metrics */}
      <ThreatSummary stats={stats} />

      {/* 2-Column Grid: Active Sessions & Live Ticker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActiveSessions sessions={sessions} onSelectSession={handleSessionClick} />
        </div>
        <div className="lg:col-span-1">
          <LiveTicker events={liveEvents} />
        </div>
      </div>
    </div>
  );
}
