import React from 'react';
import { UserCheck, Play, Shield, AlertTriangle, ArrowRight, ExternalLink } from 'lucide-react';
import { AgentControlMode } from '../../types/desktopAgent';

export interface AgentBrowserHandoffCardProps {
  controlMode?: AgentControlMode;
  onTakeControl: () => void;
  onResumeAgent: () => void;
  onOpenBrowserPanel?: () => void;
  onSendQuickReply?: (reply: string) => void;
  className?: string;
}

export const AgentBrowserHandoffCard: React.FC<AgentBrowserHandoffCardProps> = ({
  controlMode = 'AGENT',
  onTakeControl,
  onResumeAgent,
  onOpenBrowserPanel,
  onSendQuickReply,
  className = '',
}) => {
  const isUserControlled = controlMode === 'MANUAL';

  return (
    <div className={`p-4 rounded-3xl border border-amber-300 bg-gradient-to-br from-amber-50/90 via-white to-amber-50/50 shadow-sm space-y-3.5 text-xs ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
              User Action Required
            </h4>
            <p className="text-[11px] text-slate-600 font-medium">
              Complete login, MFA, or CAPTCHA manually.
            </p>
          </div>
        </div>

        {onOpenBrowserPanel && (
          <button
            onClick={onOpenBrowserPanel}
            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 shrink-0"
          >
            <span>View Browser</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Main Instruction */}
      <div className="p-3 rounded-2xl bg-white border border-amber-200/80 space-y-2 text-slate-700">
        <p className="font-semibold text-slate-900 leading-relaxed">
          {isUserControlled
            ? 'Complete login, MFA, or CAPTCHA manually in your desktop browser, then click Resume Agent.'
            : 'Complete login, MFA, or CAPTCHA manually. Take control of the browser window to proceed.'}
        </p>

        {/* Security & Credential Protection Notice */}
        <div className="p-2.5 rounded-xl bg-slate-900 text-slate-200 text-[11px] flex items-start gap-2 leading-relaxed">
          <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-300">Security Notice: </span>
            Do not send your password in TRON chat.
          </div>
        </div>
      </div>

      {/* Interactive Action Buttons */}
      <div className="flex items-center gap-2.5 flex-wrap">
        {!isUserControlled ? (
          <>
            <button
              onClick={onTakeControl}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Take Browser Control</span>
            </button>
            <button
              onClick={onResumeAgent}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-slate-700" />
              <span>Resume Agent</span>
            </button>
          </>
        ) : (
          <button
            onClick={onResumeAgent}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-105 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Resume Agent</span>
          </button>
        )}

        {/* Quick continuation replies */}
        {onSendQuickReply && (
          <div className="flex items-center gap-1.5 flex-wrap ml-auto">
            <span className="text-[10px] text-slate-400 font-semibold">Or reply:</span>
            {['done', 'continue', 'I logged in'].map((reply) => (
              <button
                key={reply}
                onClick={() => onSendQuickReply(reply)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
              >
                "{reply}"
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
