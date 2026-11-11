import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  User,
  Shield,
  Layers,
} from 'lucide-react';
import { AdminAuditLog } from '../../../types/admin';
import { adminTranslations } from '../../../locales/adminTranslations';

interface AuditLogsTabProps {
  logs: AdminAuditLog[];
  lang: 'en' | 'ja';
}

export const AuditLogsTab: React.FC<AuditLogsTabProps> = ({ logs, lang }) => {
  const t = adminTranslations[lang] || adminTranslations.en;

  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);

  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.targetType.toLowerCase().includes(q) ||
          l.targetId.toLowerCase().includes(q) ||
          l.detail.toLowerCase().includes(q) ||
          (l.actorEmail && l.actorEmail.toLowerCase().includes(q))
      );
    }

    if (actionFilter !== 'ALL') {
      result = result.filter((l) => l.action === actionFilter);
    }

    return result;
  }, [logs, searchTerm, actionFilter]);

  const uniqueActions = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.action)));
  }, [logs]);

  const handleExportCsv = () => {
    const headers = ['ID', 'Timestamp', 'ActorEmail', 'Action', 'TargetType', 'TargetId', 'Status', 'IP', 'Detail'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.createdAt,
      `"${l.actorEmail || l.actorUserId}"`,
      l.action,
      l.targetType,
      l.targetId,
      l.status,
      l.ipAddress || '',
      `"${l.detail.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tron_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-1 items-center gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by action, actor, target ID, or detail..."
              className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Actions</option>
            {uniqueActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>{t.audit.exportLogs}</span>
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
            <thead className="bg-slate-50/70 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">{t.audit.timestamp}</th>
                <th className="py-3 px-4">{t.audit.admin}</th>
                <th className="py-3 px-4">{t.audit.action}</th>
                <th className="py-3 px-4">{t.audit.target}</th>
                <th className="py-3 px-4">{t.audit.result}</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-center">Inspect</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    {t.common.noData}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {log.actorEmail || `UID #${log.actorUserId}`}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-md">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-mono text-[11px]">
                      {log.targetType}:{log.targetId}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {log.status === 'SUCCESS' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-600" />
                        )}
                        {log.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {log.detail}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Event Inspection Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-250">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{t.audit.drawerTitle}</h3>
                  <p className="text-xs text-slate-400 font-mono">Event #{selectedLog.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold block">Action Type</span>
                  <span className="font-mono font-bold text-blue-700 text-sm">{selectedLog.action}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold block">Administrator</span>
                    <span className="font-semibold text-slate-800">{selectedLog.actorEmail || selectedLog.actorUserId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold block">Status</span>
                    <span className="font-bold text-emerald-700">{selectedLog.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold block">Target</span>
                    <span className="font-mono text-slate-700">{selectedLog.targetType}:{selectedLog.targetId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[10px] font-bold block">IP Address</span>
                    <span className="font-mono text-slate-700">{selectedLog.ipAddress || '127.0.0.1'}</span>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Audit Details / Description</span>
                <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed font-mono text-[11px]">
                  {selectedLog.detail}
                </p>
              </div>

              <div>
                <span className="text-slate-400 uppercase text-[10px] font-bold block mb-1">Full Immutable Event JSON Snapshot</span>
                <pre className="p-3 rounded-xl bg-slate-900 text-cyan-400 font-mono text-[11px] overflow-auto max-h-56">
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
