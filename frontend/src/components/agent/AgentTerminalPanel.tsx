import React, { useState, useRef, useEffect } from 'react';
import { AgentTerminalEvent } from '../../types/desktopAgent';
import { Terminal, Copy, Check, ArrowDownCircle, Maximize2, Minimize2 } from 'lucide-react';

interface AgentTerminalPanelProps {
  logs: AgentTerminalEvent[];
  title?: string;
  isStreaming?: boolean;
  className?: string;
}

export const AgentTerminalPanel: React.FC<AgentTerminalPanelProps> = ({
  logs = [],
  title = 'Desktop Agent Terminal',
  isStreaming = false,
  className = '',
}) => {
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive if autoScroll is enabled
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleCopyLogs = () => {
    const rawText = logs.map((l) => `[${l.timestamp}] [${l.stream.toUpperCase()}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`
        flex flex-col rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 shadow-xl overflow-hidden transition-all
        ${isExpanded ? 'fixed inset-4 z-50 md:inset-8' : 'h-[380px] md:h-[440px]'}
        ${className}
      `}
    >
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          <div className="flex items-center gap-2 ml-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-mono font-semibold text-slate-300">{title}</span>
            {isStreaming && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 animate-pulse">
                LIVE
              </span>
            )}
          </div>
        </div>

        {/* Terminal Controls */}
        <div className="flex items-center gap-2">
          {/* Auto-scroll button */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`
              flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono transition-colors
              ${autoScroll ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700/50' : 'text-slate-400 hover:text-slate-200'}
            `}
            title="Auto-scroll on new output"
          >
            <ArrowDownCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Auto-scroll</span>
          </button>

          {/* Copy Logs */}
          <button
            onClick={handleCopyLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-40 transition-colors"
            title="Copy all logs"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Expand / Minimize */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Minimize' : 'Expand full screen'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Terminal Output Body */}
      <div
        ref={scrollRef}
        className="flex-1 p-3.5 overflow-y-auto overflow-x-auto font-mono text-xs leading-relaxed space-y-1 select-text scrollbar-thin scrollbar-thumb-slate-800"
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 text-center py-10">
            <Terminal className="w-8 h-8 mb-2 opacity-40 text-slate-500" />
            <p className="text-xs">Terminal is ready.</p>
            <p className="text-[11px] text-slate-700 mt-1">Output from the connected TRON Desktop Agent will stream here.</p>
          </div>
        ) : (
          logs.map((log, index) => {
            const isStderr = log.stream === 'stderr';
            const isSystem = log.stream === 'system';

            return (
              <div
                key={log.id || index}
                className={`
                  flex items-start gap-2.5 break-all whitespace-pre-wrap
                  ${isStderr ? 'text-rose-400 bg-rose-950/20 px-1 py-0.5 rounded' : isSystem ? 'text-cyan-300 font-semibold' : 'text-slate-200'}
                `}
              >
                <span className="text-slate-600 select-none text-[10px] shrink-0 pt-0.5">
                  {log.timestamp ? log.timestamp.split('T')[1]?.slice(0, 8) || log.timestamp : `#${index + 1}`}
                </span>
                <span className="flex-1 font-mono">{log.text}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Terminal Status Footer */}
      <div className="px-4 py-1.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span>Lines: {logs.length}</span>
        <span>TRON Execution Stream • Read Only</span>
      </div>
    </div>
  );
};
