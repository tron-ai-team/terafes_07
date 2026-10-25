import React from 'react';
import { ArrowUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { LANGUAGES, SupportedLanguage } from '../../locales';

export const LandingFooter: React.FC = () => {
  const navigate = useNavigate();
  const { selectedLanguage, setSelectedLanguage } = useApp();
  const { t, lang, setLang } = useTranslation();

  const currentLang = selectedLanguage || lang;

  const handleSelectLang = (newLang: SupportedLanguage) => {
    setSelectedLanguage(newLang);
    setLang(newLang);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="relative bg-white border-t border-slate-200/80 pt-16 pb-12 overflow-hidden text-left" aria-label="TRON AI Footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-100">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-400 flex items-center justify-center shadow-md shadow-cyan-500/20 overflow-hidden bg-white p-1">
                <img src="/images/assets/tron-logo.png" alt="TRON AI Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-extrabold font-heading text-slate-900">
                TRON <span className="text-blue-600">AI</span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 max-w-sm leading-relaxed">
              {t.footer.tagline}
            </p>

            {/* 5-Language Switcher */}
            <div className="flex flex-col gap-2 pt-2">
              <span className="text-xs font-semibold text-slate-400">{t.topbar.language}:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    id={`footer-lang-${l.code}`}
                    onClick={() => handleSelectLang(l.code)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      currentLang === l.code
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {l.nativeName}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-heading">
              {t.footer.product}
            </h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>
                <button onClick={() => navigate('/chat')} className="hover:text-blue-600 transition-colors">
                  {t.footer.chatModule}
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/voice')} className="hover:text-blue-600 transition-colors">
                  {t.footer.voiceModule}
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/career/interview')} className="hover:text-blue-600 transition-colors">
                  {t.footer.interviewModule}
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/workspace/agent')} className="hover:text-blue-600 transition-colors">
                  {t.footer.codingModule}
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/career')} className="hover:text-blue-600 transition-colors">
                  {t.footer.careerModule}
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-heading">
              {t.footer.resources}
            </h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>
                <a href="#models" className="hover:text-blue-600 transition-colors">
                  {t.nav.aiModels}
                </a>
              </li>
              <li>
                <a href="#help" className="hover:text-blue-600 transition-colors">
                  {t.footer.docs}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-blue-600 transition-colors">
                  {t.footer.guides}
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-blue-600 transition-colors">
                  {t.howItWorks.badge}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Company & Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-heading">
              {t.footer.company}
            </h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>
                <a href="#about" className="hover:text-blue-600 transition-colors">
                  {t.footer.about}
                </a>
              </li>
              <li>
                <button onClick={() => navigate('/about')} className="hover:text-blue-600 transition-colors">
                  Platform Architecture
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/help')} className="hover:text-blue-600 transition-colors">
                  Help Center
                </button>
              </li>
              <li>
                <span className="text-slate-400">TRON AI Unified v4.0</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar with copyright and back to top */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>{t.footer.copyright}</div>
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </footer>
  );
};
