import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp, AppMode } from '../../context/AppContext';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../../utils/languageResolver';
import {
  MessageCircle,
  Mic,
  LayoutGrid,
  Briefcase,
  User,
  Globe,
  Wifi,
  WifiOff,
  ChevronDown,
  Check,
} from 'lucide-react';
import { GlobalAiModeSelector } from '../common/GlobalAiModeSelector';

export const TopBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    isAuthenticated,
    selectedLanguage,
    setSelectedLanguage,
    uiLocale,
    activeMode,
    setActiveMode,
    backendStatus,
    backendMessage,
  } = useApp();

  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && langMenuOpen) {
        setLangMenuOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [langMenuOpen]);

  // Determine current active mode based on route
  const getCurrentMode = (): AppMode => {
    if (location.pathname.startsWith('/chat')) return 'chat';
    if (location.pathname.startsWith('/voice')) return 'voice';
    if (
      location.pathname.startsWith('/career') ||
      location.pathname.startsWith('/interview') ||
      location.pathname.startsWith('/cv') ||
      location.pathname.startsWith('/history')
    ) {
      return 'career';
    }
    if (
      location.pathname.startsWith('/workspace') ||
      location.pathname.startsWith('/agent') ||
      location.pathname.startsWith('/dashboard')
    ) {
      return 'workspace';
    }
    return activeMode;
  };

  const currentMode = getCurrentMode();

  const handleModeSwitch = (mode: AppMode) => {
    if (location.pathname.includes('/interview/room')) {
      const confirmLeave = window.confirm(
        'An interview session is currently active. Are you sure you want to switch modes? Your completed answers are saved in your session.'
      );
      if (!confirmLeave) return;
    }

    setActiveMode(mode);
    switch (mode) {
      case 'chat':
        navigate('/chat');
        break;
      case 'voice':
        navigate('/voice');
        break;
      case 'workspace':
        navigate('/workspace');
        break;
      case 'career':
      case 'interview':
        navigate('/career');
        break;
      case 'agent':
        navigate('/workspace/agent');
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
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 py-3 bg-white/45 backdrop-blur-xl border-b border-blue-50/80">
      {/* Left: Backend Status pill badge */}
      <div className="flex-1 flex items-center">
        <div
          className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
            backendStatus === 'connected'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50/80 text-amber-700 border-amber-200/80'
          }`}
          title={backendMessage}
        >
          {backendStatus === 'connected' ? (
            <Wifi className="w-3 h-3 text-emerald-500" />
          ) : (
            <WifiOff className="w-3 h-3 text-amber-500" />
          )}
          <span>{backendStatus === 'connected' ? 'TRON Core Online' : 'TRON Core Offline (Client Mode)'}</span>
        </div>
      </div>

      {/* Center: TWO SEPARATE VISUAL GROUPS: [Chat | Voice | Workspace] + [💼 Career Center] */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 md:gap-3.5">
        {/* Group 1: Primary Core Modes Segmented Control */}
        <div className="flex items-center p-1 rounded-2xl bg-white/95 backdrop-blur-2xl border border-[#D6E6F7] shadow-md shadow-blue-500/5">
          {/* Tab 1: Chat */}
          <button
            onClick={() => handleModeSwitch('chat')}
            className={`
              flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200
              ${currentMode === 'chat'
                ? 'bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-blue-50/60'
              }
            `}
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">
              {uiLocale === 'ja' ? 'チャット' : 'Chat'}
            </span>
          </button>

          {/* Tab 2: Voice */}
          <button
            onClick={() => handleModeSwitch('voice')}
            className={`
              flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200
              ${currentMode === 'voice'
                ? 'bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-blue-50/60'
              }
            `}
          >
            <Mic className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">
              {uiLocale === 'ja' ? '音声' : 'Voice'}
            </span>
          </button>

          {/* Tab 3: Workspace */}
          <button
            onClick={() => handleModeSwitch('workspace')}
            className={`
              flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200
              ${currentMode === 'workspace'
                ? 'bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white shadow-md shadow-blue-500/25 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-blue-50/60'
              }
            `}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">
              {uiLocale === 'ja' ? 'ワークスペース' : 'Workspace'}
            </span>
          </button>
        </div>

        {/* Group 2: Visually Separate Career Center Button */}
        <button
          onClick={() => handleModeSwitch('career')}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 shadow-md
            ${currentMode === 'career'
              ? 'bg-gradient-to-r from-[#008CFF] to-[#0066FF] text-white shadow-blue-500/25 ring-2 ring-blue-400/40 scale-[1.02]'
              : 'bg-white/95 backdrop-blur-2xl border border-[#D6E6F7] text-slate-700 hover:text-blue-600 hover:border-blue-300 shadow-blue-500/5 hover:bg-blue-50/40'
            }
          `}
          title="Open Career Center"
        >
          <Briefcase className={`w-4 h-4 shrink-0 ${currentMode === 'career' ? 'text-white' : 'text-blue-600'}`} />
          <span className="whitespace-nowrap font-display tracking-tight">
            {uiLocale === 'ja' ? 'キャリアセンター' : 'Career Center'}
          </span>
        </button>
      </div>

      {/* Right Controls: Centralized Global AI Mode Selector, Single Experience Language Selector & User Profile */}
      <div className="flex-1 flex items-center justify-end gap-2.5">
        {/* Global AI Mode Selector (AUTO | FAST | SMART | ULTRA PRO MAX) */}
        <GlobalAiModeSelector />

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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-[#E2EEF8] text-xs font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-200 shadow-2xs transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
            title={`TRON AI Experience Language: ${currentLangObj.nativeName}`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-medium">{currentLangObj.nativeName}</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                langMenuOpen ? 'rotate-180' : ''
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
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-blue-50/80 transition-colors focus:outline-hidden focus-visible:bg-blue-50 focus-visible:ring-1 focus-visible:ring-blue-400 ${
                    selectedLanguage === l.code
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
    </header>
  );
};
