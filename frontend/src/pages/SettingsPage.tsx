import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { AI_MODES } from '../config/aiModes';
import { AiMode } from '../types/aiProfile';
import {
  Settings,
  Volume2,
  Globe,
  Mic,
  Bell,
  Shield,
  Cpu,
  Coins,
  Clock,
  Sparkles,
  Zap,
  Brain,
  Rocket,
  Check,
  Server,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { authApi } from '../services/httpClient';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../utils/languageResolver';

export const SettingsPage: React.FC = () => {
  const {
    user,
    selectedLanguage,
    setSelectedLanguage,
    addToast,
    isAuthenticated,
    selectedAiMode,
    setSelectedAiMode,
    ultraCredits,
    setAdvancedAiModalOpen,
    uiLocale,
  } = useApp();

  const [micSensitivity, setMicSensitivity] = useState(75);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [autoTranscribe, setAutoTranscribe] = useState(true);

  const handleSave = async () => {
    if (isAuthenticated) {
      try {
        await authApi.updateSettings({
          preferredLanguage: selectedLanguage,
          preferredAiProfile: selectedAiMode,
        });
      } catch {
        // ignore
      }
    }
    addToast('Preferences saved successfully', 'success');
  };

  const getModeIcon = (mode: AiMode) => {
    switch (mode) {
      case 'AUTO':
        return <Sparkles className="w-4 h-4 text-blue-500" />;
      case 'FAST':
        return <Zap className="w-4 h-4 text-cyan-500" />;
      case 'SMART':
        return <Brain className="w-4 h-4 text-indigo-500" />;
      case 'ULTRA':
        return <Rocket className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 select-none py-2">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure centralized AI intelligence modes, audio recognition, and display languages.
        </p>
      </div>

      <div className="space-y-4">
        {/* Authentication & Security */}
        {isAuthenticated && user && (
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-blue-50">
              <Shield className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-base text-slate-800">Account & Authentication</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Signed in as:</span>
                <div className="font-bold text-slate-800 text-sm">{user.email}</div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Authentication Provider:</span>
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                    {user.authProviders?.includes('GOOGLE') && user.authProviders?.includes('PASSWORD')
                      ? 'Password + Google'
                      : user.authProviders?.includes('GOOGLE')
                      ? 'Google'
                      : 'Password'}
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Centralized AI Mode Selector Card */}
        <GlassCard className="p-6 space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-blue-50 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="font-bold text-base text-slate-800">Centralized AI Intelligence Mode</h3>
                <p className="text-xs text-slate-500">Shared across Chat, Voice, Coding Agent, Browser Agent, and Interview Practice</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAdvancedAiModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Advanced AI Settings</span>
            </button>
          </div>

          {/* Mode Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.keys(AI_MODES) as AiMode[]).map((modeKey) => {
              const mode = AI_MODES[modeKey];
              const isSelected = selectedAiMode === modeKey;
              const isUltra = modeKey === 'ULTRA';

              return (
                <button
                  key={modeKey}
                  type="button"
                  onClick={() => setSelectedAiMode(modeKey)}
                  className={`
                    p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between
                    ${
                      isSelected
                        ? isUltra
                          ? 'bg-purple-50/90 border-purple-400 ring-2 ring-purple-400/20 shadow-xs'
                          : 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-400/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }
                  `}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                          {getModeIcon(modeKey)}
                        </div>
                        <span className="font-extrabold text-sm text-slate-900 font-display">
                          {mode.displayName}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {mode.shortDesc}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>{mode.model}</span>
                    <span className="text-emerald-700 font-semibold">{mode.status}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Ultra Credits Display Card */}
          <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Coins className="w-4 h-4 text-purple-600 shrink-0" />
              <div>
                <span className="font-bold text-purple-950">Ultra Pro Max Quota: </span>
                <span className="font-semibold text-purple-800">
                  {ultraCredits.remaining} of {ultraCredits.total} credits remaining today
                </span>
                <div className="text-[11px] text-purple-600 font-mono mt-0.5">
                  {ultraCredits.resetTime}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500">
              Required credits disclosed before premium agent operations.
            </div>
          </div>
        </GlassCard>

        {/* Experience Language */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-blue-50">
            <Globe className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-base text-slate-800">Unified Experience Language</h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-800">Experience Language</div>
              <div className="text-xs text-slate-500">Controls AI conversational responses, voice turn processing, and UI chrome</div>
            </div>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value as SupportedLanguage)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none"
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName}
                </option>
              ))}
            </select>
          </div>
        </GlassCard>

        {/* Microphone & Voice */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-blue-50">
            <Mic className="w-5 h-5 text-cyan-500" />
            <h3 className="font-bold text-base text-slate-800">Microphone & Speech Recognition</h3>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                <span>Microphone Input Sensitivity</span>
                <span>{micSensitivity}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                value={micSensitivity}
                onChange={(e) => setMicSensitivity(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <div className="text-sm font-semibold text-slate-800">Auto Speech Detection (Dynamic Baseline VAD)</div>
                <div className="text-xs text-slate-500">Automatically submits answers when speech pauses exceed dynamic ambient threshold</div>
              </div>
              <input
                type="checkbox"
                checked={autoTranscribe}
                onChange={(e) => setAutoTranscribe(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
        </GlassCard>

        <div className="flex justify-end">
          <NeonButton onClick={handleSave}>
            Save Preferences
          </NeonButton>
        </div>
      </div>
    </div>
  );
};
