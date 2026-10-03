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
  Laptop,
  CheckCircle,
  HardDrive,
  Cpu,
  Layers,
  Sparkles
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

        // Fetch active live DNA profile
        const activeRes = await fetch(`http://${window.location.hostname}:8001/api/fingerprints/active-live`);
        let liveProfile = null;
        if (activeRes.ok) {
          liveProfile = await activeRes.json();
          setActiveLive(liveProfile);
        }

        // Default selection: active live if connected, else first cataloged item
        if (liveProfile && liveProfile.is_connected && liveProfile.genome) {
          setSelectedFp({
            session_id: liveProfile.genome.session_id,
            device_name: liveProfile.device?.name || "Connected USB Hardware",
            cluster_family: liveProfile.genome.cluster_family,
            dna_hash: liveProfile.genome.master_barcode,
            tokens: liveProfile.genome.behavior?.tokens || [],
            genome: liveProfile.genome
          });
        } else if (data.length > 0 && !selectedFp) {
          setSelectedFp(data[0]);
        }

        // Compare first two by default if available
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

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Live WebSocket update on USB insertion or DNA synthesis
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

  if (loading) return <LoadingState message="Synthesizing USB Forensic DNA database..." />;

  const isLiveConnected = activeLive?.is_connected || false;

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
                  USB Forensic DNA & Cross-Device Lineage Engine
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                  isLiveConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-white/[0.06] text-neutral-300 border-white/[0.1]'
                }`}>
                  {isLiveConnected ? "LIVE USB HARVEST ACTIVE" : "SURVEILLANCE ARMED"}
                </span>
              </div>
              <p className="text-xs font-mono text-neutral-400 mt-1 max-w-3xl leading-relaxed">
                Reverse-extracts 4-layer hardware silicon descriptors, filesystem superblocks, and microscopic cross-OS digital dust (.Spotlight, IndexerVolumeGuid, .Trashes) to link threat actors even when physical USB hardware is swapped.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={loadData}
              className="p-2.5 rounded-full bg-[#18181D] hover:bg-[#222228] text-neutral-300 border border-white/[0.1] transition-all cursor-pointer"
              title="Refresh DNA Catalog"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <SimulateButton stage={2} onComplete={() => loadData()} />
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-white/[0.08] font-mono text-xs">
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-neutral-500 text-[10px] block uppercase">Signatures Synthesized</span>
            <span className="text-white font-extrabold text-base">{fingerprints.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-neutral-500 text-[10px] block uppercase">Genomic Layers Scanned</span>
            <span className="text-cyan-400 font-extrabold text-base">4 Layers / Drive</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-neutral-500 text-[10px] block uppercase">Host Dust Detectors</span>
            <span className="text-purple-400 font-extrabold text-base">Win • Mac • Linux</span>
          </div>
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-neutral-500 text-[10px] block uppercase">Attribution Accuracy</span>
            <span className="text-emerald-400 font-extrabold text-base">98.4% FP-Immune</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          FORENSIC DNA DOSSIER (ACTIVE / SELECTED USB)
      ══════════════════════════════════════════════════════════════════════ */}
      <ForensicDNADossier fingerprint={selectedFp} isLiveActive={isLiveConnected && selectedFp?.session_id === activeLive?.genome?.session_id} />

      {/* ══════════════════════════════════════════════════════════════════════
          2-COLUMN GRID: CATALOGED FINGERPRINTS & CROSS-DEVICE COMPARISON
      ══════════════════════════════════════════════════════════════════════ */}
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

    </div>
  );
}
