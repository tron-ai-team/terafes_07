import React from 'react';
import { Layers, TrendingUp, ShieldCheck, Users, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TrustRibbon: React.FC = () => {
  const { t } = useApp();
  const trust = t.about.trustBar;

  return (
    <section className="rounded-2xl bg-white/80 backdrop-blur-xl border border-white/95 shadow-sm p-3 sm:p-4 transition-all duration-200">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700 font-medium">
        {/* Item 1 */}
        <div className="flex items-center gap-2 hover:text-blue-600 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <span className="font-semibold text-slate-800 text-[12px]">{trust.realPractice}</span>
        </div>

        <div className="hidden lg:block w-px h-5 bg-slate-200" />

        {/* Item 2 */}
        <div className="flex items-center gap-2 hover:text-blue-600 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="font-semibold text-slate-800 text-[12px]">{trust.jobSkills}</span>
        </div>

        <div className="hidden lg:block w-px h-5 bg-slate-200" />

        {/* Item 3 */}
        <div className="flex items-center gap-2 hover:text-blue-600 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-semibold text-slate-800 text-[12px]">{trust.practicalAi}</span>
        </div>

        <div className="hidden lg:block w-px h-5 bg-slate-200" />

        {/* Item 4 */}
        <div className="flex items-center gap-2 hover:text-blue-600 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <span className="font-semibold text-slate-800 text-[12px]">{trust.forEveryone}</span>
        </div>

        {/* Right Gradient Highlight Pill */}
        <div className="ml-auto w-full sm:w-auto mt-2 sm:mt-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs shadow-md shadow-blue-500/20">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>{trust.confidencePill}</span>
        </div>
      </div>
    </section>
  );
};
