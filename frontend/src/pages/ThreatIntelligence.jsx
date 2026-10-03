import React, { useState, useEffect } from 'react';
import { FingerprintList } from '../components/intelligence/FingerprintList';
import { SimilarityGraph } from '../components/intelligence/SimilarityGraph';
import { ForensicDNADossier } from '../components/intelligence/ForensicDNADossier';
import { LoadingState } from '../components/common/LoadingState';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  Dna,
  RefreshCw,
  Trash2,
  Usb,
  Radio,
  HardDrive,
  Cpu,
  Layers
} from 'lucide-react';

export function ThreatIntelligence() {
  const { liveEvents } = useWebSocket();
  const [fingerprints, setFingerprints] = useState([]);
  const [activeLive, setActiveLive] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [selectedFp, setSelectedFp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = async () => {
    setIsRefreshing(true);
    try {
      // 1. Fetch cataloged real fingerprints
      const res = await fetch(`http://${window.location.hostname}:8001/api/fingerprints`);
      if (res.ok) {
        const data = await res.json();
        setFingerprints(data);

        // Fetch active live DNA profile (strictly real connected hardware)
        const activeRes = await fetch(`http://${window.location.hostname}:8001/api/fingerprints/active-live`);
        let liveProfile = null;
        if (activeRes.ok) {
          liveProfile = await activeRes.json();
          setActiveLive(liveProfile);
        }

        // Priority 1: If real USB is currently physically mounted, select it
        if (liveProfile && liveProfile.is_connected && liveProfile.genome) {
          setSelectedFp({
            session_id: liveProfile.genome.session_id,
            device_name: liveProfile.device?.name || liveProfile.device?.device_name || "Connected Physical USB",
            cluster_family: liveProfile.genome.cluster_family,
            dna_hash: liveProfile.genome.master_barcode,
            tokens: liveProfile.genome.behavior?.tokens || [],
            genome: liveProfile.genome
          });
        } else if (data.length > 0) {
          // If we have real recorded sessions in history, pick latest or keep current selection
          if (!selectedFp || !data.some(d => d.session_id === selectedFp.session_id)) {
            setSelectedFp(data[0]);
          }
        } else {
          setSelectedFp(null);
          setComparison(null);
        }

        // Compare first two if at least 2 real sessions exist
        if (data.length >= 2) {
          const compRes = await fetch(
            `http://${window.location.hostname}:8001/api/fingerprints/compare?source=${data[0].session_id}&target=${data[1].session_id}`
          );
          if (compRes.ok) setComparison(await compRes.json());
        }
      }
    } catch (e) {
      console.error("Error fetching fingerprints:", e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/fingerprints/clear`, {
        method: "POST"
      });
      if (res.ok) {
        setFingerprints([]);
        setSelectedFp(null);
        setComparison(null);
        loadData();
      }
    } catch (e) {
      console.error("Failed to clear fingerprints:", e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3500);
    return () => clearInterval(interval);
  }, []);

  // Live WebSocket update on real USB insertion or DNA synthesis
  useEffect(() => {
    if (liveEvents && liveEvents.length > 0) {
      const latest = liveEvents[0];
      if (
        latest.event_type === "USB_DNA_SYNTHESIZED" ||
        latest.event_type === "USB_INSERTED" ||
        latest.event_type === "USB_REMOVED"
      ) {
        loadData();
      }
    }
  }, [liveEvents]);

  if (loading) return <LoadingState message="Connecting to USB Forensic DNA Engine..." />;

  const isLiveConnected = activeLive?.is_connected || false;
  const hasProfiles = fingerprints.length > 0 || isLiveConnected;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* ══════════════════════════════════════════════════════════════════════
          HERO BANNER & CONTROLS (PHANTOM YELLOW & BLACK)
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-[#FDE047] shrink-0 shadow-lg shadow-black/40">
              <Dna className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-sm md:text-base font-bold text-white tracking-tight uppercase">
                  Attack DNA & Forensic Hardware Engine
                </h1>
                <span className={`flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  isLiveConnected
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-white/[0.04] text-neutral-400 border-white/[0.08]'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isLiveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
                  {isLiveConnected ? "LIVE HARDWARE ATTACHED" : "SURVEILLANCE LISTENING"}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/[0.04] text-neutral-300 border border-white/[0.08]">
                  <Radio className="w-3 h-3 text-[#FDE047]" />
                  ZERO-TRUST PROVENANCE
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 max-w-3xl leading-relaxed">
                Reverse-extracts 4-layer hardware silicon descriptors, filesystem superblocks, and microscopic cross-OS digital dust (.Spotlight, IndexerVolumeGuid, .Trashes) directly from inserted USB hardware.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Clear History Button */}
            {fingerprints.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.04] hover:bg-red-500/10 hover:text-red-400 text-neutral-400 border border-white/[0.08] hover:border-red-500/30 text-xs font-semibold transition-all cursor-pointer"
                title="Purge all cataloged fingerprints"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={loadData}
              className="p-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-white/[0.08] transition-all cursor-pointer"
              title="Refresh DNA Catalog"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#FDE047]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-white/[0.06] text-xs">
          <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/[0.04]">
            <span className="text-neutral-500 text-[11px] block uppercase tracking-wide">Connected USB</span>
            <span className={`font-bold text-base mt-0.5 block ${isLiveConnected ? 'text-emerald-400' : 'text-neutral-300'}`}>
              {isLiveConnected ? "1 Device Active" : "0 Devices (Waiting)"}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/[0.04]">
            <span className="text-neutral-500 text-[11px] block uppercase tracking-wide">Cataloged Profiles</span>
            <span className="text-white font-bold text-base mt-0.5 block">{fingerprints.length}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/[0.04]">
            <span className="text-neutral-500 text-[11px] block uppercase tracking-wide">Genomic Layers</span>
            <span className="text-[#FDE047] font-bold text-base mt-0.5 block">4 Deep Layers</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/[0.04]">
            <span className="text-neutral-500 text-[11px] block uppercase tracking-wide">Host Provenance</span>
            <span className="text-white font-bold text-base mt-0.5 block">Win • Mac • Linux</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BODY: LIVE DNA DOSSIER OR WAITING STATE
      ══════════════════════════════════════════════════════════════════════ */}
      {!hasProfiles ? (
        /* Zero Hardware Waiting State */
        <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] p-16 text-center shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-white/[0.08] flex items-center justify-center text-[#FDE047] mx-auto shadow-lg shadow-black/40">
            <Usb className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-white tracking-tight uppercase">
              No Physical USB Hardware Inserted
            </h3>
            <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
              Hardware surveillance is active on all USB root hubs. Plug in any real USB flash drive to automatically extract its controller silicon, filesystem geometry, and cross-OS digital dust.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2 text-[11px] font-mono text-[#FDE047]">
            <span className="w-2 h-2 rounded-full bg-[#FDE047] animate-ping" />
            <span>ROOT_HUB_0: LISTENING FOR PHYSICAL INSERTION</span>
          </div>
        </div>
      ) : (
        <>
          {/* Active / Selected USB Forensic DNA Dossier */}
          <ForensicDNADossier
            fingerprint={selectedFp}
            isLiveActive={isLiveConnected && selectedFp?.session_id === activeLive?.genome?.session_id}
          />

          {/* 2-Column Grid: Cataloged Fingerprints & Cross-Device Comparison */}
          {fingerprints.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5">
                <FingerprintList
                  fingerprints={fingerprints}
                  selectedId={selectedFp?.session_id}
                  onSelect={(fp) => {
                    setSelectedFp(fp);
                    if (fingerprints.length >= 2) {
                      const other = fingerprints.find(f => f.session_id !== fp.session_id) || fingerprints[0];
                      fetch(`http://${window.location.hostname}:8001/api/fingerprints/compare?source=${fp.session_id}&target=${other.session_id}`)
                        .then(r => r.json())
                        .then(setComparison)
                        .catch(console.error);
                    }
                  }}
                />
              </div>
              
              <div className="lg:col-span-7">
                <SimilarityGraph comparison={comparison} />
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
