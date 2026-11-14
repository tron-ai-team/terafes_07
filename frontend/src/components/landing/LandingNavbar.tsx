import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  X,
  Globe,
  ChevronDown,
  Check,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import { LANGUAGES, SupportedLanguage } from "../../locales";
import {
  NavHomeIcon,
  NavFeaturesIcon,
  NavAboutIcon,
  AiChatIcon,
  AiVoiceIcon,
  InterviewPracticeIcon,
  CreateCvIcon,
} from "./TronIcons";

interface LandingNavbarProps {
  onGetStarted?: () => void;
  onSignIn: () => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  onSignIn,
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, selectedLanguage, setSelectedLanguage } = useApp();
  const { t, lang, setLang } = useTranslation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const langMenuRef = useRef<HTMLDivElement>(null);
  const mobileLangMenuRef = useRef<HTMLDivElement>(null);
  const featuresMenuRef = useRef<HTMLDivElement>(null);

  const currentLang = selectedLanguage || lang;

  const handleSelectLang = (newLang: SupportedLanguage) => {
    setSelectedLanguage(newLang);
    setLang(newLang);
    setLangMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedDesktop = langMenuRef.current && langMenuRef.current.contains(target);
      const clickedMobile = mobileLangMenuRef.current && mobileLangMenuRef.current.contains(target);
      if (!clickedDesktop && !clickedMobile) {
        setLangMenuOpen(false);
      }
      if (featuresMenuRef.current && !featuresMenuRef.current.contains(target)) {
        setFeaturesOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLangObj = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  const featureLinks = [
    {
      title: "AI Chat",
      desc: lang === "ja" ? "知的推論 & コード支援" : "Conversational intelligence & code reasoning",
      route: "/chat",
      icon: <AiChatIcon size={18} className="stroke-[2] text-blue-500" />,
    },
    {
      title: "AI Voice",
      desc: lang === "ja" ? "超低遅延リアルタイム音声" : "Natural real-time voice synthesis",
      route: "/voice",
      icon: <AiVoiceIcon size={18} className="stroke-[2] text-purple-500" />,
    },
    {
      title: "Interview Practice",
      desc: lang === "ja" ? "実践的日本語面接対策" : "Japanese tech interview simulation",
      route: "/career/interview",
      icon: <InterviewPracticeIcon size={18} className="stroke-[2] text-pink-500" />,
    },
    {
      title: "Create CV",
      desc: lang === "ja" ? "JIS規格履歴書 & 職務経歴書" : "Bilingual resume & CV builder",
      route: "/career/cv-builder",
      icon: <CreateCvIcon size={18} className="stroke-[2] text-orange-500" />,
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-2.5 sm:pt-3.5 px-3 sm:px-6 lg:px-10 transition-all duration-300 pointer-events-none">
      <div className="max-w-[1780px] mx-auto w-full">
        {/* Floating Master Liquid Glass Bar */}
        <div
          className="pointer-events-auto w-full rounded-full tron-liquid-glass px-4 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between transition-all duration-300"
          style={{
            boxShadow:
              "0 14px 40px -8px rgba(0, 60, 160, 0.09), 0 2px 8px rgba(0, 0, 0, 0.02), inset 0 1px 2px rgba(255, 255, 255, 1)",
          }}
        >
          {/* ── LEFT: TRON AI BRANDING ── */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <a
              href="#hero"
              className="flex items-center gap-2 sm:gap-2.5 group focus:outline-none focus:ring-2 focus:ring-blue-500/30 rounded-xl"
            >
              <div className="relative w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <img
                  src="/images/assets/tron-logo.png"
                  alt="TRON AI Logo"
                  className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,180,255,0.45)]"
                />
              </div>

              <div className="flex flex-col justify-center text-left leading-none">
                <span className="text-sm sm:text-base lg:text-lg font-black font-heading tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors leading-none">
                  TRON <span className="text-blue-600">AI</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium tracking-tight leading-none mt-0.5">
                  Your AI Partner
                </span>
              </div>
            </a>
          </div>

          {/* ── CENTER: LIQUID GLASS PILL NAVIGATION (HOME, FEATURES, ABOUT) ── */}
          <nav
            className="hidden lg:flex items-center gap-1.5 p-1 rounded-full bg-slate-100/60 border border-white/80 shadow-inner"
            aria-label="Main Navigation"
          >
            {/* 1. Home (Active Capsule) */}
            <a
              href="#hero"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-blue-600 bg-white/95 border border-blue-200/80 shadow-[0_2px_8px_rgba(0,102,255,0.12)] transition-all"
            >
              <NavHomeIcon size={14} className="stroke-[2.2] text-blue-600" />
              <span>{t.nav.home}</span>
            </a>

            {/* 2. Features Dropdown */}
            <div className="relative" ref={featuresMenuRef}>
              <button
                type="button"
                onClick={() => setFeaturesOpen(!featuresOpen)}
                onMouseEnter={() => setFeaturesOpen(true)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  featuresOpen
                    ? "text-blue-600 bg-white/80 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
                aria-expanded={featuresOpen}
              >
                <NavFeaturesIcon size={14} className="stroke-[1.8] text-slate-500" />
                <span>{t.nav.features}</span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform ${
                    featuresOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Features Liquid Glass Menu */}
              {featuresOpen && (
                <div
                  onMouseLeave={() => setFeaturesOpen(false)}
                  className="absolute left-1/2 -translate-x-1/2 mt-2 w-72 rounded-2xl tron-liquid-glass p-2 shadow-2xl z-50 animate-fadeIn"
                  style={{
                    background: "rgba(255, 255, 255, 0.94)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                  }}
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    {lang === "ja" ? "TRON AI 機能一覧" : "TRON AI Capabilities"}
                  </div>
                  <div className="py-1 space-y-1">
                    {featureLinks.map((item) => (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => {
                          setFeaturesOpen(false);
                          navigate(item.route);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-blue-50/70 transition-all cursor-pointer group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 leading-tight">
                            {item.title}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate leading-snug">
                            {item.desc}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. About (Routes to /about) */}
            <button
              type="button"
              onClick={() => navigate("/about")}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white/60 transition-all cursor-pointer"
            >
              <NavAboutIcon size={14} className="stroke-[1.8] text-slate-500" />
              <span>{t.nav.about}</span>
            </button>
          </nav>

          {/* ── DESKTOP RIGHT: LANGUAGE SELECTOR & SIGN IN (lg:flex) ── */}
          <div className="hidden lg:flex items-center gap-2.5 shrink-0">
            {/* Language Selector */}
            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                id="tron-landing-language-button"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                aria-label="Select Language"
                aria-haspopup="listbox"
                aria-expanded={langMenuOpen}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full tron-liquid-pill text-xs font-semibold text-slate-700 hover:text-blue-600 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-medium">{currentLangObj.nativeName}</span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform ${
                    langMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {langMenuOpen && (
                <div
                  role="listbox"
                  className="absolute right-0 mt-2 w-44 rounded-2xl tron-liquid-glass p-1.5 shadow-2xl z-50 text-xs animate-fadeIn"
                  style={{
                    background: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(24px)",
                  }}
                >
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Language / 言語
                  </div>
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      id={`tron-landing-lang-${l.code}`}
                      type="button"
                      role="option"
                      aria-selected={currentLang === l.code}
                      onClick={() => handleSelectLang(l.code)}
                      className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-left hover:bg-blue-50/80 transition-colors cursor-pointer ${
                        currentLang === l.code
                          ? "font-bold text-blue-600 bg-blue-50/60"
                          : "text-slate-700 font-medium"
                      }`}
                    >
                      <span className="text-xs">{l.nativeName}</span>
                      {currentLang === l.code && (
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sign In Button / Open Chat */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/chat")}
                  className="px-4 py-2 rounded-full text-xs font-bold text-white tron-primary-cta flex items-center gap-1.5 cursor-pointer"
                >
                  <AiChatIcon size={14} className="stroke-[2]" />
                  <span>{lang === "ja" ? "チャットを開く" : "Open Chat"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center shadow-xs cursor-pointer hover:border-blue-400 transition-colors"
                  title={user.name}
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full tron-liquid-pill text-xs font-semibold text-slate-700 hover:text-blue-600 cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-blue-500" />
                <span>{t.nav.signIn}</span>
              </button>
            )}
          </div>

          {/* ── MOBILE RIGHT CONTROLS: LANGUAGE SELECTOR & HAMBURGER (lg:hidden) ── */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:hidden shrink-0">
            {/* Mobile Language Selector Pill */}
            <div className="relative" ref={mobileLangMenuRef}>
              <button
                type="button"
                id="tron-landing-language-button-mobile"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                aria-label="Select Language"
                aria-haspopup="listbox"
                aria-expanded={langMenuOpen}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full tron-liquid-pill text-[11px] sm:text-xs font-semibold text-slate-700 hover:text-blue-600 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="font-medium text-[11px] sm:text-xs">{currentLangObj.nativeName}</span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform ${
                    langMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {langMenuOpen && (
                <div
                  role="listbox"
                  className="absolute right-0 mt-2 w-44 rounded-2xl tron-liquid-glass p-1.5 shadow-2xl z-50 text-xs animate-fadeIn"
                  style={{
                    background: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(24px)",
                  }}
                >
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Language / 言語
                  </div>
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      id={`tron-landing-mobile-lang-${l.code}`}
                      type="button"
                      role="option"
                      aria-selected={currentLang === l.code}
                      onClick={() => handleSelectLang(l.code)}
                      className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-left hover:bg-blue-50/80 transition-colors cursor-pointer ${
                        currentLang === l.code
                          ? "font-bold text-blue-600 bg-blue-50/60"
                          : "text-slate-700 font-medium"
                      }`}
                    >
                      <span className="text-xs">{l.nativeName}</span>
                      {currentLang === l.code && (
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-full text-slate-700 hover:text-slate-900 tron-liquid-pill cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── MOBILE NAV DRAWER ── */}
      {isMobileMenuOpen && (
        <div className="lg:hidden pointer-events-auto mt-2 mx-auto max-w-[1780px] px-4 pt-3 pb-5 rounded-2xl tron-liquid-glass space-y-3 animate-fadeIn shadow-2xl">
          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate("/chat");
              }}
              className="p-2.5 rounded-xl bg-white/90 border border-slate-200/80 text-left text-slate-800 flex items-center gap-2"
            >
              <AiChatIcon size={16} className="text-blue-500" />
              <span>AI Chat</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate("/voice");
              }}
              className="p-2.5 rounded-xl bg-white/90 border border-slate-200/80 text-left text-slate-800 flex items-center gap-2"
            >
              <AiVoiceIcon size={16} className="text-purple-500" />
              <span>AI Voice</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate("/career/interview");
              }}
              className="p-2.5 rounded-xl bg-white/90 border border-slate-200/80 text-left text-slate-800 flex items-center gap-2"
            >
              <InterviewPracticeIcon size={16} className="text-pink-500" />
              <span>Interview</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate("/career/cv-builder");
              }}
              className="p-2.5 rounded-xl bg-white/90 border border-slate-200/80 text-left text-slate-800 flex items-center gap-2"
            >
              <CreateCvIcon size={16} className="text-orange-500" />
              <span>Create CV</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Language
            </span>
            <div className="flex flex-wrap gap-1">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => handleSelectLang(l.code)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                    currentLang === l.code
                      ? "bg-blue-600 text-white"
                      : "bg-white/80 text-slate-700"
                  }`}
                >
                  {l.nativeName}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/80">
            {isAuthenticated && user ? (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate("/chat");
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white tron-primary-cta flex items-center justify-center gap-2"
              >
                <AiChatIcon size={16} className="stroke-[2]" />
                <span>{lang === "ja" ? "チャットを開く" : "Open Chat"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onSignIn();
                }}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200"
              >
                {t.nav.signIn}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default LandingNavbar;
