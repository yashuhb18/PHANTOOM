import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  Terminal, 
  ShieldAlert, 
  ShieldCheck, 
  Mic, 
  MicOff, 
  Volume2, 
  Copy, 
  Check, 
  Zap 
} from 'lucide-react';
import { formatISTTime } from '../../utils/time';

/**
 * Transforms complex technical logs into clean, human-centered
 * Security Awareness announcements.
 */
function getTacticalVoiceAlert(rawText = '', severity = '') {
  const text = rawText.toLowerCase();

  // 1. Surgical kills & containment
  if (text.includes('surgical') || text.includes('terminated') || text.includes('kill') || text.includes('containment')) {
    if (text.includes('usb') || text.includes('media') || text.includes('mount')) {
      return "Security Alert. Malicious script from USB drive detected and terminated immediately.";
    }
    return "Security Alert. Unauthorized rogue process intercepted and surgically neutralized.";
  }

  // 2. Reverse shells & socket exfiltration
  if (text.includes('reverse shell') || text.includes('socket') || text.includes('/dev/tcp') || text.includes('exfiltration')) {
    return "Critical Warning. Unauthorized reverse shell callback intercepted. Network transmission blocked.";
  }

  // 3. BadUSB / Keystroke injection
  if (text.includes('keystroke') || text.includes('ducky') || text.includes('synthetic')) {
    return "Critical Alert. Rapid keystroke injection attack intercepted. Bad USB payload blocked.";
  }

  // 4. Honeypot / Canary deception
  if (text.includes('canary') || text.includes('decoy') || text.includes('honeypot') || text.includes('honeytoken')) {
    return "Security Warning. Deception honeytoken accessed. Unauthorized credential access blocked.";
  }

  // 5. File quarantine
  if (text.includes('quarantine') || text.includes('.phantom_quarantined')) {
    return "Defense Notice. Weaponized artifact neutralized and locked into quarantine vault.";
  }

  // 6. Autorun immunization
  if (text.includes('autorun') && (text.includes('neutralized') || text.includes('immuniz'))) {
    return "Security Notice. Rogue autorun configuration file neutralized on removable storage.";
  }

  // 7. USB insertion / connection
  if (text.includes('usb_inserted') || (text.includes('usb') && (text.includes('mounted') || text.includes('attached') || text.includes('triage')))) {
    return "Hardware Notice. USB storage device attached. Initiating Zero-Trust hardware scan.";
  }

  // 8. USB removal
  if (text.includes('usb_removed') || text.includes('detached') || text.includes('disconnected')) {
    return "Hardware Notice. USB storage device detached from endpoint.";
  }

  // 9. Generic high severity alert
  if (severity === 'CRITICAL' || severity === 'HIGH') {
    return "Security Alert. High severity endpoint anomaly intercepted by autonomous sentinel.";
  }

  return null;
}

/**
 * Maps high-level tactical announcements to high-definition,
 * studio-grade neural voice MP3 assets.
 */
function getTacticalAudioFile(sentence = '') {
  const t = sentence.toLowerCase();
  if (t.includes('malicious script') || t.includes('terminated') || t.includes('neutralized') || t.includes('surgical')) {
    return '/audio/alerts/surgical_kill.mp3';
  }
  if (t.includes('reverse shell') || t.includes('callback')) {
    return '/audio/alerts/reverse_shell.mp3';
  }
  if (t.includes('keystroke') || t.includes('ducky') || t.includes('bad usb')) {
    return '/audio/alerts/badusb.mp3';
  }
  if (t.includes('honeytoken') || t.includes('canary') || t.includes('decoy')) {
    return '/audio/alerts/canary_trap.mp3';
  }
  if (t.includes('zero-trust hardware scan') || t.includes('attached')) {
    return '/audio/alerts/usb_inserted.mp3';
  }
  if (t.includes('detached') || t.includes('removed')) {
    return '/audio/alerts/usb_removed.mp3';
  }
  if (t.includes('quarantine vault') || t.includes('quarantined')) {
    return '/audio/alerts/file_quarantined.mp3';
  }
  if (t.includes('autorun')) {
    return '/audio/alerts/autorun_neutralized.mp3';
  }
  return null;
}

