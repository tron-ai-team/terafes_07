import React from 'react';
import { TronLogo } from '../components/common/TronLogo';
import { GlassCard } from '../components/common/GlassCard';
import { ShieldCheck, Cpu, Globe2, Sparkles } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 select-none py-2">
      <div className="text-center space-y-3">
        <TronLogo size="hero" showGlow className="mx-auto" />
        <h1 className="font-display text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
          ABOUT TRON AI
        </h1>
        <p className="text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          The next-generation Japanese AI interview simulation platform engineered for global bilingual engineers and professionals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
        <GlassCard className="p-6 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-slate-800">Advanced AI Evaluation</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Multimodal evaluation analyzing Japanese language fluency, keigo respect levels, and engineering depth.
          </p>
        </GlassCard>

        <GlassCard className="p-6 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
            <Globe2 className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-slate-800">Targeted Japanese Market</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tailored specifically for interviews at top Japanese tech enterprises, mega-ventures, and research institutions.
          </p>
        </GlassCard>

        <GlassCard className="p-6 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-base text-slate-800">Privacy & Confidentiality</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your CV and speech recordings are encrypted and processed with zero training retention.
          </p>
        </GlassCard>
      </div>
    </div>
  );
};
