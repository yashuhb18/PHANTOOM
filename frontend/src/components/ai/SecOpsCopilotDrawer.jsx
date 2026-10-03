import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  Terminal, 
  ShieldAlert, 
  Trash2, 
  Code,
  Brain,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FileCode,
  RotateCcw,
  Play,
  FileText,
  AlertTriangle,
  Usb
} from 'lucide-react';

function parseThinkingAndAnswer(rawText) {
  if (!rawText) return { thinking: null, answer: '', isThinking: false };

  const thinkStart = rawText.indexOf('<think>');
  if (thinkStart === -1) {
    return { thinking: null, answer: rawText, isThinking: false };
  }

  const thinkEnd = rawText.indexOf('</think>');
  if (thinkEnd === -1) {
    const thinking = rawText.slice(thinkStart + 7);
    return { thinking, answer: '', isThinking: true };
  }

  const thinking = rawText.slice(thinkStart + 7, thinkEnd).trim();
  const answer = rawText.slice(thinkEnd + 8).trim();
  return { thinking, answer, isThinking: false };
}

function ThinkingAccordion({ thinking, isThinking }) {
  const [expanded, setExpanded] = useState(isThinking || false);

  useEffect(() => {
    if (isThinking) {
      setExpanded(true);
    }
  }, [isThinking]);

  if (!thinking) return null;
  const wordCount = thinking.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="mb-2.5 rounded-xl border border-white/[0.08] bg-black/50 overflow-hidden text-xs">
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
              Thinking...
            </span>
          ) : (
            <span className="text-neutral-400 hover:text-white font-mono text-[11px] font-medium transition-colors">
              Thinking Process ({wordCount} words)
            </span>
          )}
        </div>
        <div className="text-neutral-500 hover:text-white">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {expanded && (
        <div className="p-3 bg-black/70 border-t border-white/[0.06] text-neutral-400 font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap select-text">
          {thinking}
        </div>
      )}
    </div>
  );
}

