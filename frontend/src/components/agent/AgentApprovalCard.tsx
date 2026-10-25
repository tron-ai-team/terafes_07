import React, { useState } from 'react';
import { AgentApproval } from '../../types/desktopAgent';
import { AlertOctagon, ShieldAlert, Check, X, Loader2 } from 'lucide-react';

interface AgentApprovalCardProps {
  approval: AgentApproval;
  onApprove: (approvalId: string) => Promise<void>;
  onDeny: (approvalId: string) => Promise<void>;
  className?: string;
}

export const AgentApprovalCard: React.FC<AgentApprovalCardProps> = ({
  approval,
  onApprove,
  onDeny,
  className = '',
}) => {
  const [isSubmitting, setIsSubmitting] = useState<'approve' | 'deny' | null>(null);

  const handleApprove = async () => {
    setIsSubmitting('approve');
    try {
      await onApprove(approval.id);
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleDeny = async () => {
    setIsSubmitting('deny');
    try {
      await onDeny(approval.id);
    } finally {
      setIsSubmitting(null);
    }
  };

  const isDangerous = approval.risk === 'Dangerous' || approval.risk === 'High';

  return (
    <div
      className={`
        rounded-2xl border-2 p-5 transition-all shadow-lg
        ${
          isDangerous
            ? 'bg-rose-50/70 border-rose-300 shadow-rose-500/10'
            : 'bg-amber-50/70 border-amber-300 shadow-amber-500/10'
        }
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Title & Warning Icon */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDangerous ? 'bg-rose-600 text-white shadow-md shadow-rose-500/30' : 'bg-amber-500 text-white'
            }`}
          >
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
              TRON requires human approval
            </h3>
            <p className="text-xs text-slate-500">
              Execution is paused until you approve or deny this specific action.
            </p>
          </div>
        </div>

        {/* Risk Badge */}
        <span
          className={`
            px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shrink-0
            ${
              isDangerous
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-amber-100 text-amber-800 border-amber-300'
            }
          `}
        >
          {approval.risk}
        </span>
      </div>

      {/* Action & Reason Details */}
      <div className="mt-4 p-3.5 rounded-xl bg-white border border-slate-200 space-y-2.5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
            Action / Command
          </span>
          <div className="mt-1 font-mono text-xs font-bold text-slate-900 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 select-all break-all">
            {approval.action || approval.command || 'Execute command on host system'}
          </div>
        </div>

        {approval.targetPath && (
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
              Target Path
            </span>
            <div className="mt-1 font-mono text-xs text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 truncate select-all">
              {approval.targetPath}
            </div>
          </div>
        )}

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono block">
            Reason & Impact
          </span>
          <p className="mt-1 text-xs text-slate-700 leading-relaxed font-medium">
            {approval.summary || approval.reason || 'This action modifies the local system environment or a remote repository.'}
          </p>
        </div>
      </div>

      {/* Action Buttons: DENY / APPROVE ONCE (Only PENDING shows action buttons) */}
      <div className="mt-4 flex items-center justify-end gap-3">
        {(approval.status || '').toUpperCase() === 'PENDING' ? (
          <>
            <button
              onClick={handleDeny}
              disabled={isSubmitting !== null}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 hover:text-rose-600 transition-all disabled:opacity-50 shadow-2xs"
            >
              {isSubmitting === 'deny' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              <span>DENY</span>
            </button>

            <button
              onClick={handleApprove}
              disabled={isSubmitting !== null}
              className={`
                flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-50 shadow-md
                ${
                  isDangerous
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                    : 'bg-gradient-to-r from-[#008CFF] to-[#0066FF] hover:brightness-105 shadow-blue-500/30'
                }
              `}
            >
              {isSubmitting === 'approve' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-4 h-4 stroke-[3]" />
              )}
              <span>APPROVE ONCE</span>
            </button>
          </>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span>Decided:</span>
            <span className="uppercase text-blue-600">{(approval.status || '').toUpperCase()}</span>
          </div>
        )}
      </div>
    </div>
  );
};
