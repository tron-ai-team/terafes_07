import React from 'react';
import { MousePointerClick, MessageSquareCode, Award, ArrowRight, Sparkles } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

export const HowItWorksSection: React.FC = () => {
  const { t } = useTranslation();

  const steps = [
    {
      num: '01',
      title: t.howItWorks.step1Title,
      desc: t.howItWorks.step1Desc,
      icon: <MousePointerClick className="w-6 h-6 text-blue-600" />,
      color: 'from-blue-600/10 to-blue-600/5',
      borderColor: 'border-blue-200',
      pill: 'Step 1 // Select',
    },
    {
      num: '02',
      title: t.howItWorks.step2Title,
      desc: t.howItWorks.step2Desc,
      icon: <MessageSquareCode className="w-6 h-6 text-cyan-600" />,
      color: 'from-cyan-500/10 to-blue-500/5',
      borderColor: 'border-cyan-200',
      pill: 'Step 2 // Engage',
    },
    {
      num: '03',
      title: t.howItWorks.step3Title,
      desc: t.howItWorks.step3Desc,
      icon: <Award className="w-6 h-6 text-indigo-600" />,
      color: 'from-indigo-500/10 to-purple-500/5',
      borderColor: 'border-indigo-200',
      pill: 'Step 3 // Accelerate',
    },
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-24 relative overflow-hidden bg-white" aria-label="How TRON AI Works">
      {/* Background decorations */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-blue-100/30 via-cyan-100/20 to-transparent blur-[90px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-xs font-bold text-cyan-700 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
            <span>{t.howItWorks.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-slate-900 tracking-tight">
            {t.howItWorks.title}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {t.howItWorks.subtitle}
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector Line on Desktop */}
          <div className="hidden md:block absolute top-1/2 left-12 right-12 h-0.5 bg-gradient-to-r from-blue-300 via-cyan-300 to-indigo-300 -translate-y-12 z-0 opacity-60" />

          {steps.map((step, index) => (
            <div
              key={step.num}
              className={`relative z-10 p-8 rounded-3xl bg-white/80 backdrop-blur-xl border ${step.borderColor} shadow-[0_10px_35px_rgba(0,102,255,0.06)] hover:shadow-[0_18px_45px_rgba(0,180,255,0.16)] transition-all duration-300 transform hover:-translate-y-2 text-left flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} border border-white flex items-center justify-center shadow-sm`}>
                    {step.icon}
                  </div>
                  <span className="text-3xl font-extrabold font-heading text-slate-200">
                    {step.num}
                  </span>
                </div>

                <div className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-slate-100 text-slate-600 mb-3">
                  {step.pill}
                </div>

                <h3 className="text-lg font-bold font-heading text-slate-900 mb-2">
                  {step.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1 text-xs font-semibold text-blue-600">
                <span>Phase {index + 1} Pipeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
