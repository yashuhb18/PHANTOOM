import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  Terminal, 
  ShieldAlert, 
  RefreshCw, 
  Code,
  Brain,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

function parseThinkingAndAnswer(rawText) {
  if (!rawText) return { thinking: null, answer: '', isThinking: false };

  const thinkStart = rawText.indexOf('<think>');
  if (thinkStart === -1) {
    return { thinking: null, answer: rawText, isThinking: false };
  }

  const thinkEnd = rawText.indexOf('</think>');
  if (thinkEnd === -1) {
    // Currently still generating the thinking process
    const thinking = rawText.slice(thinkStart + 7);
    return { thinking, answer: '', isThinking: true };
  }

  // Thinking completed
  const thinking = rawText.slice(thinkStart + 7, thinkEnd).trim();
  const answer = rawText.slice(thinkEnd + 8).trim();
  return { thinking, answer, isThinking: false };
}

function ThinkingAccordion({ thinking, isThinking }) {
  const [expanded, setExpanded] = useState(isThinking);

  useEffect(() => {
    if (isThinking) {
      setExpanded(true);
    }
  }, [isThinking]);

  if (!thinking) return null;

  const wordCount = thinking.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="mb-2.5 rounded-xl border border-white/[0.08] bg-black/40 overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-1.5 flex items-center justify-between bg-white/[0.02] hover:bg-white/[0.05] transition-colors cursor-pointer text-left select-none"
      >
        <div className="flex items-center gap-2">
          <Brain className={`w-3.5 h-3.5 ${isThinking ? 'text-[#FDE047] animate-pulse' : 'text-neutral-400'}`} />
          {isThinking ? (
            <span className="text-[#FDE047] font-mono text-[11px] font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FDE047] animate-ping" />
              DeepSeek Reasoning...
            </span>
          ) : (
            <span className="text-neutral-400 hover:text-white font-mono text-[11px] font-medium transition-colors">
              Thought Process ({wordCount} words)
            </span>
          )}
        </div>
        <div className="text-neutral-500 hover:text-white">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {expanded && (
        <div className="p-3 bg-black/60 border-t border-white/[0.06] text-neutral-400 font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap select-text">
          {thinking}
          {isThinking && (
            <span className="inline-block w-1.5 h-3.5 bg-[#FDE047] animate-pulse ml-1 align-middle" />
          )}
        </div>
      )}
    </div>
  );
}

