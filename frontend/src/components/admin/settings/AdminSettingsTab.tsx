import React, { useState } from 'react';
import {
  Settings,
  Play,
  Pause,
  AlertOctagon,
  Cpu,
  Globe,
  Coins,
  RefreshCw,
  Save,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { AdminPlatformSettings } from '../../../types/admin';
import { adminTranslations } from '../../../locales/adminTranslations';

interface AdminSettingsTabProps {
  platformSettings: AdminPlatformSettings;
  onUpdatePlatformSettings: (patch: Partial<AdminPlatformSettings>) => Promise<void>;
  lang: 'en' | 'ja';
  onLanguageChange: (lang: 'en' | 'ja') => void;
}

export const AdminSettingsTab: React.FC<AdminSettingsTabProps> = ({
  platformSettings,
  onUpdatePlatformSettings,
  lang,
  onLanguageChange,
}) => {
  const t = adminTranslations[lang] || adminTranslations.en;

  const [mode, setMode] = useState(platformSettings.mode);
  const [localRouting, setLocalRouting] = useState(platformSettings.localRoutingEnabled);
  const [cloudRouting, setCloudRouting] = useState(platformSettings.cloudRoutingEnabled);
  const [pauseAi, setPauseAi] = useState(platformSettings.pauseNewAiTasks);
  const [stopAgentJobs, setStopAgentJobs] = useState(platformSettings.stopNewAgentJobs);
  const [maxConcurrent, setMaxConcurrent] = useState(platformSettings.maxConcurrentAiRequests);
  const [queueCapacity, setQueueCapacity] = useState(platformSettings.queueCapacity);

  const [refreshInterval, setRefreshInterval] = useState('30s');
  const [currency, setCurrency] = useState('USD');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await onUpdatePlatformSettings({
        mode,
        localRoutingEnabled: localRouting,
        cloudRoutingEnabled: cloudRouting,
        pauseNewAiTasks: pauseAi,
        stopNewAgentJobs: stopAgentJobs,
        maxConcurrentAiRequests: Number(maxConcurrent),
        queueCapacity: Number(queueCapacity),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Platform Operational Mode (Spring Boot PUT /api/v1/admin/control) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              {t.settings.platformMode}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Controls high-level traffic routing and maintenance gates enforced by the Spring Boot backend.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'NORMAL' as const,
                title: t.settings.normalMode,
                desc: 'Standard production traffic. Local and cloud AI models operate concurrently.',
                color: 'border-emerald-500 text-emerald-700 bg-emerald-50/40',
              },
              {
                id: 'EXHIBITION' as const,
                title: t.settings.exhibitionMode,
                desc: 'Optimized for campus tech exhibitions. Fast guest onboarding with localized quotas.',
                color: 'border-amber-500 text-amber-700 bg-amber-50/40',
              },
              {
                id: 'MAINTENANCE' as const,
                title: t.settings.maintenanceMode,
                desc: 'Suspends new AI jobs. Existing sessions drain safely while infrastructure updates.',
                color: 'border-rose-500 text-rose-700 bg-rose-50/40',
              },
            ].map((m) => (
              <div
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  mode === m.id ? m.color : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{m.title}</span>
                  {mode === m.id && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 2. AI Routing & Gateway Switches */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">{t.settings.routingControls}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">{t.settings.localRouting}</span>
                <span className="text-[11px] text-slate-400">Routes desktop agent to local Ollama GPU runners</span>
              </div>
              <input
                type="checkbox"
                checked={localRouting}
                onChange={(e) => setLocalRouting(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">{t.settings.cloudRouting}</span>
                <span className="text-[11px] text-slate-400">Allows dispatch to Groq, Gemini, and Mistral LPUs</span>
              </div>
              <input
                type="checkbox"
                checked={cloudRouting}
                onChange={(e) => setCloudRouting(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">{t.settings.pauseAi}</span>
                <span className="text-[11px] text-slate-400">Temporarily returns 429 / queue pause on chat & voice</span>
              </div>
              <input
                type="checkbox"
                checked={pauseAi}
                onChange={(e) => setPauseAi(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
              />
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800 block">{t.settings.stopAgentJobs}</span>
                <span className="text-[11px] text-slate-400">Halts active code execution tasks on connected devices</span>
              </div>
              <input
                type="checkbox"
                checked={stopAgentJobs}
                onChange={(e) => setStopAgentJobs(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Max Concurrent AI Requests</label>
              <input
                type="number"
                min="1"
                max="200"
                value={maxConcurrent}
                onChange={(e) => setMaxConcurrent(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Queue Buffer Capacity</label>
              <input
                type="number"
                min="10"
                max="1000"
                value={queueCapacity}
                onChange={(e) => setQueueCapacity(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl font-semibold"
              />
            </div>
          </div>
        </div>

        {/* 3. Admin UI Preferences */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">{t.settings.uiPreferences}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t.settings.language}</label>
              <select
                value={lang}
                onChange={(e) => onLanguageChange(e.target.value as 'en' | 'ja')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium"
              >
                <option value="en">English (US)</option>
                <option value="ja">日本語 (Japanese)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t.settings.currency}</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium"
              >
                <option value="USD">USD ($)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">{t.settings.refreshInterval}</label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium"
              >
                <option value="manual">Manual Only</option>
                <option value="15s">Every 15 seconds</option>
                <option value="30s">Every 30 seconds</option>
                <option value="60s">Every 60 seconds</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          {savedSuccess ? (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Settings saved successfully and dispatched to Spring Boot control service.
            </span>
          ) : (
            <span className="text-xs text-slate-400">
              Changes take effect immediately on platform routing state.
            </span>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 text-xs font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : t.settings.saveChanges}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
