import React from 'react';
import { Cpu, Globe2, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

export const AboutSection: React.FC = () => {
  const { t } = useTranslation();

  return (
    <section id="about" className="py-20 sm:py-28 relative bg-white" aria-label="About TRON AI">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.about.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-slate-900 tracking-tight">
            {t.about.title}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {t.about.desc}
          </p>
        </div>

        {/* 3 Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 text-left">
          
          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-heading text-slate-900">
              {t.about.pillar1Title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t.about.pillar1Desc}
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 flex items-center justify-center text-cyan-600">
              <Globe2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-heading text-slate-900">
              {t.about.pillar2Title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t.about.pillar2Desc}
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-heading text-slate-900">
              {t.about.pillar3Title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t.about.pillar3Desc}
            </p>
          </div>

        </div>

        {/* Platform Overview Banner */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-50/80 via-cyan-50/40 to-blue-50/60 border border-blue-200 text-left">
          <div className="max-w-3xl space-y-3">
            <h3 className="text-xl font-bold font-heading text-slate-900">
              {t.about.platformOverviewTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t.about.platformOverviewDesc}
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};
