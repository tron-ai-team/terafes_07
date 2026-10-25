import React from 'react';
import { Cpu, Zap, Cloud, Sparkles, Check, Server, Shield } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { AI_MODES, ADVANCED_PROVIDERS } from '../../config/aiModes';

export const AiModelsSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section id="models" className="py-20 sm:py-28 relative bg-white" aria-label="TRON AI Supported Models">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 uppercase tracking-wider">
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.aiModels.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-slate-900 tracking-tight">
            {t.aiModels.title}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {t.aiModels.desc}
          </p>
        </div>

        {/* 4 Core AI Operating Modes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          
          {/* AUTO */}
          <div className="p-6 rounded-3xl bg-slate-50/70 border border-slate-200 hover:border-blue-300 shadow-sm transition-all text-left flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100/60 flex items-center justify-center text-blue-700">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-heading text-slate-900">
                {t.aiModels.autoTitle}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.aiModels.autoDesc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono text-blue-700">
              <span>{AI_MODES.AUTO.badgeText}</span>
              <span className="font-bold">DYNAMIC</span>
            </div>
          </div>

          {/* FAST */}
          <div className="p-6 rounded-3xl bg-cyan-50/40 border border-cyan-200 hover:border-cyan-400 shadow-sm transition-all text-left flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-100 flex items-center justify-center text-cyan-700">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-heading text-slate-900">
                {t.aiModels.fastTitle}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.aiModels.fastDesc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-cyan-200/80 flex items-center justify-between text-[11px] font-mono text-cyan-800">
              <span>{AI_MODES.FAST.model}</span>
              <span className="font-bold">&lt; 15ms</span>
            </div>
          </div>

          {/* SMART */}
          <div className="p-6 rounded-3xl bg-blue-50/40 border border-blue-200 hover:border-blue-400 shadow-sm transition-all text-left flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-heading text-slate-900">
                {t.aiModels.smartTitle}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.aiModels.smartDesc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-blue-200/80 flex items-center justify-between text-[11px] font-mono text-blue-800">
              <span>{AI_MODES.SMART.provider}</span>
              <span className="font-bold">BALANCED</span>
            </div>
          </div>

          {/* ULTRA */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-indigo-900 to-slate-900 text-white border border-indigo-500/30 shadow-md transition-all text-left flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-300">
                <Cloud className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold font-heading text-white">
                {t.aiModels.ultraTitle}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t.aiModels.ultraDesc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-indigo-300">
              <span>HIGH REASONING</span>
              <span className="font-bold text-cyan-300">PREMIUM</span>
            </div>
          </div>

        </div>

        {/* Real Configured Inference Providers List */}
        <div className="rounded-3xl bg-slate-50 border border-slate-200 p-8 text-left space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold font-heading text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600" />
              <span>{t.aiModels.configuredProviders}</span>
            </h3>
            <span className="text-xs font-mono text-slate-500">
              SPRING BOOT CORE GATEWAY
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ADVANCED_PROVIDERS.filter((p) => p.status === 'Available').map((p) => (
              <div key={p.id} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">{p.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    {p.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{p.description}</p>
                <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{p.endpoint}</span>
                  <span>{p.latency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
