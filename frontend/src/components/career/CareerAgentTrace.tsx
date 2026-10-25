import React from 'react';
import {
  Cpu,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Search,
  Globe,
  Layers,
  Award,
} from 'lucide-react';
import { CareerAgentStep, CareerAgentMetrics } from '../../types/careerAgent';

interface CareerAgentTraceProps {
  steps: CareerAgentStep[];
  currentStepIndex?: number;
  isRunning: boolean;
  metrics?: CareerAgentMetrics | null;
  selectedAiProfile?: string;
  uiLanguage?: string;
}

export const CareerAgentTrace: React.FC<CareerAgentTraceProps> = ({
  steps,
  currentStepIndex = 0,
  isRunning,
  metrics,
  selectedAiProfile = 'QUALITY',
  uiLanguage = 'en',
}) => {
  const getStepIcon = (status: CareerAgentStep['status'], isCurrent: boolean) => {
    if (isCurrent && isRunning) {
      return (
        <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-400 flex items-center justify-center shrink-0">
          <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
        </div>
      );
    }

    switch (status) {
      case 'completed':
        return (
          <div className="w-5 h-5 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-5 h-5 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
        );
      case 'failed':
        return (
          <div className="w-5 h-5 rounded-full bg-red-100 border border-red-300 flex items-center justify-center shrink-0">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
          </div>
        );
      case 'running':
        return (
          <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-400 flex items-center justify-center shrink-0">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
          </div>
        );
      case 'pending':
      default:
        return (
          <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          </div>
        );
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-white/95 backdrop-blur-xl border border-[#D6E6F7] shadow-lg shadow-blue-500/5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-blue-600" />
          <h2 className="font-display font-extrabold text-base text-slate-900">
            AGENT EXECUTION & DISCOVERY PIPELINE
          </h2>
        </div>

        <div>
          {isRunning ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Step {currentStepIndex}/7 Running</span>
            </span>
          ) : steps.some((s) => s.status === 'completed') ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>COMPLETED</span>
            </span>
          ) : (
            <span className="text-xs font-semibold text-slate-400">Standby</span>
          )}
        </div>
      </div>

      {/* Metrics Bar */}
      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 rounded-2xl bg-blue-50/40 border border-blue-100/70 text-xs">
          <div className="px-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">
              Jobs Found
            </span>
            <span className="font-extrabold text-slate-800 text-sm">
              {metrics.jobsDiscovered}
            </span>
          </div>

          <div className="px-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">
              Analyzed
            </span>
            <span className="font-extrabold text-slate-800 text-sm">
              {metrics.jobsAnalyzed}
            </span>
          </div>

          <div className="px-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">
              Matches
            </span>
            <span className="font-extrabold text-emerald-700 text-sm">
              {metrics.jobsMatched}
            </span>
          </div>

          <div className="px-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">
              AI Profile
            </span>
            <span className="font-extrabold text-purple-700 text-sm">
              {metrics.aiProfile || selectedAiProfile}
            </span>
          </div>

          <div className="px-2 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">
              Duration
            </span>
            <span className="font-extrabold text-slate-700 text-sm font-mono">
              {(metrics.durationMs / 1000).toFixed(1)}s
            </span>
          </div>
        </div>
      )}

      {/* Steps Stepper List */}
      <div className="space-y-2.5">
        {steps.map((step) => {
          const isCurrent = isRunning && currentStepIndex === step.step;
          const isFinished = step.status === 'completed';

          return (
            <div
              key={step.step}
              className={`p-3 rounded-2xl border text-xs transition-all flex items-start gap-3 ${
                isFinished
                  ? 'bg-emerald-50/40 border-emerald-200/60 text-slate-800'
                  : isCurrent
                  ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-400/30 text-blue-900 shadow-2xs'
                  : 'bg-slate-50/40 border-slate-200/50 text-slate-500'
              }`}
            >
              {getStepIcon(step.status, isCurrent)}

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-bold text-xs ${isFinished ? 'text-slate-900' : isCurrent ? 'text-blue-900' : 'text-slate-600'}`}>
                    {step.title}
                  </span>
                  {step.timestamp && (
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {step.timestamp}
                    </span>
                  )}
                </div>

                {step.description && (
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
