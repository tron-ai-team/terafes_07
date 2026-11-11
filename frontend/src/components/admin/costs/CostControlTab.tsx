import React, { useState } from 'react';
import {
  Coins,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Bell,
  PieChart as PieIcon,
  Layers,
  ArrowRight,
  ShieldCheck,
  User,
  Sliders,
  DollarSign,
  Info,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { CostControlResponseData } from '../../../services/admin/adminTypes';
import { adminTranslations } from '../../../locales/adminTranslations';
import { AdminMetricCard } from '../common/AdminMetricCard';

interface CostControlTabProps {
  data: CostControlResponseData;
  lang: 'en' | 'ja';
}

export const CostControlTab: React.FC<CostControlTabProps> = ({ data, lang }) => {
  const t = adminTranslations[lang] || adminTranslations.en;
  const { overview, byProvider, byFeature, topUsers } = data;
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [budgetCap, setBudgetCap] = useState(overview.monthlyBudgetCapUsd);
  const [warningThreshold, setWarningThreshold] = useState(80);
  const [criticalThreshold, setCriticalThreshold] = useState(95);

  const providerColors = ['#EF4444', '#3B82F6', '#F97316', '#10B981', '#64748B'];
  const featureColors = ['#3B82F6', '#A855F7', '#06B6D4', '#F59E0B'];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Financial Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminMetricCard
          title={t.costs.todayCost}
          value={`$${overview.todayEstimatedCostUsd.toFixed(2)}`}
          deltaText={`${overview.todayCostDeltaPct}%`}
          isPositive={overview.todayCostDeltaPct <= 0}
          subtitle="vs daily average"
          icon={Coins}
          iconColorClass="text-amber-600"
          iconBgClass="bg-amber-50 border-amber-200"
        />

        <AdminMetricCard
          title={t.costs.monthCost}
          value={`$${overview.monthlyEstimatedCostUsd.toFixed(2)}`}
          deltaText={`${overview.budgetUsagePct.toFixed(1)}% used`}
          isPositive={overview.budgetUsagePct < 85}
          subtitle="of $500 monthly budget"
          icon={DollarSign}
          iconColorClass="text-blue-600"
          iconBgClass="bg-blue-50 border-blue-200"
        />

        <AdminMetricCard
          title={t.costs.projectedCost}
          value={`$${overview.projectedMonthEndCostUsd.toFixed(2)}`}
          deltaText="Within Budget"
          isPositive={true}
          subtitle="Projected month-end"
          icon={TrendingUp}
          iconColorClass="text-emerald-600"
          iconBgClass="bg-emerald-50 border-emerald-200"
        />

        <AdminMetricCard
          title="Avg Cost / User"
          value={`$${overview.avgCostPerUserUsd.toFixed(2)}`}
          subtitle={`$${overview.avgCostPerRequestUsd.toFixed(5)} / req`}
          icon={User}
          iconColorClass="text-purple-600"
          iconBgClass="bg-purple-50 border-purple-200"
        />
      </div>

      {/* Monthly Budget Consumption Progress Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Monthly Spending Budget & Cap</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ${overview.monthlyEstimatedCostUsd.toFixed(2)} spent of ${budgetCap.toFixed(2)} monthly ceiling
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAlertModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Bell className="w-3.5 h-3.5 text-blue-600" />
            <span>Configure Spending Alerts</span>
          </button>
        </div>

        {/* Progress Bar Container */}
        <div className="space-y-1.5">
          <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex">
            <div
              className={`h-full transition-all duration-500 ${
                overview.budgetUsagePct > 90
                  ? 'bg-rose-500'
                  : overview.budgetUsagePct > 75
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-400'
              }`}
              style={{ width: `${Math.min(overview.budgetUsagePct, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <span>$0.00</span>
            <span className="font-bold text-slate-700">{overview.budgetUsagePct.toFixed(1)}% Consumed</span>
            <span>${budgetCap.toFixed(2)} Cap</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2 text-xs text-slate-600">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p>
            Costs are calculated from live token counters and standard provider API pricing. Final invoices from Google Cloud, Groq, and Mistral may vary slightly due to enterprise tier discounts.
          </p>
        </div>
      </div>

      {/* Row: Breakdown by Provider & Feature */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by Provider */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-900">{t.costs.costByProvider}</h3>
            <p className="text-xs text-slate-500">Expenditure share per inference provider</p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byProvider} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" stroke="#94A3B8" fontSize={11} tickFormatter={(v) => `$${v}`} />
                <YAxis dataKey="providerName" type="category" stroke="#94A3B8" fontSize={11} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderRadius: '10px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                  formatter={(v: any) => [`$${Number(v).toFixed(2)}`, 'Spend']}
                />
                <Bar dataKey="costUsd" fill="#2563EB" radius={[0, 4, 4, 0]}>
                  {byProvider.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={providerColors[index % providerColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost by Feature */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="mb-3">
            <h3 className="text-sm font-bold text-slate-900">{t.costs.costByFeature}</h3>
            <p className="text-xs text-slate-500">Expenditure share per TRON AI product feature</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byFeature}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="costUsd"
                >
                  {byFeature.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={featureColors[index % featureColors.length]} />
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
                    `$${Number(val).toFixed(2)} (${item.payload.costPct}%)`,
                    item.payload.featureName,
                  ]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Consuming Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">{t.costs.topUsersCost}</h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-4">User</th>
                <th className="py-2.5 px-4">Requests (Month)</th>
                <th className="py-2.5 px-4">Tokens Consumed</th>
                <th className="py-2.5 px-4 text-right">Estimated Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topUsers.map((u) => (
                <tr key={u.userId} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 block">{u.displayName}</span>
                    <span className="text-[11px] text-slate-400">{u.email}</span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700 tabular-nums">
                    {u.requestsMonth.toLocaleString()} req
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700 tabular-nums">
                    {(u.tokensMonth / 1000000).toFixed(2)}M tokens
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                    ${u.costMonthUsd.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Spending Alerts Modal */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900">Configure Spending Alert Thresholds</h3>
            <p className="text-slate-500">
              Set automated notifications when monthly AI spending approaches budget limits.
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Monthly Budget Cap ($ USD)</label>
              <input
                type="number"
                value={budgetCap}
                onChange={(e) => setBudgetCap(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Warning Alert (%)</label>
                <input
                  type="number"
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Critical Alert (%)</label>
                <input
                  type="number"
                  value={criticalThreshold}
                  onChange={(e) => setCriticalThreshold(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAlertModalOpen(false)}
                className="px-4 py-2 font-semibold rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setIsAlertModalOpen(false)}
                className="px-4 py-2 font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700"
              >
                Save Thresholds
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
