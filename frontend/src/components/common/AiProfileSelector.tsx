import React, { useState, useRef, useEffect, useId } from 'react';
import {
  Zap,
  Brain,
  Lock,
  ChevronDown,
  Check,
  Sparkles,
  Cloud,
  Bot,
  AlertCircle,
  Rocket,
  Coins,
} from 'lucide-react';
import { AiProfile, AiProfileDefinition } from '../../types/aiProfile';

export interface AiProfileSelectorProps {
  selectedProfile: AiProfile;
  onChange: (profile: AiProfile) => void;
  locked?: boolean;
  availableProfiles?: AiProfileDefinition[];
  compact?: boolean;
  showDescriptions?: boolean;
  placement?: 'top' | 'bottom' | 'auto';
  className?: string;
  label?: string;
  disabledTooltip?: string;
}

// Default profiles matching TRON AI modes
const DEFAULT_PROFILES: AiProfileDefinition[] = [
  {
    id: 'AUTO',
    displayName: 'Auto',
    description: 'Dynamic adaptive routing based on query complexity',
    available: true,
    provider: 'tron_local',
    modelDisplayName: 'TRON Gateway',
    icon: 'sparkles',
  },
  {
    id: 'FAST',
    displayName: 'Fast',
    description: 'Ultra-low latency for everyday conversations',
    available: true,
    provider: 'local',
    modelDisplayName: 'qwen3:8b',
    icon: 'zap',
  },
  {
    id: 'SMART',
    displayName: 'Smart',
    description: 'High-reasoning model for complex code, CV, and interview prep',
    available: true,
    provider: 'local',
    modelDisplayName: 'gemma3:12b',
    icon: 'brain',
  },
  {
    id: 'ULTRA',
    displayName: 'Ultra Pro Max',
    description: 'Frontier model reasoning for autonomous agents (3 of 5 credits remaining)',
    available: true,
    provider: 'cloud',
    modelDisplayName: 'TRON Cloud Gateway',
    icon: 'rocket',
  },
];

