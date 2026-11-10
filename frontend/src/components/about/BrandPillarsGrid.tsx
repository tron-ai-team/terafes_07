import React, { useState } from 'react';
import { Target, Compass, Sparkles, Rocket, Quote, ArrowUpRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const BrandPillarsGrid: React.FC = () => {
  const { t } = useApp();
  const about = t.about;
  const tronInfo = about.meaningOfTron;
  const mission = about.mission;
  const vision = about.vision;

  const [activeLetter, setActiveLetter] = useState<'t' | 'r' | 'o' | 'n'>('t');

  const letterData = [
    {
      key: 't' as const,
      letter: tronInfo.letters.t.letter,
      name: 'Thushan',
      fullName: tronInfo.letters.t.name,
      role: tronInfo.letters.t.role,
      strength: tronInfo.letters.t.strength,
      color: 'from-blue-600 to-cyan-500',
      activeBorder: 'border-blue-500 shadow-blue-500/20',
      bgGlow: 'bg-blue-500/10 text-blue-600',
    },
    {
      key: 'r' as const,
      letter: tronInfo.letters.r.letter,
      name: 'Rakib',
      fullName: tronInfo.letters.r.name,
      role: tronInfo.letters.r.role,
      strength: tronInfo.letters.r.strength,
      color: 'from-indigo-600 to-blue-500',
      activeBorder: 'border-indigo-500 shadow-indigo-500/20',
      bgGlow: 'bg-indigo-500/10 text-indigo-600',
    },
    {
      key: 'o' as const,
      letter: tronInfo.letters.o.letter,
      name: 'Opu',
      fullName: tronInfo.letters.o.name,
      role: tronInfo.letters.o.role,
      strength: tronInfo.letters.o.strength,
      color: 'from-fuchsia-600 to-pink-500',
      activeBorder: 'border-fuchsia-500 shadow-fuchsia-500/20',
      bgGlow: 'bg-fuchsia-500/10 text-fuchsia-600',
    },
    {
      key: 'n' as const,
      letter: tronInfo.letters.n.letter,
      name: 'Nayam',
      fullName: tronInfo.letters.n.name,
      role: tronInfo.letters.n.role,
      strength: tronInfo.letters.n.strength,
      color: 'from-amber-600 to-orange-500',
      activeBorder: 'border-amber-500 shadow-amber-500/20',
      bgGlow: 'bg-amber-500/10 text-amber-600',
    },
  ];

  const currentMember = letterData.find((l) => l.key === activeLetter)!;

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* ─── CARD 1: THE MEANING OF TRON ─── */}
      <div className="relative rounded-3xl bg-white/85 backdrop-blur-xl border border-white/95 shadow-glass-card p-6 md:p-7 flex flex-col justify-between hover:shadow-glass-pop hover:border-blue-400/30 transition-all duration-300">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <span className="text-xl font-black font-display tracking-tight bg-gradient-to-r from-blue-700 to-cyan-500 bg-clip-text text-transparent">
              TRON
            </span>
            <span className="text-slate-300 font-light">|</span>
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">
              {tronInfo.title}
            </h2>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {tronInfo.description}
          </p>

          {/* 4 Interactive Letter Identity Display */}
          <div className="pt-2">
            <div className="grid grid-cols-4 gap-2.5">
              {letterData.map((item) => {
                const isActive = activeLetter === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveLetter(item.key)}
                    onMouseEnter={() => setActiveLetter(item.key)}
                    className={`flex flex-col items-center justify-center py-3 px-1 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      isActive
                        ? `bg-blue-50/90 ${item.activeBorder} shadow-md -translate-y-0.5`
                        : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-blue-300/60'
                    }`}
                  >
                    <span
                      className={`text-2xl font-black font-display ${
                        isActive
                          ? `bg-gradient-to-br ${item.color} bg-clip-text text-transparent`
                          : 'text-slate-700'
                      }`}
                    >
                      {item.letter}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 mt-0.5 truncate max-w-full">
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Active Letter Preview Callout */}
            <div className="mt-3.5 p-3 rounded-2xl bg-gradient-to-br from-blue-50/70 to-cyan-50/50 border border-blue-100/80 text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-1.5 py-0.5 rounded-md font-mono font-bold text-[10px] ${currentMember.bgGlow}`}>
                  {currentMember.letter}
                </span>
                <span className="font-bold text-slate-900 truncate">
                  {currentMember.fullName}
                </span>
              </div>
              <div className="text-[11px] font-medium text-blue-600 mb-0.5">
                {currentMember.role}
              </div>
              <div className="text-[11px] text-slate-600 leading-snug">
                {currentMember.strength}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>{tronInfo.motto}</span>
          <span className="font-mono text-blue-500 font-semibold">T • R • O • N</span>
        </div>
      </div>

      {/* ─── CARD 2: OUR MISSION ─── */}
      <div className="relative rounded-3xl bg-white/85 backdrop-blur-xl border border-white/95 shadow-glass-card p-6 md:p-7 flex flex-col justify-between hover:shadow-glass-pop hover:border-blue-400/30 transition-all duration-300">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/15 to-cyan-500/20 text-blue-600 flex items-center justify-center border border-blue-200/60 shadow-xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight font-display">
                {mission.title}
              </h2>
              <p className="text-[11px] font-medium text-blue-600">
                {mission.heading}
              </p>
            </div>
          </div>

          {/* Main Mission Text */}
          <p className="text-xs text-slate-600 leading-relaxed">
            {mission.description}
          </p>

          {/* Highlight Callout Quote */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-transparent border-l-4 border-blue-500 text-xs font-semibold text-slate-800 italic">
            &ldquo;{mission.quote}&rdquo;
          </div>

          {/* Core Principles Chips */}
          <div className="pt-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Core Principles
            </div>
            <div className="flex flex-wrap gap-1.5">
              {mission.principles.map((principle, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/70 text-[11px] text-slate-700 font-medium hover:bg-blue-50 hover:border-blue-200 transition-colors"
                >
                  {principle}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-blue-600 font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real preparation for real career moments</span>
        </div>
      </div>

      {/* ─── CARD 3: OUR VISION ─── */}
      <div className="relative rounded-3xl bg-white/85 backdrop-blur-xl border border-white/95 shadow-glass-card p-6 md:p-7 flex flex-col justify-between hover:shadow-glass-pop hover:border-blue-400/30 transition-all duration-300 md:col-span-2 lg:col-span-1">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/15 to-blue-500/20 text-cyan-600 flex items-center justify-center border border-cyan-200/60 shadow-xs">
              <Rocket className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight font-display">
                {vision.title}
              </h2>
              <p className="text-[11px] font-mono text-cyan-600">
                Persistence & Growth
              </p>
            </div>
          </div>

          {/* Primary Statement in Bold Quote */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-md">
            <div className="flex items-start gap-2">
              <Quote className="w-4 h-4 text-cyan-200 shrink-0 mt-0.5" />
              <div className="font-extrabold text-sm sm:text-base leading-snug tracking-tight font-display">
                {vision.quote}
              </div>
            </div>
          </div>

          {/* Vision Story */}
          <p className="text-xs text-slate-600 leading-relaxed">
            {vision.story}
          </p>

          {/* Vision Commitments */}
          <div className="pt-1">
            <div className="grid grid-cols-2 gap-1.5">
              {vision.principles.map((item, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1.5 rounded-xl bg-cyan-50/60 border border-cyan-100 text-[11px] text-cyan-900 font-medium truncate"
                >
                  • {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Technology with purpose</span>
          <span className="font-semibold text-blue-600">Never Give Up</span>
        </div>
      </div>
    </section>
  );
};
