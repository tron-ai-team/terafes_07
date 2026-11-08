import React from "react";
import { motion } from "framer-motion";
import {
  NavFeaturesIcon,
  AiChatIcon,
  AiVoiceIcon,
  InterviewPracticeIcon,
  CreateCvIcon,
  InteractiveDemoIcon,
} from "./TronIcons";
import { useTranslation } from "../../hooks/useTranslation";

interface QuickLaunchBarProps {
  onNavigate: (route: string) => void;
  onDemosClick: () => void;
}

export const QuickLaunchBar: React.FC<QuickLaunchBarProps> = ({
  onNavigate,
  onDemosClick,
}) => {
  const { lang } = useTranslation();
  const isJa = lang === "ja";

  const items = [
    {
      id: "chat",
      label: "Chat",
      icon: <AiChatIcon size={15} className="stroke-[2]" />,
      iconClass: "text-blue-600 group-hover:text-white group-hover:bg-blue-600",
      pillHoverClass: "hover:border-blue-400 hover:shadow-[0_4px_16px_rgba(0,102,255,0.2)]",
      action: () => onNavigate("/chat"),
    },
    {
      id: "voice",
      label: "Voice",
      icon: <AiVoiceIcon size={15} className="stroke-[2]" />,
      iconClass: "text-purple-600 group-hover:text-white group-hover:bg-purple-600",
      pillHoverClass: "hover:border-purple-400 hover:shadow-[0_4px_16px_rgba(147,51,234,0.2)]",
      action: () => onNavigate("/voice"),
    },
    {
      id: "interview",
      label: "Interview",
      icon: <InterviewPracticeIcon size={15} className="stroke-[2]" />,
      iconClass: "text-pink-600 group-hover:text-white group-hover:bg-pink-600",
      pillHoverClass: "hover:border-pink-400 hover:shadow-[0_4px_16px_rgba(219,39,119,0.2)]",
      action: () => onNavigate("/career/interview"),
    },
    {
      id: "cv",
      label: "Create CV",
      icon: <CreateCvIcon size={15} className="stroke-[2]" />,
      iconClass: "text-orange-600 group-hover:text-white group-hover:bg-orange-600",
      pillHoverClass: "hover:border-orange-400 hover:shadow-[0_4px_16px_rgba(234,88,12,0.2)]",
      action: () => onNavigate("/career/cv-builder"),
    },
    {
      id: "demos",
      label: isJa ? "キャリア" : "Career",
      icon: <InteractiveDemoIcon size={15} className="stroke-[2]" />,
      iconClass: "text-cyan-600 group-hover:text-white group-hover:bg-cyan-600",
      pillHoverClass: "hover:border-cyan-400 hover:shadow-[0_4px_16px_rgba(2,132,199,0.2)]",
      action: () => onNavigate("/career"),
    },
  ];

  return (
    <div className="w-full flex justify-center px-3 sm:px-4 z-30">
      <div
        className="rounded-full px-3.5 py-2 sm:px-6 sm:py-2.5 max-w-4xl w-full flex flex-col md:flex-row items-center justify-between gap-2.5 sm:gap-4 transition-all duration-300"
        style={{
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(246, 251, 255, 0.8) 100%)",
          backdropFilter: "blur(24px) saturate(160%)",
          WebkitBackdropFilter: "blur(24px) saturate(160%)",
          border: "1px solid rgba(255, 255, 255, 0.95)",
          boxShadow:
            "0 14px 40px -8px rgba(0, 60, 160, 0.1), 0 2px 8px rgba(0, 0, 0, 0.02), inset 0 1px 2px rgba(255, 255, 255, 1)",
        }}
      >
        {/* Left Side: Grid icon + Quick Launch Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[14px] bg-gradient-to-tr from-blue-600 via-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
            <NavFeaturesIcon size={17} className="stroke-[2.2]" />
          </div>
          <div className="text-left">
            <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 tracking-tight leading-tight font-heading">
              Quick Launch
            </h4>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
              {isJa ? "主要機能にすぐアクセス" : "Instant access to core features"}
            </p>
          </div>
        </div>

        {/* Separator on desktop */}
        <div className="hidden md:block w-[1px] h-6 bg-slate-200/90 mx-1" />

        {/* Right Side: 5 Horizontal Capsule Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 w-full md:w-auto">
          {items.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ y: -1.5, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={item.action}
              className={`group flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-slate-200/90 bg-white/80 hover:bg-white text-slate-700 hover:text-slate-950 text-[11px] sm:text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs shrink-0 ${item.pillHoverClass}`}
              aria-label={`Launch ${item.label}`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center bg-slate-100/90 transition-all duration-200 ${item.iconClass}`}
              >
                {item.icon}
              </div>
              <span className="leading-none">{item.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickLaunchBar;
