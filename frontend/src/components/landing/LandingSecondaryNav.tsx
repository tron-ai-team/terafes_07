import React from "react";
import { useNavigate } from "react-router-dom";
import {
  NavHomeIcon,
  AiChatIcon,
  AiVoiceIcon,
  InterviewPracticeIcon,
  CreateCvIcon,
  InteractiveDemoIcon,
  BottomSettingsIcon,
  BottomHelpIcon,
} from "./TronIcons";
import { useTranslation } from "../../hooks/useTranslation";

interface LandingSecondaryNavProps {
  onOpenDemos: () => void;
}

export const LandingSecondaryNav: React.FC<LandingSecondaryNavProps> = ({
  onOpenDemos,
}) => {
  const navigate = useNavigate();
  const { lang } = useTranslation();
  const isJa = lang === "ja";

  const navItems = [
    {
      id: "home",
      label: isJa ? "ホーム" : "Home",
      icon: <NavHomeIcon size={15} className="stroke-[2.2]" />,
      active: true,
      action: () => window.scrollTo({ top: 0, behavior: "smooth" }),
    },
    {
      id: "chat",
      label: "Chat",
      icon: <AiChatIcon size={15} className="stroke-[2]" />,
      active: false,
      action: () => navigate("/chat"),
    },
    {
      id: "voice",
      label: "Voice",
      icon: <AiVoiceIcon size={15} className="stroke-[2]" />,
      active: false,
      action: () => navigate("/voice"),
    },
    {
      id: "interview",
      label: "Interview",
      icon: <InterviewPracticeIcon size={15} className="stroke-[2]" />,
      active: false,
      action: () => navigate("/career/interview"),
    },
    {
      id: "cv",
      label: "Create CV",
      icon: <CreateCvIcon size={15} className="stroke-[2]" />,
      active: false,
      action: () => navigate("/career/cv-builder"),
    },
    {
      id: "demos",
      label: isJa ? "キャリア" : "Career Center",
      icon: <InteractiveDemoIcon size={15} className="stroke-[2]" />,
      active: false,
      action: () => {
        if (onOpenDemos) {
          onOpenDemos();
        } else {
          navigate("/career");
        }
      },
    },
  ];

  return (
    <div className="w-full px-3 sm:px-6 lg:px-10 pb-3 sm:pb-4 z-30">
      <div className="max-w-[1780px] mx-auto w-full">
        <div
          className="w-full rounded-full tron-liquid-glass px-4 sm:px-6 py-2 flex items-center justify-between transition-all duration-300"
          style={{
            background:
              "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(246, 251, 255, 0.82) 100%)",
            boxShadow:
              "0 8px 30px -4px rgba(0, 50, 140, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02), inset 0 1px 1.5px rgba(255, 255, 255, 1)",
          }}
        >
          {/* ── LEFT: TRON AI LOGO EMBLEM ── */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2.5 shrink-0 hover:opacity-90 transition-opacity cursor-pointer text-left"
            title="Scroll to top"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center">
              <img
                src="/images/assets/tron-logo.png"
                alt="TRON AI"
                className="w-full h-full object-contain filter drop-shadow-[0_2px_6px_rgba(0,180,255,0.4)]"
              />
            </div>
            <span className="text-xs sm:text-sm font-black font-heading tracking-tight text-slate-900 leading-none">
              TRON <span className="text-blue-600">AI</span>
            </span>
            <div className="hidden sm:block w-[1.5px] h-3.5 bg-slate-300/80 mx-1" />
          </button>

          {/* ── CENTER: NAVIGATION TABS (HOME, CHAT, VOICE, INTERVIEW, CREATE CV, DEMOS) ── */}
          <div className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all duration-200 cursor-pointer ${
                  item.active
                    ? "bg-blue-100/80 text-blue-600 shadow-2xs border border-blue-200/70"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
                }`}
                aria-label={item.label}
              >
                <span className={item.active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}>
                  {item.icon}
                </span>
                <span className="hidden sm:inline leading-none">{item.label}</span>
              </button>
            ))}
          </div>

          {/* ── RIGHT: SYSTEM CONTROLS (SETTINGS, HELP) ── */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Settings */}
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="p-1.5 sm:p-2 rounded-full text-slate-500 hover:text-blue-600 hover:bg-white/80 transition-all cursor-pointer"
              aria-label="Settings"
              title={isJa ? "設定" : "Settings"}
            >
              <BottomSettingsIcon size={15} />
            </button>

            {/* Help */}
            <button
              type="button"
              onClick={() => navigate("/help")}
              className="p-1.5 sm:p-2 rounded-full text-slate-500 hover:text-blue-600 hover:bg-white/80 transition-all cursor-pointer"
              aria-label="Help"
              title={isJa ? "ヘルプ" : "Help"}
            >
              <BottomHelpIcon size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingSecondaryNav;
