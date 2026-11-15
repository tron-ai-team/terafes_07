import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useApp, AppMode } from '../../context/AppContext';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../../utils/languageResolver';
import { TronLogo } from '../common/TronLogo';
import {
  MessageCircle,
  Mic,
  FileText,
  Sparkles,
  User,
  Globe,
  Wifi,
  WifiOff,
  ChevronDown,
  Check,
  Menu,
} from 'lucide-react';
import {
  AiChatIcon,
  AiVoiceIcon,
  InterviewPracticeIcon,
  CreateCvIcon,
} from '../landing/TronIcons';
import { GlobalAiModeSelector } from '../common/GlobalAiModeSelector';

interface TopBarProps {
  onToggleMobileSidebar?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleMobileSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    isAuthenticated,
    t,
    selectedLanguage,
    setSelectedLanguage,
    uiLocale,
    activeMode,
    setActiveMode,
    backendStatus,
    backendMessage,
  } = useApp();

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileLangMenuOpen, setMobileLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const mobileLangMenuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
      if (mobileLangMenuRef.current && !mobileLangMenuRef.current.contains(e.target as Node)) {
        setMobileLangMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (langMenuOpen) {
          setLangMenuOpen(false);
          buttonRef.current?.focus();
        }
        if (mobileLangMenuOpen) {
          setMobileLangMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [langMenuOpen, mobileLangMenuOpen]);

  // Core product modes only (Workspace / unfinished career tools hidden from public nav)
  type CoreNavMode = 'chat' | 'voice' | 'interview' | 'cv';

  const getCurrentMode = (): CoreNavMode => {
    if (location.pathname.startsWith('/chat')) return 'chat';
    if (location.pathname.startsWith('/voice')) return 'voice';
    if (
      location.pathname.startsWith('/career/cv') ||
      location.pathname === '/cv' ||
      location.pathname.startsWith('/career/profile')
    ) {
      return 'cv';
    }
    if (
      location.pathname.startsWith('/career') ||
      location.pathname.startsWith('/interview') ||
      location.pathname.startsWith('/history')
    ) {
      return 'interview';
    }
    if (activeMode === 'voice') return 'voice';
    if (activeMode === 'interview' || activeMode === 'career') return 'interview';
    return 'chat';
  };

  const currentMode = getCurrentMode();

  const handleModeSwitch = (mode: CoreNavMode) => {
    if (location.pathname.includes('/interview/room')) {
      const confirmLeave = window.confirm(
        'An interview session is currently active. Are you sure you want to switch modes? Your completed answers are saved in your session.'
      );
      if (!confirmLeave) return;
    }

    const mapped: AppMode =
      mode === 'interview' ? 'interview' : mode === 'cv' ? 'career' : mode;
    setActiveMode(mapped);
    switch (mode) {
      case 'chat':
        navigate('/chat');
        break;
      case 'voice':
        navigate('/voice');
        break;
      case 'interview':
        navigate('/career/interview');
        break;
      case 'cv':
        navigate('/career/cv-builder');
        break;
    }
  };

  const currentLangObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  const handleButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setLangMenuOpen(true);
      setTimeout(() => {
        const activeIdx = SUPPORTED_LANGUAGES.findIndex((l) => l.code === selectedLanguage);
        const targetIdx = activeIdx >= 0 ? activeIdx : 0;
        optionRefs.current[targetIdx]?.focus();
      }, 50);
    }
  };

  const handleOptionKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    langCode: SupportedLanguage,
    index: number
  ) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = (index + 1) % SUPPORTED_LANGUAGES.length;
      optionRefs.current[nextIdx]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = (index - 1 + SUPPORTED_LANGUAGES.length) % SUPPORTED_LANGUAGES.length;
      optionRefs.current[prevIdx]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      optionRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      optionRefs.current[SUPPORTED_LANGUAGES.length - 1]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedLanguage(langCode);
      setLangMenuOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-blue-50/80 transition-all">
      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE HEADER EXPERIENCE (< md)
          Faithful reproduction matching the reference image:
          Row 1: Logo + 'Your AI Partner' on left, Language dropdown + Hamburger on right
          Row 2: 4 Core Navigation Tabs (Chat | Voice | Interview | CV)
          Row 3: Connection Status ('TRON Core Online') on left, AI Mode Selector on right
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden flex flex-col w-full gap-2 px-3 pt-2 pb-2">
        {/* Row 1: Header (Logo + Language + Hamburger) */}
        <div className="flex items-center justify-between w-full">
          {/* Left: TRON AI Branding */}
          <Link
            to="/"
            className="flex items-center gap-2 group focus:outline-none"
            title="Return to TRON AI Homepage"
          >
            <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
              <img
                src="/images/assets/tron-logo.png"
                alt="TRON AI Logo"
                className="w-full h-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,180,255,0.45)]"
              />
            </div>
            <div className="flex flex-col justify-center text-left leading-none">
              <span className="text-sm font-black font-heading tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors leading-none">
                TRON <span className="text-blue-600">AI</span>
              </span>
              <span className="text-[8.5px] text-slate-500 font-medium tracking-tight leading-none mt-0.5">
                Your AI Partner
              </span>
            </div>
          </Link>

          {/* Right: Language Selector + Hamburger */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Mobile Language Selector Dropdown */}
            <div className="relative" ref={mobileLangMenuRef}>
              <button
                type="button"
                id="tron-mobile-language-button"
                onClick={() => setMobileLangMenuOpen(!mobileLangMenuOpen)}
                aria-label="Select Experience Language"
                aria-haspopup="listbox"
                aria-expanded={mobileLangMenuOpen}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full tron-liquid-pill text-xs font-semibold text-slate-700 hover:text-blue-600 cursor-pointer shadow-2xs"
              >
                <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="font-medium text-[11px]">{currentLangObj.nativeName}</span>
                <ChevronDown
                  className={`w-3 h-3 text-slate-400 transition-transform ${
                    mobileLangMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {mobileLangMenuOpen && (
                <div
                  role="listbox"
                  className="absolute right-0 mt-1.5 w-40 rounded-2xl bg-white/95 backdrop-blur-2xl border border-blue-100/90 shadow-2xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95"
                >
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Language / 言語
                  </div>
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      id={`tron-mobile-lang-option-${l.code}`}
                      type="button"
                      role="option"
                      aria-selected={selectedLanguage === l.code}
                      onClick={() => {
                        setSelectedLanguage(l.code);
                        setMobileLangMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-blue-50/80 transition-colors cursor-pointer ${
                        selectedLanguage === l.code
                          ? 'font-bold text-blue-600 bg-blue-50/50'
                          : 'text-slate-700'
                      }`}
                    >
                      <span className="text-xs">{l.nativeName}</span>
                      {selectedLanguage === l.code && (
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Hamburger Menu Button (opens History/New Chat sidebar) */}
            <button
              type="button"
              id="tron-mobile-sidebar-hamburger"
              onClick={onToggleMobileSidebar}
              className="p-1.5 rounded-full tron-liquid-pill text-slate-700 hover:text-slate-900 cursor-pointer shadow-2xs"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: 4 Core Navigation Tabs (Chat | Voice | Interview | CV) */}
        <div className="grid grid-cols-4 gap-1 p-0.5 rounded-xl bg-slate-100/70 border border-slate-200/60 shadow-inner">
          <button
            type="button"
            onClick={() => handleModeSwitch('chat')}
            className={`flex items-center justify-center gap-1 py-1.5 px-0.5 sm:px-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
              currentMode === 'chat'
                ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AiChatIcon size={14} className={currentMode === 'chat' ? 'text-white' : 'text-blue-600'} />
            <span className="truncate">{uiLocale === 'ja' ? 'チャット' : 'Chat'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('voice')}
            className={`flex items-center justify-center gap-1 py-1.5 px-0.5 sm:px-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
              currentMode === 'voice'
                ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AiVoiceIcon size={14} className={currentMode === 'voice' ? 'text-white' : 'text-purple-600'} />
            <span className="truncate">{uiLocale === 'ja' ? '音声' : 'Voice'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('interview')}
            className={`flex items-center justify-center gap-1 py-1.5 px-0.5 sm:px-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
              currentMode === 'interview'
                ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <InterviewPracticeIcon size={14} className={currentMode === 'interview' ? 'text-white' : 'text-pink-600'} />
            <span className="truncate">{uiLocale === 'ja' ? '面接' : 'Interview'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('cv')}
            className={`flex items-center justify-center gap-1 py-1.5 px-0.5 sm:px-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
              currentMode === 'cv'
                ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreateCvIcon size={14} className={currentMode === 'cv' ? 'text-white' : 'text-orange-600'} />
            <span className="truncate">{uiLocale === 'ja' ? '履歴書' : 'CV'}</span>
          </button>
        </div>

        {/* Row 3: Backend Connection Status (Left) & AI Mode Selector (Right) */}
        <div className="flex items-center justify-between w-full px-0.5">
          {/* Left: Backend Status */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-all ${
              backendStatus === 'connected'
                ? 'bg-emerald-50/90 text-emerald-700 border-emerald-200/80 shadow-2xs'
                : backendStatus === 'checking'
                  ? 'bg-slate-50 text-slate-600 border-slate-200'
                  : 'bg-amber-50/90 text-amber-700 border-amber-200/80'
            }`}
            title={backendMessage}
          >
            {backendStatus === 'connected' ? (
              <Wifi className="w-3 h-3 text-emerald-500 shrink-0" />
            ) : backendStatus === 'checking' ? (
              <Wifi className="w-3 h-3 text-slate-400 animate-pulse shrink-0" />
            ) : (
              <WifiOff className="w-3 h-3 text-amber-500 shrink-0" />
            )}
            <span>
              {backendStatus === 'connected'
                ? 'TRON Core Online'
                : backendStatus === 'checking'
                  ? 'Connecting…'
                  : 'TRON Core Offline'}
            </span>
          </div>

          {/* Right: AI Mode Selector */}
          <GlobalAiModeSelector compact />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP MASTER TOP BAR (>= md)
          100% PRESERVED APPROVED DESKTOP ARCHITECTURE & LAYOUT
          ══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex items-center justify-between w-full px-6 py-3">
        {/* Left: Desktop status pill badge */}
        <div className="flex-1 flex items-center min-w-0">
          <div
            className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
              backendStatus === 'connected'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : backendStatus === 'checking'
                  ? 'bg-slate-50 text-slate-600 border-slate-200'
                  : 'bg-amber-50/80 text-amber-700 border-amber-200/80'
            }`}
            title={backendMessage}
          >
            {backendStatus === 'connected' ? (
              <Wifi className="w-3 h-3 text-emerald-500" />
            ) : backendStatus === 'checking' ? (
              <Wifi className="w-3 h-3 text-slate-400 animate-pulse" />
            ) : (
              <WifiOff className="w-3 h-3 text-amber-500" />
            )}
            <span>
              {backendStatus === 'connected'
                ? 'TRON Core Online'
                : backendStatus === 'checking'
                  ? 'Connecting…'
                  : 'TRON Core Offline (Client Mode)'}
            </span>
          </div>
        </div>

        {/* Center: four core features — Chat | Voice | Interview | CV */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 md:gap-3.5 shrink-0">
          <div className="flex items-center p-0.5 sm:p-1 rounded-xl sm:rounded-2xl bg-white/95 backdrop-blur-2xl border border-[#D6E6F7] shadow-md shadow-blue-500/5">
            <button
              type="button"
              onClick={() => handleModeSwitch('chat')}
              className={`
                flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer
                ${currentMode === 'chat'
                  ? 'bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-blue-50/60'
                }
              `}
              title={t.topbar.chat}
            >
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">
                {t.topbar.chat}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleModeSwitch('voice')}
              className={`
                flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer
                ${currentMode === 'voice'
                  ? 'bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-blue-50/60'
                }
              `}
              title={t.topbar.voice}
            >
              <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">
                {t.topbar.voice}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleModeSwitch('interview')}
              className={`
                flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer
                ${currentMode === 'interview'
                  ? 'bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-blue-50/60'
                }
              `}
              title={uiLocale === 'ja' ? '面接練習' : 'Interview Practice'}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">
                {uiLocale === 'ja' ? '面接' : 'Interview'}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleModeSwitch('cv')}
            className={`
              flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-bold transition-all duration-200 shadow-md cursor-pointer
              ${currentMode === 'cv'
                ? 'bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white shadow-blue-500/25 ring-2 ring-blue-400/40 scale-[1.02]'
                : 'bg-white/95 backdrop-blur-2xl border border-[#D6E6F7] text-slate-700 hover:text-blue-600 hover:border-blue-300 shadow-blue-500/5 hover:bg-blue-50/40'
              }
            `}
            title={uiLocale === 'ja' ? 'AI履歴書ビルダー' : 'AI CV Builder'}
          >
            <FileText className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${currentMode === 'cv' ? 'text-white' : 'text-blue-600'}`} />
            <span className="hidden md:inline whitespace-nowrap font-display tracking-tight">
              {uiLocale === 'ja' ? '履歴書' : 'CV Builder'}
            </span>
            <span className="md:hidden hidden sm:inline whitespace-nowrap font-display tracking-tight">
              CV
            </span>
          </button>
        </div>

        {/* Right Controls: Centralized Global AI Mode Selector, Single Experience Language Selector & User Profile */}
        <div className="flex-1 flex items-center justify-end gap-1.5 sm:gap-2.5 min-w-0">
          {/* Global AI Mode Selector (AUTO | FAST | SMART | ULTRA PRO MAX) */}
          <GlobalAiModeSelector compact />

          {/* Single Global Experience Language Selector */}
          <div className="relative" ref={langMenuRef}>
            <button
              ref={buttonRef}
              type="button"
              id="tron-global-language-button"
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              onKeyDown={handleButtonKeyDown}
              aria-label="Select Experience Language"
              aria-haspopup="listbox"
              aria-expanded={langMenuOpen}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-white/80 border border-[#E2EEF8] text-xs font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-200 shadow-2xs transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
              title={`TRON AI Experience Language: ${currentLangObj.nativeName}`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="font-medium hidden sm:inline">{currentLangObj.nativeName}</span>
              <span className="font-bold sm:hidden uppercase text-[10px]">{currentLangObj.code}</span>
              <ChevronDown
                className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${langMenuOpen ? 'rotate-180' : ''
                  }`}
              />
            </button>

            {langMenuOpen && (
              <div
                role="listbox"
                id="tron-global-language-menu"
                aria-label="Experience Language Options"
                className="absolute right-0 mt-2 w-44 rounded-2xl bg-white/95 backdrop-blur-xl border border-[#D6E6F7] shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
              >
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Language / 言語
                </div>
                {SUPPORTED_LANGUAGES.map((l, index) => (
                  <button
                    key={l.code}
                    id={`tron-lang-option-${l.code}`}
                    ref={(el) => {
                      optionRefs.current[index] = el;
                    }}
                    role="option"
                    type="button"
                    aria-selected={selectedLanguage === l.code}
                    tabIndex={0}
                    onClick={() => {
                      setSelectedLanguage(l.code);
                      setLangMenuOpen(false);
                      buttonRef.current?.focus();
                    }}
                    onKeyDown={(e) => handleOptionKeyDown(e, l.code, index)}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-blue-50/80 transition-colors focus:outline-hidden focus-visible:bg-blue-50 focus-visible:ring-1 focus-visible:ring-blue-400 ${selectedLanguage === l.code
                        ? 'font-bold text-blue-600 bg-blue-50/50'
                        : 'text-slate-700 font-medium'
                      }`}
                  >
                    <span className="text-xs">{l.nativeName}</span>
                    {selectedLanguage === l.code && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile Avatar Button */}
          <button
            onClick={() => navigate(isAuthenticated ? '/profile' : '/auth')}
            className="w-9 h-9 rounded-full bg-white/90 border border-[#E2EEF8] flex items-center justify-center text-slate-600 hover:text-blue-600 hover:border-blue-300 shadow-2xs transition-all"
            title={isAuthenticated ? user?.name : 'Account'}
          >
            {isAuthenticated && user ? (
              <span className="font-bold text-xs text-blue-600">{user.name.charAt(0).toUpperCase()}</span>
            ) : (
              <User className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
