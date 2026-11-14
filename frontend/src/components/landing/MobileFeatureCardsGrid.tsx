import React from "react";
import {
  AiChatIcon,
  AiVoiceIcon,
  InterviewPracticeIcon,
  CreateCvIcon,
  RefinedArrowRight,
} from "./TronIcons";
import { useTranslation } from "../../hooks/useTranslation";

interface MobileFeatureCardsGridProps {
  onNavigate: (route: string) => void;
}

export const MobileFeatureCardsGrid: React.FC<MobileFeatureCardsGridProps> = ({
  onNavigate,
}) => {
  const { lang } = useTranslation();
  const isJa = lang === "ja";

  const cards = [
    {
      id: "chat",
      icon: <AiChatIcon size={20} className="stroke-[2]" />,
      iconBgClass:
        "bg-gradient-to-br from-blue-500 to-cyan-400 shadow-[0_4px_14px_rgba(37,99,235,0.3)]",
      title: "AI Chat",
      description: isJa
        ? "AIと対話して、質問・学習・プログラミングを即座に解決。"
        : "Ask, learn, and solve code problems instantly with conversational AI.",
      route: "/chat",
    },
    {
      id: "voice",
      icon: <AiVoiceIcon size={20} className="stroke-[2]" />,
      iconBgClass:
        "bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 shadow-[0_4px_14px_rgba(147,51,234,0.3)]",
      title: "AI Voice",
      description: isJa
        ? "自然な発音のAI音声で会話練習（日英バイリンガル対応）。"
        : "Practice spoken conversation with natural-sounding AI voice.",
      route: "/voice",
    },
    {
      id: "interview",
      icon: <InterviewPracticeIcon size={20} className="stroke-[2]" />,
      iconBgClass:
        "bg-gradient-to-br from-pink-500 via-rose-500 to-pink-600 shadow-[0_4px_14px_rgba(236,72,153,0.3)]",
      title: "Interview Practice",
      description: isJa
        ? "リアルな日本語面接シミュレーションと即時フィードバック。"
        : "Realistic Japanese job interview simulations with instant feedback.",
      route: "/career/interview",
    },
    {
      id: "cv",
      icon: <CreateCvIcon size={20} className="stroke-[2]" />,
      iconBgClass:
        "bg-gradient-to-br from-amber-500 via-orange-500 to-orange-600 shadow-[0_4px_14px_rgba(249,115,22,0.3)]",
      title: "Create CV",
      description: isJa
        ? "日本のJIS規格履歴書・職務経歴書や英語Resumeを自動作成。"
        : "Generate a professional Japanese 履歴書 and English Resume.",
      route: "/career/cv-builder",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 w-full">
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={() => onNavigate(card.route)}
          className="group relative flex flex-col justify-between w-full rounded-[20px] tron-liquid-card p-3 sm:p-3.5 text-left cursor-pointer transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-xs hover:border-blue-300/80"
        >
          {/* Top Row: Icon + Arrow */}
          <div className="flex items-center justify-between w-full mb-2 sm:mb-2.5">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white shrink-0 transition-transform group-hover:scale-105 ${card.iconBgClass}`}
            >
              {card.icon}
            </div>

            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/95 border border-slate-200/90 text-slate-400 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all flex items-center justify-center shrink-0 shadow-2xs">
              <RefinedArrowRight size={12} className="stroke-[2.2]" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="w-full">
            <h3 className="text-xs sm:text-[13px] font-black text-slate-900 group-hover:text-blue-600 transition-colors font-heading leading-tight mb-1">
              {card.title}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-500 group-hover:text-slate-700 transition-colors leading-[1.38] line-clamp-3">
              {card.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};

export default MobileFeatureCardsGrid;
