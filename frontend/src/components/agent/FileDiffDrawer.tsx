import React, { useState } from 'react';
import { AgentFileChange } from '../../types/desktopAgent';
import { X, FileCode, Plus, Minus, FileDiff, Split, AlignJustify } from 'lucide-react';

interface FileDiffDrawerProps {
  fileChange: AgentFileChange | null;
  onClose: () => void;
}

export const FileDiffDrawer: React.FC<FileDiffDrawerProps> = ({ fileChange, onClose }) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');

  if (!fileChange) return null;

  const getStatusBadge = () => {
    switch (fileChange.changeType) {
      case 'created':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Plus className="w-3 h-3" /> CREATED
          </span>
        );
      case 'modified':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            ~ MODIFIED
          </span>
        );
      case 'deleted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <Minus className="w-3 h-3" /> DELETED
          </span>
        );
    }
  };

  // Parse diff lines for colored rendering
  const diffLines = (fileChange.diff || '').split('\n');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileCode className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-mono font-bold text-xs text-slate-900 truncate">
                  {fileChange.path}
                </h3>
                {getStatusBadge()}
              </div>
              <p className="text-[11px] text-slate-500">File Diff from Desktop Agent</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setViewMode('unified')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                  viewMode === 'unified' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Unified Diff View"
              >
                <AlignJustify className="w-3 h-3" />
                <span className="hidden sm:inline">Unified</span>
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                  viewMode === 'split' ? 'bg-white shadow-xs text-slate-800' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Before / After Split View"
              >
                <Split className="w-3 h-3" />
                <span className="hidden sm:inline">Split</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Diff Content Body */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs select-text">
          {viewMode === 'unified' ? (
            <div className="space-y-0.5">
              {diffLines.length === 0 || !fileChange.diff ? (
                <div className="text-center py-12 text-slate-500">
                  <FileDiff className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="text-xs">No visual diff provided for this change.</p>
                  <p className="text-[11px] text-slate-600 mt-1">Backend contract provides diff lines once processed.</p>
                </div>
              ) : (
                diffLines.map((line, idx) => {
                  const isAdd = line.startsWith('+');
                  const isDel = line.startsWith('-');
                  const isHunk = line.startsWith('@@');

                  return (
                    <div
                      key={idx}
                      className={`
                        px-2 py-0.5 rounded-xs leading-relaxed whitespace-pre font-mono
                        ${isAdd ? 'bg-emerald-950/40 text-emerald-300' : isDel ? 'bg-rose-950/40 text-rose-300' : isHunk ? 'text-cyan-400 font-bold bg-slate-900/60' : 'text-slate-300'}
                      `}
                    >
                      {line}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            // Split View (Before / After)
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 overflow-auto">
                <div className="text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800 pb-1 mb-2">
                  Original Content (Before)
                </div>
                <pre className="text-slate-300 text-[11px] whitespace-pre-wrap">
                  {fileChange.originalContent || '// File did not exist previously or original content unavailable.'}
                </pre>
              </div>

              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 overflow-auto">
                <div className="text-[10px] font-bold uppercase text-emerald-400 border-b border-slate-800 pb-1 mb-2">
                  Generated Content (After)
                </div>
                <pre className="text-emerald-200 text-[11px] whitespace-pre-wrap">
                  {fileChange.newContent || fileChange.diff || '// Modified or new content from TRON Coding Agent.'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Provided by TRON Desktop Agent backend</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-white border border-slate-300 font-medium text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            Close Diff
          </button>
        </div>
      </div>
    </div>
  );
};
