import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  UploadCloud,
  Scan,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  Zap,
  Sparkles,
  RefreshCw,
  Trash2,
  CheckCircle2,
  HardDrive,
  Layers,
  Info,
  Clock,
  ChevronRight,
  Database,
  Crosshair,
  X,
  FileCheck
} from 'lucide-react';
import { formatISTFull, formatISTTime } from '../utils/time';
import { safeJson } from '../utils/api';

export function HardwareScanner() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [deviceLabel, setDeviceLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [presets, setPresets] = useState([]);

  const [analyzing, setAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySource, setHistorySource] = useState('MongoDB Atlas');

  // Webcam modal state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);

  // Load presets and scan history on mount
  useEffect(() => {
    loadPresets();
    loadHistory();
  }, []);

  const loadPresets = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/hardware-scan/presets`);
      const data = await safeJson(res);
      if (data && data.presets) {
        setPresets(data.presets);
      }
    } catch (e) {
      console.warn("Failed to load presets:", e);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/hardware-scan/history`);
      const data = await safeJson(res);
      if (data && data.scans) {
        setHistory(data.scans);
        if (data.source) setHistorySource(data.source);
      }
    } catch (e) {
      console.warn("Failed to load history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle local file upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedPreset(null);
    setSelectedImage(file);
    setDeviceLabel(file.name.replace(/\.[^/.]+$/, ""));

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Preset Selection
  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    setSelectedImage(null);
    setImagePreview(null);
    setDeviceLabel(preset.name);
    setNotes(preset.category);
  };

  // Webcam controls
  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Camera access was not granted or webcam is unavailable: " + err.message);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const captureCameraFrame = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setImagePreview(dataUrl);
    setSelectedImage(dataUrl);
    setSelectedPreset(null);
    setDeviceLabel(`Webcam Snap ${new Date().toLocaleTimeString()}`);
    stopCamera();
  };

  // Trigger analysis
  const handleAnalyze = async () => {
    if (!imagePreview && !selectedPreset) {
      alert("Please upload a photo, take a webcam snapshot, or select a sample hardware preset.");
      return;
    }

    setAnalyzing(true);
    setScanResult(null);

    try {
      const payload = {
        image_base64: imagePreview || null,
        device_label: deviceLabel || "Unknown Peripheral",
        notes: notes || "",
        preset_id: selectedPreset?.id || null
      };

      const res = await fetch(`http://${window.location.hostname}:8001/api/hardware-scan/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await safeJson(res);
      if (data && data.success && data.scan) {
        setScanResult(data.scan);
        loadHistory(); // Refresh table
      } else {
        alert("Analysis failed: " + (data?.detail || "Server error"));
      }
    } catch (err) {
      console.error("Hardware scan error:", err);
      alert("Error communicating with AI analysis engine: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeleteHistory = async (scanId) => {
    try {
      await fetch(`http://${window.location.hostname}:8001/api/hardware-scan/history/${scanId}`, {
        method: 'DELETE'
      });
      setHistory(prev => prev.filter(s => s.scan_id !== scanId));
      if (scanResult?.scan_id === scanId) {
        setScanResult(null);
      }
    } catch (e) {
      console.error("Delete history error:", e);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto font-sans selection:bg-[#FDE047] selection:text-black">

      {/* ─── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2 rounded-xl bg-[#FDE047]/10 border border-[#FDE047]/20 text-[#FDE047]">
              <Crosshair className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>AI USB Hardware Photo Scanner</span>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#FDE047] text-black font-extrabold uppercase">
                Pre-Plug Triage
              </span>
            </h1>
          </div>
          <p className="text-xs text-neutral-400 max-w-2xl leading-relaxed">
            Visual inspection &amp; physical component triage. Detect exposed microcontrollers, high-voltage capacitor banks (USB Killers), and covert BadUSB HID injectors before insertion.
          </p>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>DeepSeek-R1 AI</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-neutral-400">
            <Database className="w-3.5 h-3.5 text-[#FDE047]" />
            <span>MongoDB Atlas</span>
          </div>
        </div>
      </div>

      {/* ─── Main Two-Column Layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ── LEFT COLUMN: Input & Inspection Studio (7 cols) ────────── */}
        <div className="lg:col-span-7 space-y-6">

          {/* Upload / Capture Card */}
          <div className="bg-[#121214] border border-white/[0.08] rounded-[24px] p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#FDE047]" />
                <span>Peripheral Photo Intake</span>
              </h2>

              <button
                type="button"
                onClick={cameraActive ? stopCamera : startCamera}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-[#FDE047] transition-all cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{cameraActive ? 'Close Camera' : 'Snap with Webcam'}</span>
              </button>
            </div>

            {/* Webcam Live Stream Area */}
            {cameraActive && (
              <div className="relative mb-5 rounded-2xl overflow-hidden bg-black border border-[#FDE047]/40 shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-64 object-cover"
                />
                <div className="absolute inset-0 border-2 border-dashed border-[#FDE047]/40 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-32 border-2 border-[#FDE047] rounded-xl flex items-center justify-center">
                    <span className="text-[10px] font-mono text-[#FDE047] bg-black/70 px-2 py-0.5 rounded">
                      Align USB Device
                    </span>
                  </div>
                </div>
                <div className="absolute bottom-3 inset-x-0 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={captureCameraFrame}
                    className="px-5 py-2 rounded-full bg-[#FDE047] hover:bg-[#FACC15] text-black font-bold text-xs uppercase tracking-wider shadow-lg cursor-pointer flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Frame</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 rounded-full bg-black/80 hover:bg-black text-white font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Drag & Drop / Image Preview Box */}
            <div className="relative">
              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/[0.15] p-2 flex flex-col items-center">
                  <div className="relative w-full max-h-72 overflow-hidden rounded-xl flex items-center justify-center bg-black/80">
                    <img
                      src={imagePreview}
                      alt="Device Preview"
                      className="max-h-72 w-auto object-contain"
                    />

                    {/* Laser Scanning Animation Overlay during analysis */}
                    {analyzing && (
                      <div className="absolute inset-0 bg-gradient-to-b from-[#FDE047]/20 via-[#FDE047]/40 to-transparent h-16 w-full animate-bounce pointer-events-none border-b-2 border-[#FDE047]" />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setSelectedImage(null);
                      setSelectedPreset(null);
                    }}
                    className="absolute top-4 right-4 p-1.5 rounded-full bg-black/80 text-neutral-300 hover:text-white border border-white/20 transition-all cursor-pointer"
                    title="Remove Photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : selectedPreset ? (
                <div className="p-6 rounded-2xl bg-[#17171a] border border-[#FDE047]/30 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#FDE047]/10 border border-[#FDE047]/30 flex items-center justify-center text-[#FDE047] shrink-0">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div className="flex-1 truncate">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FDE047]/20 text-[#FDE047] font-bold">
                        PRESET LOADED
                      </span>
                      <span className="text-xs text-neutral-400 font-mono">
                        Threat Score: {selectedPreset.danger_score}/100
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white truncate">{selectedPreset.name}</h3>
                    <p className="text-xs text-neutral-400 truncate">{selectedPreset.category}</p>
                  </div>
                  <button
                    onClick={() => setSelectedPreset(null)}
                    className="p-1.5 text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/[0.12] hover:border-[#FDE047]/50 rounded-2xl cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                    <UploadCloud className="w-10 h-10 text-neutral-500 group-hover:text-[#FDE047] transition-colors mb-3" />
                    <p className="text-xs font-semibold text-white mb-1">
                      Click to upload or drag &amp; drop USB photo
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Supports JPG, PNG, WEBP high-resolution photos
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Quick Test Presets Carousel */}
            <div className="mt-5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-2">
                Or Select Known Hardware Signature Sample:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {presets.map((p) => {
                  const isSelected = selectedPreset?.id === p.id;
                  const isDangerous = p.danger_score > 70;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className={`text-left p-2.5 rounded-xl border text-xs transition-all cursor-pointer truncate ${
                        isSelected
                          ? 'bg-[#FDE047]/15 border-[#FDE047] text-white shadow-md'
                          : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          isDangerous ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {isDangerous ? 'MALICIOUS' : 'COMMERCIAL'}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500">
                          {p.danger_score} pts
                        </span>
                      </div>
                      <div className="font-semibold text-white truncate text-[11px]">{p.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inputs: Label & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Device Label / Markings
                </label>
                <input
                  type="text"
                  value={deviceLabel}
                  onChange={(e) => setDeviceLabel(e.target.value)}
                  placeholder="e.g. SanDisk Ultra, Blue PCB Dongle"
                  className="w-full px-3 py-2 bg-[#17171a] border border-white/[0.08] rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047] transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
                  Analyst Physical Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Found in conference room, visible DIP switches"
                  className="w-full px-3 py-2 bg-[#17171a] border border-white/[0.08] rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDE047] transition-all font-mono"
                />
              </div>
            </div>

            {/* Submit Action Button */}
            <div className="mt-5">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing || (!imagePreview && !selectedPreset)}
                className={`w-full py-3.5 px-5 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg flex items-center justify-center gap-2 ${
                  analyzing || (!imagePreview && !selectedPreset)
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    : 'bg-[#FDE047] hover:bg-[#FACC15] text-black shadow-amber-500/15 hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                {analyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>DeepSeek-R1 Inspecting Hardware Architecture...</span>
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4" />
                    <span>Execute AI Hardware Triage</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Forensic Threat Dossier (5 cols) ─────────── */}
        <div className="lg:col-span-5 space-y-6">

          {scanResult ? (
            <div className="bg-[#121214] border border-white/[0.1] rounded-[24px] p-6 shadow-2xl space-y-5 animate-fadeIn">
              
              {/* Verdict Header */}
              <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block mb-1">
                    Inspection ID: {scanResult.scan_id}
                  </span>
                  <h3 className="text-lg font-extrabold text-white leading-tight">
                    {scanResult.device_name}
                  </h3>
                  <span className="text-xs text-neutral-400 font-mono mt-0.5 block">
                    {scanResult.classification}
                  </span>
                </div>

                {/* Threat Score Pill */}
                <div className={`text-center px-4 py-2 rounded-2xl border font-mono shrink-0 ${
                  scanResult.threat_score >= 70
                    ? 'bg-red-500/15 border-red-500/40 text-red-400'
                    : scanResult.threat_score >= 40
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                    : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                }`}>
                  <div className="text-2xl font-black leading-none">{scanResult.threat_score}</div>
                  <div className="text-[9px] font-bold uppercase mt-1">/ 100 PTS</div>
                </div>
              </div>

              {/* Status Banner */}
              <div className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                scanResult.threat_score >= 70
                  ? 'bg-red-500/10 border-red-500/30 text-red-300'
                  : scanResult.threat_score >= 40
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}>
                {scanResult.threat_score >= 70 ? (
                  <ShieldAlert className="w-5 h-5 shrink-0 text-red-400" />
                ) : scanResult.threat_score >= 40 ? (
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                ) : (
                  <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400" />
                )}
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider">{scanResult.threat_level}</h4>
                  <p className="text-[11px] leading-snug mt-0.5">{scanResult.recommendation}</p>
                </div>
              </div>

              {/* MITRE Technique Tag */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] flex items-center justify-between text-xs">
                <span className="font-mono text-neutral-400 text-[11px]">MITRE ATT&amp;CK Mapping</span>
                <span className="font-mono font-bold text-[#FDE047] text-[11px]">
                  {scanResult.mitre_technique}
                </span>
              </div>

              {/* Hardware Indicators Checklist */}
              <div>
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-2">
                  Identified Physical Indicators
                </h4>
                <div className="space-y-1.5">
                  {scanResult.indicators?.map((ind, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs text-neutral-300"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#FDE047] shrink-0 mt-0.5" />
                      <span className="leading-snug">{ind}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* DeepSeek-R1 AI Triage Narrative */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#FDE047]" />
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                    DeepSeek-R1 Cyber Forensic Reasoning
                  </h4>
                </div>
                <div className="p-3.5 rounded-xl bg-black/50 border border-white/[0.08] text-xs text-neutral-300 leading-relaxed font-mono">
                  {scanResult.ai_rationale}
                </div>
              </div>

              {/* Containment Protocol Badge */}
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
                <span className="text-neutral-500 font-mono text-[10px]">
                  Scanned: {formatISTFull(scanResult.timestamp)}
                </span>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Synced to Atlas
                </span>
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="bg-[#121214] border border-white/[0.08] rounded-[24px] p-8 shadow-xl text-center space-y-4 flex flex-col items-center justify-center min-h-[380px]">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-center text-neutral-600">
                <Scan className="w-8 h-8 text-[#FDE047]/40" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-sm font-bold text-white mb-1">Awaiting Peripheral Photo</h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Upload an image or select a hardware preset on the left, then click <strong>"Execute AI Hardware Triage"</strong> to generate the physical forensic dossier.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ─── Bottom Section: Historical Hardware Scans from MongoDB ──── */}
      <div className="bg-[#121214] border border-white/[0.08] rounded-[24px] p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-[#FDE047]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              MongoDB Atlas Hardware Scan Archive
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-neutral-400 border border-white/[0.08]">
              Source: {historySource}
            </span>
          </div>

          <button
            onClick={loadHistory}
            disabled={loadingHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-neutral-300 hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-xs font-mono">
            No previous hardware scans in database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-neutral-500 text-[10px] uppercase">
                  <th className="py-2.5 px-3">Timestamp (IST)</th>
                  <th className="py-2.5 px-3">Device Name</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3">Threat Level</th>
                  <th className="py-2.5 px-3 text-right">Score</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {history.map((scan) => {
                  const isThreat = scan.threat_score >= 70;
                  return (
                    <tr
                      key={scan.scan_id}
                      className="hover:bg-white/[0.02] transition-colors group"
                    >
                      <td className="py-2.5 px-3 text-neutral-400 whitespace-nowrap">
                        {formatISTTime(scan.timestamp)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">
                        {scan.device_name}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-300 max-w-xs truncate">
                        {scan.classification}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isThreat
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {scan.threat_level}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold ${
                        isThreat ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        {scan.threat_score} / 100
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setScanResult(scan)}
                            className="text-[11px] text-[#FDE047] hover:underline cursor-pointer"
                          >
                            View Dossier
                          </button>
                          <button
                            onClick={() => handleDeleteHistory(scan.scan_id)}
                            className="p-1 text-neutral-600 hover:text-red-400 cursor-pointer transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
