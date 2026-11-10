import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, MessageSquare, Mic, Briefcase, FileText, Sparkles, Globe2, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AboutHero: React.FC = () => {
  const { t } = useApp();
  const navigate = useNavigate();
  const about = t.about;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-white/80 backdrop-blur-2xl border border-white/95 shadow-glass-card p-6 md:p-10 lg:p-12 transition-all duration-300">
      {/* Ambient background glows */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-400/20 via-blue-500/15 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-tr from-blue-600/10 via-cyan-300/10 to-transparent blur-2xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        {/* Left Column: Headlines, Description, Inclusivity & Capability Pills */}
        <div className="lg:col-span-7 space-y-6">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 border border-blue-200/80 text-blue-700 text-xs font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span className="tracking-wide uppercase">{about.badge}</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 font-display tracking-tight leading-[1.15]">
              {about.title}{' '}
              <span className="block mt-1 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 bg-clip-text text-transparent">
                {about.titleHighlight}
              </span>
            </h1>
            <p className="text-base sm:text-lg font-semibold text-blue-600/90 font-display">
              {about.subtitle}
            </p>
          </div>

          {/* Professional Description */}
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl font-normal">
            {about.description}
          </p>

          {/* Inclusivity Callout Banner */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-50/80 to-cyan-50/80 border border-blue-100 text-slate-700 text-xs font-medium shadow-xs">
            <Globe2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{about.inclusivityNote}</span>
          </div>

          {/* 4 Core Capability Quick Pills */}
          <div className="pt-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Core Capabilities
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              {/* AI Chat */}
              <button
                onClick={() => navigate('/chat')}
                className="group p-3 rounded-2xl bg-white/90 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-400/50 shadow-xs hover:shadow-md transition-all duration-200 text-left cursor-pointer"
                title={about.capabilities.chat.desc}
              >
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs text-slate-900 group-hover:text-blue-600">
                    {about.capabilities.chat.title}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-1">
                  {about.capabilities.chat.badge}
                </div>
              </button>

              {/* AI Voice */}
              <button
                onClick={() => navigate('/voice')}
                className="group p-3 rounded-2xl bg-white/90 hover:bg-cyan-50/80 border border-slate-200/80 hover:border-cyan-400/50 shadow-xs hover:shadow-md transition-all duration-200 text-left cursor-pointer"
                title={about.capabilities.voice.desc}
              >
                <div className="flex items-center gap-2 text-cyan-600 mb-1">
                  <Mic className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs text-slate-900 group-hover:text-cyan-600">
                    {about.capabilities.voice.title}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-1">
                  {about.capabilities.voice.badge}
                </div>
              </button>

              {/* Interview Practice */}
              <button
                onClick={() => navigate('/career/interview')}
                className="group p-3 rounded-2xl bg-white/90 hover:bg-indigo-50/80 border border-slate-200/80 hover:border-indigo-400/50 shadow-xs hover:shadow-md transition-all duration-200 text-left cursor-pointer"
                title={about.capabilities.interview.desc}
              >
                <div className="flex items-center gap-2 text-indigo-600 mb-1">
                  <Briefcase className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-600">
                    {about.capabilities.interview.title}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-1">
                  {about.capabilities.interview.badge}
                </div>
              </button>

              {/* Create CV */}
              <button
                onClick={() => navigate('/career/cv-builder')}
                className="group p-3 rounded-2xl bg-white/90 hover:bg-emerald-50/80 border border-slate-200/80 hover:border-emerald-400/50 shadow-xs hover:shadow-md transition-all duration-200 text-left cursor-pointer"
                title={about.capabilities.cv.desc}
              >
                <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-xs text-slate-900 group-hover:text-emerald-600">
                    {about.capabilities.cv.title}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-1">
                  {about.capabilities.cv.badge}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Premium Hero Visual Artwork (matching Image 1) */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end">
          <div className="relative w-full max-w-md lg:max-w-none rounded-3xl overflow-hidden border border-white/80 shadow-2xl bg-gradient-to-br from-blue-900/10 via-sky-800/10 to-slate-900/15 p-2 backdrop-blur-md group">
            {/* Inner Frame */}
            <div className="relative rounded-2xl overflow-hidden aspect-[16/10] sm:aspect-[16/9] lg:aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-[#0c1f42] via-[#09224c] to-[#04112c]">
              {/* Background Mt Fuji & Chamber Art */}
              <img
                src="/images/about-hero-art.webp"
                alt="TRON AI Robot with Holographic Earth and Mount Fuji"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                onError={(e) => {
                  // Fallback to existing high-res asset if webp is missing
                  (e.currentTarget as HTMLImageElement).src = '/images/assets/tron-hero-bg.jpg';
                }}
              />

              {/* Atmospheric Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#05132d]/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/20 rounded-2xl pointer-events-none" />

              {/* Status Badge in bottom corner */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/70 backdrop-blur-md border border-cyan-400/30 text-cyan-300 text-[11px] font-mono font-medium">
                  <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
                  <span>TRON Core Intelligence</span>
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-950/60 backdrop-blur-md border border-blue-400/20 text-blue-200 text-[10px] font-mono">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  <span>Production Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
