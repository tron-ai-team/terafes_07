import React, { useState } from 'react';
import {
  Terminal,
  FileCode,
  Globe,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export interface AgentToolCardProps {
  toolType: 'terminal' | 'file' | 'browser' | 'approval';
  title?: string;
  summary?: string;
  payload?: any;
  onOpenPanel?: (tab: 'terminal' | 'files' | 'browser' | 'trace') => void;
  className?: string;
}

export const AgentToolCard: React.FC<AgentToolCardProps> = ({
  toolType,
  title,
  summary,
  payload = {},
  onOpenPanel,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Render Terminal Tool Card
  if (toolType === 'terminal') {
    const command = payload.command || title || 'mvnw test';
    const output = payload.output || summary || 'BUILD SUCCESS';
    const isSuccess = !output.toLowerCase().includes('fail') && !output.toLowerCase().includes('error');

    return (
      <div className={`rounded-2xl border border-slate-200 bg-slate-900/95 text-slate-100 shadow-sm overflow-hidden text-xs ${className}`}>
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-3 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-800/80 transition-colors select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-md bg-slate-800 text-cyan-400">
              <Terminal className="w-3.5 h-3.5" />
            </span>
            <span className="font-mono font-bold text-slate-300 text-[11px] truncate">
              {command.startsWith('>') ? command : `> ${command}`}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                isSuccess ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {output.length > 28 ? output.substring(0, 25) + '...' : output}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="p-3 bg-slate-950 border-t border-slate-800 font-mono text-[11px] space-y-2">
            <div className="text-slate-300 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text p-2 rounded-lg bg-black/40">
              {payload.fullOutput || output}
            </div>
            {onOpenPanel && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPanel('terminal');
                  }}
                  className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <span>Open Full Terminal Log</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Render File Change Tool Card
  if (toolType === 'file') {
    const filePath = payload.path || title || 'pom.xml';
    const changeType = (payload.changeType || 'modified').toUpperCase();
    const diff = payload.diff || summary || '+ dependency version updated';
    const linesAdded = payload.linesAdded;
    const linesRemoved = payload.linesRemoved;

    return (
      <div className={`rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden text-xs ${className}`}>
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-3 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-50 transition-colors select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-md bg-indigo-50 text-indigo-600">
              <FileCode className="w-3.5 h-3.5" />
            </span>
            <span className="font-mono font-bold text-slate-800 text-[11px] truncate">
              {filePath}
            </span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                changeType === 'CREATED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : changeType === 'DELETED'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {changeType}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(linesAdded !== undefined || linesRemoved !== undefined) && (
              <span className="font-mono text-[10px] text-slate-500">
                {linesAdded !== undefined && <span className="text-emerald-600 font-bold">+{linesAdded} </span>}
                {linesRemoved !== undefined && <span className="text-rose-600 font-bold">-{linesRemoved}</span>}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="p-3 bg-slate-900 border-t border-slate-100 font-mono text-[11px] text-slate-200 space-y-2">
            <pre className="max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text p-2 rounded-lg bg-black/40 text-[10px]">
              {diff}
            </pre>
            {onOpenPanel && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPanel('files');
                  }}
                  className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <span>Inspect in Changed Files Panel</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Render Browser Tool Card
  if (toolType === 'browser') {
    const url = payload.url || payload.currentUrl || title || 'http://localhost:8080';
    const pageTitle = payload.pageTitle || summary || 'Application Verification';
    const rawShot = payload.screenshotBase64;
    const hasScreenshot = Boolean(rawShot && rawShot.trim().length > 0);
    const screenshot = hasScreenshot
      ? rawShot!.startsWith('data:')
        ? rawShot!
        : `data:image/png;base64,${rawShot}`
      : null;

    return (
      <div className={`rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden text-xs ${className}`}>
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-3 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-50 transition-colors select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-md bg-blue-50 text-blue-600">
              <Globe className="w-3.5 h-3.5" />
            </span>
            <div className="truncate min-w-0">
              <p className="font-bold text-slate-800 text-[11px] truncate">{pageTitle}</p>
              <p className="font-mono text-[10px] text-blue-600 truncate">{url}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                hasScreenshot ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {hasScreenshot ? 'Screenshot Ready' : 'Active Viewport'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
            {screenshot ? (
              <div className="rounded-lg overflow-hidden border border-slate-200 bg-white">
                <img src={screenshot} alt={pageTitle} className="w-full h-auto max-h-44 object-contain" />
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic p-2 text-center bg-white rounded-lg border border-slate-200">
                Browser verified URL without static snapshot frame.
              </p>
            )}
            {onOpenPanel && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPanel('browser');
                  }}
                  className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <span>Open Full Browser Verification View</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Fallback Approval Tool Card
  return (
    <div className={`p-3 rounded-2xl border border-amber-200 bg-amber-50/70 text-amber-900 text-xs ${className}`}>
      <div className="flex items-center gap-2 font-bold">
        <ShieldAlert className="w-4 h-4 text-amber-600" />
        <span>{title || 'Human Approval Required'}</span>
      </div>
      <p className="text-[11px] text-amber-800 mt-1">{summary}</p>
    </div>
  );
};
