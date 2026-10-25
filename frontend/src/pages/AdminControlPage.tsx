import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { apiFetch, parseErrorDetail } from '../services/httpClient';
import { Navigate } from 'react-router-dom';
import { Shield, RefreshCw, Pause, Play, Users, Activity, Server } from 'lucide-react';

type Dash = {
  registeredUsers?: number;
  enabledUsers?: number;
  suspendedUsers?: number;
  onlineDevices?: number;
  aiUsageEventsLast24h?: number | null;
  hybrid?: Record<string, unknown>;
  agentEngines?: Record<string, unknown>;
  generatedAt?: string;
  note?: string;
};

type AdminUser = {
  id: number;
  email: string;
  displayName?: string;
  role?: string;
  enabled: boolean;
  suspendedAt?: string | null;
  suspendReason?: string | null;
};

export const AdminControlPage: React.FC = () => {
  const { user, isAuthenticated, addToast, uiLanguage } = useApp();
  const role = (user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN' || role === 'OWNER';

  const [dash, setDash] = useState<Dash | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, usersRes] = await Promise.all([
        apiFetch('/api/v1/admin/dashboard'),
        apiFetch('/api/v1/admin/users'),
      ]);
      if (!dashRes.ok) {
        throw new Error(await parseErrorDetail(dashRes));
      }
      if (!usersRes.ok) {
        throw new Error(await parseErrorDetail(usersRes));
      }
      setDash((await dashRes.json()) as Dash);
      const u = (await usersRes.json()) as AdminUser[];
      setUsers(Array.isArray(u) ? u : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load admin data';
      setError(msg);
      setDash(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      void load();
    }
  }, [isAuthenticated, isAdmin, load]);

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  if (!isAdmin) {
    return (
      <div className="p-8 max-w-xl mx-auto text-slate-700">
        <Shield className="w-8 h-8 text-slate-400 mb-3" />
        <h1 className="text-xl font-semibold mb-2">
          {uiLanguage === 'ja' ? '管理者専用' : 'Admin only'}
        </h1>
        <p className="text-sm text-slate-500">
          {uiLanguage === 'ja'
            ? 'ADMIN または OWNER ロールが必要です。'
            : 'ADMIN or OWNER role required.'}
        </p>
      </div>
    );
  }

  const hybrid = dash?.hybrid || {};

  const patchControl = async (body: Record<string, unknown>) => {
    try {
      const res = await apiFetch('/api/v1/admin/control', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(await parseErrorDetail(res));
      }
      addToast('Control updated', 'success');
      await load();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Update failed', 'error');
    }
  };

  const suspend = async (id: number) => {
    try {
      const res = await apiFetch(`/api/v1/admin/users/${id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Suspended via Admin Control Center' }),
      });
      if (!res.ok) {
        throw new Error(await parseErrorDetail(res));
      }
      await load();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Suspend failed', 'error');
    }
  };

  const restore = async (id: number) => {
    try {
      const res = await apiFetch(`/api/v1/admin/users/${id}/restore`, { method: 'POST' });
      if (!res.ok) {
        throw new Error(await parseErrorDetail(res));
      }
      await load();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Restore failed', 'error');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-cyan-600" />
            Admin Control Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Live metrics from Spring — no mock values. Provider secrets are never shown.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm p-3">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Registered users', value: dash?.registeredUsers, icon: Users },
          { label: 'Enabled', value: dash?.enabledUsers, icon: Users },
          { label: 'Suspended', value: dash?.suspendedUsers, icon: Pause },
          { label: 'Online devices', value: dash?.onlineDevices, icon: LaptopLike },
          { label: 'AI events 24h', value: dash?.aiUsageEventsLast24h, icon: Activity },
          { label: 'In-flight AI', value: hybrid.inFlightAiRequests as number | undefined, icon: Server },
          { label: 'Queue size', value: hybrid.queueSize as number | undefined, icon: Activity },
          { label: 'Supervisor route', value: String(hybrid.supervisorRoute ?? '—'), icon: Server },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white/80 p-4">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">{c.label}</div>
            <div className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">
              {c.value === undefined || c.value === null ? '—' : String(c.value)}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white/80 p-5 space-y-4">
        <h2 className="font-semibold text-slate-800">Platform controls</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white"
            onClick={() => void patchControl({ mode: 'NORMAL', pauseNewAiTasks: false })}
          >
            <Play className="w-3.5 h-3.5 inline mr-1" />
            Normal
          </button>
          <button
            type="button"
            className="px-3 py-2 text-sm rounded-lg bg-amber-500 text-white"
            onClick={() => void patchControl({ mode: 'EXHIBITION' })}
          >
            Exhibition
          </button>
          <button
            type="button"
            className="px-3 py-2 text-sm rounded-lg bg-slate-700 text-white"
            onClick={() => void patchControl({ mode: 'MAINTENANCE', pauseNewAiTasks: true })}
          >
            Maintenance
          </button>
          <button
            type="button"
            className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            onClick={() =>
              void patchControl({
                localRoutingEnabled: !(hybrid.localRoutingEnabled === true),
              })
            }
          >
            Toggle local routing
          </button>
          <button
            type="button"
            className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            onClick={() =>
              void patchControl({
                cloudRoutingEnabled: !(hybrid.cloudRoutingEnabled === true),
              })
            }
          >
            Toggle cloud routing
          </button>
          <button
            type="button"
            className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            onClick={() =>
              void patchControl({ pauseNewAiTasks: !(hybrid.pauseNewAiTasks === true) })
            }
          >
            Toggle pause AI
          </button>
          <button
            type="button"
            className="px-3 py-2 text-sm rounded-lg border border-slate-300"
            onClick={() =>
              void patchControl({ stopNewAgentJobs: !(hybrid.stopNewAgentJobs === true) })
            }
          >
            Toggle stop agent jobs
          </button>
        </div>
        <pre className="text-xs bg-slate-50 rounded-lg p-3 overflow-auto max-h-48 text-slate-700">
          {JSON.stringify(hybrid, null, 2)}
        </pre>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white/80 p-5">
        <h2 className="font-semibold text-slate-800 mb-3">Users</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b">
                <th className="py-2 pr-2">ID</th>
                <th className="py-2 pr-2">Email</th>
                <th className="py-2 pr-2">Role</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2 tabular-nums">{u.id}</td>
                  <td className="py-2 pr-2">{u.email}</td>
                  <td className="py-2 pr-2">{u.role}</td>
                  <td className="py-2 pr-2">
                    {u.suspendedAt ? 'SUSPENDED' : u.enabled ? 'ACTIVE' : 'DISABLED'}
                  </td>
                  <td className="py-2 space-x-2">
                    {u.role !== 'OWNER' && !u.suspendedAt && (
                      <button
                        type="button"
                        className="text-red-600 hover:underline"
                        onClick={() => void suspend(u.id)}
                      >
                        Suspend
                      </button>
                    )}
                    {u.suspendedAt && (
                      <button
                        type="button"
                        className="text-emerald-600 hover:underline"
                        onClick={() => void restore(u.id)}
                      >
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white/80 p-5">
        <h2 className="font-semibold text-slate-800 mb-2">Agent engines</h2>
        <pre className="text-xs bg-slate-50 rounded-lg p-3 overflow-auto max-h-64 text-slate-700">
          {JSON.stringify(dash?.agentEngines ?? {}, null, 2)}
        </pre>
        <p className="text-xs text-slate-400 mt-2">{dash?.note}</p>
      </section>
    </div>
  );
};

function LaptopLike(props: { className?: string }) {
  return <Server {...props} />;
}

export default AdminControlPage;
