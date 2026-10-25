import React, { useState, useRef, useEffect, useId } from 'react';
import { useApp } from '../../context/AppContext';
import { AI_MODES } from '../../config/aiModes';
import { AiMode } from '../../types/aiProfile';
import {
  Sparkles,
  Zap,
  Brain,
  Rocket,
  ChevronDown,
  Check,
  Clock,
  Coins,
  Settings,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface GlobalAiModeSelectorProps {
  className?: string;
  compact?: boolean;
}

export const GlobalAiModeSelector: React.FC<GlobalAiModeSelectorProps> = ({
  className = '',
  compact = false,
}) => {
  const {
    selectedAiMode,
    setSelectedAiMode,
    ultraCredits,
    setAdvancedAiModalOpen,
    uiLocale,
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownId = useId();

  const activeDef = AI_MODES[selectedAiMode] || AI_MODES.SMART;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getModeIcon = (mode: AiMode, size = 'w-3.5 h-3.5') => {
    switch (mode) {
      case 'AUTO':
        return <Sparkles className={`${size} text-blue-500`} />;
      case 'FAST':
        return <Zap className={`${size} text-cyan-500 fill-cyan-500/20`} />;
      case 'SMART':
        return <Brain className={`${size} text-indigo-500`} />;
      case 'ULTRA':
        return <Rocket className={`${size} text-purple-600 fill-purple-600/10`} />;
    }
  };

  const getThemeClasses = (mode: AiMode) => {
    switch (mode) {
      case 'ULTRA':
        return {
          pill: 'bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-purple-300/80 text-purple-900 shadow-sm hover:border-purple-400',
          badge: 'bg-purple-100 text-purple-800 border-purple-200',
          ring: 'focus-visible:ring-purple-400',
        };
      case 'SMART':
        return {
          pill: 'bg-indigo-50/80 border-indigo-200 text-indigo-900 hover:border-indigo-300',
          badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          ring: 'focus-visible:ring-indigo-400',
        };
      case 'FAST':
        return {
          pill: 'bg-cyan-50/80 border-cyan-200 text-cyan-900 hover:border-cyan-300',
          badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
          ring: 'focus-visible:ring-cyan-400',
        };
      case 'AUTO':
      default:
        return {
          pill: 'bg-blue-50/80 border-blue-200 text-blue-900 hover:border-blue-300',
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          ring: 'focus-visible:ring-blue-400',
        };
    }
  };

  const currentTheme = getThemeClasses(selectedAiMode);

  return (
    <div ref={containerRef} className={`relative inline-block text-left select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id="tron-global-ai-mode-selector-button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={dropdownId}
        aria-label={`Current AI Mode: ${activeDef.displayName}. Click to change.`}
        className={`
          group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold
          border backdrop-blur-xl transition-all duration-200 cursor-pointer
          hover:shadow-sm focus:outline-none focus-visible:ring-2
          ${currentTheme.pill} ${currentTheme.ring}
        `}
      >
        <span className="shrink-0">{getModeIcon(selectedAiMode, 'w-3.5 h-3.5')}</span>
        <span className="truncate tracking-tight font-display">{activeDef.displayName}</span>

        {/* Display credits badge if in ULTRA mode */}
        {selectedAiMode === 'ULTRA' && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-extrabold bg-purple-200/80 text-purple-900 border border-purple-300 shrink-0">
            {ultraCredits.remaining}/{ultraCredits.total}
          </span>
        )}

        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : 'group-hover:text-slate-600'
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          id={dropdownId}
          role="listbox"
          aria-label="TRON AI Intelligence Modes"
          className="
            absolute right-0 sm:right-auto sm:left-0 top-full mt-2 z-50 w-80 sm:w-88 rounded-3xl
            bg-white/98 backdrop-blur-2xl border border-[#D6E6F7]
            shadow-2xl shadow-blue-500/15 p-2.5 text-left animate-in fade-in-0 zoom-in-95 duration-150
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 mb-2">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
                TRON Intelligence
              </span>
              <h4 className="text-xs font-bold text-slate-800">
                {uiLocale === 'ja' ? 'グローバルAIモード選択' : 'Select AI Mode'}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{uiLocale === 'ja' ? 'リアルタイム連動' : 'Active Everywhere'}</span>
            </div>
          </div>

          {/* Mode Options List */}
          <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
            {(Object.keys(AI_MODES) as AiMode[]).map((modeKey) => {
              const mode = AI_MODES[modeKey];
              const isSelected = selectedAiMode === modeKey;
              const isUltra = modeKey === 'ULTRA';

              return (
                <button
                  key={modeKey}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setSelectedAiMode(modeKey);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-start justify-between p-3 rounded-2xl text-left transition-all duration-150 cursor-pointer
                    ${
                      isSelected
                        ? isUltra
                          ? 'bg-purple-50/90 border border-purple-300 shadow-xs'
                          : 'bg-blue-50/90 border border-blue-300 shadow-xs'
                        : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'
                    }
                  `}
                >
                  <div className="flex items-start gap-2.5 min-w-0 pr-2">
                    <div className="mt-0.5 shrink-0 p-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                      {getModeIcon(modeKey, 'w-4 h-4')}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-extrabold text-slate-900 font-display">
                          {mode.displayName}
                        </span>

                        {mode.badgeText && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                              isUltra
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {mode.badgeText}
                          </span>
                        )}

                        {/* Availability Pill */}
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono text-emerald-700 bg-emerald-50 border border-emerald-200">
                          {mode.status}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-snug mt-1 font-medium">
                        {mode.shortDesc}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400 font-mono">
                        <span>Model: {mode.model}</span>
                        <span>•</span>
                        <span>{mode.provider}</span>
                      </div>

                      {/* Ultra Credits Info if applicable */}
                      {isUltra && (
                        <div className="mt-2 pt-2 border-t border-purple-100 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1 font-bold text-purple-900">
                            <Coins className="w-3 h-3 text-purple-600" />
                            <span>
                              {ultraCredits.remaining} of {ultraCredits.total} credits remaining
                            </span>
                          </div>
                          <span className="text-[10px] text-purple-600 font-mono">
                            {ultraCredits.resetTime}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-0.5 shrink-0 text-blue-600">
                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Controls: Advanced Settings & Usage */}
          <div className="mt-2 pt-2 border-t border-slate-100 px-1 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setAdvancedAiModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 hover:text-blue-600 transition-colors p-1.5 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>{uiLocale === 'ja' ? '詳細AI設定' : 'Advanced AI Settings'}</span>
            </button>

            <span className="text-[10px] text-slate-400 font-mono">
              TRON Gateway v1.4
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
