import React, { useState } from 'react';
import { AgentFileChange } from '../../types/desktopAgent';
import { FileCode, Plus, Minus, FileText, ChevronRight } from 'lucide-react';
import { FileDiffDrawer } from './FileDiffDrawer';

interface AgentChangedFilesPanelProps {
  files: AgentFileChange[];
  className?: string;
}

export const AgentChangedFilesPanel: React.FC<AgentChangedFilesPanelProps> = ({
  files = [],
  className = '',
}) => {
  const [selectedFile, setSelectedFile] = useState<AgentFileChange | null>(null);

  const getBadge = (type: AgentFileChange['changeType']) => {
    const normalized = (type || 'modified').toLowerCase();
    switch (normalized) {
      case 'created':
        return (
          <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
            <Plus className="w-3 h-3 stroke-[3]" />
          </span>
        );
      case 'deleted':
        return (
          <span className="w-5 h-5 rounded-md bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center shrink-0 border border-rose-200">
            <Minus className="w-3 h-3 stroke-[3]" />
          </span>
        );
      case 'modified':
      default:
        return (
          <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200">
            ~
          </span>
        );
    }
  };

  return (
    <>
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-2">
            <span>Changed Files</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              {files.length}
            </span>
          </h3>
          <span className="text-[11px] text-slate-400">Click to view diff</span>
        </div>

        {files.length === 0 ? (
          <div className="p-6 text-center rounded-2xl bg-slate-50/60 border border-dashed border-slate-200">
            <FileText className="w-7 h-7 mx-auto mb-1.5 text-slate-300" />
            <p className="text-xs text-slate-400 font-medium">No files changed yet.</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
            {files.map((file, idx) => (
              <button
                key={file.path || idx}
                onClick={() => setSelectedFile(file)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50/50 hover:border-blue-200 transition-all text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {getBadge(file.changeType)}
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-semibold text-slate-800 group-hover:text-blue-600 truncate block">
                      {file.path}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="capitalize">{file.changeType}</span>
                      {file.linesAdded !== undefined && (
                        <span className="text-emerald-600 font-mono">+{file.linesAdded}</span>
                      )}
                      {file.linesRemoved !== undefined && (
                        <span className="text-rose-600 font-mono">-{file.linesRemoved}</span>
                      )}
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0 ml-2" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* File Diff Drawer */}
      <FileDiffDrawer
        fileChange={selectedFile}
        onClose={() => setSelectedFile(null)}
      />
    </>
  );
};
