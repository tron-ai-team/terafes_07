import React from "react";
import { motion } from "framer-motion";
import {
  AiChatIcon,
  AiVoiceIcon,
  InterviewPracticeIcon,
  CreateCvIcon,
  RefinedArrowRight,
} from "./TronIcons";
import { useTranslation } from "../../hooks/useTranslation";

interface CinematicFeatureCardProps {
  id: string;
  icon: React.ReactNode;
  iconBgClass: string;
  title: string;
  description: string;
  onClick: () => void;
  className?: string;
  delay?: number;
}

export const CinematicFeatureCard: React.FC<CinematicFeatureCardProps> = ({
  icon,
  iconBgClass,
  title,
  description,
  onClick,
  className = "",
  delay = 0,
}) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3, scale: 1.012 }}
      whileTap={{ scale: 0.985 }}
      className={`group relative w-full sm:w-[320px] md:w-[340px] lg:w-[340px] xl:w-[370px] cursor-pointer rounded-[22px]
                 tron-liquid-card p-3.5 sm:p-4 text-left
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${className}`}
    >
      {/* Specular glass reflection along top edge */}
      <div className="absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none" />

      <div className="flex items-center gap-3.5">
        {/* Vibrant Gradient Icon Container matching reference */}
        <div
          className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-[16px] text-white transition-all duration-300 ${iconBgClass}`}
        >
          {icon}
        </div>

        {/* Text Area */}
        <div className="flex-1 min-w-0 pr-1 text-left">
          <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight font-heading">
            {title}
          </h3>
          <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-[12px] leading-snug text-slate-500 group-hover:text-slate-700 transition-colors line-clamp-2">
            {description}
          </p>
        </div>

        {/* Liquid Glass Arrow Action */}
        <div className="w-8 h-8 rounded-full bg-white/80 border border-slate-200/80 text-slate-400 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all duration-200 flex items-center justify-center shrink-0 shadow-2xs group-hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)]">
          <div className="transform group-hover:translate-x-0.5 transition-transform duration-200">
            <RefinedArrowRight size={14} className="stroke-[2.2]" />
          </div>
        </div>
      </div>
    </motion.button>
  );
};

interface CinematicFeatureCardsColumnProps {
  onNavigate: (route: string) => void;
}

export const CinematicFeatureCardsColumn: React.FC<CinematicFeatureCardsColumnProps> = ({
  onNavigate,
}) => {
  const { lang } = useTranslation();
  const isJa = lang === "ja";

  const cards = [
    {
      id: "chat",
      icon: <AiChatIcon size={22} className="stroke-[2]" />,
      iconBgClass:
        "bg-gradient-to-br from-blue-500 to-cyan-500 shadow-[0_6px_18px_rgba(37,99,235,0.32)] group-hover:shadow-[0_8px_22px_rgba(0,180,255,0.45)]",
      title: "AI Chat",
      description: isJa
        ? "AIと対話して、質問・学習・プログラミングを即座に解決。"
        : "Ask, learn, and get answers instantly with conversational AI.",
      route: "/chat",
      delay: 0.08,
    },
    {
      id: "voice",
      icon: <AiVoiceIcon size={22} className="stroke-[2]" />,
      iconBgClass:
        "bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 shadow-[0_6px_18px_rgba(147,51,234,0.32)] group-hover:shadow-[0_8px_22px_rgba(168,85,247,0.45)]",
      title: "AI Voice",
      description: isJa
        ? "自然な発音のAI音声で会話練習 (日英バイリンガル対応)。"
        : "Practice spoken conversation with natural-sounding AI voice.",
      route: "/voice",
      delay: 0.16,
    },
    {
      id: "interview",
      icon: <InterviewPracticeIcon size={22} className="stroke-[2]" />,
      iconBgClass:
        "bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 shadow-[0_6px_18px_rgba(236,72,153,0.32)] group-hover:shadow-[0_8px_22px_rgba(244,63,94,0.45)]",
      title: "Interview Practice",
      description: isJa
        ? "リアルな日本語面接シミュレーションと即時フィードバック。"
        : "Realistic Japanese job interview simulations with instant feedback.",
      route: "/career/interview",
      delay: 0.24,
    },
    {
      id: "cv",
      icon: <CreateCvIcon size={22} className="stroke-[2]" />,
      iconBgClass:
        "bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 shadow-[0_6px_18px_rgba(249,115,22,0.32)] group-hover:shadow-[0_8px_22px_rgba(251,146,60,0.45)]",
      title: "Create CV",
      description: isJa
        ? "日本のJIS規格履歴書・職務経歴書や英語Resumeを自動作成。"
        : "Generate a professional Japanese 履歴書 and English Resume.",
      route: "/career/cv-builder",
      delay: 0.32,
    },
  ];

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3.5 items-center lg:items-end w-full z-20">
      {cards.map((card) => (
        <CinematicFeatureCard
          key={card.id}
          id={card.id}
          icon={card.icon}
          iconBgClass={card.iconBgClass}
          title={card.title}
          description={card.description}
          onClick={() => onNavigate(card.route)}
          delay={card.delay}
        />
      ))}
    </div>
  );
};

// Backward compatibility exports
export const LeftFeatureCards = CinematicFeatureCardsColumn;
export const RightFeatureCards = CinematicFeatureCardsColumn;

export default CinematicFeatureCard;
