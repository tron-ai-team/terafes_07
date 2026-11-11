import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AdminTab, AdminUser, GlobalQuotaConfig, AiProviderInfo, SystemHealthOverview, AdminPlatformSettings } from '../types/admin';
import { adminService } from '../services/admin/adminService';
import { adminTranslations } from '../locales/adminTranslations';
import { AdminLayout } from '../components/admin/layout/AdminLayout';

// Module Tabs
import { OverviewTab } from '../components/admin/overview/OverviewTab';
import { UserManagementTab } from '../components/admin/users/UserManagementTab';
import { QuotaManagementTab } from '../components/admin/quotas/QuotaManagementTab';
import { AnalyticsTab } from '../components/admin/analytics/AnalyticsTab';
import { ProviderManagementTab } from '../components/admin/providers/ProviderManagementTab';
import { CostControlTab } from '../components/admin/costs/CostControlTab';
import { SecurityCenterTab } from '../components/admin/security/SecurityCenterTab';
import { AuditLogsTab } from '../components/admin/audit/AuditLogsTab';
import { AnnouncementsTab } from '../components/admin/announcements/AnnouncementsTab';
import { SystemHealthTab } from '../components/admin/health/SystemHealthTab';
import { AdminSettingsTab } from '../components/admin/settings/AdminSettingsTab';