export function NarratorPanel({ messages = [] }) {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const currentAudioRef = useRef(null);
  const lastSpokenTimeRef = useRef(0);
  const spokenIdsRef = useRef(new Set());
  const containerRef = useRef(null);

  // Normalize messages & extract actual text
  const normalizedMessages = (messages || []).map((msg, idx) => {
    const rawText = msg.narration || msg.text || msg.message || msg.content || '';
    const session_id = msg.session_id || 'sess_live';
    const timestamp = msg.timestamp || new Date().toISOString();
    const severity = msg.severity || (
      rawText.toLowerCase().includes('kill') || 
      rawText.toLowerCase().includes('critical') || 
      rawText.toLowerCase().includes('contain') 
        ? 'CRITICAL' 
        : 'INFO'
    );
    
    // Categorize threat tags
    let tag = 'TACTICAL ADVISORY';
    if (rawText.toLowerCase().includes('kill') || rawText.toLowerCase().includes('containment')) tag = 'SURGICAL CONTAINMENT';
    else if (rawText.toLowerCase().includes('reverse') || rawText.toLowerCase().includes('socket')) tag = 'REVERSE SHELL';
    else if (rawText.toLowerCase().includes('canary') || rawText.toLowerCase().includes('decoy')) tag = 'DECEPTION TRIP';
    else if (rawText.toLowerCase().includes('usb') || rawText.toLowerCase().includes('autorun')) tag = 'HARDWARE INSERTION';

    return {
      ...msg,
      text: rawText,
      session_id,
      timestamp,
      severity,
      tag,
      id: `${timestamp}_${idx}`
    };
  });

  /**
   * Studio-Grade Neural Voice Engine:
   * Plays pre-rendered studio broadcast neural audio with zero lag,
   * with seamless backend streaming fallback.
   */
  const playStudioNeuralVoice = (sentence) => {
    if (!sentence) return;

    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }

      const localFile = getTacticalAudioFile(sentence);
      const audioUrl = localFile || `http://${window.location.hostname}:8001/api/ai/voice?text=${encodeURIComponent(sentence)}`;

      const audio = new Audio(audioUrl);
      audio.volume = 1.0;
      currentAudioRef.current = audio;

      audio.play().catch((err) => {
        console.debug("Audio play policy:", err);
      });
    } catch (e) {
      console.debug("Audio engine error:", e);
    }
  };

  // Automated Watcher for Live Incoming Alerts
  useEffect(() => {
    if (!voiceEnabled) return;

    if (normalizedMessages.length > 0) {
      const latest = normalizedMessages[0];
      const now = Date.now();

      // Enforce minimum 3.5s cooldown between vocal alerts
      if (latest && !spokenIdsRef.current.has(latest.id) && (now - lastSpokenTimeRef.current > 3500)) {
        spokenIdsRef.current.add(latest.id);
        lastSpokenTimeRef.current = now;

        const tacticalSentence = getTacticalVoiceAlert(latest.text, latest.severity);
        if (tacticalSentence) {
          playStudioNeuralVoice(tacticalSentence);
        }
      }
    }
  }, [normalizedMessages, voiceEnabled]);

  const handleCopy = (text, idx) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // Filter messages
  const filteredMessages = normalizedMessages.filter(msg => {
    if (filter === 'ALL') return true;
    if (filter === 'CRITICAL') return msg.severity === 'CRITICAL';
    if (filter === 'HARDWARE') return msg.tag === 'HARDWARE INSERTION';
    return true;
  });

  return (
    <div className="bg-[#141414] border border-white/[0.08] rounded-[28px] overflow-hidden flex flex-col h-[740px] shadow-2xl">
      {/* Clean Minimalist Header: Title + MIC ON/OFF */}
      <div className="p-4 px-6 border-b border-white/[0.06] flex items-center justify-between bg-[#0F0F0F] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#FDE047] flex items-center justify-center text-black shadow-lg shadow-amber-500/10 shrink-0">
            <Sparkles className="w-4 h-4 fill-current" />
          </div>
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              AI Forensic Threat Narrator
            </span>
          </div>
        </div>

        {/* Clean Mic ON/OFF Toggle */}
        <button
          onClick={() => {
            if (currentAudioRef.current) {
              currentAudioRef.current.pause();
            }
            setVoiceEnabled(!voiceEnabled);
          }}
          title={voiceEnabled ? "Mute Voice Alerts" : "Enable Voice Alerts"}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer border ${
            voiceEnabled
              ? 'bg-amber-500/15 border-amber-500/40 text-[#FDE047] shadow-[0_0_12px_rgba(245,158,11,0.2)]'
              : 'bg-white/[0.04] border-white/[0.08] text-neutral-400 hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          {voiceEnabled ? (
            <>
              <Mic className="w-3.5 h-3.5 text-[#FDE047]" />
              <span>MIC: ON</span>
            </>
          ) : (
            <>
              <MicOff className="w-3.5 h-3.5 text-neutral-500" />
              <span>MIC: OFF</span>
            </>
          )}
        </button>
      </div>

      {/* Subheader: Clean Dispatches Count & Filter Pills */}
      <div className="px-6 py-2.5 bg-[#0A0A0A] border-b border-white/[0.04] flex items-center justify-between text-[11px] font-mono">
        <span className="text-neutral-400">
          Showing {filteredMessages.length} forensic narrative dispatches
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-0.5 rounded-full transition-all ${
              filter === 'ALL'
                ? 'bg-[#FDE047] text-black font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            ALL ({normalizedMessages.length})
          </button>
          <button
            onClick={() => setFilter('CRITICAL')}
            className={`px-2.5 py-0.5 rounded-full transition-all ${
              filter === 'CRITICAL'
                ? 'bg-red-500/20 text-red-300 border border-red-500/30 font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            CONTAINMENT
          </button>
        </div>
      </div>

      {/* Narrative Cards Feed */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {filteredMessages.length === 0 ? (
          <div className="py-24 text-center text-neutral-500">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900/80 border border-white/[0.06] flex items-center justify-center text-neutral-600 mx-auto mb-4">
              <Bot className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-neutral-300">
              AI Forensic Threat Narrator Standby
            </p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1 leading-relaxed">
              Monitoring endpoint bus. As threats execute or USB devices attach, real-time forensic narratives appear here.
            </p>
          </div>
        ) : (
          filteredMessages.map((msg, idx) => {
            const isCritical = msg.severity === 'CRITICAL' || msg.tag === 'SURGICAL CONTAINMENT';
            
            return (
              <div
                key={idx}
                className={`p-4 rounded-[22px] border text-xs leading-relaxed transition-all shadow-lg ${
                  isCritical
                    ? 'bg-gradient-to-br from-red-950/40 via-[#120B0B] to-[#0A0A0A] border-red-500/30 text-red-100 hover:border-red-500/50'
                    : 'bg-[#0D0D0E] border-white/[0.08] text-neutral-200 hover:border-white/[0.15]'
                }`}
              >
                {/* Card Top Meta */}
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-white/[0.05]">
                  <div className="flex items-center gap-2">
                    {isCritical ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold font-mono">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>{msg.tag}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[#FDE047] text-[10px] font-bold font-mono">
                        <Terminal className="w-3.5 h-3.5 text-[#FDE047] shrink-0" />
                        <span>{msg.tag}</span>
                      </div>
                    )}

                    <span className="font-mono text-[10px] text-neutral-400">
                      {msg.timestamp ? formatISTTime(msg.timestamp, { withSuffix: true }) : 'LIVE'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Speak this specific item button */}
                    <button
                      onClick={() => {
                        const alertSentence = getTacticalVoiceAlert(msg.text, msg.severity) || "Security Alert. Threat event recorded.";
                        playStudioNeuralVoice(alertSentence);
                      }}
                      title="Play Voice Brief"
                      className="p-1 rounded-lg text-neutral-400 hover:text-[#FDE047] hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>

                    {msg.session_id && (
                      <span className="font-mono text-[9px] px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-neutral-400">
                        {msg.session_id}
                      </span>
                    )}

                    <button
                      onClick={() => handleCopy(msg.text, idx)}
                      title="Copy Forensic Log"
                      className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      {copiedIdx === idx ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Card Narrative Body */}
                <div className="font-sans text-xs leading-relaxed text-neutral-200">
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* Card Footer: Forensic Badges & Quick Context */}
                <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" />
                      AUTONOMOUS ACTION: CONTAINED
                    </span>
                    {isCritical && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-300 border border-red-500/20">
                        <Zap className="w-3 h-3 text-red-400" />
                        SIGKILL TERMINATION
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] text-neutral-500">
                    PHANTOM Behavioral Engine v2.0
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
