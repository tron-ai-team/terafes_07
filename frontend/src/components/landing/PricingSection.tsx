import React from 'react';
import { Check, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

interface PricingSectionProps {
  onGetStarted: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onGetStarted }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <section id="pricing" className="py-20 sm:py-28 relative bg-gradient-to-b from-white via-slate-50/50 to-white" aria-label="TRON AI Pricing Plans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>{t.pricing.badge}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-slate-900 tracking-tight">
            {t.pricing.title}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {t.pricing.desc}
          </p>
        </div>

        {/* Transparent 'Plans Coming Soon' Notice */}
        <div className="mb-12 max-w-3xl mx-auto p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80 flex items-start gap-3 text-xs text-blue-950 text-left">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">{t.pricing.plansComingSoon}</span>
            <p className="leading-relaxed text-blue-900/80">{t.pricing.plansComingSoonDesc}</p>
          </div>
        </div>

        {/* 3 Tier Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left items-stretch">
          
          {/* Free Tier */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold font-heading text-slate-900">{t.pricing.freeTierName}</h3>
                <p className="text-xs text-slate-500 mt-1">{t.pricing.freeTierDesc}</p>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold font-heading text-slate-900">{t.pricing.freeTierPrice}</span>
                <span className="text-xs text-slate-400">/ {t.pricing.freeTierPeriod}</span>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Full access to AI Chat with Markdown export</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Real-time Voice Mode simulation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Community Japanese interview practice questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Local on-device inference support</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <button
                onClick={onGetStarted}
                className="w-full py-3 rounded-2xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <span>{t.pricing.getStartedFree}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Pro Tier (Featured) */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-blue-900 via-slate-900 to-slate-950 text-white border-2 border-cyan-400 shadow-xl hover:shadow-2xl transition-all flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-bl-2xl">
              COMING SOON
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold font-heading text-white">{t.pricing.proTierName}</h3>
                <p className="text-xs text-slate-300 mt-1">{t.pricing.proTierDesc}</p>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold font-heading text-white">{t.pricing.proTierPrice}</span>
                <span className="text-xs text-slate-400">/ {t.pricing.proTierPeriod}</span>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-white/10 text-xs text-slate-200">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Unlimited Japanese interview rooms & STAR scoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Desktop Coding Agent pairing & automated builds</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Deep CV parsing & Japanese market compensation analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Daily Ultra Pro Max credits for high-capacity reasoning</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <button
                onClick={onGetStarted}
                className="w-full py-3 rounded-2xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 shadow-lg shadow-cyan-400/25 transition-all flex items-center justify-center gap-2"
              >
                <span>{t.pricing.joinWaitlist}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Enterprise Tier */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold font-heading text-slate-900">{t.pricing.enterpriseTierName}</h3>
                <p className="text-xs text-slate-500 mt-1">{t.pricing.enterpriseTierDesc}</p>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold font-heading text-slate-900">{t.pricing.enterpriseTierPrice}</span>
                <span className="text-xs text-slate-400">/ {t.pricing.enterpriseTierPeriod}</span>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Dedicated corporate TRON Gateway instance</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Custom interview rubric benchmarks & question authoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Self-hosted on-premises server deployment support</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Priority engineering SLA & dedicated support</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <button
                onClick={() => navigate('/help')}
                className="w-full py-3 rounded-2xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <span>{t.pricing.contactUs}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