export const AdminControlPage: React.FC = () => {
  const { user, isAuthenticated, isLoadingAuth, addToast, uiLanguage, setUiLanguage, logout } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab derived from query param or default to 'overview'
  const initialTab = (searchParams.get('tab') as AdminTab) || 'overview';
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);

  const lang = (uiLanguage === 'ja' ? 'ja' : 'en') as 'en' | 'ja';
  const t = adminTranslations[lang] || adminTranslations.en;

  // Authorization check
  const role = (user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN' || role === 'OWNER';

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLiveApi, setIsLiveApi] = useState(false);

  // Data states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [globalQuotas, setGlobalQuotas] = useState<GlobalQuotaConfig | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [providersData, setProvidersData] = useState<{ providers: AiProviderInfo[]; routing: any[] }>({
    providers: [],
    routing: [],
  });
  const [costData, setCostData] = useState<any>(null);
  const [securityData, setSecurityData] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealthOverview | null>(null);
  const [platformSettings, setPlatformSettings] = useState<AdminPlatformSettings | null>(null);

  // Sync tab with URL
  const handleSelectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Main data loader
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [
        dashRes,
        usersRes,
        quotasRes,
        analyticsRes,
        providersRes,
        costRes,
        secRes,
        auditRes,
        annRes,
        healthRes,
      ] = await Promise.all([
        adminService.getDashboardOverview(),
        adminService.getUsers({ pageSize: 100 }),
        adminService.getGlobalQuotas(),
        adminService.getAnalyticsData('7d'),
        adminService.getProviders(),
        adminService.getCostControlData(),
        adminService.getSecurityCenterData(),
        adminService.getAuditLogs(),
        adminService.getAnnouncements(),
        adminService.getSystemHealth(),
      ]);

      setDashboardData(dashRes.analytics);
      setPlatformSettings(dashRes.platformSettings);
      setIsLiveApi(dashRes.isLive);
      setUsers(usersRes.users);
      setGlobalQuotas(quotasRes);
      setAnalyticsData(analyticsRes);
      setProvidersData(providersRes);
      setCostData(costRes);
      setSecurityData(secRes);
      setAuditLogs(auditRes.logs);
      setAnnouncements(annRes);
      setSystemHealth(healthRes);
    } catch (e) {
      addToast(e instanceof Error ? e.message : 'Error loading admin data', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      void loadData();
    }
  }, [isAuthenticated, isAdmin, loadData]);

  // Auth guards
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        <Shield className="w-6 h-6 animate-pulse text-blue-600 mr-2" />
        Authenticating administrator session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {lang === 'ja' ? '管理者アクセス制限' : 'Administrator Authorization Required'}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {lang === 'ja'
              ? 'このコントロールセンターは、TRON AIのシステム管理者（ADMIN）またはオーナー（OWNER）専用です。現在のユーザーにはアクセス権限がありません。'
              : 'The Admin Control Center is restricted to TRON AI system administrators and platform owners. Your current account lacks administrative privileges.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/workspace')}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{lang === 'ja' ? 'ワークスペースへ戻る' : 'Return to Workspace'}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{lang === 'ja' ? '別アカウントでログイン' : 'Switch Account'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Language switch handler
  const handleLanguageChange = (newLang: 'en' | 'ja') => {
    setUiLanguage(newLang);
  };

  // Return to TRON AI app handler
  const handleReturnToApp = () => {
    navigate('/workspace');
  };

  // Loading skeleton state
  if (isLoading || !dashboardData || !globalQuotas || !analyticsData || !systemHealth || !platformSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg animate-bounce">
            <Shield className="w-5 h-5" />
          </div>
          <span className="font-semibold text-xs tracking-wide text-slate-700">
            Initializing TRON AI Admin Control Center...
          </span>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout
      activeTab={activeTab}
      onSelectTab={handleSelectTab}
      lang={lang}
      onLanguageChange={handleLanguageChange}
      isLive={isLiveApi}
      onRefresh={() => void loadData(true)}
      isRefreshing={isRefreshing}
      user={user}
      onLogout={logout}
      onReturnToApp={handleReturnToApp}
    >
      {/* 1. Overview Tab */}
      {activeTab === 'overview' && (
        <OverviewTab
          analytics={dashboardData}
          dailyRequests={analyticsData.dailyRequests}
          featureDistribution={analyticsData.featureDistribution}
          providers={providersData.providers}
          health={systemHealth}
          onNavigateTab={handleSelectTab}
          lang={lang}
        />
      )}

      {/* 2. User Management Tab (Phase 1 - Admin V1) */}
      {activeTab === 'users' && (
        <UserManagementTab
          users={users}
          globalQuotas={globalQuotas}
          lang={lang}
          onRefresh={() => void loadData(true)}
          isRefreshing={isRefreshing}
          onSuspendUser={async (userId, reason) => {
            await adminService.suspendUser(userId, reason);
            addToast('User suspended successfully', 'info');
            await loadData(true);
          }}
          onRestoreUser={async (userId) => {
            await adminService.restoreUser(userId);
            addToast('User account restored', 'success');
            await loadData(true);
          }}
          onCreateUser={async (payload) => {
            await adminService.createUser(payload);
            addToast('User created successfully', 'success');
            await loadData(true);
          }}
          onInviteUser={async (payload) => {
            await adminService.inviteUser(payload);
            addToast('User invitation dispatched', 'success');
          }}
          onUpdateRole={async (userId, newRole) => {
            await adminService.updateUserRole(userId, newRole);
            addToast(`Role updated to ${newRole}`, 'success');
            await loadData(true);
          }}
          onResetPassword={async (userId, tempPass) => {
            await adminService.resetUserPassword(userId, tempPass);
            addToast('Temporary password generated', 'success');
          }}
          onDeleteUser={async (userId) => {
            await adminService.deleteUser(userId);
            addToast('User account deleted', 'info');
            await loadData(true);
          }}
          onSaveQuotaOverride={async (override) => {
            await adminService.setUserQuotaOverride(override);
            addToast('Custom user quota override saved', 'success');
            await loadData(true);
          }}
          onRemoveQuotaOverride={async (userId) => {
            await adminService.removeUserQuotaOverride(userId);
            addToast('User reset to global quota limits', 'info');
            await loadData(true);
          }}
          onResetUsageToday={async (userId) => {
            await adminService.resetUserUsageCounterToday(userId);
            addToast("Today's usage counter reset to 0", 'success');
            await loadData(true);
          }}
        />
      )}

      {/* 3. AI Usage & Quotas Tab (Phase 1 - Admin V1) */}
      {activeTab === 'quotas' && (
        <QuotaManagementTab
          globalQuotas={globalQuotas}
          users={users}
          onUpdateGlobalQuotas={async (patch) => {
            await adminService.updateGlobalQuotas(patch);
            addToast('Global daily limits updated successfully', 'success');
            await loadData(true);
          }}
          onSaveQuotaOverride={async (override) => {
            await adminService.setUserQuotaOverride(override);
            addToast('Custom user quota override saved', 'success');
            await loadData(true);
          }}
          onRemoveQuotaOverride={async (userId) => {
            await adminService.removeUserQuotaOverride(userId);
            addToast('User reset to global quota limits', 'info');
            await loadData(true);
          }}
          onResetUsageToday={async (userId) => {
            await adminService.resetUserUsageCounterToday(userId);
            addToast("Today's usage counter reset to 0", 'success');
            await loadData(true);
          }}
          lang={lang}
        />
      )}

      {/* 4. AI Analytics Tab (Phase 2 - Admin V2) */}
      {activeTab === 'analytics' && <AnalyticsTab data={analyticsData} lang={lang} />}

      {/* 5. AI Providers Tab (Phase 2 - Admin V2) */}
      {activeTab === 'providers' && (
        <ProviderManagementTab
          providers={providersData.providers}
          routingMatrix={providersData.routing}
          onUpdateProvider={async (providerId, patch) => {
            await adminService.updateProviderConfig(providerId, patch);
            addToast('Provider configuration updated', 'success');
            await loadData(true);
          }}
          onPingProvider={async (providerId) => {
            return await adminService.pingProvider(providerId);
          }}
          lang={lang}
        />
      )}

      {/* 6. Costs & Budgets Tab (Phase 2 - Admin V2) */}
      {activeTab === 'costs' && <CostControlTab data={costData} lang={lang} />}

      {/* 7. Security Center Tab (Phase 3 - Admin V3) */}
      {activeTab === 'security' && (
        <SecurityCenterTab
          data={securityData}
          onRevokeUserSessions={async (userId) => {
            await adminService.revokeAllUserSessions(userId);
            addToast('Active sessions revoked for user', 'info');
          }}
          onEmergencyRevoke={async () => {
            await adminService.emergencyRevokeAllNonOwnerSessions();
            addToast('Emergency platform session revocation executed', 'warning');
          }}
          lang={lang}
        />
      )}

      {/* 8. Audit Logs Tab (Phase 3 - Admin V3) */}
      {activeTab === 'audit' && <AuditLogsTab logs={auditLogs} lang={lang} />}

      {/* 9. Announcements Tab (Phase 3 - Admin V3) */}
      {activeTab === 'announcements' && (
        <AnnouncementsTab
          announcements={announcements}
          onSaveAnnouncement={async (data) => {
            await adminService.saveAnnouncement(data);
            addToast('Announcement saved successfully', 'success');
            await loadData(true);
          }}
          onDeleteAnnouncement={async (id) => {
            await adminService.deleteAnnouncement(id);
            addToast('Announcement deleted', 'info');
            await loadData(true);
          }}
          lang={lang}
        />
      )}

      {/* 10. System Health Tab (Phase 3 - Admin V3) */}
      {activeTab === 'health' && (
        <SystemHealthTab
          health={systemHealth}
          providers={providersData.providers}
          onRunProbe={async () => {
            await loadData(true);
            addToast('System diagnostics probe completed', 'success');
          }}
          isProbing={isRefreshing}
          lang={lang}
        />
      )}

      {/* 11. Admin Settings Tab */}
      {activeTab === 'settings' && (
        <AdminSettingsTab
          platformSettings={platformSettings}
          onUpdatePlatformSettings={async (patch) => {
            await adminService.updatePlatformControls(patch);
            addToast('Admin platform settings updated', 'success');
            await loadData(true);
          }}
          lang={lang}
          onLanguageChange={handleLanguageChange}
        />
      )}
    </AdminLayout>
  );
};

export default AdminControlPage;
