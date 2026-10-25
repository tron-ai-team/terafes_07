import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ADVANCED_PROVIDERS, ADVANCED_MODELS } from '../../config/aiModes';
import {
  X,
  Cpu,
  Server,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Zap,
  Brain,
  HelpCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export const AdvancedAiSettingsModal: React.FC = () => {
  const { isAdvancedAiModalOpen, setAdvancedAiModalOpen, uiLocale } = useApp();
  const [activeTab, setActiveTab] = useState<'providers' | 'models' | 'routing'>('models');

  if (!isAdvancedAiModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="advanced-ai-settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white border border-[#D6E6F7] shadow-2xl shadow-blue-500/10 overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="advanced-ai-settings-title" className="text-lg font-extrabold text-slate-900 font-display">
                  {uiLocale === 'ja' ? '詳細AIモデル・プロバイダー設定' : 'Advanced AI Model & Provider Settings'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-700">
                  Technical Architecture
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {uiLocale === 'ja'
                  ? 'TRON Coreゲートウェイで構成済みのプロバイダー、検証済みモデル、機能別ルーティング'
                  : 'Static catalog for UI preview. Live availability comes from /api/v1/ai/modes and /api/v1/ai/models when opened from product settings.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setAdvancedAiModalOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security / No-Secrets Banner */}
        <div className="px-6 py-2.5 bg-emerald-50/90 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">
              Zero Client Secrets: Cloud provider credentials and API keys are stored exclusively on the TRON server gateway and never exposed to the browser.
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full shrink-0">
            SECURE
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-2 pt-2">
          {[
            { id: 'models', label: uiLocale === 'ja' ? 'モデル一覧（静的）' : 'Models (Static)', count: ADVANCED_MODELS.length },
            { id: 'providers', label: uiLocale === 'ja' ? 'AIプロバイダー（静的）' : 'Providers (Static)', count: ADVANCED_PROVIDERS.length },
            { id: 'routing', label: uiLocale === 'ja' ? '機能別デフォルトルーティング' : 'Feature Routing' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer
                ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }
              `}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === tab.id ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: MODELS */}
          {activeTab === 'models' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 mb-2">
                All models below are verified by the TRON Core backend registry (`/api/v1/models`). Only models with genuine runtime support are listed.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {ADVANCED_MODELS.map((model) => (
                  <div
                    key={model.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 font-display">
                            {model.displayName}
                          </h4>
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              model.providerType === 'local'
                                ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                                : 'bg-purple-50 text-purple-800 border border-purple-200'
                            }`}
                          >
                            {model.providerType}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {model.provider} • {model.modelIdentifier}
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          model.availability === 'Available'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {model.availability}
                      </span>
                    </div>

                    {/* Capabilities */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {model.capabilities.map((cap) => (
                        <span
                          key={cap}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>

                    {/* Technical details footer */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Context: {model.contextWindow.toLocaleString()} tokens</span>
                      <span>Latency: {model.latencyTier}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PROVIDERS */}
          {activeTab === 'providers' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 mb-2">
                Supported AI provider engines configured on the TRON AI Gateway:
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {ADVANCED_PROVIDERS.map((provider) => (
                  <div
                    key={provider.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-blue-600" />
                        <h4 className="font-bold text-sm text-slate-900 font-display">
                          {provider.name}
                        </h4>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          provider.status === 'Available'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {provider.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {provider.description}
                    </p>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Endpoint: {provider.endpoint}</span>
                      <span>Link: {provider.latency}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ROUTING */}
          {activeTab === 'routing' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-500 mb-2">
                TRON feature routing automatically selects verified models based on active AI mode:
              </div>

              <div className="space-y-2.5">
                {[
                  { feature: 'Normal Chat', fast: 'Qwen3 8B (Ollama)', smart: 'Gemma3 12B (Ollama)', ultra: 'Llama 3.3 70B (Groq)' },
                  { feature: 'Voice Chat', fast: 'Qwen3 8B + VOICEVOX', smart: 'Qwen3 8B + VOICEVOX', ultra: 'TRON Cloud Voice' },
                  { feature: 'Coding Agent', fast: 'Qwen3 8B (Local)', smart: 'Gemma3 12B (Deep Reasoning)', ultra: 'DeepSeek R1 / Claude Gateway' },
                  { feature: 'Browser Agent', fast: 'Playwright Local CLI', smart: 'Playwright + Step Verification', ultra: 'Multimodal Vision Gateway' },
                  { feature: 'Job Finder', fast: 'Career Heuristic Matcher', smart: 'CV Competency Scorer', ultra: 'Autonomous Web Scanner' },
                  { feature: 'CV Review & Revision', fast: 'Summary Extraction', smart: 'STAR Method Analysis', ultra: 'Executive CV Transformation' },
                  { feature: 'Interview Practice', fast: 'General Questions', smart: 'Adaptive STAR Follow-ups', ultra: 'Real-time Executive Coaching' },
                ].map((row, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="font-bold text-slate-800 md:w-1/4">
                      {row.feature}
                    </div>

                    <div className="grid grid-cols-3 gap-2 flex-1 text-[11px]">
                      <div className="p-2 rounded-xl bg-cyan-50/70 border border-cyan-100">
                        <div className="font-bold text-cyan-900 text-[10px] uppercase font-mono">Fast</div>
                        <div className="text-cyan-800 truncate">{row.fast}</div>
                      </div>

                      <div className="p-2 rounded-xl bg-indigo-50/70 border border-indigo-100">
                        <div className="font-bold text-indigo-900 text-[10px] uppercase font-mono">Smart</div>
                        <div className="text-indigo-800 truncate">{row.smart}</div>
                      </div>

                      <div className="p-2 rounded-xl bg-purple-50/70 border border-purple-100">
                        <div className="font-bold text-purple-900 text-[10px] uppercase font-mono">Ultra</div>
                        <div className="text-purple-800 truncate">{row.ultra}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Server-side verification active</span>
          </div>

          <button
            onClick={() => setAdvancedAiModalOpen(false)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
