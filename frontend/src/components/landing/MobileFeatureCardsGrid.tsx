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
      icon: <AiChatIcon size={17} className="stroke-[2]" />,
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
      icon: <AiVoiceIcon size={17} className="stroke-[2]" />,
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
      icon: <InterviewPracticeIcon size={17} className="stroke-[2]" />,
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
      icon: <CreateCvIcon size={17} className="stroke-[2]" />,
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
    <div className="grid grid-cols-2 gap-1.5 sm:gap-2.5 w-full">
      {cards.map((card) => (
        <button
          key={card.id}
          type="button"
          onClick={() => onNavigate(card.route)}
          className="group relative flex flex-col justify-between w-full rounded-xl sm:rounded-2xl tron-liquid-card p-2 sm:p-2.5 text-left cursor-pointer transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-xs hover:border-blue-300/80"
        >
          {/* Top Row: Icon + Arrow */}
          <div className="flex items-center justify-between w-full mb-1 sm:mb-1.5">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-white shrink-0 transition-transform group-hover:scale-105 ${card.iconBgClass}`}
            >
              {card.icon}
            </div>

            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/95 border border-slate-200/90 text-slate-400 group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all flex items-center justify-center shrink-0 shadow-2xs">
              <RefinedArrowRight size={10} className="stroke-[2.2]" />
            </div>
          </div>

          {/* Title & Description */}
          <div className="w-full">
            <h3 className="text-[11px] sm:text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors font-heading leading-tight mb-0.5">
              {card.title}
            </h3>
            <p className="text-[8.5px] xs:text-[9px] sm:text-[10px] text-slate-500 group-hover:text-slate-700 transition-colors leading-[1.25] line-clamp-2">
              {card.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};

export default MobileFeatureCardsGrid;
