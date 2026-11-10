import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, MessageSquare, Mic, Briefcase, FileText, ArrowRight } from 'lucide-react';
import { TronLogo } from '../common/TronLogo';
import { useApp } from '../../context/AppContext';

export const ClosingBrandStatement: React.FC = () => {
  const { t } = useApp();
  const navigate = useNavigate();
  const closing = t.about.closing;

  return (
    <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-white/95 via-blue-50/70 to-cyan-50/50 backdrop-blur-2xl border border-white/95 shadow-glass-card p-8 md:p-12 text-center transition-all">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <TronLogo size="md" showGlow />
        </div>

        {/* Brand Headline */}
        <div className="space-y-2">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight font-display">
            {closing.brand}
          </h2>
          <p className="text-base sm:text-xl font-bold bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 bg-clip-text text-transparent font-display">
            {closing.tagline}
          </p>
        </div>

        {/* Primary Motto Quote Box */}
        <div className="inline-block px-6 py-3 rounded-2xl bg-white/90 border border-blue-200 shadow-md">
          <p className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-display italic">
            &ldquo;{closing.motto}&rdquo;
          </p>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl mx-auto font-normal">
          {closing.description}
        </p>

        {/* Action CTAs */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate('/career/interview')}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 cursor-pointer"
          >
            <Briefcase className="w-4 h-4" />
            <span>{closing.ctaInterview}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>

          <button
            onClick={() => navigate('/chat')}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/90 hover:bg-white text-slate-800 hover:text-blue-600 font-semibold text-xs sm:text-sm border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>{closing.ctaChat}</span>
          </button>

          <button
            onClick={() => navigate('/voice')}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/90 hover:bg-white text-slate-800 hover:text-cyan-600 font-semibold text-xs sm:text-sm border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <Mic className="w-4 h-4 text-cyan-600" />
            <span>{closing.ctaVoice}</span>
          </button>

          <button
            onClick={() => navigate('/career/cv-builder')}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/90 hover:bg-white text-slate-800 hover:text-emerald-600 font-semibold text-xs sm:text-sm border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>{closing.ctaCv}</span>
          </button>
        </div>
      </div>
    </section>
  );
};
