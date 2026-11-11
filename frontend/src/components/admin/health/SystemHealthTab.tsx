import React, { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Server,
  Database,
  Layers,
  FileCheck,
  Cpu,
  Clock,
  Terminal,
} from 'lucide-react';
import { SystemHealthOverview, AiProviderInfo } from '../../../types/admin';
import { adminTranslations } from '../../../locales/adminTranslations';

interface SystemHealthTabProps {
  health: SystemHealthOverview;
  providers: AiProviderInfo[];
  onRunProbe: () => Promise<void>;
  isProbing: boolean;
  lang: 'en' | 'ja';
}

export const SystemHealthTab: React.FC<SystemHealthTabProps> = ({
  health,
  providers,
  onRunProbe,
  isProbing,
  lang,
}) => {
  const t = adminTranslations[lang] || adminTranslations.en;
  const [logFilter, setLogFilter] = useState<'ALL' | 'WARN' | 'ERROR'>('ALL');

  const filteredLogs = health.recentErrors.filter((err) => {
    if (logFilter === 'ALL') return true;
    return err.level === logFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner with Probe Action */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            {t.health.title}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.health.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={onRunProbe}
          disabled={isProbing}
          className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
          <span>{isProbing ? 'Testing Endpoints...' : t.health.runHealthProbe}</span>
        </button>
      </div>

      {/* Main Status Strip */}
      <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-emerald-950">{t.health.allSystemsOk}</h3>
            <p className="text-xs text-emerald-800 mt-0.5">
              Backend runtime, connection pools, and AI inference backends are within SLA tolerances.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-emerald-200/60 md:pl-6 text-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-700">{t.health.uptimePercentage}</span>
            <p className="text-base font-extrabold text-emerald-950 mt-0.5 tabular-nums">{health.uptimePct}%</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-700">{t.health.averageLatency}</span>
            <p className="text-base font-extrabold text-emerald-950 mt-0.5 tabular-nums">{health.avgLatencyMs} ms</p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-700">{t.health.errorRate}</span>
            <p className="text-base font-extrabold text-emerald-950 mt-0.5 tabular-nums">{100 - health.successRatePct}%</p>
          </div>
        </div>
      </div>

      {/* Core Infrastructure Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {health.services.map((svc) => (
          <div key={svc.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                {svc.id === 'api' && <Server className="w-4 h-4 text-blue-600" />}
                {svc.id === 'db' && <Database className="w-4 h-4 text-amber-600" />}
                {svc.id === 'gateway' && <Layers className="w-4 h-4 text-purple-600" />}
                {svc.id === 'gotenberg' && <FileCheck className="w-4 h-4 text-emerald-600" />}
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {svc.status}
              </span>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 leading-tight">{svc.name}</h4>
              <span className="text-[11px] text-slate-400 block mt-0.5">{svc.role}</span>
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
              <div className="flex justify-between">
                <span>Latency:</span>
                <span className="font-bold text-slate-800 tabular-nums">{svc.latencyMs} ms</span>
              </div>
              <div className="flex justify-between">
                <span>Uptime:</span>
                <span className="font-bold text-slate-800 tabular-nums">{svc.uptimePct}%</span>
              </div>
              {svc.version && (
                <div className="flex justify-between text-[11px]">
                  <span>Version:</span>
                  <span className="font-mono text-slate-700">{svc.version}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* AI Provider Health Ping Strip */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">AI Provider Inference Health</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {providers.map((p) => (
            <div key={p.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">{p.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="text-[11px] text-slate-500">
                <span>Latency: </span>
                <strong className="text-slate-800 tabular-nums">{p.avgLatencyMs} ms</strong>
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                Last checked: Just now
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live System Diagnostics Console / Log Stream */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-4 shadow-lg border border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {t.health.recentSystemLogs}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {['ALL', 'WARN', 'ERROR'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLogFilter(lvl as any)}
                className={`px-2.5 py-0.5 rounded-md font-semibold text-[10px] ${
                  logFilter === lvl
                    ? 'bg-cyan-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="font-mono text-xs space-y-2 max-h-60 overflow-y-auto pr-2">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-start gap-2">
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  log.level === 'ERROR'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {log.level}
              </span>
              <span className="text-slate-400 text-[11px] shrink-0">
                [{new Date(log.timestamp).toLocaleTimeString()}]
              </span>
              <span className="text-cyan-300 shrink-0 font-semibold">{log.service}:</span>
              <span className="text-slate-300 leading-relaxed">{log.message}</span>
            </div>
          ))}
          <div className="text-[11px] text-slate-500 pt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Listening to live event bus telemetry stream...
          </div>
        </div>
      </div>
    </div>
  );
};
