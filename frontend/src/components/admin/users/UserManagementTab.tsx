import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  UserPlus,
  Mail,
  Download,
  RefreshCw,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Shield,
  Eye,
  Pause,
  Play,
  KeyRound,
  Sliders,
  Trash2,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { AdminUser, UserRole, UserStatus, GlobalQuotaConfig } from '../../../types/admin';
import { adminTranslations } from '../../../locales/adminTranslations';
import { RoleBadge, StatusBadge, ProviderBadge } from '../common/AdminBadge';
import { UserDetailDrawer } from './UserDetailDrawer';
import { CreateUserModal } from './CreateUserModal';
import { InviteUserModal } from './InviteUserModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { UserQuotaModal } from './UserQuotaModal';
import { AdminConfirmModal } from '../common/AdminConfirmModal';

interface UserManagementTabProps {
  users: AdminUser[];
  globalQuotas: GlobalQuotaConfig;
  lang: 'en' | 'ja';
  onRefresh: () => void;
  isRefreshing: boolean;
  onSuspendUser: (userId: number, reason?: string) => Promise<void>;
  onRestoreUser: (userId: number) => Promise<void>;
  onCreateUser: (payload: any) => Promise<void>;
  onInviteUser: (payload: any) => Promise<void>;
  onUpdateRole: (userId: number, newRole: UserRole) => Promise<void>;
  onResetPassword: (userId: number, tempPass: string) => Promise<void>;
  onDeleteUser: (userId: number) => Promise<void>;
  onSaveQuotaOverride: (override: any) => Promise<void>;
  onRemoveQuotaOverride: (userId: number) => Promise<void>;
  onResetUsageToday: (userId: number) => Promise<void>;
}

