import React from 'react';
import { Users, User, MessageSquare, Star, Zap } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

export const StatsRibbon: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="relative py-4 bg-white/75 backdrop-blur-md border-y border-slate-200/70" aria-label="TRON AI Verified Information Bar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 sm:gap-2 text-xs text-slate-700">
          
          {/* Item 1: Global Trust */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-900 text-xs">
              {t.stats.trustedBy}
            </span>
          </div>

          <div className="hidden lg:block h-6 w-[1px] bg-slate-200" />

          {/* Item 2: Active Engineers */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <User className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-slate-950 text-sm font-heading">10K+</span>
              <span className="text-slate-500 text-xs">{t.stats.engineers}</span>
            </div>
          </div>

          <div className="hidden lg:block h-6 w-[1px] bg-slate-200" />

          {/* Item 3: AI Interactions */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-slate-950 text-sm font-heading">50K+</span>
              <span className="text-slate-500 text-xs">{t.stats.conversations}</span>
            </div>
          </div>

          <div className="hidden lg:block h-6 w-[1px] bg-slate-200" />

          {/* Item 4: Success Rate */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Star className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-slate-950 text-sm font-heading">95%</span>
              <span className="text-slate-500 text-xs">{t.stats.passRate}</span>
            </div>
          </div>

          <div className="hidden lg:block h-6 w-[1px] bg-slate-200" />

          {/* Item 5: Real-time support */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Zap className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-slate-950 text-sm font-heading">24/7</span>
              <span className="text-slate-500 text-xs">{t.stats.support}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
