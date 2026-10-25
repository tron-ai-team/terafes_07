import React from 'react';
import { MessageSquare, Mic, User, Code, Briefcase, ArrowUpRight } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface FloatingCardProps {
  featureId: 'chat' | 'voice' | 'interview' | 'coding' | 'career';
  onClick: () => void;
  className?: string;
}

export const FloatingCard: React.FC<FloatingCardProps> = ({
  featureId,
  onClick,
  className = '',
}) => {
  const { t } = useTranslation();

  if (featureId === 'chat') {
    return (
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
        className={`glass-panel glass-panel-interactive cursor-pointer rounded-2xl p-4 w-[240px] text-left shadow-[0_8px_25px_rgba(0,102,255,0.08)] border border-white/80 hover:border-cyan-300 transition-all select-none ${className}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
              <MessageSquare className="w-4 h-4 fill-white" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 font-heading">{t.features.chat.title}</h4>
          </div>
          <ArrowUpRight className="w-4 h-4 text-cyan-500" />
        </div>
        <p className="text-[11px] text-slate-500 leading-tight">
          {t.features.chat.shortDesc}
        </p>
      </div>
    );
  }

  if (featureId === 'voice') {
    return (
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
        className={`glass-panel glass-panel-interactive cursor-pointer rounded-2xl p-4 w-[250px] text-left shadow-[0_8px_25px_rgba(0,102,255,0.08)] border border-white/80 hover:border-cyan-300 transition-all select-none ${className}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white shadow-md shadow-cyan-500/25 shrink-0">
              <Mic className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 font-heading">{t.features.voice.title}</h4>
          </div>
          <ArrowUpRight className="w-4 h-4 text-cyan-500" />
        </div>

        {/* Animated Audio Equalizer Waveform */}
        <div className="h-6 flex items-center justify-center gap-1 my-1.5 px-2">
          <span className="w-0.5 h-2 bg-cyan-400 rounded-full animate-pulse" />
          <span className="w-0.5 h-4 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
          <span className="w-0.5 h-6 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
          <span className="w-0.5 h-3 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
          <span className="w-0.5 h-5 bg-cyan-600 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
          <span className="w-0.5 h-7 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.25s' }} />
          <span className="w-0.5 h-4 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0.05s' }} />
          <span className="w-0.5 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.35s' }} />
          <span className="w-0.5 h-5 bg-cyan-500 rounded-full animate-pulse" style={{ animationDelay: '0.18s' }} />
          <span className="w-0.5 h-3 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.28s' }} />
        </div>

        <p className="text-[11px] text-slate-500 leading-tight">
          {t.features.voice.shortDesc}
        </p>
      </div>
    );
  }

  if (featureId === 'coding') {
    return (
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
        className={`glass-panel glass-panel-interactive cursor-pointer rounded-2xl p-4 w-[240px] text-left shadow-[0_8px_25px_rgba(0,102,255,0.08)] border border-white/80 hover:border-cyan-300 transition-all select-none ${className}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500 flex items-center justify-center text-white shadow-md shadow-teal-500/25 shrink-0">
              <Code className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 font-heading">{t.features.coding.title}</h4>
          </div>
          <ArrowUpRight className="w-4 h-4 text-cyan-500" />
        </div>
        <p className="text-[11px] text-slate-500 leading-tight">
          {t.features.coding.shortDesc}
        </p>
      </div>
    );
  }

  if (featureId === 'interview') {
    return (
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
        className={`glass-panel glass-panel-interactive cursor-pointer rounded-2xl p-4 w-[250px] text-left shadow-[0_8px_25px_rgba(0,102,255,0.08)] border border-white/80 hover:border-cyan-300 transition-all select-none ${className}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 font-heading">{t.features.interview.title}</h4>
          </div>
          <ArrowUpRight className="w-4 h-4 text-cyan-500" />
        </div>

        <div className="flex items-center justify-between gap-2 my-1.5">
          {/* Audio soundwave indicator */}
          <div className="flex items-center gap-1 flex-1">
            <span className="w-0.5 h-2 bg-blue-400 rounded-full" />
            <span className="w-0.5 h-4 bg-cyan-500 rounded-full" />
            <span className="w-0.5 h-6 bg-blue-600 rounded-full" />
            <span className="w-0.5 h-3 bg-blue-400 rounded-full" />
            <span className="w-0.5 h-5 bg-cyan-500 rounded-full" />
            <span className="w-0.5 h-2 bg-blue-400 rounded-full" />
          </div>

          {/* Japanese Interview Candidate Avatar */}
          <div className="w-9 h-9 rounded-full overflow-hidden border border-blue-200 shadow-sm shrink-0">
            <img 
              src="/images/assets/candidate-avatar.png" 
              alt="Interview Candidate" 
              className="w-full h-full object-cover" 
            />
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-tight">
          {t.features.interview.shortDesc}
        </p>
      </div>
    );
  }

  if (featureId === 'career') {
    return (
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
        className={`glass-panel glass-panel-interactive cursor-pointer rounded-2xl p-4 w-[250px] text-left shadow-[0_8px_25px_rgba(0,102,255,0.08)] border border-white/80 hover:border-cyan-300 transition-all select-none ${className}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-500/25 shrink-0">
              <Briefcase className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 font-heading">{t.features.career.title}</h4>
          </div>
          <ArrowUpRight className="w-4 h-4 text-cyan-500" />
        </div>

        <div className="flex items-center justify-between gap-3 my-1">
          <p className="text-[11px] text-slate-500 leading-tight flex-1">
            {t.features.career.shortDesc}
          </p>
          <div className="w-10 h-9 shrink-0">
            <img 
              src="/images/assets/career-chart.png" 
              alt="Career Growth Analytics" 
              className="w-full h-full object-contain" 
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
};
