import React, { useRef, useEffect, useState } from 'react';
import { Terminal, Copy, Trash2, Check, ArrowRight, CornerDownLeft, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { ConsoleOutputMessage } from '../language/interpreter';

interface ConsoleOutputProps {
  logs: ConsoleOutputMessage[];
  isRunning: boolean;
  executionTime?: number | null;
  onClear: () => void;
  promptState: {
    active: boolean;
    promptText: string;
    varName: string;
    onSubmit: (value: string) => void;
  } | null;
  onErrorClick?: (line: number) => void;
}

export const ConsoleOutput: React.FC<ConsoleOutputProps> = ({
  logs,
  isRunning,
  executionTime,
  onClear,
  promptState,
  onErrorClick
}) => {
  const [copied, setCopied] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const consoleBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    consoleBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, promptState]);

  // Focus input when prompt becomes active
  useEffect(() => {
    if (promptState?.active) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [promptState]);

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptState) return;
    promptState.onSubmit(inputValue);
    setInputValue('');
  };

  const handleCopyLogs = async () => {
    try {
      const fullText = logs.map((l) => `${l.type === 'stderr' ? '[त्रुटि] ' : ''}${l.text}`).join('\n');
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-inner">
      {/* Console Top Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/70 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-200">आउटपुट कंसोल (Output Console)</span>
          {isRunning ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              चल रहा है...
            </span>
          ) : executionTime !== undefined && executionTime !== null ? (
            <span className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-slate-400 bg-slate-800/80 rounded border border-slate-700/60">
              <Clock className="w-3 h-3 text-slate-400" />
              {executionTime} ms
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">तैयार</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1 px-2 py-1 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="आउटपुट कॉपी करें"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{copied ? 'कॉपी हुआ' : 'कॉपी'}</span>
          </button>

          <button
            type="button"
            onClick={onClear}
            disabled={logs.length === 0}
            className="flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-red-300 bg-slate-800/50 hover:bg-red-950/30 border border-slate-800 hover:border-red-800/50 rounded transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="कंसोल साफ़ करें"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">साफ़ करें</span>
          </button>
        </div>
      </div>

      {/* Console Log Area */}
      <div className="flex-1 p-3 overflow-y-auto font-mono text-sm space-y-1.5 bg-slate-950/90 text-slate-200">
        {logs.length === 0 && !promptState?.active && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 select-none">
            <Terminal className="w-8 h-8 mb-2 text-slate-600 opacity-60" />
            <p className="text-sm font-medium text-slate-400">कंसोल खाली है</p>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              प्रोग्राम निष्पादित करने के लिए ऊपर दिए गए <strong>"चलाएं (Run)"</strong> बटन पर क्लिक करें।
            </p>
          </div>
        )}

        {logs.map((log) => {
          if (log.type === 'stderr') {
            return (
              <div
                key={log.id}
                className="flex items-start gap-2 p-2 bg-red-950/40 border border-red-800/50 rounded text-red-300 text-xs sm:text-sm"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-red-200">{log.text}</span>
                    {log.line && (
                      <button
                        type="button"
                        onClick={() => onErrorClick?.(log.line!)}
                        className="px-1.5 py-0.5 text-[10px] bg-red-900/60 hover:bg-red-800/80 text-red-200 rounded border border-red-700/60 cursor-pointer transition"
                      >
                        पंक्ति {log.line} देखें
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          if (log.type === 'input-prompt') {
            return (
              <div key={log.id} className="flex items-center gap-2 py-1 text-amber-300 font-semibold">
                <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{log.text}</span>
              </div>
            );
          }

          if (log.type === 'input-echo') {
            return (
              <div key={log.id} className="text-slate-400 italic text-xs pl-4 border-l-2 border-slate-700">
                {log.text}
              </div>
            );
          }

          if (log.type === 'info') {
            return (
              <div key={log.id} className="flex items-center gap-2 py-0.5 text-slate-400 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>{log.text}</span>
              </div>
            );
          }

          // stdout
          return (
            <div key={log.id} className="text-slate-100 whitespace-pre-wrap leading-relaxed break-words font-devanagari">
              {log.text}
            </div>
          );
        })}

        {/* Embedded Interactive Input Field when "पूछो" statement is active */}
        {promptState?.active && (
          <form
            onSubmit={handleInputSubmit}
            className="mt-2 p-2.5 bg-amber-950/30 border border-amber-600/40 rounded-lg flex items-center gap-2"
          >
            <span className="text-amber-400 text-xs font-semibold shrink-0">
              {promptState.varName ? `[${promptState.varName}]` : '>'}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="यहाँ उत्तर लिखें और Enter दबाएं..."
              className="flex-1 bg-slate-900/90 text-amber-100 placeholder-slate-500 px-3 py-1.5 text-sm rounded border border-amber-500/40 focus:outline-hidden focus:border-amber-400"
            />
            <button
              type="submit"
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded transition cursor-pointer"
            >
              <span>दर्ज करें</span>
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        <div ref={consoleBottomRef} />
      </div>

      {/* Console Bottom Info */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>कंसोल सक्रिय</span>
        </div>
        <div>
          <span>कुल संदेश: {logs.length}</span>
        </div>
      </div>
    </div>
  );
};
