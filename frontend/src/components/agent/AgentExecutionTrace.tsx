import React from 'react';
import { AgentTaskStep } from '../../types/desktopAgent';
import { Check, Circle, Loader2, X, SkipForward, ArrowRight } from 'lucide-react';

interface AgentExecutionTraceProps {
  steps: AgentTaskStep[];
  currentStepId?: string;
  hasBrowserScreenshot?: boolean;
  className?: string;
}

export const AgentExecutionTrace: React.FC<AgentExecutionTraceProps> = ({
  steps = [],
  currentStepId,
  hasBrowserScreenshot = false,
  className = '',
}) => {
  const getCleanTitle = (title: string) => {
    if (title.toLowerCase().includes('screenshot captured') && !hasBrowserScreenshot) {
      return 'Browser verification';
    }
    return title;
  };

  const getCleanSummary = (summary?: string) => {
    if (!summary) return undefined;
    if (summary.toLowerCase().includes('screenshot captured') && !hasBrowserScreenshot) {
      return 'Inspecting browser session';
    }
    return summary;
  };
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center gap-2">
          <span>Execution Plan & Trace</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-600 font-semibold border border-blue-100">
            {steps.filter((s) => s.status === 'completed').length} / {steps.length}
          </span>
        </h3>
        <span className="text-[11px] text-slate-400">Safe summaries only</span>
      </div>

      {steps.length === 0 ? (
        <div className="p-6 text-center rounded-2xl bg-slate-50/60 border border-dashed border-slate-200">
          <p className="text-xs text-slate-400 font-medium">No execution steps planned yet.</p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200/80">
          {steps.map((step, idx) => {
            const isCurrent = step.id === currentStepId || step.status === 'running';

            return (
              <div key={step.id || idx} className="relative group">
                {/* Status Dot / Icon along the timeline */}
                <div
                  className={`
                    absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all
                    ${
                      step.status === 'completed'
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                        : step.status === 'running'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/40 ring-4 ring-blue-100 animate-pulse'
                        : step.status === 'failed'
                        ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
                        : step.status === 'skipped'
                        ? 'bg-slate-300 text-slate-600'
                        : 'bg-white text-slate-400 border-2 border-slate-300'
                    }
                  `}
                >
                  {step.status === 'completed' && <Check className="w-3 h-3 stroke-[3]" />}
                  {step.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                  {step.status === 'failed' && <X className="w-3 h-3 stroke-[3]" />}
                  {step.status === 'skipped' && <SkipForward className="w-2.5 h-2.5" />}
                  {step.status === 'pending' && <Circle className="w-2 h-2 fill-slate-300 text-slate-300" />}
                </div>

                {/* Step Content */}
                <div
                  className={`
                    p-3 rounded-xl border transition-all text-xs
                    ${
                      isCurrent
                        ? 'bg-blue-50/70 border-blue-200 shadow-xs'
                        : step.status === 'completed'
                        ? 'bg-white/80 border-slate-200/70 text-slate-700'
                        : step.status === 'failed'
                        ? 'bg-rose-50/50 border-rose-200 text-rose-900'
                        : 'bg-slate-50/40 border-slate-200/50 text-slate-500'
                    }
                  `}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-semibold ${
                        isCurrent
                          ? 'text-blue-900'
                          : step.status === 'completed'
                          ? 'text-slate-800'
                          : step.status === 'failed'
                          ? 'text-rose-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {getCleanTitle(step.title)}
                    </span>

                    {step.status === 'running' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded-full">
                        <ArrowRight className="w-2.5 h-2.5 animate-pulse" /> In Progress
                      </span>
                    )}
                  </div>

                  {/* Safe Summary details (safe high-level activity, never raw internal chain-of-thought) */}
                  {step.safeSummary && (
                    <p className="mt-1 text-[11px] text-slate-500 font-mono leading-relaxed">
                      {getCleanSummary(step.safeSummary)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
