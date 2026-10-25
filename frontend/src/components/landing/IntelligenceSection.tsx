import React from 'react';
import { Cpu, Cloud, Route, ShieldAlert, Check, Zap } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

export const IntelligenceSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section id="intelligence" className="py-20 sm:py-28 relative bg-gradient-to-b from-white via-blue-50/20 to-white" aria-label="TRON AI Intelligence Architecture">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.intelligence.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-slate-900 tracking-tight">
            {t.intelligence.title}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {t.intelligence.desc}
          </p>
        </div>

        {/* 3 Architecture Pillar Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          
          {/* Card 1: Local AI */}
          <div className="p-8 rounded-3xl bg-white/90 backdrop-blur-xl border border-cyan-200 shadow-md hover:shadow-xl transition-all text-left flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-slate-900">
                {t.intelligence.localAiTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t.intelligence.localAiDesc}
              </p>
              
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-4 h-4 text-cyan-500 shrink-0" />
                  <span>{t.intelligence.localAiBullet1}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-4 h-4 text-cyan-500 shrink-0" />
                  <span>{t.intelligence.localAiBullet2}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-4 h-4 text-cyan-500 shrink-0" />
                  <span>{t.intelligence.localAiBullet3}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-cyan-700">
              <span>ENGINE: qwen3:8b</span>
              <span className="font-bold">LOW LATENCY</span>
            </div>
          </div>

          {/* Card 2: Dynamic Hybrid Router */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-blue-900 via-slate-900 to-slate-950 text-white shadow-xl hover:shadow-2xl transition-all text-left flex flex-col justify-between border border-cyan-400/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-cyan-400/20 border border-cyan-300/40 flex items-center justify-center text-cyan-300">
                <Route className="w-6 h-6" />
              </div>
              <div className="inline-block px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                DYNAMIC ROUTER
              </div>
              <h3 className="text-xl font-bold font-heading text-white">
                {t.intelligence.hybridRoutingTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {t.intelligence.hybridRoutingDesc}
              </p>

              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-200">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{t.intelligence.hybridRoutingBullet1}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-200">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{t.intelligence.hybridRoutingBullet2}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-200">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{t.intelligence.hybridRoutingBullet3}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-cyan-300 relative z-10">
              <span>MODE: AUTO-DISPATCH</span>
              <span className="font-bold text-emerald-400">OPTIMAL</span>
            </div>
          </div>

          {/* Card 3: Cloud AI */}
          <div className="p-8 rounded-3xl bg-white/90 backdrop-blur-xl border border-blue-200 shadow-md hover:shadow-xl transition-all text-left flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Cloud className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading text-slate-900">
                {t.intelligence.cloudAiTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {t.intelligence.cloudAiDesc}
              </p>

              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{t.intelligence.cloudAiBullet1}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{t.intelligence.cloudAiBullet2}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Check className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>{t.intelligence.cloudAiBullet3}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-blue-700">
              <span>TIER: HIGH-THROUGHPUT</span>
              <span className="font-bold">MASSIVE SCALE</span>
            </div>
          </div>

        </div>

        {/* Disclaimer / Capability statement */}
        <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 flex items-center gap-3 text-xs text-slate-600 max-w-2xl mx-auto">
          <ShieldAlert className="w-5 h-5 text-slate-400 shrink-0" />
          <span>{t.intelligence.disclaimer}</span>
        </div>

      </div>
    </section>
  );
};
