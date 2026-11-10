import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Shield, Code, Monitor, Database, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TeamSection: React.FC = () => {
  const { t } = useApp();
  const team = t.about.team;
  const members = team.members;

  // Track which card has responsibilities expanded (default: first or none)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const teamCards = [
    {
      id: 'thushan',
      data: members.thushan,
      image: '/images/team/thushan-rathnayaka.webp',
      alt: 'Thushan Rathnayaka — System Architect & Lead Engineer at TRON AI',
      letter: 'T',
      icon: Shield,
      badgeColor: 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-blue-500/25',
      letterColor: 'bg-blue-500/10 text-blue-600 border-blue-200',
      accentGlow: 'hover:border-blue-400/50 hover:shadow-blue-500/10',
      topLine: 'from-blue-600 to-cyan-500',
    },
    {
      id: 'rakib',
      data: members.rakib,
      image: '/images/team/md-rakib-hossain.webp',
      alt: 'Md Rakib Hossain — Frontend Developer at TRON AI',
      letter: 'R',
      icon: Code,
      badgeColor: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-500/25',
      letterColor: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
      accentGlow: 'hover:border-indigo-400/50 hover:shadow-indigo-500/10',
      topLine: 'from-indigo-600 to-purple-500',
    },
    {
      id: 'minhaj',
      data: members.minhaj,
      image: '/images/team/minhaj-hossain-opu.webp',
      alt: 'Minhaj Hossain Opu — Desktop Application Developer at TRON AI',
      letter: 'O',
      icon: Monitor,
      badgeColor: 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-fuchsia-500/25',
      letterColor: 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-200',
      accentGlow: 'hover:border-fuchsia-400/50 hover:shadow-fuchsia-500/10',
      topLine: 'from-fuchsia-600 to-pink-500',
    },
    {
      id: 'nayem',
      data: members.nayem,
      image: '/images/team/md-nayem.png',
      alt: 'Md Nayem — Backend Developer at TRON AI',
      letter: 'N',
      icon: Database,
      badgeColor: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-amber-500/25',
      letterColor: 'bg-amber-500/10 text-amber-600 border-amber-200',
      accentGlow: 'hover:border-amber-400/50 hover:shadow-amber-500/10',
      topLine: 'from-amber-600 to-orange-500',
    },
  ];

  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/70 pb-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
            <span className="w-4 h-0.5 bg-blue-600 rounded-full" />
            <span>{team.badge}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
            {team.title}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md font-medium">
          {team.subtitle}
        </p>
      </div>

      {/* 4 Team Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {teamCards.map((card) => {
          const isExpanded = expandedId === card.id;
          const Icon = card.icon;

          return (
            <div
              key={card.id}
              className={`relative rounded-3xl bg-white/90 backdrop-blur-xl border border-white/95 shadow-glass-card overflow-hidden transition-all duration-300 flex flex-col hover:-translate-y-1.5 hover:shadow-glass-pop ${card.accentGlow}`}
            >
              {/* Colored top hairline accent */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${card.topLine}`} />

              <div className="p-5 sm:p-6 flex flex-col flex-1 space-y-4">
                {/* Team Member Photograph Container */}
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-inner group">
                  <img
                    src={card.image}
                    alt={card.alt}
                    loading="lazy"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      console.error(`Failed to load team member photo: ${card.image}`);
                    }}
                  />

                  {/* Gradient corner reflection */}
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-2xl pointer-events-none" />

                  {/* Floating TRON Letter Badge */}
                  <div
                    className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-xl backdrop-blur-md border flex items-center justify-center font-display font-black text-sm shadow-sm ${card.letterColor}`}
                  >
                    {card.letter}
                  </div>
                </div>

                {/* Name & Role */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-display leading-tight">
                      {card.data.name}
                    </h3>
                  </div>

                  {/* Role Pill Badge (matching Image 1 color schemes) */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shadow-xs leading-none max-w-full">
                    <span className={`px-2.5 py-1 rounded-full ${card.badgeColor} text-[11px] font-semibold tracking-wide truncate`}>
                      {card.data.role}
                    </span>
                  </div>
                </div>

                {/* Professional Description */}
                <p className="text-xs text-slate-600 leading-relaxed font-normal flex-1">
                  {card.data.bio}
                </p>

                {/* Expandable Key Responsibilities */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => toggleExpand(card.id)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors py-1 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{team.responsibilitiesLabel}</span>
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <ul className="mt-2.5 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      {card.data.responsibilities.map((resp, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-1.5 text-[11px] text-slate-600 leading-tight"
                        >
                          <CheckCircle2 className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
