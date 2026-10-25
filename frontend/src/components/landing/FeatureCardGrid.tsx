import React, { useState } from 'react';
import { MessageSquare, Mic, FileText, Code, Briefcase, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FeatureCardItem } from '../../types/landing';
import { LandingFeatureModal } from './LandingFeatureModal';
import { useTranslation } from '../../hooks/useTranslation';

export const FeatureCardGrid: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [selectedFeature, setSelectedFeature] = useState<FeatureCardItem | null>(null);

  const features: FeatureCardItem[] = [
    {
      id: 'chat',
      title: t.features.chat.title,
      shortDesc: t.features.chat.shortDesc,
      fullDesc: t.features.chat.fullDesc,
      badge: t.features.chat.badge,
      image: '/images/features/chat.png',
      accentColor: '#2563eb',
      gradient: 'from-blue-500/10 via-cyan-500/5 to-transparent',
      routePath: '/chat',
      keyFeatures: t.features.chat.keyFeatures,
    },
    {
      id: 'voice',
      title: t.features.voice.title,
      shortDesc: t.features.voice.shortDesc,
      fullDesc: t.features.voice.fullDesc,
      badge: t.features.voice.badge,
      image: '/images/features/voice.png',
      accentColor: '#06b6d4',
      gradient: 'from-cyan-500/10 via-emerald-500/5 to-transparent',
      routePath: '/voice',
      keyFeatures: t.features.voice.keyFeatures,
    },
    {
      id: 'interview',
      title: t.features.interview.title,
      shortDesc: t.features.interview.shortDesc,
      fullDesc: t.features.interview.fullDesc,
      badge: t.features.interview.badge,
      image: '/images/features/interview.png',
      accentColor: '#8b5cf6',
      gradient: 'from-purple-500/10 via-indigo-500/5 to-transparent',
      routePath: '/career/interview',
      keyFeatures: t.features.interview.keyFeatures,
    },
    {
      id: 'coding',
      title: t.features.coding.title,
      shortDesc: t.features.coding.shortDesc,
      fullDesc: t.features.coding.fullDesc,
      badge: t.features.coding.badge,
      image: '/images/features/coding.png',
      accentColor: '#0d9488',
      gradient: 'from-teal-500/10 via-cyan-500/5 to-transparent',
      routePath: '/workspace/agent',
      keyFeatures: t.features.coding.keyFeatures,
    },
    {
      id: 'career',
      title: t.features.career.title,
      shortDesc: t.features.career.shortDesc,
      fullDesc: t.features.career.fullDesc,
      badge: t.features.career.badge,
      image: '/images/features/career.png',
      accentColor: '#f43f5e',
      gradient: 'from-rose-500/10 via-orange-500/5 to-transparent',
      routePath: '/career',
      keyFeatures: t.features.career.keyFeatures,
    },
  ];

  const getIcon = (id: string) => {
    switch (id) {
      case 'chat':
        return <MessageSquare className="w-3.5 h-3.5 text-white fill-white" />;
      case 'voice':
        return <Mic className="w-3.5 h-3.5 text-white" />;
      case 'interview':
        return <FileText className="w-3.5 h-3.5 text-white" />;
      case 'coding':
        return <Code className="w-3.5 h-3.5 text-white stroke-[2.5]" />;
      case 'career':
        return <Briefcase className="w-3.5 h-3.5 text-white" />;
      default:
        return null;
    }
  };

  return (
    <section id="features" className="relative pt-2 pb-8 bg-transparent" aria-label="TRON AI Primary Features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 uppercase tracking-wider">
            <span>{t.features.sectionBadge}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-slate-900 tracking-tight">
            {t.features.sectionTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl mx-auto">
            {t.features.sectionDesc}
          </p>
        </div>

        {/* Exactly Five Feature Cards in balanced 5-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {features.map((feat) => {
            return (
              <div
                key={feat.id}
                onClick={() => setSelectedFeature(feat)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedFeature(feat)}
                className="group relative flex flex-col justify-between p-3.5 rounded-2xl bg-white/85 hover:bg-white backdrop-blur-md border border-slate-200/80 hover:border-cyan-400 shadow-[0_4px_16px_rgba(0,102,255,0.04)] hover:shadow-[0_12px_28px_rgba(0,180,255,0.15)] transition-all duration-300 transform hover:-translate-y-1 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {/* Visual Illustration Banner */}
                <div className="relative w-full h-[84px] mb-2.5 rounded-xl bg-gradient-to-b from-blue-50/50 via-cyan-50/20 to-transparent flex items-center justify-center overflow-hidden border border-slate-100/60">
                  <img
                    src={feat.image}
                    alt={feat.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Card Title & Icon Badge */}
                <div className="space-y-1.5 mb-2.5 flex-1">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-lg flex items-center justify-center shadow-sm shrink-0"
                      style={{ backgroundColor: feat.accentColor }}
                    >
                      {getIcon(feat.id)}
                    </div>
                    <span className="text-xs font-bold text-slate-900 font-heading">
                      {feat.title}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-snug font-normal line-clamp-2">
                    {feat.shortDesc}
                  </p>
                </div>

                {/* Bottom Call to Action Action Row */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100/70">
                  <span className="text-[10px] font-semibold text-blue-600 group-hover:underline">
                    {feat.badge}
                  </span>
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(feat.routePath);
                    }}
                    title={`Open ${feat.title}`}
                    className="w-5 h-5 rounded-full bg-blue-50 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-blue-600 transition-all shadow-sm"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Details / Interactive Preview Modal */}
      <LandingFeatureModal
        feature={selectedFeature}
        onClose={() => setSelectedFeature(null)}
      />
    </section>
  );
};
