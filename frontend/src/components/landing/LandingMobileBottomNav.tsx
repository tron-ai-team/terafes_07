import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User } from "lucide-react";
import {
  NavHomeIcon,
  AiChatIcon,
  AiVoiceIcon,
  InterviewPracticeIcon,
  CreateCvIcon,
} from "./TronIcons";
import { useTranslation } from "../../hooks/useTranslation";

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useTranslation();
  const isJa = lang === "ja";
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Dynamic keyboard detection via visualViewport
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const handleResize = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      // If visualViewport height is substantially smaller than window.innerHeight, keyboard is active
      const keyboardOpen = window.innerHeight - vv.height > 120;
      setIsKeyboardVisible(keyboardOpen);
    };

    window.visualViewport.addEventListener("resize", handleResize);
    window.visualViewport.addEventListener("scroll", handleResize);

    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("scroll", handleResize);
    };
  }, []);

  const isHome = location.pathname === "/" || location.pathname === "/landing";

  const navItems = [
    {
      id: "home",
      label: isJa ? "ホーム" : "Home",
      icon: <NavHomeIcon size={16} className="stroke-[2.2]" />,
      active: isHome,
      onClick: () => {
        if (location.pathname === "/" || location.pathname === "/landing") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          navigate("/");
        }
      },
    },
    {
      id: "chat",
      label: isJa ? "チャット" : "Chat",
      icon: <AiChatIcon size={16} className="stroke-[2]" />,
      active: location.pathname.startsWith("/chat"),
      onClick: () => navigate("/chat"),
    },
    {
      id: "voice",
      label: isJa ? "音声" : "Voice",
      icon: <AiVoiceIcon size={16} className="stroke-[2]" />,
      active: location.pathname.startsWith("/voice"),
      onClick: () => navigate("/voice"),
    },
    {
      id: "interview",
      label: isJa ? "面接" : "Interview",
      icon: <InterviewPracticeIcon size={16} className="stroke-[2]" />,
      active: location.pathname.startsWith("/career/interview"),
      onClick: () => navigate("/career/interview"),
    },
    {
      id: "cv",
      label: isJa ? "履歴書" : "Create CV",
      icon: <CreateCvIcon size={16} className="stroke-[2]" />,
      active: location.pathname.startsWith("/career/cv-builder"),
      onClick: () => navigate("/career/cv-builder"),
    },
    {
      id: "profile",
      label: isJa ? "プロフィール" : "Profile",
      icon: <User size={16} className="stroke-[2]" />,
      active: location.pathname.startsWith("/profile"),
      onClick: () => navigate("/profile"),
    },
  ];

  if (isKeyboardVisible) {
    return null; // Collapse completely while onscreen keyboard is open to give max space to composer & thread
  }

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/94 backdrop-blur-2xl border-t border-blue-100/90 shadow-[0_-6px_28px_rgba(0,50,140,0.07)] rounded-t-2xl sm:rounded-t-3xl pt-1 pb-[calc(0.35rem+env(safe-area-inset-bottom,0px))] px-1 transition-all duration-300"
    >
      <div className="max-w-md mx-auto grid grid-cols-6 gap-0.5 sm:gap-1 items-center justify-items-center">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            aria-label={item.label}
            aria-current={item.active ? "page" : undefined}
            className={`flex flex-col items-center justify-center w-full py-0.5 px-0.5 rounded-xl transition-all duration-200 cursor-pointer ${
              item.active
                ? "text-blue-600 font-bold"
                : "text-slate-500 hover:text-slate-800 font-medium"
            }`}
          >
            {/* Active Pill container around Icon */}
            <div
              className={`flex items-center justify-center w-8 h-6 rounded-full transition-all duration-200 ${
                item.active
                  ? "bg-blue-100/90 text-blue-600 shadow-2xs border border-blue-200/80"
                  : "text-slate-600 hover:bg-slate-100/60"
              }`}
            >
              {item.icon}
            </div>

            {/* Label below Icon */}
            <span
              className={`text-[8.5px] sm:text-[9px] tracking-tight leading-none mt-0.5 truncate max-w-full ${
                item.active ? "text-blue-600 font-bold" : "text-slate-600"
              }`}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export const LandingMobileBottomNav = MobileBottomNav;
export default MobileBottomNav;
