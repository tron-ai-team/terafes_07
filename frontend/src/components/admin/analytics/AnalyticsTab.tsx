import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Cpu,
  Coins,
  AlertTriangle,
  Zap,
  TrendingUp,
  Download,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AnalyticsResponseData } from '../../../services/admin/adminTypes';
import { adminTranslations } from '../../../locales/adminTranslations';
import { AdminMetricCard } from '../common/AdminMetricCard';

interface AnalyticsTabProps {
  data: AnalyticsResponseData;
  lang: 'en' | 'ja';
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ data, lang }) => {
  const t = adminTranslations[lang] || adminTranslations.en;
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | 'custom'>('7d');

  const {
    overview,
    dailyRequests,
    userGrowth,
    tokenConsumption,
    featureDistribution,
    providerUsage,
    dailyCost,
    latencyTrend,
  } = data;

  const handleExportCsv = () => {
    const headers = ['Date', 'TotalRequests', 'Chat', 'Voice', 'Interview', 'CV', 'Failed'];
    const rows = dailyRequests.map((d) => [
      d.date,
      d.totalRequests,
      d.chatRequests,
      d.voiceRequests,
      d.interviewRequests,
      d.cvRequests,
      d.failedRequests,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tron_ai_analytics_${timeRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Controls: Time Range Selector & CSV Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Time range pills */}
        <div className="flex items-center gap-1.5 text-xs">
          {[
            { id: 'today', label: t.analytics.timeRange.today },
            { id: '7d', label: t.analytics.timeRange.last7d },
            { id: '30d', label: t.analytics.timeRange.last30d },
            { id: 'custom', label: t.analytics.timeRange.custom },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setTimeRange(r.id as any)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                timeRange === r.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Analytics CSV</span>
        </button>
      </div>

      {/* 8 KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminMetricCard
          title={t.analytics.kpi.totalUsers}
          value={overview.totalUsers.toLocaleString()}
          deltaText="+12%"
          isPositive={true}
          icon={Users}
          iconColorClass="text-blue-600"
          iconBgClass="bg-blue-50 border-blue-200"
        />

        <AdminMetricCard
          title={t.analytics.kpi.activeUsers}
          value={overview.activeUsers7d.toLocaleString()}
          deltaText="+8%"
          isPositive={true}
          icon={UserCheck}
          iconColorClass="text-emerald-600"
          iconBgClass="bg-emerald-50 border-emerald-200"
        />

        <AdminMetricCard
          title={t.analytics.kpi.newSignups}
          value={overview.newRegistrations7d.toLocaleString()}
          deltaText="+15%"
          isPositive={true}
          icon={UserPlus}
          iconColorClass="text-cyan-600"
          iconBgClass="bg-cyan-50 border-cyan-200"
        />

        <AdminMetricCard
          title={t.analytics.kpi.requestsToday}
          value={overview.aiRequestsToday.toLocaleString()}
          deltaText="+24%"
          isPositive={true}
          icon={Cpu}
          iconColorClass="text-purple-600"
          iconBgClass="bg-purple-50 border-purple-200"
        />

        <AdminMetricCard
          title={t.analytics.kpi.requestsMonth}
          value={(overview.aiRequestsMonth / 1000).toFixed(1) + 'k'}
          deltaText="+31%"
          isPositive={true}
          icon={Zap}
          iconColorClass="text-indigo-600"
          iconBgClass="bg-indigo-50 border-indigo-200"
        />

        <AdminMetricCard
          title={t.analytics.kpi.tokensConsumed}
          value={(overview.tokensConsumedMonth / 1000000).toFixed(1) + 'M'}
          deltaText="+18%"
          isPositive={true}
          icon={Cpu}
          iconColorClass="text-blue-600"
          iconBgClass="bg-blue-50 border-blue-200"
        />

        <AdminMetricCard
          title={t.analytics.kpi.estimatedSpend}
          value={`$${overview.estimatedAiSpendMonth.toFixed(2)}`}
          deltaText="-4%"
          isPositive={true}
          icon={Coins}
          iconColorClass="text-amber-600"
          iconBgClass="bg-amber-50 border-amber-200"
        />

        <AdminMetricCard
          title={t.analytics.kpi.failedRequests}
          value={`${overview.failureRate}%`}
          deltaText={`${overview.failedRequestsToday} fails`}
          isPositive={overview.failureRate < 1}
          icon={AlertTriangle}
          iconColorClass="text-rose-600"
          iconBgClass="bg-rose-50 border-rose-200"
        />
      </div>

      {/* Row 1: Daily Requests & User Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Requests Stacked Area Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">{t.analytics.charts.dailyRequests}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Stacked request volume categorized by application module</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyRequests} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '10px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="chatRequests" name="AI Chat" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="voiceRequests" name="AI Voice" stackId="1" stroke="#A855F7" fill="#A855F7" fillOpacity={0.6} />
                <Area type="monotone" dataKey="interviewRequests" name="AI Interview" stackId="1" stroke="#06B6D4" fill="#06B6D4" fillOpacity={0.6} />
                <Area type="monotone" dataKey="cvRequests" name="CV Magic Fill" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Growth Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">{t.analytics.charts.userGrowth}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Cumulative registered users vs weekly active users</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '10px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="totalUsers" name="Total Users" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="activeUsers" name="Active Users" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Token Consumption & Provider Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Consumption by Feature (Bar Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">{t.analytics.charts.tokenBreakdown}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Daily tokens consumed in inference calls</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tokenConsumption} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '10px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                  formatter={(v: any) => [`${(Number(v) / 1000000).toFixed(2)}M tokens`]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="chatTokens" name="Chat" stackId="a" fill="#3B82F6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="voiceTokens" name="Voice" stackId="a" fill="#A855F7" radius={[0, 0, 0, 0]} />
                <Bar dataKey="interviewTokens" name="Interview" stackId="a" fill="#06B6D4" radius={[0, 0, 0, 0]} />
                <Bar dataKey="cvTokens" name="CV" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Provider Traffic Share */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t.analytics.charts.providerTraffic}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Request routing distribution across configured inference backends</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={providerUsage}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={3}
                  dataKey="requestCount"
                >
                  {providerUsage.map((entry) => (
                    <Cell key={entry.providerId} fill={entry.color} />
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
                    item.payload.providerName,
                  ]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Daily Cost Trend & Latency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Estimated AI Cost Trend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">{t.analytics.charts.dailyCostTrend}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Estimated daily cloud token expenditures</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyCost} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '10px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                  formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Cost']}
                />
                <Line type="monotone" dataKey="cost" name="Actual Estimated Cost" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="projectedCost" name="Target Cap" stroke="#94A3B8" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency & Error Trend */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">{t.analytics.charts.latencyErrorTrend}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Inference response latency percentiles (p50 / p95 / p99)</p>
          </div>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}ms`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '10px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="p50" name="p50 (Median)" stroke="#10B981" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p95" name="p95" stroke="#3B82F6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="p99" name="p99 (Peak)" stroke="#EF4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