// Antigravity-style Code Diff Viewer
function DiffViewer({ diff, oldCode, newCode }) {
  if (diff && diff.trim()) {
    const lines = diff.split('\n');
    return (
      <div className="my-2 rounded-xl bg-black border border-white/10 overflow-hidden font-mono text-[11px]">
        <div className="px-3 py-1 bg-white/[0.04] border-b border-white/[0.06] text-[10px] text-neutral-400 flex items-center justify-between">
          <span>Unified Diff Preview</span>
          <span className="text-emerald-400 font-bold">+Added / -Removed</span>
        </div>
        <div className="p-2.5 max-h-56 overflow-y-auto overflow-x-auto leading-relaxed">
          {lines.map((l, i) => {
            if (l.startsWith('+') && !l.startsWith('+++')) {
              return (
                <div key={i} className="text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded -mx-1 border-l-2 border-emerald-400">
                  {l}
                </div>
              );
            }
            if (l.startsWith('-') && !l.startsWith('---')) {
              return (
                <div key={i} className="text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded -mx-1 border-l-2 border-red-400">
                  {l}
                </div>
              );
            }
            if (l.startsWith('@@')) {
              return <div key={i} className="text-cyan-400 opacity-80 py-0.5">{l}</div>;
            }
            return <div key={i} className="text-neutral-400 py-0.5">{l}</div>;
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="my-2 rounded-xl bg-black border border-white/10 p-3 font-mono text-[11px] space-y-2">
      {oldCode && (
        <div className="p-2 rounded bg-red-950/30 border border-red-500/20 text-red-300">
          <span className="text-[9px] uppercase font-bold tracking-wider text-red-400 block mb-1">Removed Lines:</span>
          <pre className="whitespace-pre-wrap">{oldCode}</pre>
        </div>
      )}
      {newCode && (
        <div className="p-2 rounded bg-emerald-950/30 border border-emerald-500/20 text-emerald-300">
          <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-400 block mb-1">Added Lines:</span>
          <pre className="whitespace-pre-wrap">{newCode}</pre>
        </div>
      )}
    </div>
  );
}

export function SecOpsCopilotDrawer({ isOpen, onClose, selectedSessionId }) {
  // Tab: 'chat' (original chatbot) | 'agent' (antigravity style live agent)
  const [activeTab, setActiveTab] = useState('agent');

  // Chatbot state
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      content: "Hey! I'm PHANTOM Copilot, running locally on your workstation's RTX 3050 GPU via DeepSeek-R1.\n\nI have direct visibility into your live USB telemetry, canary traps, and alert logs. Switch to the **Autonomous Agent** tab to have me execute bash commands, kill processes, or edit files inside your folder directly!"
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatStreaming, setChatStreaming] = useState(false);

  // Antigravity Agent state
  const [agentMessages, setAgentMessages] = useState([
    {
      role: 'assistant',
      content: "PHANTOM Antigravity Agent online. Ready to run commands, kill rogue processes, delete/quarantine files, or edit code inside your folder.",
      steps: []
    }
  ]);
  const [agentInput, setAgentInput] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);

  const chatContainerRef = useRef(null);
  const agentContainerRef = useRef(null);

  const scrollChatToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  const scrollAgentToBottom = () => {
    if (agentContainerRef.current) {
      agentContainerRef.current.scrollTop = agentContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(activeTab === 'chat' ? scrollChatToBottom : scrollAgentToBottom, 50);
    }
  }, [isOpen, activeTab]);

  // Handle standard Chatbot message
  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading || chatStreaming) return;
    const userMsg = { role: 'user', content: chatInput };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    setChatInput('');
    setChatLoading(true);
    setChatStreaming(true);

    let accumulatedText = '';
    setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    setTimeout(scrollChatToBottom, 50);

    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/ai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          session_id: selectedSessionId || null,
          history: updated.slice(-4)
        })
      });

      if (!res.ok || !res.body) throw new Error(`HTTP error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        accumulatedText += decoder.decode(value, { stream: true });
        setChatMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: accumulatedText };
          return next;
        });
        scrollChatToBottom();
      }
    } catch (e) {
      console.warn("Chat streaming interrupted, using fallback:", e);
      try {
        const fbRes = await fetch(`http://${window.location.hostname}:8001/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMsg.content,
            session_id: selectedSessionId || null,
            history: updated.slice(-4)
          })
        });
        if (fbRes.ok) {
          const data = await fbRes.json();
          setChatMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = { role: 'assistant', content: data.reply };
            return next;
          });
          return;
        }
      } catch (err) {
        console.error("Fallback chat error:", err);
      }
      setChatMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: `Error: ${e.message}` };
        return next;
      });
    } finally {
      setChatLoading(false);
      setChatStreaming(false);
    }
  };

  // Handle Antigravity Agent Execution with Live SSE Streaming
  const handleSendAgent = async () => {
    if (!agentInput.trim() || agentLoading) return;
    const promptToSend = agentInput.trim();
    const userMsg = { role: 'user', content: promptToSend };
    
    // Antigravity assistant placeholder with live thinking
    const assistantPlaceholder = {
      role: 'assistant',
      content: '',
      thinking: '',
      isThinking: true,
      steps: [],
      currentTool: null,
      status: 'RUNNING',
      elapsed_ms: null
    };

    setAgentMessages(prev => [...prev, userMsg, assistantPlaceholder]);
    setAgentInput('');
    setAgentLoading(true);
    setTimeout(scrollAgentToBottom, 50);

    const historyPayload = agentMessages
      .filter(m => m.role === 'user' || (m.role === 'assistant' && m.content))
      .slice(-6)
      .map(m => ({ role: m.role, content: m.content || '' }));

    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/ai/agent/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          session_id: selectedSessionId || null,
          history: historyPayload
        })
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Split on newlines to parse SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            setAgentMessages(prev => {
              const next = [...prev];
              const last = { ...next[next.length - 1] };

              if (event.type === 'STEP_START') {
                last.isThinking = true;
              } else if (event.type === 'THINKING_CHUNK') {
                last.thinking = (last.thinking || '') + event.chunk;
                last.isThinking = true;
              } else if (event.type === 'THINKING_COMPLETE') {
                last.thinking = event.thinking || last.thinking;
                last.isThinking = false;
              } else if (event.type === 'TOOL_START') {
                last.currentTool = {
                  action: event.action,
                  args: event.args,
                  reason: event.reason,
                  step: event.step
                };
              } else if (event.type === 'TOOL_COMPLETE') {
                last.currentTool = null;
                const completedStep = {
                  step: event.step,
                  action: event.action,
                  args: event.args,
                  reason: event.reason,
                  result: event.result
                };
                const existing = [...(last.steps || [])];
                const sIdx = existing.findIndex(s => s.step === event.step && s.action === event.action);
                if (sIdx >= 0) {
                  existing[sIdx] = completedStep;
                } else {
                  existing.push(completedStep);
                }
                last.steps = existing;
              } else if (event.type === 'STEP_COMPLETE') {
                if (event.step_record && event.step_record.action !== 'FINISH') {
                  const existing = [...(last.steps || [])];
                  const sIdx = existing.findIndex(s => s.step === event.step && s.action === event.step_record.action);
                  if (sIdx >= 0) {
                    existing[sIdx] = event.step_record;
                  } else {
                    existing.push(event.step_record);
                  }
                  last.steps = existing;
                }
              } else if (event.type === 'MISSION_COMPLETE') {
                last.currentTool = null;
                last.isThinking = false;
                last.content = event.final_summary || 'Task completed.';
                last.status = event.status || 'COMPLETED';
                last.elapsed_ms = event.elapsed_ms;
                if (event.steps && event.steps.length > 0) {
                  last.steps = event.steps;
                }
              }

              next[next.length - 1] = last;
              return next;
            });
            scrollAgentToBottom();
          } catch (jsonErr) {
            console.warn("Failed to parse SSE JSON:", jsonErr, jsonStr);
          }
        }
      }
    } catch (e) {
      console.warn("Streaming agent mission interrupted, using prompt fallback:", e);
      try {
        const fbRes = await fetch(`http://${window.location.hostname}:8001/api/ai/agent/prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptToSend,
            session_id: selectedSessionId || null,
            history: historyPayload
          })
        });
        if (fbRes.ok) {
          const data = await fbRes.json();
          setAgentMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = {
              role: 'assistant',
              content: data.reply || 'Task complete.',
              thinking: data.thinking || null,
              isThinking: false,
              steps: data.steps || [],
              currentTool: null,
              elapsed_ms: data.elapsed_ms || null,
              status: data.status || 'COMPLETED'
            };
            return next;
          });
          return;
        }
      } catch (fbErr) {
        console.error("Agent fallback failed:", fbErr);
      }

      setAgentMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant',
          content: `Execution error: ${e.message}`,
          status: 'ERROR',
          isThinking: false,
          currentTool: null,
          steps: []
        };
        return next;
      });
    } finally {
      setAgentLoading(false);
      setTimeout(scrollAgentToBottom, 50);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-md transition-opacity">
      <div className="w-full max-w-2xl bg-[#0D0D0D] border-l border-white/[0.08] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-4 px-6 border-b border-white/[0.08] flex items-center justify-between bg-[#111111]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#FDE047]/10 border border-[#FDE047]/30 flex items-center justify-center p-1.5 shrink-0">
              {activeTab === 'agent' ? (
                <Terminal className="w-4 h-4 text-[#FDE047]" />
              ) : (
                <Bot className="w-4 h-4 text-[#FDE047]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  {activeTab === 'agent' ? 'PHANTOM Autonomous Agent' : 'PHANTOM Copilot'}
                </h2>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                DeepSeek-R1 • RTX 3050 GPU • {activeTab === 'agent' ? 'Antigravity Execution Engine' : 'Threat Intelligence'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'agent' && (
              <button
                onClick={() => setAgentMessages([
                  {
                    role: 'assistant',
                    content: "PHANTOM Antigravity Agent online. Ready to run commands, kill rogue processes, delete/quarantine files, or edit code inside your folder.",
                    steps: []
                  }
                ])}
                className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Reset agent session"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher: Chatbot vs Antigravity Agent */}
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
            Intelligence Chatbot
          </button>
          <button
            onClick={() => setActiveTab('agent')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'agent'
                ? 'border-[#FDE047] text-[#FDE047]'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4 text-[#FDE047]" />
            Autonomous Agent
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FDE047]/20 text-[#FDE047] font-mono font-bold">
              ANTIGRAVITY
            </span>
          </button>
        </div>

        {/* TAB 1: ORIGINAL CHATBOT */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#0A0A0A]">
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.map((m, idx) => (
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

            {/* Chat Input Bar */}
            <div className="p-4 border-t border-white/[0.08] bg-[#111111]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Inquire about threat intelligence, USB forensics, or security posture..."
                  className="flex-1 bg-[#0A0A0A] border border-white/[0.1] rounded-full px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FDE047] transition-colors"
                  disabled={chatLoading || chatStreaming}
                />
                <button
                  type="submit"
                  disabled={chatLoading || chatStreaming || !chatInput.trim()}
                  className="p-2.5 rounded-full bg-[#FDE047] hover:bg-[#FACC15] text-black font-bold disabled:opacity-40 transition-all cursor-pointer shadow-md shadow-[#FDE047]/10"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 2: ANTIGRAVITY AUTONOMOUS AGENT */}
        {activeTab === 'agent' && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#0A0A0A]">
            
            {/* Execution Stream */}
            <div ref={agentContainerRef} className="flex-1 overflow-y-auto p-6 space-y-5">
              {agentMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-[#FDE047]/10 border border-[#FDE047]/30 flex items-center justify-center text-[#FDE047] shrink-0 mt-0.5">
                      <Terminal className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[90%] rounded-2xl p-4 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#FDE047] text-black font-semibold shadow-lg shadow-[#FDE047]/5 whitespace-pre-wrap'
                        : 'bg-[#141414] border border-white/[0.08] text-neutral-200 shadow-md w-full'
                    }`}
                  >
                    {m.role === 'assistant' ? (
                      <div className="space-y-3.5">
                        
                        {/* 1. Antigravity-Style Thinking Stream */}
                        {(m.thinking || m.isThinking) && (
                          <ThinkingAccordion thinking={m.thinking} isThinking={m.isThinking} />
                        )}

                        {/* 2. Active Tool Execution in Real Time */}
                        {m.currentTool && (
                          <div className="rounded-xl bg-[#0D0D0D] border border-[#FDE047]/40 p-3.5 flex items-center justify-between animate-pulse">
                            <div className="flex items-center gap-2.5 font-mono text-[11px]">
                              <Terminal className="w-4 h-4 text-[#FDE047] animate-spin shrink-0" />
                              <span className="text-[#FDE047] font-bold">
                                {m.currentTool.action === 'EDIT_CODE' ? `Editing ${m.currentTool.args?.filepath || 'file'}...` :
                                 m.currentTool.action === 'WRITE_FILE' ? `Writing ${m.currentTool.args?.filepath || 'file'}...` :
                                 m.currentTool.action === 'READ_FILE' ? `Viewing ${m.currentTool.args?.filepath || m.currentTool.args?.directory || 'file'}...` :
                                 m.currentTool.action === 'LIST_FILES' ? `Listing ${m.currentTool.args?.directory || '.'}...` :
                                 m.currentTool.action === 'RUN_COMMAND' ? `Executing: ${m.currentTool.args?.command || 'command'}...` :
                                 m.currentTool.action === 'KILL_PROCESS' ? `Terminating process PID ${m.currentTool.args?.pid || 'target'}...` :
                                 m.currentTool.action === 'KILL_FILE' ? `Deleting file ${m.currentTool.args?.filepath || 'file'}...` :
                                 m.currentTool.action === 'DETECT_USB' ? `Detecting connected USB devices & mount points...` :
                                 `Executing ${m.currentTool.action}...`}
                              </span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[#FDE047]/20 text-[#FDE047] font-bold font-mono">
                              RUNNING...
                            </span>
                          </div>
                        )}

                        {/* 3. Antigravity Tool Execution Cards */}
                        {m.steps && m.steps.length > 0 && (
                          <div className="space-y-3 pt-1">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                              Execution Trace ({m.steps.length} Actions):
                            </span>

                            {m.steps.map((st, sIdx) => {
                              const res = st.result || {};
                              return (
                                <div
                                  key={sIdx}
                                  className="rounded-xl bg-[#0D0D0D] border border-white/[0.08] overflow-hidden"
                                >
                                  {/* Step Card Header */}
                                  <div className="px-3.5 py-2.5 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-mono text-[11px]">
                                      {/* Icon by tool */}
                                      {st.action === 'EDIT_CODE' && <FileCode className="w-3.5 h-3.5 text-cyan-400" />}
                                      {st.action === 'WRITE_FILE' && <FileCode className="w-3.5 h-3.5 text-emerald-400" />}
                                      {st.action === 'READ_FILE' && <FileText className="w-3.5 h-3.5 text-blue-400" />}
                                      {st.action === 'RUN_COMMAND' && <Terminal className="w-3.5 h-3.5 text-[#FDE047]" />}
                                      {st.action === 'KILL_PROCESS' && <ShieldAlert className="w-3.5 h-3.5 text-red-400" />}
                                      {st.action === 'KILL_FILE' && <Trash2 className="w-3.5 h-3.5 text-amber-400" />}
                                      {st.action === 'DETECT_USB' && <Usb className="w-3.5 h-3.5 text-[#FDE047]" />}

                                      <span className="font-bold text-white">
                                        {st.action === 'EDIT_CODE' ? `Editing ${res.rel_path || res.filename || st.args?.filepath}` :
                                         st.action === 'WRITE_FILE' ? `Writing ${res.rel_path || res.filename || st.args?.filepath}` :
                                         st.action === 'READ_FILE' ? (res.is_directory ? `Inspecting ${res.filename || st.args?.filepath || 'directory'}` : `Viewing ${res.rel_path || res.filename || st.args?.filepath}`) :
                                         st.action === 'LIST_FILES' ? `Listing ${res.directory || st.args?.directory || '.'}` :
                                         st.action === 'LIST_PROCESSES' ? `Listing processes` :
                                         st.action === 'RUN_COMMAND' ? `Running command` :
                                         st.action === 'KILL_PROCESS' ? `Terminating process` :
                                         st.action === 'KILL_FILE' ? `Deleting file` :
                                         st.action === 'DETECT_USB' ? `Detected USB Storage (${res.connected_count || 0} device(s))` : st.action}
                                      </span>

                                      {/* Antigravity Lines Changed Badge */}
                                      {(st.action === 'EDIT_CODE' || st.action === 'WRITE_FILE') && (res.lines_added !== undefined || res.lines_removed !== undefined) && (
                                        <div className="flex items-center gap-1.5 ml-2">
                                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                            +{res.lines_added || 0}
                                          </span>
                                          <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">
                                            -{res.lines_removed || 0}
                                          </span>
                                        </div>
                                      )}

                                      {/* Process PID Badge */}
                                      {st.action === 'KILL_PROCESS' && (
                                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">
                                          PID {st.args?.pid || res.target_pid || 'target'}
                                        </span>
                                      )}
                                    </div>

                                    {/* Duration / Status Pill */}
                                    <div className="flex items-center gap-2">
                                      {res.duration_ms && (
                                        <span className="text-[10px] font-mono text-neutral-500">
                                          {res.duration_ms}ms
                                        </span>
                                      )}
                                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                        res.success !== false
                                          ? 'bg-emerald-500/20 text-emerald-400'
                                          : 'bg-red-500/20 text-red-400'
                                      }`}>
                                        {res.success !== false ? 'SUCCESS' : 'FAILED'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Step Body Content */}
                                  <div className="p-3.5 space-y-2">
                                    {/* Action reason */}
                                    {st.reason && (
                                      <p className="text-[11px] text-neutral-300 italic">
                                        "{st.reason}"
                                      </p>
                                    )}

                                    {/* Antigravity Diff Viewer for EDIT_CODE and WRITE_FILE */}
                                    {(st.action === 'EDIT_CODE' || st.action === 'WRITE_FILE') && (
                                      <DiffViewer 
                                        diff={res.diff} 
                                        oldCode={res.old_code || st.args?.old_code} 
                                        newCode={res.new_code || st.args?.content || res.content} 
                                      />
                                    )}

                                    {/* Terminal Command Output for RUN_COMMAND */}
                                    {st.action === 'RUN_COMMAND' && (
                                      <div className="space-y-1.5">
                                        <div className="px-3 py-1.5 rounded-lg bg-black border border-white/10 font-mono text-[11px] text-[#FDE047] flex items-center gap-2">
                                          <span className="text-neutral-500 select-none">$</span>
                                          <span>{st.args?.command || res.command}</span>
                                        </div>
                                        {res.stdout && (
                                          <pre className="p-3 rounded-lg bg-black/80 border border-white/[0.06] text-neutral-300 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap max-h-48 leading-snug">
                                            {res.stdout}
                                          </pre>
                                        )}
                                        {res.stderr && (
                                          <pre className="p-3 rounded-lg bg-red-950/30 border border-red-500/20 text-red-300 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap leading-snug">
                                            {res.stderr}
                                          </pre>
                                        )}
                                      </div>
                                    )}

                                    {/* File Read Output */}
                                    {st.action === 'READ_FILE' && res.content && (
                                      <pre className="p-3 rounded-lg bg-black/80 border border-white/[0.06] text-neutral-300 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap max-h-48 leading-snug">
                                        {res.content}
                                      </pre>
                                    )}

                                    {/* Directory File Explorer Listing */}
                                    {res.items && res.items.length > 0 && (
                                      <div className="p-2.5 rounded-lg bg-black/80 border border-white/10 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1">
                                        <div className="text-neutral-400 text-[10px] pb-1 border-b border-white/[0.06] flex items-center justify-between">
                                          <span>Folder: <strong className="text-[#FDE047]">{res.directory || res.filepath || st.args?.directory || '.'}</strong></span>
                                          <span className="text-neutral-500">{res.total_items || res.items.length} items</span>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1 pt-1">
                                          {res.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-neutral-300 py-0.5 px-1.5 rounded hover:bg-white/[0.04]">
                                              <span className="flex items-center gap-1.5 truncate">
                                                <span>{item.is_dir ? '📁' : '📄'}</span>
                                                <span className={item.is_dir ? 'text-[#FDE047] font-semibold' : 'text-neutral-200'}>{item.name}</span>
                                              </span>
                                              {!item.is_dir && (
                                                <span className="text-neutral-500 text-[10px] shrink-0">{item.size_bytes} B</span>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* USB Detection Output */}
                                    {st.action === 'DETECT_USB' && res.storage_devices && res.storage_devices.length > 0 && (
                                      <div className="space-y-1.5 font-mono text-[11px] my-1">
                                        {res.storage_devices.map((dev, dIdx) => (
                                          <div key={dIdx} className="p-2.5 rounded-lg bg-black/80 border border-white/10 flex items-center justify-between">
                                            <div>
                                              <span className="text-white font-bold">{dev.device_name || dev.model}</span>
                                              <span className="text-neutral-400 block text-[10px] mt-0.5">
                                                Mount: <strong className="text-[#FDE047]">{dev.mount_point || 'Unmounted'}</strong> • {dev.capacity_gb}GB • {dev.filesystem}
                                              </span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                              {dev.hardware_id}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* Message confirmation */}
                                    {res.message && (
                                      <p className="text-emerald-400 font-mono text-[11px] flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                        <span>{res.message}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* 4. Final Agent Explanation / Response */}
                        <div className="pt-2 border-t border-white/[0.06]">
                          {m.content ? (
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
                              {m.content}
                            </ReactMarkdown>
                          ) : m.status === 'RUNNING' ? (
                            <div className="flex items-center gap-2 text-[#FDE047] font-mono text-[11px]">
                              <Sparkles className="w-3.5 h-3.5 animate-spin" />
                              <span>Autonomous Agent operating...</span>
                            </div>
                          ) : null}

                          {m.elapsed_ms && (
                            <div className="pt-2 mt-2 text-[10px] font-mono text-neutral-500 flex items-center justify-between border-t border-white/[0.04]">
                              <span>Status: <strong className="text-emerald-400">{m.status}</strong></span>
                              <span>⚡ {m.elapsed_ms}ms</span>
                            </div>
                          )}
                        </div>

                      </div>
                    ) : (
                      m.content
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Antigravity Prompt Input Bar */}
            <div className="p-4 border-t border-white/[0.08] bg-[#111111]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAgent();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={agentInput}
                  onChange={(e) => setAgentInput(e.target.value)}
                  placeholder="Tell the agent what to do (e.g. kill process 1234, edit config.py, run ls)..."
                  className="flex-1 bg-[#0A0A0A] border border-white/[0.1] rounded-full px-4 py-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FDE047] transition-colors font-sans"
                  disabled={agentLoading}
                />
                <button
                  type="submit"
                  disabled={agentLoading || !agentInput.trim()}
                  className="p-3 rounded-full bg-[#FDE047] hover:bg-[#FACC15] text-black font-bold disabled:opacity-40 transition-all cursor-pointer shadow-md shadow-[#FDE047]/10 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
