import React, { useState } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Clock,
  Layers,
  Lock,
  ArrowRight,
  ShieldCheck,
  Server,
  Play,
  Activity,
  Sliders,
} from 'lucide-react';
import { AiProviderInfo, FeatureRoutingConfig } from '../../../types/admin';
import { adminTranslations } from '../../../locales/adminTranslations';

interface ProviderManagementTabProps {
  providers: AiProviderInfo[];
  routingMatrix: FeatureRoutingConfig[];
  onUpdateProvider: (providerId: string, patch: Partial<AiProviderInfo>) => Promise<void>;
  onPingProvider: (providerId: string) => Promise<any>;
  lang: 'en' | 'ja';
}

export const ProviderManagementTab: React.FC<ProviderManagementTabProps> = ({
  providers,
  routingMatrix,
  onUpdateProvider,
  onPingProvider,
  lang,
}) => {
  const t = adminTranslations[lang] || adminTranslations.en;
  const [pingResults, setPingResults] = useState<Record<string, { latency: number; time: string }>>({});
  const [isPinging, setIsPinging] = useState<Record<string, boolean>>({});

  const handlePing = async (providerId: string) => {
    setIsPinging((prev) => ({ ...prev, [providerId]: true }));
    try {
      const res = await onPingProvider(providerId);
      setPingResults((prev) => ({
        ...prev,
        [providerId]: {
          latency: res.latencyMs,
          time: new Date().toLocaleTimeString(),
        },
      }));
    } finally {
      setIsPinging((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            {t.providers.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.providers.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            5 Providers Active
          </span>
        </div>
      </div>

      {/* 1. Connected AI Providers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((p) => {
          const ping = pingResults[p.id];
          const pinging = isPinging[p.id];

          return (
            <div
              key={p.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all ${
                p.enabled ? 'border-slate-200' : 'border-slate-200/60 opacity-60 bg-slate-50/50'
              }`}
            >
              <div>
                {/* Header: Name, Rank, and Status */}
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">{p.name}</h3>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{p.description}</span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      p.status === 'ONLINE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {p.status}
                  </span>
                </div>

                {/* Masked Credentials Display */}
                <div className="my-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium text-[11px] flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Credential:
                  </span>
                  <span className="font-mono text-[11px] text-slate-700 font-semibold">
                    {p.credentialMasked}
                  </span>
                </div>

                {/* Model Configuration Dropdown */}
                <div className="space-y-1 my-3">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    {t.providers.preferredModel}:
                  </label>
                  <select
                    value={p.preferredModel}
                    onChange={(e) => onUpdateProvider(p.id, { preferredModel: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  >
                    {p.availableModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Telemetry Metrics */}
                <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 text-slate-700">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Requests (24h)</span>
                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                      {p.requestCountToday.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 text-slate-700">
                    <span className="text-[10px] text-slate-400 block font-semibold uppercase">Avg Latency</span>
                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                      {p.avgLatencyMs} ms
                    </span>
                  </div>
                </div>

                {/* Fallback Rank & Spending Cap */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span>Fallback Priority:</span>
                  <span className="font-bold text-slate-800">Rank #{p.fallbackRank}</span>
                </div>
              </div>

              {/* Action Controls: Ping & Toggle */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => handlePing(p.id)}
                  disabled={pinging || !p.enabled}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <Activity className={`w-3.5 h-3.5 text-blue-600 ${pinging ? 'animate-spin' : ''}`} />
                  <span>
                    {pinging
                      ? 'Testing...'
                      : ping
                      ? `${ping.latency} ms (${ping.time})`
                      : t.providers.testPing}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateProvider(p.id, { enabled: !p.enabled })}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors ${
                    p.enabled
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {p.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Feature-Specific Model Routing Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t.providers.routingMatrixTitle}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Routing policies dispatch each user request to optimal low-latency or high-intelligence foundation models.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Application Feature</th>
                <th className="py-2.5 px-4">Preferred Provider</th>
                <th className="py-2.5 px-4">Preferred Model</th>
                <th className="py-2.5 px-4">Fallback Provider</th>
                <th className="py-2.5 px-4">Fallback Model</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {routingMatrix.map((r) => (
                <tr key={r.featureId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{r.featureName}</td>
                  <td className="py-3 px-4 font-semibold text-blue-700 uppercase">{r.preferredProviderId}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{r.preferredModel}</td>
                  <td className="py-3 px-4 font-semibold text-slate-600 uppercase">{r.fallbackProviderId}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{r.fallbackModel}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
