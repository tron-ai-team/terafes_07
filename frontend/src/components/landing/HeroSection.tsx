import React, { useState } from 'react';
import { ArrowRight, Play, CheckCircle2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { RobotHero2D } from './RobotHero2D';
import { FloatingCard } from './FloatingCard';
import { DemoVideoModal } from './DemoVideoModal';
import { LandingFeatureModal } from './LandingFeatureModal';
import { FeatureCardItem } from '../../types/landing';
import { useTranslation } from '../../hooks/useTranslation';

interface HeroSectionProps {
  onStartForFree: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onStartForFree }) => {
  const { t } = useTranslation();
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureCardItem | null>(null);

  const getFeatureItem = (id: 'chat' | 'voice' | 'interview' | 'coding' | 'career'): FeatureCardItem => {
    switch (id) {
      case 'chat':
        return {
          id: 'chat',
          title: t.features.chat.title,
          shortDesc: t.features.chat.shortDesc,
          fullDesc: t.features.chat.fullDesc,
          badge: t.features.chat.badge,
          accentColor: '#2563eb',
          gradient: 'from-blue-500/10 via-cyan-500/5 to-transparent',
          image: '/images/features/chat.png',
          routePath: '/chat',
          keyFeatures: t.features.chat.keyFeatures,
        };
      case 'voice':
        return {
          id: 'voice',
          title: t.features.voice.title,
          shortDesc: t.features.voice.shortDesc,
          fullDesc: t.features.voice.fullDesc,
          badge: t.features.voice.badge,
          accentColor: '#06b6d4',
          gradient: 'from-cyan-500/10 via-emerald-500/5 to-transparent',
          image: '/images/features/voice.png',
          routePath: '/voice',
          keyFeatures: t.features.voice.keyFeatures,
        };
      case 'interview':
        return {
          id: 'interview',
          title: t.features.interview.title,
          shortDesc: t.features.interview.shortDesc,
          fullDesc: t.features.interview.fullDesc,
          badge: t.features.interview.badge,
          accentColor: '#8b5cf6',
          gradient: 'from-purple-500/10 via-indigo-500/5 to-transparent',
          image: '/images/features/interview.png',
          routePath: '/career/interview',
          keyFeatures: t.features.interview.keyFeatures,
        };
      case 'coding':
        return {
          id: 'coding',
          title: t.features.coding.title,
          shortDesc: t.features.coding.shortDesc,
          fullDesc: t.features.coding.fullDesc,
          badge: t.features.coding.badge,
          accentColor: '#0d9488',
          gradient: 'from-teal-500/10 via-cyan-500/5 to-transparent',
          image: '/images/features/coding.png',
          routePath: '/workspace/agent',
          keyFeatures: t.features.coding.keyFeatures,
        };
      case 'career':
        return {
          id: 'career',
          title: t.features.career.title,
          shortDesc: t.features.career.shortDesc,
          fullDesc: t.features.career.fullDesc,
          badge: t.features.career.badge,
          accentColor: '#f43f5e',
          gradient: 'from-rose-500/10 via-orange-500/5 to-transparent',
          image: '/images/features/career.png',
          routePath: '/career',
          keyFeatures: t.features.career.keyFeatures,
        };
    }
  };

  const handleCtaClick = () => {
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#00e5ff', '#0066ff', '#38bdf8', '#ffffff'],
      });
    } catch {
      // fallback
    }
    onStartForFree();
  };

  const handleCardClick = (id: 'chat' | 'voice' | 'interview' | 'coding' | 'career') => {
    setSelectedFeature(getFeatureItem(id));
  };

  return (
    <section 
      id="hero" 
      className="relative pt-24 sm:pt-28 pb-6 lg:pb-8 overflow-hidden flex items-center bg-white"
      aria-label="TRON AI Hero Section"
    >
      {/* Background Command Center Room Texture + Ambient Glows */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Futuristic AI Command Center Room Background */}
        <div 
          className="absolute inset-0 opacity-45 bg-cover bg-center mix-blend-multiply"
          style={{ backgroundImage: "url('/images/assets/tron-hero-bg.jpg')" }}
        />

        {/* Soft Radial Ambient Color Glows */}
        <div className="absolute top-0 right-1/4 w-[750px] h-[750px] bg-gradient-to-b from-cyan-200/35 via-blue-200/20 to-transparent rounded-full blur-[110px]" />
        <div className="absolute top-1/4 left-0 w-[550px] h-[550px] bg-gradient-to-r from-blue-100/40 via-cyan-100/20 to-transparent rounded-full blur-[90px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-2 items-center">
          
          {/* LEFT COLUMN: HERO CONTENT */}
          <div className="lg:col-span-5 text-center lg:text-left space-y-4">
            
            {/* Small Badge: NEXT GENERATION AI PLATFORM */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50/90 border border-cyan-300/60 shadow-[0_2px_10px_rgba(0,210,255,0.12)] text-[11px] font-bold text-blue-800 tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-cyan-500 fill-cyan-400" />
              <span>{t.hero.badge}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-extrabold font-heading text-slate-950 tracking-tight leading-[1.14]">
              {t.hero.titlePart1}{' '}
              <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-400 bg-clip-text text-transparent">
                {t.hero.titleHighlight1}
              </span>{' '}
              {t.hero.titlePart2}{' '}
              <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-sky-400 bg-clip-text text-transparent">
                {t.hero.titleHighlight2}
              </span>
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal max-w-xl mx-auto lg:mx-0">
              {t.hero.description}
            </p>

            {/* CTA Buttons Row */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-1">
              {/* Primary Button */}
              <button
                onClick={handleCtaClick}
                className="w-full sm:w-auto px-6 py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-[0_8px_20px_rgba(0,102,255,0.32)] hover:shadow-[0_12px_28px_rgba(0,210,255,0.42)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-cyan-300/50"
              >
                <span>{t.hero.startForFree}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Secondary Button: Watch Demo */}
              <button
                onClick={() => setIsDemoModalOpen(true)}
                className="w-full sm:w-auto px-4.5 py-2.5 rounded-2xl font-semibold text-sm text-slate-800 bg-white/90 hover:bg-white border border-slate-200/90 hover:border-blue-300 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="leading-tight font-bold text-xs text-slate-900">{t.hero.watchDemo}</span>
                  <span className="text-[10px] text-slate-400 font-normal leading-tight">{t.hero.demoOverview}</span>
                </div>
              </button>
            </div>

            {/* Small feature indicators */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2.5 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-100" />
                <span>{t.hero.badgeLocalCloud}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-100" />
                <span>{t.hero.badgeJapaneseInterview}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-100" />
                <span>{t.hero.badgeMultilingual}</span>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: 2D ROBOT HERO + 5 FLOATING PANELS */}
          <div className="lg:col-span-7 relative flex items-center justify-center min-h-[400px] sm:min-h-[460px]">
            
            {/* LEFT FLOATING CARDS (3 Cards stacked on the left of the robot on desktop) */}
            <div className="hidden xl:flex flex-col gap-3 absolute -left-4 z-20">
              <FloatingCard
                featureId="chat"
                onClick={() => handleCardClick('chat')}
                className="transform hover:-translate-x-1"
              />
              <FloatingCard
                featureId="voice"
                onClick={() => handleCardClick('voice')}
                className="transform hover:-translate-x-1"
              />
              <FloatingCard
                featureId="coding"
                onClick={() => handleCardClick('coding')}
                className="transform hover:-translate-x-1"
              />
            </div>

            {/* CENTRAL 2D ROBOT MASCOT HERO */}
            <div className="relative z-10 w-full max-w-[430px] flex items-center justify-center">
              <RobotHero2D />
            </div>

            {/* RIGHT FLOATING CARDS (2 Cards stacked on the right of the robot on desktop) */}
            <div className="hidden xl:flex flex-col gap-4 absolute -right-6 z-20">
              <FloatingCard
                featureId="interview"
                onClick={() => handleCardClick('interview')}
                className="transform hover:translate-x-1"
              />
              <FloatingCard
                featureId="career"
                onClick={() => handleCardClick('career')}
                className="transform hover:translate-x-1"
              />
            </div>

          </div>
        </div>

        {/* Tablet / Mobile Floating Cards Grid */}
        <div className="xl:hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-6">
          <FloatingCard featureId="chat" onClick={() => handleCardClick('chat')} className="w-full" />
          <FloatingCard featureId="voice" onClick={() => handleCardClick('voice')} className="w-full" />
          <FloatingCard featureId="coding" onClick={() => handleCardClick('coding')} className="w-full" />
          <FloatingCard featureId="interview" onClick={() => handleCardClick('interview')} className="w-full" />
          <FloatingCard featureId="career" onClick={() => handleCardClick('career')} className="w-full" />
        </div>
      </div>

      {/* Interactive Demo Video Modal */}
      <DemoVideoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />

      {/* Interactive Feature Preview Modal */}
      <LandingFeatureModal
        feature={selectedFeature}
        onClose={() => setSelectedFeature(null)}
      />
    </section>
  );
};