export function SecOpsCopilotDrawer({ isOpen, onClose, selectedSessionId }) {
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'deobfuscate'
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hey! I'm PHANTOM Copilot, running locally on your workstation's RTX 3050 GPU via DeepSeek-R1.\n\nI have direct visibility into your live USB telemetry, canary traps, and alert logs. You can ask me about attached devices, investigate recent alerts, or paste an obfuscated script into the **Script De-obfuscator** tab. How can I assist you right now?"
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Script analysis state
  const [scriptName, setScriptName] = useState('payload.ps1');
  const [scriptContent, setScriptContent] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzingScript, setAnalyzingScript] = useState(false);

  const messagesContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Only check status and scroll when the drawer opens, NOT on every streaming character
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen]);

  const handleSendMessage = async (customPrompt) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || loading || isStreaming) return;

    const userMessage = { role: 'user', content: textToSend };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    if (!customPrompt) setInputMessage('');
    setLoading(true);
    setIsStreaming(true);

    let accumulatedText = '';
    // Append placeholder for streaming assistant response
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    // Smooth scroll immediately after user sends message
    setTimeout(scrollToBottom, 50);

    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          session_id: selectedSessionId || null,
          history: updatedMessages.slice(-4)
        })
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;
        
        // Immediate smooth text accumulation without triggering external network calls
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: accumulatedText };
          return next;
        });

        // Direct scroll without smooth animation lag
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }
    } catch (e) {
      console.warn("Stream interrupted, using fallback:", e);
      if (!accumulatedText) {
        try {
          const fallbackRes = await fetch(`http://${window.location.hostname}:8001/api/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: textToSend,
              session_id: selectedSessionId || null,
              history: updatedMessages.slice(-4)
            })
          });
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            setMessages(prev => {
              const next = [...prev];
              next[next.length - 1] = { role: 'assistant', content: data.reply };
              return next;
            });
            setTimeout(scrollToBottom, 50);
            return;
          }
        } catch (err) {
          console.error("Fallback chat error:", err);
        }

        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { 
            role: 'assistant', 
            content: `Apologies, Investigator. I encountered an issue contacting the AI engine: ${e.message}` 
          };
          return next;
        });
      }
    } finally {
      setLoading(false);
      setIsStreaming(false);
      setTimeout(scrollToBottom, 50);
    }
  };

  const handleAnalyzeScript = async () => {
    if (!scriptContent.trim() || analyzingScript) return;
    setAnalyzingScript(true);
    setAnalysisResult(null);

    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/ai/analyze-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: scriptName,
          content: scriptContent
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data);
      } else {
        setAnalysisResult({ error: 'Failed to analyze script via AI engine.' });
      }
    } catch (e) {
      setAnalysisResult({ error: e.message });
    } finally {
      setAnalyzingScript(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-md transition-opacity">
      <div className="w-full max-w-2xl bg-[#0D0D0D] border-l border-white/[0.08] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Header - Clean & Minimal (Latency pill removed) */}
        <div className="p-4 px-6 border-b border-white/[0.08] flex items-center justify-between bg-[#111111]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#FDE047]/10 border border-[#FDE047]/25 flex items-center justify-center p-1.5 shrink-0">
              <img src="/phantom-icon-yellow.png" alt="PHANTOM" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">PHANTOM Copilot</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-white/[0.08] bg-[#0E0E0E] px-6">
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'chat'
                ? 'border-[#FDE047] text-[#FDE047]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            Intelligence Assistant
          </button>
          <button
            onClick={() => setActiveTab('deobfuscate')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'deobfuscate'
                ? 'border-[#FDE047] text-[#FDE047]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Code className="w-4 h-4" />
            Script De-obfuscator
          </button>
        </div>

        {/* Tab Content: CHAT */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#0A0A0A]">
            {/* Messages Scroll Area */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-[#FDE047]/10 border border-[#FDE047]/30 flex items-center justify-center text-[#FDE047] shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#FDE047] text-black font-semibold shadow-lg shadow-[#FDE047]/5 whitespace-pre-wrap'
                        : 'bg-[#141414] border border-white/[0.08] text-neutral-200 shadow-md'
                    }`}
                  >
                    {m.content ? (
                      m.role === 'user' ? (
                        m.content
                      ) : (
                        (() => {
                          const { thinking, answer, isThinking } = parseThinkingAndAnswer(m.content);
                          return (
                            <div className="space-y-2 markdown-chat-content text-xs">
                              {thinking && (
                                <ThinkingAccordion thinking={thinking} isThinking={isThinking} />
                              )}
                              {answer ? (
                                <ReactMarkdown
                                  components={{
                                    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-neutral-200 text-xs font-normal">{children}</p>,
                                    strong: ({ children }) => <strong className="font-bold text-[#FDE047]">{children}</strong>,
                                    ul: ({ children }) => <ul className="space-y-1.5 my-2 pl-4 list-disc marker:text-[#FDE047] text-neutral-300">{children}</ul>,
                                    ol: ({ children }) => <ol className="space-y-1.5 my-2 pl-4 list-decimal marker:text-[#FDE047] text-neutral-300 font-medium">{children}</ol>,
                                    li: ({ children }) => <li className="text-neutral-300 leading-relaxed text-xs">{children}</li>,
                                    code: ({ inline, children }) =>
                                      inline ? (
                                        <code className="px-1.5 py-0.5 rounded bg-black/60 text-[#FDE047] font-mono text-[11px] border border-white/10">{children}</code>
                                      ) : (
                                        <pre className="p-3 my-2 rounded-xl bg-black border border-white/10 overflow-x-auto text-[11px] font-mono text-emerald-400 leading-snug">{children}</pre>
                                      ),
                                    h1: ({ children }) => <h3 className="font-bold text-white text-sm mt-3 mb-1 text-[#FDE047]">{children}</h3>,
                                    h2: ({ children }) => <h4 className="font-bold text-white text-xs sm:text-sm mt-2.5 mb-1 text-[#FDE047]">{children}</h4>,
                                    h3: ({ children }) => <h5 className="font-bold text-white text-xs mt-2 mb-1 text-[#FDE047]">{children}</h5>,
                                  }}
                                >
                                  {answer}
                                </ReactMarkdown>
                              ) : isThinking ? null : (
                                <ReactMarkdown>{m.content}</ReactMarkdown>
                              )}
                            </div>
                          );
                        })()
                      )
                    ) : (
                      <div className="flex items-center gap-2 text-neutral-400 italic">
                        <Sparkles className="w-3.5 h-3.5 text-[#FDE047] animate-spin" />
                        <span>Formulating response...</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-white/[0.08] bg-[#111111]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Inquire about threats, devices, or forensic analysis..."
                  className="flex-1 bg-[#0A0A0A] border border-white/[0.1] rounded-full px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FDE047] transition-colors"
                  disabled={loading || isStreaming}
                />
                <button
                  type="submit"
                  disabled={loading || isStreaming || !inputMessage.trim()}
                  className="p-2.5 rounded-full bg-[#FDE047] hover:bg-[#FDE047]/90 text-black font-bold disabled:opacity-40 transition-all cursor-pointer shadow-md shadow-[#FDE047]/10"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab Content: SCRIPT DE-OBFUSCATOR */}
        {activeTab === 'deobfuscate' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0A0A0A]">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider">
                Script / Filename:
              </label>
              <input
                type="text"
                value={scriptName}
                onChange={(e) => setScriptName(e.target.value)}
                className="w-full bg-[#111111] border border-white/[0.1] rounded-xl px-4 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#FDE047]"
                placeholder="e.g. autorun.bat, payload.ps1"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
                <span>Code Content:</span>
                <button
                  onClick={() => {
                    setScriptName('deploy_task.bat');
                    setScriptContent('@echo off\nreg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v Updater /t REG_SZ /d "powershell.exe -w hidden -nop -enc JAB3AGUAYgA..." /f\nexit');
                  }}
                  className="text-[10px] text-[#FDE047] hover:underline cursor-pointer"
                >
                  Load Sample Script
                </button>
              </label>
              <textarea
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                rows={8}
                className="w-full bg-[#111111] border border-white/[0.1] rounded-xl p-4 text-xs font-mono text-white focus:outline-none focus:border-[#FDE047]"
                placeholder="Paste code or script here..."
              />
            </div>

            <button
              onClick={handleAnalyzeScript}
              disabled={analyzingScript || !scriptContent.trim()}
              className="w-full py-2.5 rounded-xl bg-[#FDE047] hover:bg-[#FDE047]/90 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {analyzingScript ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>De-obfuscating Payload...</span>
                </>
              ) : (
                <>
                  <Terminal className="w-4 h-4" />
                  <span>Analyze & De-obfuscate</span>
                </>
              )}
            </button>

            {analysisResult && (
              <div className="mt-4 p-5 rounded-2xl bg-[#141414] border border-white/[0.08] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">VERDICT:</span>
                    <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
                      analysisResult.verdict === 'MALICIOUS'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : analysisResult.verdict === 'SUSPICIOUS'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-white/[0.08] text-neutral-300 border border-white/[0.1]'
                    }`}>
                      {analysisResult.verdict || 'ANALYZED'}
                    </span>
                  </div>

                  {analysisResult.threat_score !== undefined && (
                    <span className="text-xs font-mono text-neutral-300">
                      Threat Score: <strong className="text-white">{analysisResult.threat_score}/100</strong>
                    </span>
                  )}
                </div>

                {analysisResult.summary && (
                  <div>
                    <h4 className="text-[11px] font-bold text-neutral-400 uppercase">Analysis Summary</h4>
                    <p className="text-xs text-neutral-200 mt-1 leading-relaxed">
                      {analysisResult.summary}
                    </p>
                  </div>
                )}

                {analysisResult.mitre_techniques?.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold text-neutral-400 uppercase">MITRE ATT&CK Matrix Mapping</h4>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {analysisResult.mitre_techniques.map((tech, i) => (
                        <span key={i} className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-neutral-900 border border-white/[0.1] text-amber-300">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResult.evasion_techniques?.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold text-neutral-400 uppercase">Identified Evasion Tactics</h4>
                    <ul className="list-disc list-inside text-xs text-neutral-300 space-y-1 mt-1">
                      {analysisResult.evasion_techniques.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.remediation && (
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-neutral-200">
                    <strong className="text-[#FDE047]">Recommended Action:</strong> {analysisResult.remediation}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
