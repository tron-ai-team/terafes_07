import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Menu, X, Globe, ChevronDown, Check, User, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { LANGUAGES, SupportedLanguage } from '../../locales';

interface LandingNavbarProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export const LandingNavbar: React.FC<LandingNavbarProps> = ({
  onGetStarted,
  onSignIn,
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, selectedLanguage, setSelectedLanguage } = useApp();
  const { t, lang, setLang } = useTranslation();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeLink, setActiveLink] = useState('Home');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const currentLang = selectedLanguage || lang;

  const handleSelectLang = (newLang: SupportedLanguage) => {
    setSelectedLanguage(newLang);
    setLang(newLang);
    setLangMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { label: t.nav.home, href: '#hero', id: 'Home' },
    { label: t.nav.features, href: '#features', id: 'Features' },
    { label: t.nav.aiModels, href: '#models', id: 'AI Models' },
    { label: t.nav.pricing, href: '#pricing', id: 'Pricing' },
    { label: t.nav.about, href: '#about', id: 'About' },
    { label: t.nav.help, href: '#help', id: 'Help' },
  ];

  const currentLangObj = LANGUAGES.find((l) => l.code === currentLang) || LANGUAGES[0];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/85 backdrop-blur-xl border-b border-cyan-100/70 shadow-[0_4px_25px_rgba(0,102,255,0.06)] py-3'
          : 'bg-white/60 backdrop-blur-md py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* LEFT: LOGO */}
          <a
            href="#hero"
            className="flex items-center gap-3 group focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl p-1"
          >
            <div className="relative w-10 h-10 rounded-full flex items-center justify-center shadow-md shadow-cyan-500/25 group-hover:scale-105 transition-transform overflow-hidden bg-white">
              <img 
                src="/images/assets/tron-logo.png" 
                alt="TRON AI Logo" 
                className="w-full h-full object-contain filter drop-shadow" 
              />
            </div>

            <div className="flex flex-col text-left">
              <span className="text-xl font-extrabold font-heading tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors leading-none">
                TRON <span className="text-blue-600">AI</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium tracking-tight mt-1 hidden sm:inline leading-none">
                Your AI Partner for a Brighter Future
              </span>
            </div>
          </a>

          {/* CENTER: DESKTOP NAVIGATION */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/80 shadow-sm">
            {navLinks.map((link) => {
              const isActive = activeLink === link.id;
              return (
                <a
                  key={link.id}
                  href={link.href}
                  onClick={() => setActiveLink(link.id)}
                  className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-sky-100 text-blue-600 shadow-xs'
                      : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* RIGHT: CONTROLS */}
          <div className="hidden sm:flex items-center gap-3">
            
            {/* Language Dropdown */}
            <div className="relative" ref={langMenuRef}>
              <button
                type="button"
                id="tron-landing-language-button"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                aria-label="Select Language"
                aria-haspopup="listbox"
                aria-expanded={langMenuOpen}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:border-blue-300 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-medium">{currentLangObj.nativeName}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${langMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {langMenuOpen && (
                <div
                  role="listbox"
                  className="absolute right-0 mt-2 w-44 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl py-1.5 z-50 text-xs animate-fadeIn"
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
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-blue-50/80 transition-colors ${
                        currentLang === l.code ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700 font-medium'
                      }`}
                    >
                      <span className="text-xs">{l.nativeName}</span>
                      {currentLang === l.code && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auth Buttons */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/workspace')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>{t.common.openWorkspace}</span>
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs flex items-center justify-center shadow-xs"
                  title={user.name}
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={onSignIn}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-blue-600 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-all"
                >
                  {t.nav.signIn}
                </button>
                <button
                  onClick={onGetStarted}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-md shadow-blue-500/20 transition-all flex items-center gap-1"
                >
                  <span>{t.nav.getStarted}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

          </div>

          {/* MOBILE MENU BUTTON */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-white border border-slate-200"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* MOBILE NAV DRAWER */}
      {isMobileMenuOpen && (
        <div className="sm:hidden px-4 pt-3 pb-6 bg-white/95 backdrop-blur-2xl border-b border-slate-200 shadow-xl space-y-4 animate-fadeIn">
          <nav className="flex flex-col space-y-2 text-left">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                onClick={() => {
                  setActiveLink(link.id);
                  setIsMobileMenuOpen(false);
                }}
                className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Mobile Language Switcher */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => handleSelectLang(l.code)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  currentLang === l.code ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {l.nativeName}
              </button>
            ))}
          </div>

          {/* Mobile Auth Actions */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            {isAuthenticated && user ? (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate('/workspace');
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 flex items-center justify-center gap-2 shadow-sm"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>{t.common.openWorkspace}</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onSignIn();
                  }}
                  className="py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100"
                >
                  {t.nav.signIn}
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onGetStarted();
                  }}
                  className="py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600"
                >
                  {t.nav.getStarted}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
