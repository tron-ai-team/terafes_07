import React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Play } from "lucide-react";
import confetti from "canvas-confetti";
import { CinematicFeatureCardsColumn } from "./CinematicFeatureCard";
import {
  BenefitFreeIcon,
  BenefitBilingualIcon,
  BenefitModulesIcon,
  RefinedArrowRight,
} from "./TronIcons";
import { useTranslation } from "../../hooks/useTranslation";

interface HeroSectionProps {
  onStartForFree?: () => void;
  onOpenDemos?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onStartForFree }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLaunchPrimary = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 65,
        origin: { y: 0.68 },
        colors: ["#00d4ff", "#2563eb", "#38bdf8", "#ffffff"],
      });
    } catch {
      // safe fallback
    }

    if (onStartForFree) {
      onStartForFree();
    } else {
      navigate("/chat");
    }
  };

  const handleNavigation = (route: string) => {
    navigate(route);
  };

  return (
    <section
      id="hero"
      className="relative w-full flex-1 flex flex-col justify-center pt-20 sm:pt-24 lg:pt-16 pb-4 sm:pb-6 overflow-x-hidden min-w-0 bg-transparent"
      aria-label="TRON AI Master Hero"
    >
      {/* ── THREE-COLUMN CINEMATIC MASTER STAGE ── */}
      <div className="relative z-10 max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-10 w-full flex-1 flex items-center my-auto min-w-0">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 xl:gap-8 items-center py-2 lg:py-0 min-w-0">
          
          {/* ── LEFT COLUMN: TYPOGRAPHY, BADGES & ACTIONS (lg:col-span-5 xl:col-span-4) ── */}
          <div className="lg:col-span-5 xl:col-span-4 text-center lg:text-left space-y-3.5 sm:space-y-4.5 z-20 min-w-0">
            
            {/* Pill Badge: ✨ ALL-IN-ONE AI ASSISTANT */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full tron-liquid-pill text-[11px] sm:text-xs font-bold text-slate-800 tracking-wide shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              <span>{t.hero.badge}</span>
            </div>

            {/* Main Japanese / English Headline */}
            <h1 className="text-2xl sm:text-3xl lg:text-[34px] xl:text-[42px] font-black font-heading text-slate-950 tracking-tight leading-[1.18] max-w-xl mx-auto lg:mx-0">
              <span className="block">{t.hero.titlePart1}</span>
              <span className="block bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 bg-clip-text text-transparent mt-0.5">
                {t.hero.titleHighlight1}
              </span>
            </h1>

            {/* Supporting Description */}
            <p className="text-xs sm:text-[13px] xl:text-sm text-slate-600 leading-relaxed font-normal max-w-md xl:max-w-lg mx-auto lg:mx-0">
              {t.hero.description}
            </p>

            {/* 3 Refined Benefit Indicator Cards in a Horizontal Row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-w-md mx-auto lg:mx-0 pt-1">
              {/* Benefit 1: 100% Free */}
              <div className="group flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-[20px] tron-liquid-card text-center cursor-default">
                <div className="w-8 h-8 rounded-xl bg-cyan-50/90 border border-cyan-200/80 flex items-center justify-center text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white group-hover:border-cyan-500 mb-1.5 shadow-2xs transition-all duration-300">
                  <BenefitFreeIcon size={17} className="stroke-[2]" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 group-hover:text-cyan-700 transition-colors leading-tight">
                  {t.hero.badgeLocalCloud}
                </span>
              </div>

              {/* Benefit 2: Bilingual AI (JP/EN) */}
              <div className="group flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-[20px] tron-liquid-card text-center cursor-default">
                <div className="w-8 h-8 rounded-xl bg-blue-50/90 border border-blue-200/80 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 mb-1.5 shadow-2xs transition-all duration-300">
                  <BenefitBilingualIcon size={17} className="stroke-[1.9]" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 group-hover:text-blue-700 transition-colors leading-tight">
                  {t.hero.badgeJapaneseInterview}
                </span>
              </div>

              {/* Benefit 3: 4 Core AI Modules */}
              <div className="group flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-[20px] tron-liquid-card text-center cursor-default">
                <div className="w-8 h-8 rounded-xl bg-indigo-50/90 border border-indigo-200/80 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 mb-1.5 shadow-2xs transition-all duration-300">
                  <BenefitModulesIcon size={17} className="stroke-[1.9]" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 group-hover:text-indigo-700 transition-colors leading-tight">
                  {t.hero.badgeMultilingual}
                </span>
              </div>
            </div>

            {/* Action Button: Primary CTA (Cleaned up, Watch Demo removed) */}
            <div className="flex items-center justify-center lg:justify-start pt-2">
              <button
                type="button"
                onClick={handleLaunchPrimary}
                id="tron-launch-cta-button"
                className="w-full sm:w-auto px-7 sm:px-8 py-3.5 rounded-full font-extrabold text-xs sm:text-sm text-white tron-primary-cta flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_8px_24px_rgba(37,99,235,0.38)]"
              >
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <Play className="w-2.5 h-2.5 fill-white text-white ml-0.5" />
                </div>
                <span>{t.hero.startForFree}</span>
                <RefinedArrowRight size={15} className="stroke-[2.5]" />
              </button>
            </div>

          </div>

          {/* ── CENTER AREA: UNOBSTRUCTED FOCAL WINDOW SHOWCASING CINEMATIC ROBOT & GLOBE (lg:col-span-3 xl:col-span-4) ── */}
          <div
            className="hidden lg:flex lg:col-span-3 xl:col-span-4 items-center justify-center min-h-[380px] pointer-events-none"
            aria-hidden="true"
          >
            {/* The background video contains the master robot and glowing holographic globe.
                This clear zone guarantees zero occlusion and zero duplicate rendering. */}
          </div>

          {/* ── RIGHT COLUMN: FOUR CINEMATIC FEATURE CARDS (lg:col-span-4 xl:col-span-4) ── */}
          <div className="lg:col-span-4 xl:col-span-4 flex items-center justify-center lg:justify-end w-full min-w-0">
            <CinematicFeatureCardsColumn onNavigate={handleNavigation} />
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