export const AiProfileSelector: React.FC<AiProfileSelectorProps> = ({
  selectedProfile,
  onChange,
  locked = false,
  availableProfiles = [],
  showDescriptions = true,
  placement = 'auto',
  className = '',
  disabledTooltip = 'Start a new session to choose another AI model.',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  // Combine backend available profiles with defaults safely
  const profilesToRender: AiProfileDefinition[] =
    availableProfiles && availableProfiles.length > 0
      ? availableProfiles
      : DEFAULT_PROFILES;

  // Resolve normalized profile ID (e.g., QUALITY maps to SMART for display)
  const normalizedId = selectedProfile === 'QUALITY' ? 'SMART' : selectedProfile;

  // Find currently selected definition
  const activeDef =
    profilesToRender.find((p) => p.id === normalizedId || (p.id === 'SMART' && selectedProfile === 'QUALITY')) ||
    DEFAULT_PROFILES.find((p) => p.id === normalizedId || (p.id === 'SMART' && selectedProfile === 'QUALITY')) ||
    profilesToRender[0] ||
    DEFAULT_PROFILES[0];

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

  // Handle keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (locked) return;

    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      if (!isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
    }
  };

  const getProfileIcon = (profileId: string, iconKey?: string, className = 'w-3.5 h-3.5') => {
    if (iconKey === 'rocket' || profileId === 'ULTRA') {
      return <Rocket className={`${className} text-purple-600 fill-purple-600/10`} />;
    }
    if (iconKey === 'zap' || profileId === 'FAST') {
      return <Zap className={`${className} text-cyan-500 fill-cyan-500/20`} />;
    }
    if (iconKey === 'brain' || profileId === 'QUALITY' || profileId === 'SMART') {
      return <Brain className={`${className} text-indigo-500`} />;
    }
    if (iconKey === 'sparkles' || profileId === 'AUTO' || profileId === 'GEMINI') {
      return <Sparkles className={`${className} text-blue-500`} />;
    }
    if (iconKey === 'cloud' || profileId === 'OPENAI' || profileId === 'CLAUDE') {
      return <Cloud className={`${className} text-blue-500`} />;
    }
    return <Bot className={`${className} text-slate-500`} />;
  };

  const getProfileTheme = (profileId: string) => {
    switch (profileId) {
      case 'ULTRA':
        return {
          pillBorder: 'border-purple-200/80 hover:border-purple-300',
          pillBg: 'bg-purple-50/50 hover:bg-purple-50/80',
          pillText: 'text-purple-900',
          glow: 'shadow-purple-500/10',
          badge: 'bg-purple-100 text-purple-800 border-purple-200',
        };
      case 'QUALITY':
      case 'SMART':
        return {
          pillBorder: 'border-indigo-200/80 hover:border-indigo-300',
          pillBg: 'bg-indigo-50/50 hover:bg-indigo-50/80',
          pillText: 'text-indigo-900',
          glow: 'shadow-indigo-500/10',
          badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        };
      case 'AUTO':
        return {
          pillBorder: 'border-blue-200/80 hover:border-blue-300',
          pillBg: 'bg-blue-50/50 hover:bg-blue-50/80',
          pillText: 'text-blue-900',
          glow: 'shadow-blue-500/10',
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case 'FAST':
      default:
        return {
          pillBorder: 'border-cyan-200/80 hover:border-cyan-300',
          pillBg: 'bg-cyan-50/50 hover:bg-cyan-50/80',
          pillText: 'text-cyan-900',
          glow: 'shadow-cyan-500/10',
          badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        };
    }
  };

  const activeTheme = getProfileTheme(activeDef.id);

  // Group profiles: TRON LOCAL vs CLOUD (data-driven)
  const localProfiles = profilesToRender.filter(
    (p) => !p.provider || p.provider === 'local' || p.provider === 'tron_local' || p.id === 'FAST' || p.id === 'QUALITY' || p.id === 'SMART' || p.id === 'AUTO'
  );
  const cloudProfiles = profilesToRender.filter(
    (p) => p.provider === 'cloud' || (p.provider !== 'local' && p.provider !== 'tron_local' && p.id !== 'FAST' && p.id !== 'QUALITY' && p.id !== 'SMART' && p.id !== 'AUTO')
  );

  // Determine popup placement
  const placementClass =
    placement === 'top'
      ? 'bottom-full mb-2'
      : placement === 'bottom'
      ? 'top-full mt-2'
      : 'bottom-full mb-2 sm:bottom-auto sm:top-full sm:mt-2'; // default auto

  // ── Render Locked State ────────────────────────────────────────────────────
  if (locked) {
    return (
      <div
        className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border backdrop-blur-md transition-all select-none cursor-default ${
          activeDef.id === 'QUALITY'
            ? 'bg-purple-50/80 border-purple-200 text-purple-800 shadow-2xs'
            : 'bg-cyan-50/80 border-cyan-200 text-cyan-800 shadow-2xs'
        } ${className}`}
        title={disabledTooltip}
        aria-label={`${activeDef.displayName} AI Model (Locked: ${disabledTooltip})`}
      >
        {getProfileIcon(activeDef.id, activeDef.icon, 'w-3.5 h-3.5')}
        <span>{activeDef.displayName}</span>
        <Lock className="w-3 h-3 text-slate-400 ml-0.5 shrink-0" aria-hidden="true" />
      </div>
    );
  }

  // ── Render Interactive Dropdown Selector ───────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left select-none ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={`Select AI Model. Currently selected: ${activeDef.displayName}`}
        className={`
          group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold
          border bg-white/95 backdrop-blur-xl shadow-2xs transition-all duration-200
          hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008CFF]/40
          ${isOpen ? 'border-[#008CFF] ring-2 ring-[#008CFF]/20' : activeTheme.pillBorder}
          ${activeTheme.pillText}
        `}
      >
        {getProfileIcon(activeDef.id, activeDef.icon, 'w-3.5 h-3.5')}
        <span className="truncate max-w-[120px]">{activeDef.displayName}</span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#008CFF]' : 'group-hover:text-slate-600'
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Available AI Models"
          className={`
            absolute left-0 z-50 w-72 sm:w-80 rounded-2xl
            bg-white/98 backdrop-blur-2xl border border-[#D6E6F7]
            shadow-xl shadow-blue-500/10 p-2 text-left animate-in fade-in-0 zoom-in-95 duration-150
            ${placementClass}
          `}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100/90 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Choose AI Model
            </span>
            <span className="text-[10px] text-slate-400">
              TRON Intelligence
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
            {/* GROUP 1: TRON LOCAL */}
            {localProfiles.length > 0 && (
              <div>
                <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  TRON Local
                </div>
                <div className="space-y-1">
                  {localProfiles.map((profile) => {
                    const isSelected = profile.id === activeDef.id;
                    const isAvailable = profile.available !== false;

                    return (
                      <button
                        key={profile.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={!isAvailable}
                        onClick={() => {
                          if (isAvailable) {
                            onChange(profile.id as AiProfile);
                            setIsOpen(false);
                          }
                        }}
                        className={`
                          w-full flex items-start justify-between p-2.5 rounded-xl text-left transition-all
                          ${
                            isSelected
                              ? 'bg-blue-50/80 border border-blue-200/80 shadow-2xs'
                              : isAvailable
                              ? 'hover:bg-slate-50 border border-transparent hover:border-slate-100'
                              : 'opacity-40 cursor-not-allowed bg-slate-50/50 border border-transparent'
                          }
                        `}
                      >
                        <div className="flex items-start gap-2.5 min-w-0 pr-2">
                          <div className="mt-0.5 shrink-0">
                            {getProfileIcon(profile.id, profile.icon, 'w-4 h-4')}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {profile.displayName}
                              </span>
                              {/* Safe provider badge */}
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono text-slate-500 bg-slate-100 border border-slate-200/60 shrink-0">
                                Local
                              </span>
                            </div>

                            {showDescriptions && profile.description && (
                              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                                {profile.description}
                              </p>
                            )}

                            {!isAvailable && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                <span>{profile.reasonUnavailable || 'Currently unavailable'}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="mt-0.5 shrink-0 text-blue-600">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* GROUP 2: CLOUD MODELS (Data-driven, only rendered if backend defines them) */}
            {cloudProfiles.length > 0 && (
              <div>
                <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-100 mt-1">
                  Cloud
                </div>
                <div className="space-y-1">
                  {cloudProfiles.map((profile) => {
                    const isSelected = profile.id === activeDef.id;
                    const isAvailable = profile.available !== false;

                    return (
                      <button
                        key={profile.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={!isAvailable}
                        onClick={() => {
                          if (isAvailable) {
                            onChange(profile.id as AiProfile);
                            setIsOpen(false);
                          }
                        }}
                        className={`
                          w-full flex items-start justify-between p-2.5 rounded-xl text-left transition-all
                          ${
                            isSelected
                              ? 'bg-blue-50/80 border border-blue-200/80 shadow-2xs'
                              : isAvailable
                              ? 'hover:bg-slate-50 border border-transparent hover:border-slate-100'
                              : 'opacity-40 cursor-not-allowed bg-slate-50/50 border border-transparent'
                          }
                        `}
                      >
                        <div className="flex items-start gap-2.5 min-w-0 pr-2">
                          <div className="mt-0.5 shrink-0">
                            {getProfileIcon(profile.id, profile.icon, 'w-4 h-4')}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {profile.displayName}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono text-blue-600 bg-blue-50 border border-blue-200/60 shrink-0">
                                Cloud
                              </span>
                            </div>

                            {showDescriptions && profile.description && (
                              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                                {profile.description}
                              </p>
                            )}

                            {!isAvailable && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                <span>{profile.reasonUnavailable || 'Currently unavailable'}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="mt-0.5 shrink-0 text-blue-600">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Popover Footer Info */}
          <div className="mt-2 pt-1.5 px-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Locked once conversation starts</span>
            <span className="font-mono text-[9px] text-slate-400">
              {activeDef.modelDisplayName || activeDef.id}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Aliased export for compatibility with either naming convention
export const AiModelSelector = AiProfileSelector;
