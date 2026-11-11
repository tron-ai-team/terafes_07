import React from 'react';
import {
  Users,
  UserCheck,
  Cpu,
  Coins,
  CheckCircle2,
  Server,
  Database,
  Layers,
  FileCheck,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { AnalyticsOverview, DailyRequestsDataPoint, FeatureDistributionItem, AiProviderInfo, SystemHealthOverview, AdminTab } from '../../../types/admin';
import { adminTranslations } from '../../../locales/adminTranslations';
import { AdminMetricCard } from '../common/AdminMetricCard';

interface OverviewTabProps {
  analytics: AnalyticsOverview;
  dailyRequests: DailyRequestsDataPoint[];
  featureDistribution: FeatureDistributionItem[];
  providers: AiProviderInfo[];
  health: SystemHealthOverview;
  onNavigateTab: (tab: AdminTab) => void;
  lang: 'en' | 'ja';
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  analytics,
  dailyRequests,
  featureDistribution,
  providers,
  health,
  onNavigateTab,
  lang,
}) => {
  const t = adminTranslations[lang] || adminTranslations.en;

  const totalRequestsFormatted = Number(analytics.aiRequestsToday).toLocaleString();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 4 Top Metric Cards matching Mockup */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminMetricCard
          title={t.overview.totalUsers}
          value={analytics.totalUsers.toLocaleString()}
          deltaText="+12% (7d)"
          isPositive={true}
          subtitle={t.overview.vsLastWeek}
          icon={Users}
          iconColorClass="text-blue-600"
          iconBgClass="bg-blue-50 border-blue-200"
          onClick={() => onNavigateTab('users')}
        />

        <AdminMetricCard
          title={t.overview.activeUsers}
          value={analytics.activeUsers7d.toLocaleString()}
          deltaText="+8% (7d)"
          isPositive={true}
          subtitle={t.overview.vsLastWeek}
          icon={UserCheck}
          iconColorClass="text-emerald-600"
          iconBgClass="bg-emerald-50 border-emerald-200"
          onClick={() => onNavigateTab('users')}
        />

        <AdminMetricCard
          title={t.overview.aiRequestsToday}
          value={totalRequestsFormatted}
          deltaText="+24%"
          isPositive={true}
          subtitle={t.overview.vsAvg}
          icon={Cpu}
          iconColorClass="text-purple-600"
          iconBgClass="bg-purple-50 border-purple-200"
          onClick={() => onNavigateTab('analytics')}
        />

        <AdminMetricCard
          title={t.overview.estAiCostToday}
          value={`$${analytics.estimatedAiSpendToday.toFixed(2)}`}
          deltaText="-6%"
          isPositive={true} // Cost decrease is positive
          subtitle={t.overview.vsAvg}
          icon={Coins}
          iconColorClass="text-amber-600"
          iconBgClass="bg-amber-50 border-amber-200"
          onClick={() => onNavigateTab('costs')}
        />
      </div>

      {/* Middle Row: 2 Primary Charts matching Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: AI Requests (Last 7 Days) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">{t.overview.aiRequests7Days}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Aggregated daily requests across chat, voice, and CV services</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('analytics')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              {t.sidebar.analytics} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyRequests} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="reqGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284C7" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                  }}
                  formatter={(val: any) => [`${Number(val).toLocaleString()} req`, 'Volume']}
                />
                <Area
                  type="monotone"
                  dataKey="totalRequests"
                  stroke="#0284C7"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#reqGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: AI Feature Usage (Today) - Donut Chart */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">{t.overview.aiFeatureUsageToday}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Real-time throughput distribution across platform modules</p>
          </div>

          <div className="relative flex items-center justify-center my-auto py-2">
            <div className="w-52 h-52 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={featureDistribution}
                    innerRadius={58}
                    outerRadius={84}
                    paddingAngle={3}
                    dataKey="requests"
                  >
                    {featureDistribution.map((entry) => (
                      <Cell key={`cell-${entry.featureKey}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderRadius: '10px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                    formatter={(val: any, name: any, item: any) => [
                      `${Number(val).toLocaleString()} req (${item.payload.percentage}%)`,
                      item.payload.featureName,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Donut Text matching mockup */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-bold text-slate-900 tabular-nums leading-tight">
                  {totalRequestsFormatted}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  {t.overview.requests}
                </span>
              </div>
            </div>

            {/* Legend list */}
            <div className="space-y-1.5 ml-4">
              {featureDistribution.map((item) => (
                <div key={item.featureKey} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 font-medium truncate max-w-[90px]">{item.featureName}</span>
                  <span className="text-slate-900 font-bold tabular-nums ml-auto">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: AI Providers Status & System Health matching Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: AI Providers Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">{t.overview.aiProvidersStatus}</h2>
              <p className="text-xs text-slate-500">Live failover status and telemetry</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('providers')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {t.overview.viewAllProviders}
            </button>
          </div>

          <div className="divide-y divide-slate-100 py-2">
            {providers.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center font-bold text-[10px] text-slate-700">
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-800">{p.name}</span>
                    <span className="text-[10px] text-slate-400 block">{p.preferredModel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                  <span className="text-xs font-bold text-slate-700 tabular-nums w-20 text-right">
                    {p.requestCountToday.toLocaleString()} req
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: System Health matching Mockup */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">{t.overview.systemHealth}</h2>
              <p className="text-xs text-slate-500">Core backend microservices and runtime</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('health')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {t.overview.viewSystemHealth}
            </button>
          </div>

          {/* Operational Banner matching Mockup */}
          <div className="my-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <h3 className="text-xs font-bold text-emerald-900">{t.overview.allSystemsOperational}</h3>
              <p className="text-[11px] text-emerald-700">All gateways, relational databases, and inference runners are green.</p>
            </div>
          </div>

          {/* Service Pills matching Mockup (API, DB, AI Gateway, Gotenberg) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2">
            {[
              { id: 'api', name: 'API', icon: Server },
              { id: 'db', name: 'DB', icon: Database },
              { id: 'gateway', name: 'AI Gateway', icon: Layers },
              { id: 'gotenberg', name: 'Gotenberg', icon: FileCheck },
            ].map((svc) => (
              <div
                key={svc.id}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{svc.name}</span>
                <span className="text-[10px] text-emerald-600">✓</span>
              </div>
            ))}
          </div>

          {/* Metrics Strip matching Mockup: Uptime 99.95%, Avg. Latency 420 ms, Success Rate 99.8% */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400">{t.overview.uptime}</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5 tabular-nums">{health.uptimePct}%</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400">{t.overview.avgLatency}</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5 tabular-nums">{health.avgLatencyMs} ms</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400">{t.overview.successRate}</span>
              <p className="text-sm font-bold text-emerald-600 mt-0.5 tabular-nums">{health.successRatePct}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
