import React, { useState, useEffect } from 'react';
import { FingerprintList } from '../components/intelligence/FingerprintList';
import { SimilarityGraph } from '../components/intelligence/SimilarityGraph';
import { ForensicDNADossier } from '../components/intelligence/ForensicDNADossier';
import { SimulateButton } from '../components/common/SimulateButton';
import { LoadingState } from '../components/common/LoadingState';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  Dna,
  RefreshCw,
  Trash2,
  Usb,
  ShieldCheck,
  AlertTriangle
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
      // 1. Fetch cataloged fingerprints
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

        // Priority 1: If real USB is currently physically mounted, select it!
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
          // If we have real recorded sessions in history, pick the latest or keep current selection
          if (!selectedFp || !data.some(d => d.session_id === selectedFp.session_id)) {
            setSelectedFp(data[0]);
          }
        } else {
          // No USB connected and no cataloged history
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

  if (loading) return <LoadingState message="Connecting to USB Forensic Radar..." />;

  const isLiveConnected = activeLive?.is_connected || false;
  const hasProfiles = fingerprints.length > 0 || isLiveConnected;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* ══════════════════════════════════════════════════════════════════════
          HERO BANNER & CONTROLS
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-[#0C0C0E]/95 border border-white/[0.08] rounded-[28px] p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#141418] border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <Dna className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-base sm:text-lg font-bold font-mono text-white tracking-wide uppercase">
                  USB Forensic DNA & Lineage Engine
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                  isLiveConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-white/[0.06] text-neutral-400 border-white/[0.08]'
                }`}>
                  {isLiveConnected ? "LIVE USB HARVEST ACTIVE" : "SURVEILLANCE LISTENING"}
                </span>
              </div>
              <p className="text-xs font-mono text-neutral-400 mt-1 max-w-3xl leading-relaxed">
                Reverse-extracts 4-layer hardware silicon descriptors, filesystem superblocks, and microscopic cross-OS digital dust (.Spotlight, IndexerVolumeGuid, .Trashes) directly from physical USB drives.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Clear History */}
            {fingerprints.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/[0.04] hover:bg-red-500/10 hover:text-red-400 text-neutral-400 border border-white/[0.08] hover:border-red-500/30 text-xs font-mono transition-all cursor-pointer"
                title="Purge all cataloged fingerprints"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={loadData}
              className="p-2.5 rounded-full bg-[#18181D] hover:bg-[#222228] text-neutral-300 border border-white/[0.1] transition-all cursor-pointer"
              title="Refresh DNA Catalog"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {/* Hackathon Stage 2 Demo Simulator */}
            <SimulateButton stage={2} onComplete={() => loadData()} />
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-white/[0.08] font-mono text-xs">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-neutral-500 text-[10px] block uppercase">Connected Hardware</span>
            <span className={`font-extrabold text-base ${isLiveConnected ? 'text-emerald-400' : 'text-neutral-400'}`}>
              {isLiveConnected ? "1 Device Active" : "0 Devices (Listening)"}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-neutral-500 text-[10px] block uppercase">Cataloged Profiles</span>
            <span className="text-white font-extrabold text-base">{fingerprints.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-neutral-500 text-[10px] block uppercase">Genomic Extraction</span>
            <span className="text-cyan-400 font-extrabold text-base">4 Layers / Drive</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-neutral-500 text-[10px] block uppercase">Cross-Host Dust</span>
            <span className="text-purple-400 font-extrabold text-base">Win • Mac • Linux</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          BODY: LIVE DNA DOSSIER OR WAITING STATE
      ══════════════════════════════════════════════════════════════════════ */}
      {!hasProfiles ? (
        /* Zero Hardware Waiting State */
        <div className="bg-[#0C0C0E]/95 border border-white/[0.08] rounded-[32px] p-16 text-center shadow-2xl backdrop-blur-md space-y-4">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400/20" />
            <div className="relative w-16 h-16 rounded-2xl bg-[#141418] border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.15)]">
              <Usb className="w-8 h-8" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-bold font-mono text-white uppercase tracking-wider">
              No Physical USB Hardware Inserted
            </h3>
            <p className="text-xs font-mono text-neutral-400 max-w-md mx-auto leading-relaxed">
              Surveillance is active on all USB root hubs. Plug in any real USB flash drive to automatically extract its physical silicon descriptors, filesystem allocation tables, and cross-OS digital dust.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2 text-[11px] font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>ROOT_HUB_0: LISTENING FOR UDEV INSERTION EVENT</span>
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
