import React, { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Play } from "lucide-react";
import confetti from "canvas-confetti";
import { CinematicFeatureCardsColumn } from "./CinematicFeatureCard";
import { MobileFeatureCardsGrid } from "./MobileFeatureCardsGrid";
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
  const videoRef = useRef<HTMLVideoElement>(null);

  // Robust HTML5 video autoplay initializer
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Browser autoplay fallback (plays automatically on user touch/visibility)
      });
    }
  }, []);

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
      className="relative w-full flex-1 flex flex-col justify-between pt-12 sm:pt-14 lg:pt-16 pb-0 overflow-x-hidden min-w-0 bg-transparent"
      aria-label="TRON AI Master Hero"
    >
      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE HERO EXPERIENCE (< lg)
          Faithful reconstruction matching the target mobile design reference:
          Header -> Badge -> Headline -> Subtitle -> Robot Hero ->
          3 Benefit Pills -> Full-width CTA -> 2x2 Feature Cards Grid
          Adaptive Single-Screen Viewport Optimized
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="lg:hidden w-full max-w-md mx-auto px-3.5 sm:px-4 pt-1 sm:pt-1.5 pb-0 text-center z-20 flex flex-col items-center justify-between flex-1 min-h-0">
        {/* Top Badge: ✦ ★ オールインワン AI アシスタント */}
        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full tron-liquid-pill text-[10px] sm:text-[11px] font-bold text-slate-800 tracking-wide shadow-2xs mb-1 sm:mb-1.5 shrink-0">
          <Sparkles className="w-3 h-3 text-cyan-500 fill-cyan-400/30" />
          <span>{t.hero.badge}</span>
        </div>

        {/* Main Mobile Japanese / English Headline */}
        <h1 className="text-[19px] xs:text-[21px] sm:text-[24px] font-black font-heading tracking-tight leading-[1.18] text-slate-950 mb-1 sm:mb-1.5 shrink-0">
          <span className="block text-slate-950">{t.hero.titlePart1}</span>
          <span className="block bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 bg-clip-text text-transparent mt-0.5">
            {t.hero.titleHighlight1}
          </span>
        </h1>

        {/* Supporting Description */}
        <p className="text-[10px] xs:text-[10.5px] sm:text-xs text-slate-600 leading-[1.3] font-normal max-w-xs sm:max-w-sm mx-auto mb-1 sm:mb-1.5 line-clamp-2 shrink-0">
          {t.hero.description}
        </p>

        {/* ── ROBOT HERO STAGE (Mobile Portrait Focal Area) ── */}
        {/*
          Houses the single master video element.
          On mobile (< lg): Contained between description and benefit cards with glowing pedestal aura.
          Adaptive flex-1 sizing ensures complete single-screen fit across mobile viewports.
          On desktop (>= lg): Transitions via lg:fixed lg:inset-0 into the cinematic background layer.
        */}
        <div className="relative w-full max-w-[320px] sm:max-w-[360px] flex-1 min-h-[110px] max-h-[190px] h-[clamp(115px,17vh,185px)] mx-auto my-0.5 sm:my-1 flex items-center justify-center lg:contents">
          {/* Concentric Halo energy aura behind robot */}
          <div
            className="lg:hidden absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[clamp(140px,22vh,200px)] h-[clamp(140px,22vh,200px)] rounded-full bg-cyan-400/20 blur-2xl pointer-events-none"
            aria-hidden="true"
          />

          {/* Concentric rotating SVG rings accenting the robot & globe */}
          <div
            className="lg:hidden absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[clamp(150px,24vh,210px)] h-[clamp(150px,24vh,210px)] pointer-events-none z-10 opacity-75"
            aria-hidden="true"
          >
            <svg viewBox="0 0 260 260" className="w-full h-full animate-[spin_40s_linear_infinite]">
              <circle
                cx="130"
                cy="130"
                r="115"
                fill="none"
                stroke="#00e5ff"
                strokeWidth="1.8"
                strokeDasharray="14 18 30 18"
                strokeOpacity="0.75"
              />
              <circle
                cx="130"
                cy="130"
                r="92"
                fill="none"
                stroke="#0088ff"
                strokeWidth="1.5"
                strokeDasharray="24 12"
                strokeOpacity="0.65"
              />
            </svg>
          </div>

          {/* ── THE SINGLE MASTER VIDEO ELEMENT (No duplicates) ── */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover object-[50%_24%] rounded-2xl lg:rounded-none lg:fixed lg:inset-0 lg:w-full lg:h-full lg:object-center pointer-events-none z-0"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/images/tron-ai-hero-poster.webp"
            aria-hidden="true"
            tabIndex={-1}
          >
            <source src="/videos/tron-ai-hero.mp4" type="video/mp4" />
          </video>

          {/* Subtle gradient fades top and bottom for smooth edge blending on mobile */}
          <div
            className="lg:hidden absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#EEFAFF] to-transparent pointer-events-none z-10"
            aria-hidden="true"
          />
          <div
            className="lg:hidden absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#EEFAFF] to-transparent pointer-events-none z-10"
            aria-hidden="true"
          />

          {/* Glowing pedestal highlight at the base of the robot */}
          <div
            className="lg:hidden absolute -bottom-1 inset-x-8 h-8 rounded-full bg-cyan-400/35 blur-lg pointer-events-none z-10"
            aria-hidden="true"
          />
        </div>

        {/* ── THREE BENEFIT PILLS ── */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full max-w-[380px] mx-auto my-1 sm:my-1.5 px-0.5 shrink-0">
          {/* Benefit 1 */}
          <div className="flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 rounded-xl sm:rounded-2xl tron-liquid-card text-center cursor-default shadow-xs">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-cyan-50/90 border border-cyan-200/80 flex items-center justify-center text-cyan-600 mb-0.5 sm:mb-1 shadow-2xs">
              <BenefitFreeIcon size={13} className="stroke-[2]" />
            </div>
            <span className="text-[9px] xs:text-[9.5px] sm:text-[10.5px] font-bold text-slate-800 leading-tight">
              {t.hero.badgeLocalCloud}
            </span>
          </div>

          {/* Benefit 2 */}
          <div className="flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 rounded-xl sm:rounded-2xl tron-liquid-card text-center cursor-default shadow-xs">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50/90 border border-blue-200/80 flex items-center justify-center text-blue-600 mb-0.5 sm:mb-1 shadow-2xs">
              <BenefitBilingualIcon size={13} className="stroke-[1.9]" />
            </div>
            <span className="text-[9px] xs:text-[9.5px] sm:text-[10.5px] font-bold text-slate-800 leading-tight">
              {t.hero.badgeJapaneseInterview}
            </span>
          </div>

          {/* Benefit 3 */}
          <div className="flex flex-col items-center justify-center py-1 sm:py-1.5 px-1 rounded-xl sm:rounded-2xl tron-liquid-card text-center cursor-default shadow-xs">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-50/90 border border-indigo-200/80 flex items-center justify-center text-indigo-600 mb-0.5 sm:mb-1 shadow-2xs">
              <BenefitModulesIcon size={13} className="stroke-[1.9]" />
            </div>
            <span className="text-[9px] xs:text-[9.5px] sm:text-[10.5px] font-bold text-slate-800 leading-tight">
              {t.hero.badgeMultilingual}
            </span>
          </div>
        </div>

        {/* ── PRIMARY CTA BUTTON ── */}
        <div className="w-full max-w-[380px] mx-auto my-1 sm:my-1.5 px-0.5 shrink-0">
          <button
            type="button"
            onClick={handleLaunchPrimary}
            id="tron-mobile-launch-cta-button"
            className="w-full h-10 sm:h-11 px-5 rounded-full font-black text-xs sm:text-[13px] text-white tron-primary-cta flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(37,99,235,0.35)] active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Play className="w-2.5 h-2.5 fill-white text-white ml-0.5" />
            </div>
            <span className="tracking-wide font-bold">{t.hero.startForFree}</span>
            <RefinedArrowRight size={14} className="stroke-[2.5]" />
          </button>
        </div>

        {/* ── FOUR MAIN FEATURE CARDS (2x2 GRID) ── */}
        <div className="w-full max-w-[410px] mx-auto mt-1 sm:mt-1.5 mb-1 shrink-0">
          <MobileFeatureCardsGrid onNavigate={handleNavigation} />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP CINEMATIC MASTER STAGE (>= lg)
          100% PRESERVED APPROVED DESKTOP ARCHITECTURE & CINEMATIC LAYOUT
          Three-column stage: Left Typography/CTA, Center Video Window, Right Cards
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex relative z-10 max-w-[1780px] mx-auto px-6 lg:px-10 w-full flex-1 items-center my-auto min-w-0">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-4 xl:gap-8 items-center py-2 lg:py-0 min-w-0">
          
          {/* ── LEFT COLUMN: TYPOGRAPHY, BADGES & ACTIONS (lg:col-span-5 xl:col-span-4) ── */}
          <div className="lg:col-span-5 xl:col-span-4 text-left space-y-3.5 sm:space-y-4.5 z-20 min-w-0">
            
            {/* Pill Badge: ✨ ALL-IN-ONE AI ASSISTANT */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full tron-liquid-pill text-xs font-bold text-slate-800 tracking-wide shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              <span>{t.hero.badge}</span>
            </div>

            {/* Main Japanese / English Headline */}
            <h1 className="text-[34px] xl:text-[42px] font-black font-heading text-slate-950 tracking-tight leading-[1.18] max-w-xl">
              <span className="block">{t.hero.titlePart1}</span>
              <span className="block bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 bg-clip-text text-transparent mt-0.5">
                {t.hero.titleHighlight1}
              </span>
            </h1>

            {/* Supporting Description */}
            <p className="text-xs sm:text-[13px] xl:text-sm text-slate-600 leading-relaxed font-normal max-w-md xl:max-w-lg">
              {t.hero.description}
            </p>

            {/* 3 Refined Benefit Indicator Cards in a Horizontal Row */}
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-w-md pt-1">
              {/* Benefit 1 */}
              <div className="group flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-[20px] tron-liquid-card text-center cursor-default">
                <div className="w-8 h-8 rounded-xl bg-cyan-50/90 border border-cyan-200/80 flex items-center justify-center text-cyan-600 group-hover:bg-cyan-500 group-hover:text-white group-hover:border-cyan-500 mb-1.5 shadow-2xs transition-all duration-300">
                  <BenefitFreeIcon size={17} className="stroke-[2]" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 group-hover:text-cyan-700 transition-colors leading-tight">
                  {t.hero.badgeLocalCloud}
                </span>
              </div>

              {/* Benefit 2 */}
              <div className="group flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-[20px] tron-liquid-card text-center cursor-default">
                <div className="w-8 h-8 rounded-xl bg-blue-50/90 border border-blue-200/80 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 mb-1.5 shadow-2xs transition-all duration-300">
                  <BenefitBilingualIcon size={17} className="stroke-[1.9]" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 group-hover:text-blue-700 transition-colors leading-tight">
                  {t.hero.badgeJapaneseInterview}
                </span>
              </div>

              {/* Benefit 3 */}
              <div className="group flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-[20px] tron-liquid-card text-center cursor-default">
                <div className="w-8 h-8 rounded-xl bg-indigo-50/90 border border-indigo-200/80 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 mb-1.5 shadow-2xs transition-all duration-300">
                  <BenefitModulesIcon size={17} className="stroke-[1.9]" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-800 group-hover:text-indigo-700 transition-colors leading-tight">
                  {t.hero.badgeMultilingual}
                </span>
              </div>
            </div>

            {/* Action Button: Primary CTA */}
            <div className="flex items-center justify-start pt-2">
              <button
                type="button"
                onClick={handleLaunchPrimary}
                id="tron-launch-cta-button"
                className="px-7 sm:px-8 py-3.5 rounded-full font-extrabold text-xs sm:text-sm text-white tron-primary-cta flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_8px_24px_rgba(37,99,235,0.38)]"
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
          <div className="lg:col-span-4 xl:col-span-4 flex items-center justify-end w-full min-w-0">
            <CinematicFeatureCardsColumn onNavigate={handleNavigation} />
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