export const UserManagementTab: React.FC<UserManagementTabProps> = ({
  users,
  globalQuotas,
  lang,
  onRefresh,
  isRefreshing,
  onSuspendUser,
  onRestoreUser,
  onCreateUser,
  onInviteUser,
  onUpdateRole,
  onResetPassword,
  onDeleteUser,
  onSaveQuotaOverride,
  onRemoveQuotaOverride,
  onResetUsageToday,
}) => {
  const t = adminTranslations[lang] || adminTranslations.en;

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'ALL' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'GOOGLE' | 'EMAIL' | 'ADMIN'
  >('ALL');
  const [sortBy, setSortBy] = useState<'id' | 'displayName' | 'registeredAt' | 'lastLoginAt' | 'usageToday'>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modal & Drawer state
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);

  // Confirm dialogs
  const [suspendModalTarget, setSuspendModalTarget] = useState<AdminUser | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [restoreModalTarget, setRestoreModalTarget] = useState<AdminUser | null>(null);
  const [deleteModalTarget, setDeleteModalTarget] = useState<AdminUser | null>(null);
  const [roleModalTarget, setRoleModalTarget] = useState<AdminUser | null>(null);

  // Filtered & Sorted list
  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          String(u.id).includes(q)
      );
    }

    if (filterType === 'ACTIVE') result = result.filter((u) => u.status === 'ACTIVE');
    else if (filterType === 'SUSPENDED') result = result.filter((u) => u.status === 'SUSPENDED');
    else if (filterType === 'DISABLED') result = result.filter((u) => u.status === 'DISABLED');
    else if (filterType === 'GOOGLE') result = result.filter((u) => u.authProvider === 'google');
    else if (filterType === 'EMAIL') result = result.filter((u) => u.authProvider === 'email');
    else if (filterType === 'ADMIN') result = result.filter((u) => u.role === 'ADMIN' || u.role === 'OWNER');

    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'id') cmp = a.id - b.id;
      else if (sortBy === 'displayName') cmp = a.displayName.localeCompare(b.displayName);
      else if (sortBy === 'registeredAt') cmp = new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime();
      else if (sortBy === 'lastLoginAt') cmp = new Date(a.lastLoginAt || 0).getTime() - new Date(b.lastLoginAt || 0).getTime();
      else if (sortBy === 'usageToday') cmp = a.aiUsageToday.totalRequests - b.aiUsageToday.totalRequests;
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [users, searchTerm, filterType, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const handleExportCsv = () => {
    const headers = ['ID', 'Email', 'DisplayName', 'Role', 'Status', 'Provider', 'RegisteredAt', 'LastLoginAt', 'RequestsToday'];
    const rows = filteredUsers.map((u) => [
      u.id,
      `"${u.email}"`,
      `"${u.displayName}"`,
      u.role,
      u.status,
      u.authProvider,
      u.registeredAt,
      u.lastLoginAt || '',
      u.aiUsageToday.totalRequests,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tron_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSort = (field: 'id' | 'displayName' | 'registeredAt' | 'lastLoginAt' | 'usageToday') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Controls: Search, Filters, Add/Invite Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t.users.searchPlaceholder}
            className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{t.users.exportCsv}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="px-3 py-2 text-xs font-semibold rounded-xl text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors shadow-2xs flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>{t.users.inviteUser}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{t.users.createUser}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { key: 'ALL', label: t.users.allFilter, count: users.length },
          { key: 'ACTIVE', label: t.users.activeFilter, count: users.filter((u) => u.status === 'ACTIVE').length },
          { key: 'SUSPENDED', label: t.users.suspendedFilter, count: users.filter((u) => u.status === 'SUSPENDED').length },
          { key: 'DISABLED', label: t.users.disabledFilter, count: users.filter((u) => u.status === 'DISABLED').length },
          { key: 'GOOGLE', label: t.users.googleFilter, count: users.filter((u) => u.authProvider === 'google').length },
          { key: 'EMAIL', label: t.users.emailFilter, count: users.filter((u) => u.authProvider === 'email').length },
          { key: 'ADMIN', label: t.users.adminFilter, count: users.filter((u) => u.role === 'ADMIN' || u.role === 'OWNER').length },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => {
              setFilterType(f.key as any);
              setCurrentPage(1);
            }}
            className={`
              px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-1.5
              ${
                filterType === f.key
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
              }
            `}
          >
            <span>{f.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                filterType === f.key ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-100">
            <thead className="bg-slate-50/70 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th
                  onClick={() => toggleSort('id')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  {t.users.columns.id} {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => toggleSort('displayName')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  {t.users.columns.user} {sortBy === 'displayName' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="py-3 px-4">{t.users.columns.provider}</th>
                <th className="py-3 px-4">{t.users.columns.role}</th>
                <th className="py-3 px-4">{t.users.columns.status}</th>
                <th
                  onClick={() => toggleSort('registeredAt')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  {t.users.columns.registered} {sortBy === 'registeredAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => toggleSort('lastLoginAt')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  {t.users.columns.lastLogin} {sortBy === 'lastLoginAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  onClick={() => toggleSort('usageToday')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 text-right"
                >
                  {t.users.columns.usageToday} {sortBy === 'usageToday' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="py-3 px-4 text-center">{t.users.columns.actions}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    {t.common.noData}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-500">#{u.id}</td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate leading-tight">{u.displayName}</p>
                          <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <ProviderBadge provider={u.authProvider} />
                    </td>

                    <td className="py-3 px-4">
                      <RoleBadge role={u.role} />
                    </td>

                    <td className="py-3 px-4">
                      <StatusBadge status={u.status} />
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {new Date(u.registeredAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <span className="font-bold text-slate-900 tabular-nums">
                        {u.aiUsageToday.totalRequests}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">req</span>
                      {u.quotaOverride && (
                        <span className="block text-[9px] text-blue-600 font-bold">Override</span>
                      )}
                    </td>

                    <td
                      className="py-3 px-4 text-center"
                      onClick={(e) => e.stopPropagation()} // don't open drawer on direct action click
                    >
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedUser(u)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="View Profile Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(u);
                            setIsQuotaModalOpen(true);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                          title="Configure Quotas"
                        >
                          <Sliders className="w-4 h-4" />
                        </button>

                        {u.role !== 'OWNER' && (
                          u.status === 'SUSPENDED' ? (
                            <button
                              type="button"
                              onClick={() => setRestoreModalTarget(u)}
                              className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Restore User"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSuspendModalTarget(u)}
                              className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors"
                              title="Suspend User"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <span>
            Showing <strong className="text-slate-900">{filteredUsers.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-slate-900">{Math.min(currentPage * pageSize, filteredUsers.length)}</strong> of{' '}
            <strong className="text-slate-900">{filteredUsers.length}</strong> accounts
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-semibold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* User Detail Drawer */}
      <UserDetailDrawer
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        lang={lang}
        onSuspend={(u) => setSuspendModalTarget(u)}
        onRestore={(u) => setRestoreModalTarget(u)}
        onChangeRole={(u) => setRoleModalTarget(u)}
        onResetPassword={(u) => setIsResetPasswordModalOpen(true)}
        onManageQuotas={(u) => setIsQuotaModalOpen(true)}
        onDeleteUser={(u) => setDeleteModalTarget(u)}
      />

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={onCreateUser}
        lang={lang}
      />

      {/* Invite User Modal */}
      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSubmit={onInviteUser}
        lang={lang}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        user={selectedUser}
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        onSubmit={onResetPassword}
        lang={lang}
      />

      {/* Individual Quota Modal */}
      <UserQuotaModal
        user={selectedUser}
        globalQuotas={globalQuotas}
        isOpen={isQuotaModalOpen}
        onClose={() => setIsQuotaModalOpen(false)}
        onSaveOverride={onSaveQuotaOverride}
        onRemoveOverride={onRemoveQuotaOverride}
        onResetUsageToday={onResetUsageToday}
        lang={lang}
      />

      {/* Suspend Confirmation Modal */}
      <AdminConfirmModal
        isOpen={!!suspendModalTarget}
        onClose={() => {
          setSuspendModalTarget(null);
          setSuspendReason('');
        }}
        onConfirm={() => {
          if (suspendModalTarget) onSuspendUser(suspendModalTarget.id, suspendReason);
        }}
        title={t.users.modal.suspendTitle}
        description={`Are you sure you want to suspend ${suspendModalTarget?.email}? This account will immediately lose access to AI Chat, Voice, and CV generation.`}
        confirmLabel="Suspend Account"
        isDestructive={true}
        requiresReason={true}
        reasonLabel={t.users.modal.suspendReasonLabel}
        onReasonChange={setSuspendReason}
      />

      {/* Restore Confirmation Modal */}
      <AdminConfirmModal
        isOpen={!!restoreModalTarget}
        onClose={() => setRestoreModalTarget(null)}
        onConfirm={() => {
          if (restoreModalTarget) onRestoreUser(restoreModalTarget.id);
        }}
        title={t.users.modal.restoreTitle}
        description={`Restore full platform privileges for ${restoreModalTarget?.email}?`}
        confirmLabel="Restore Account"
        isDestructive={false}
      />

      {/* Change Role Modal */}
      <AdminConfirmModal
        isOpen={!!roleModalTarget}
        onClose={() => setRoleModalTarget(null)}
        onConfirm={() => {
          if (roleModalTarget) {
            const nextRole: UserRole = roleModalTarget.role === 'ADMIN' ? 'USER' : 'ADMIN';
            onUpdateRole(roleModalTarget.id, nextRole);
          }
        }}
        title="Change User Role Permission"
        description={`Switch role for ${roleModalTarget?.email} from ${roleModalTarget?.role} to ${
          roleModalTarget?.role === 'ADMIN' ? 'USER' : 'ADMIN'
        }?`}
        confirmLabel="Update Role"
        isDestructive={false}
      />

      {/* Delete User Confirmation Modal */}
      <AdminConfirmModal
        isOpen={!!deleteModalTarget}
        onClose={() => setDeleteModalTarget(null)}
        onConfirm={() => {
          if (deleteModalTarget) onDeleteUser(deleteModalTarget.id);
        }}
        title={t.users.modal.deleteTitle}
        description={t.users.modal.deleteConfirmPrompt}
        confirmLabel="Permanently Delete"
        isDestructive={true}
        requiresTypeEmail={deleteModalTarget?.email}
      />
    </div>
  );
};
