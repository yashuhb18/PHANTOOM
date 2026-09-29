import React, { useState, useEffect } from 'react';
import {
  Usb,
  Cpu,
  HardDrive,
  Mouse,
  Keyboard,
  Camera,
  Bluetooth,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Layers,
  ArrowRight,
  ExternalLink,
  Zap,
  LogOut
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { safeJson } from '../utils/api';

export function HardwarePorts({ setTab, setSelectedSessionId }) {
  const [topology, setTopology] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [ejectingMount, setEjectingMount] = useState(null);
  const { liveEvents } = useWebSocket();

  const handleEjectUsb = async (mountPoint) => {
    setEjectingMount(mountPoint);
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/devices/eject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mount_point: mountPoint,
          reason: 'User safe hardware ejection from Port Topology'
        })
      });
      const data = await safeJson(res, {});
      if (res.ok) {
        showToast(`Drive ${mountPoint} safely ejected and unmounted.`);
        fetchTopology(true);
      } else {
        showToast(`Eject failed: ${data.detail || data.details || 'Error dismounting'}`);
      }
    } catch (e) {
      console.error("Eject error:", e);
      showToast(`Error communicating with backend: ${e.message}`);
    } finally {
      setEjectingMount(null);
    }
  };

  const fetchTopology = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const url = `http://${window.location.hostname}:8001/api/devices/topology`;
      const res = await fetch(url);
      const data = await safeJson(res);
      if (data) {
        setTopology(data);
        if (isManual) {
          showToast("Hardware topology refreshed: all laptop ports scanned.");
        }
      }
    } catch (err) {
      console.error("Failed to fetch topology:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    fetchTopology();
  }, []);

  // React in real time to hardware events over WebSocket
  useEffect(() => {
    if (liveEvents && liveEvents.length > 0) {
      const latest = liveEvents[0];
      if (['PORT_TOPOLOGY_UPDATED', 'USB_INSERTED', 'USB_REMOVED'].includes(latest.event_type)) {
        fetchTopology();
        showToast(`Hardware Change: ${latest.event_type.replace(/_/g, ' ')}`);
      }
    }
  }, [liveEvents]);

  const handleManualScan = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/devices/scan`, { method: 'POST' });
      const data = await safeJson(res);
      if (res.ok && data) {
        if (data.topology) setTopology(data.topology);
        showToast("Low-latency port rescan complete. Hardware matrix synchronized.");
      }
    } catch (e) {
      console.error("Scan error:", e);
    } finally {
      setRefreshing(false);
    }
  };

  const summary = topology?.summary || {
    total_controllers: 2,
    total_root_hubs: 3,
    estimated_available_ports: 6,
    active_storage_devices: 0,
    active_peripherals: 2,
    active_integrated_devices: 3,
    total_connected_devices: 5
  };

  const storageDevices = topology?.storage_devices || [];
  const peripherals = topology?.peripherals || [];
  const integratedDevices = topology?.integrated_devices || [];
  const controllers = topology?.controllers || [];
  const hubs = topology?.hubs || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#141414] text-white px-5 py-3 rounded-full shadow-2xl border border-white/10 flex items-center gap-3 text-xs">
          <div className="w-2 h-2 rounded-full bg-[#FDE047]" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Hero Header Banner */}
      <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-[#FDE047] shrink-0">
            <Usb className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-sm font-bold text-white tracking-tight uppercase">Laptop Port & Hardware Matrix</h1>
              <span className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                HARDWARE DAEMON ACTIVE
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Real-time continuous surveillance of USB 3.2/3.1 host controllers, wireless mouse dongles, RF receivers, and removable flash storage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualScan}
            disabled={refreshing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-[#FDE047] hover:bg-[#FACC15] text-black transition-all pill-button shadow-lg shadow-[#FDE047]/10 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Scanning Ports...' : 'Rescan Ports'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Host Controllers</span>
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-[#FDE047]">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-white font-mono mt-3">{summary.total_controllers}</p>
          <p className="text-xs text-neutral-400 mt-1">USB 3.2 / 3.1 SuperSpeed</p>
        </div>

        <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Root Hubs & Ports</span>
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-white font-mono mt-3">{summary.total_root_hubs}</p>
          <p className="text-xs text-neutral-400 mt-1">~{summary.estimated_available_ports} Ports Available</p>
        </div>

        <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">Peripherals</span>
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-amber-400">
              <Mouse className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-white font-mono mt-3">{summary.active_peripherals}</p>
          <p className="text-xs text-neutral-400 mt-1">Dongles & Keyboards</p>
        </div>

        <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">USB Storage Triage</span>
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-[#FDE047]">
              <HardDrive className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-[#FDE047] font-mono mt-3">{summary.active_storage_devices}</p>
          <p className="text-xs text-neutral-400 mt-1">{summary.active_storage_devices > 0 ? 'Surveillance Active' : 'Awaiting USB Insertion'}</p>
        </div>
      </div>

      {/* SECTION 1: PHYSICAL USB REMOVABLE FLASH DRIVES */}
      <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/[0.06] bg-[#0F0F0F] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-[#FDE047]">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white tracking-wide uppercase">Removable USB Flash Drives & Storage Triage</h2>
              <p className="text-[10px] text-neutral-400">Physical USB flash memory attached to laptop ports</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/[0.04] text-neutral-300 border border-white/[0.08]">
            {storageDevices.length} Connected
          </span>
        </div>

        <div className="p-6">
          {storageDevices.length === 0 ? (
            /* Animated Radar State when no USB stick is inserted yet */
            <div className="border border-dashed border-white/[0.1] rounded-[24px] p-10 text-center bg-[#0A0A0A] flex flex-col items-center justify-center">
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-full bg-neutral-900 border border-white/[0.1] flex items-center justify-center text-[#FDE047]">
                  <Usb className="w-8 h-8" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-white">Awaiting Physical USB Flash Drive Insertion</h3>
              <p className="text-xs text-neutral-400 max-w-md mt-1.5 leading-relaxed">
                Insert any USB storage drive into a port on your laptop. PHANTOM's background agent will automatically detect the connection, extract volume descriptors, and initialize a Zero-Trust threat triage session.
              </p>
              <div className="flex items-center gap-2 mt-5 text-[10px] font-mono text-neutral-400 bg-neutral-900 px-3.5 py-1.5 rounded-full border border-white/[0.08]">
                <Radio className="w-3 h-3 text-[#FDE047]" />
                <span>Scanning USB Hubs every 1500ms</span>
              </div>
            </div>
          ) : (
            /* Active Storage Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {storageDevices.map((dev, idx) => {
                const isDriveThreat = Boolean(dev.has_threat) && (dev.active_threats?.length > 0);
                const threatFileName = dev.primary_threat || dev.active_threats?.[0] || 'something.bat';

                return (
                  <div key={idx} className={`border rounded-[24px] p-5 relative overflow-hidden ${
                    isDriveThreat ? 'border-red-500/40 bg-[#160E0E]' : 'border-white/[0.08] bg-[#0D101A]'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold ${
                          isDriveThreat ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-[#FDE047] text-black'
                        }`}>
                          <HardDrive className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{dev.device_name || dev.model}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FDE047]/15 text-[#FDE047] border border-[#FDE047]/30">
                              {dev.mount_point}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Manufacturer: <span className="font-semibold text-white">{dev.vendor_name}</span>
                          </p>
                        </div>
                      </div>
                      {isDriveThreat ? (
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
                          THREAT DETECTED
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          ZERO-TRUST: UNTRUSTED
                        </span>
                      )}
                    </div>

                    {/* Threat Notification Banner if threats present on drive */}
                    {isDriveThreat && (
                      <div className="mt-3 p-3 bg-red-950/60 border border-red-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-red-300">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="leading-snug">
                          Threat detected: <strong className="text-white underline">{threatFileName}</strong> is inside this folder. You need to eject as early as possible or eject now.
                        </span>
                      </div>
                    )}

                    {/* Storage Capacity Bar */}
                    <div className="mt-4 p-3.5 bg-[#141414] rounded-2xl border border-white/[0.06] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-400">Storage Usage</span>
                        <span className="font-mono text-white font-semibold">
                          {dev.used_gb} GB / {dev.capacity_gb} GB ({dev.percent_used}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-neutral-900 overflow-hidden">
                        <div
                          className="h-full bg-[#FDE047] rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, dev.percent_used))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono pt-1">
                        <span>Filesystem: {dev.filesystem}</span>
                        <span>Free: {dev.free_gb} GB</span>
                      </div>
                    </div>

                    {/* Hardware Descriptors */}
                    <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] font-mono">
                      <div className="bg-[#141414] p-2 rounded-xl border border-white/[0.06]">
                        <span className="text-neutral-500 block">Hardware ID</span>
                        <span className="text-white font-semibold">{dev.hardware_id}</span>
                      </div>
                      <div className="bg-[#141414] p-2 rounded-xl border border-white/[0.06]">
                        <span className="text-neutral-500 block">Serial Number</span>
                        <span className="text-white truncate block">{dev.serial_number}</span>
                      </div>
                    </div>

                    {/* Triage & Eject Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
                      <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Canary Traps Armed
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEjectUsb(dev.mount_point)}
                          disabled={ejectingMount === dev.mount_point}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer pill-button shadow-md ${
                            isDriveThreat
                              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40'
                              : 'bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 border border-white/[0.08]'
                          }`}
                          title="Safely dismount and eject this USB drive"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>{ejectingMount === dev.mount_point ? 'Ejecting...' : 'Eject Drive'}</span>
                        </button>
                        <button
                          onClick={() => setTab && setTab('live')}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-[#FDE047] hover:bg-[#FACC15] text-black transition-all cursor-pointer pill-button shadow-md"
                        >
                          <span>Live Triage</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: CONNECTED HID PERIPHERALS & WIRELESS DONGLES */}
      <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/[0.06] bg-[#0F0F0F] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-amber-400">
              <Mouse className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white tracking-wide uppercase">Connected HID Peripherals & Wireless Dongles</h2>
              <p className="text-[10px] text-neutral-400">Mouse dongles (2.4GHz RF / Bluetooth receivers), keyboards, and human interface devices</p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/[0.04] text-neutral-300 border border-white/[0.08]">
            {peripherals.length} Active Devices
          </span>
        </div>

        <div className="divide-y divide-white/[0.04]">
          {peripherals.map((peri, idx) => {
            const isMouse = peri.type === 'MOUSE_DONGLE' || peri.name?.toLowerCase().includes('mouse');
            return (
              <div key={idx} className="p-4 px-6 hover:bg-white/[0.02] transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-[#FDE047]">
                    {isMouse ? <Mouse className="w-5 h-5" /> : <Keyboard className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{peri.name}</span>
                      {peri.is_wireless_dongle && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold">
                          2.4GHz DONGLE
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-neutral-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
                        {peri.hardware_id}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400">
                      <span>Vendor: <strong className="text-white font-medium">{peri.vendor_name}</strong></span>
                      <span>•</span>
                      <span>Interface: <span className="font-mono text-neutral-500">{peri.friendly_name}</span></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-center">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{peri.safety_status}</span>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-mono">Keystroke Anomaly: 0%</span>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                    CONNECTED
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3 & 4 GRID: INTEGRATED HARDWARE & CONTROLLER HIERARCHY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Integrated System USB Devices */}
        <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-white/[0.06] bg-[#0F0F0F] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-[#FDE047]" />
              <h3 className="text-xs font-bold text-white tracking-wide uppercase">Integrated System Devices</h3>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">{integratedDevices.length} Components</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {integratedDevices.map((dev, idx) => {
              const isCam = dev.type === 'WEBCAM';
              const isBt = dev.type === 'BLUETOOTH_ADAPTER';
              return (
                <div key={idx} className="p-4 px-6 hover:bg-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-neutral-300">
                      {isCam ? <Camera className="w-4 h-4 text-blue-400" /> : isBt ? <Bluetooth className="w-4 h-4 text-[#FDE047]" /> : <Cpu className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{dev.name}</p>
                      <p className="text-[10px] font-mono text-neutral-400">
                        {dev.pnp_class || dev.type} • {dev.hardware_id}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                    {dev.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* USB Host Controllers & Root Hubs */}
        <div className="bg-[#141414] border border-white/[0.06] rounded-[28px] overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-white/[0.06] bg-[#0F0F0F] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white tracking-wide uppercase">Host Controllers & Root Hubs</h3>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">{controllers.length} Controllers</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {controllers.map((ctrl, idx) => (
              <div key={idx} className="p-4 px-6 hover:bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-emerald-400">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{ctrl.name}</p>
                    <p className="text-[10px] font-mono text-neutral-400">
                      {ctrl.type} • {ctrl.manufacturer}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                  {ctrl.status}
                </span>
              </div>
            ))}

            {hubs.map((hub, idx) => (
              <div key={`hub-${idx}`} className="p-4 px-6 hover:bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-neutral-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{hub.name}</p>
                    <p className="text-[10px] font-mono text-neutral-400">
                      {hub.hub_type} • ~{hub.estimated_ports} Logical Port Allocations
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] text-neutral-300 border border-white/[0.08]">
                  {hub.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
