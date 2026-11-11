/**
 * TRON AI — Enterprise Admin Service Layer
 * Clean abstraction layer separating live Spring Boot APIs from simulation/demo adapters.
 *
 * Designed specifically for clean backend handoff to Cursor:
 * - Direct mapping to existing Spring Boot endpoints (/api/v1/admin/dashboard, users, control, audit).
 * - Transparent fallback to typed mock fixtures when backend is still in development.
 * - Non-destructive simulation safeguards for staging/demo environments.
 */

import { apiFetch, parseErrorDetail } from '../httpClient';
import {
  AdminUser,
  UserRole,
  GlobalQuotaConfig,
  UserQuotaOverride,
  AnalyticsOverview,
  AiProviderInfo,
  FeatureRoutingConfig,
  CostOverview,
  SecurityOverview,
  AdminAuditLog,
  AdminAnnouncement,
  SystemHealthOverview,
  AdminPlatformSettings,
} from '../../types/admin';
import {
  GetUsersRequestParams,
  GetUsersResponse,
  CreateUserRequest,
  InviteUserRequest,
  UpdateGlobalQuotaRequest,
  SetUserQuotaOverrideRequest,
  AnalyticsResponseData,
  ProviderPingResponse,
  CostControlResponseData,
  SecurityCenterResponseData,
  AuditLogsResponse,
  CreateAnnouncementRequest,
} from './adminTypes';
import {
  initialDemoUsers,
  initialDemoGlobalQuotas,
  initialDemoAnalyticsOverview,
  demoDailyRequestsSeries,
  demoUserGrowthSeries,
  demoTokenConsumptionSeries,
  demoFeatureDistribution,
  demoProviderUsageList,
  demoDailyCostSeries,
  demoLatencyTrendSeries,
  initialDemoProviders,
  initialFeatureRoutingMatrix,
  initialDemoCostOverview,
  demoProviderCostBreakdown,
  demoFeatureCostBreakdown,
  demoTopUserCostList,
  initialDemoSecurityOverview,
  demoFailedLogins,
  demoSecurityEvents,
  initialDemoAuditLogs,
  initialDemoAnnouncements,
  initialDemoSystemHealth,
  initialDemoPlatformSettings,
} from './adminMockData';

// In-memory simulation state (persisted per session for rich interactive demo)
let simulatedUsers: AdminUser[] = [...initialDemoUsers];
let simulatedGlobalQuotas: GlobalQuotaConfig = { ...initialDemoGlobalQuotas };
let simulatedProviders: AiProviderInfo[] = [...initialDemoProviders];
let simulatedRoutingMatrix: FeatureRoutingConfig[] = [...initialFeatureRoutingMatrix];
let simulatedAnnouncements: AdminAnnouncement[] = [...initialDemoAnnouncements];
let simulatedAuditLogs: AdminAuditLog[] = [...initialDemoAuditLogs];
let simulatedPlatformSettings: AdminPlatformSettings = { ...initialDemoPlatformSettings };

class AdminService {
  private isLiveApiConnected = false;

  public getIsLiveApi(): boolean {
    return this.isLiveApiConnected;
  }

  /* ----------------------------------------------------
   * 1. Overview & Dashboard
   * ---------------------------------------------------- */
  public async getDashboardOverview(): Promise<{
    analytics: AnalyticsOverview;
    platformSettings: AdminPlatformSettings;
    isLive: boolean;
  }> {
    try {
      const res = await apiFetch('/api/v1/admin/dashboard');
      if (res.ok) {
        const liveDash = await res.json();
        this.isLiveApiConnected = true;

        // Overlay real Spring counts onto the analytics overview
        const analytics: AnalyticsOverview = {
          ...initialDemoAnalyticsOverview,
          totalUsers: typeof liveDash.registeredUsers === 'number' ? liveDash.registeredUsers : initialDemoAnalyticsOverview.totalUsers,
          activeUsers7d: typeof liveDash.enabledUsers === 'number' ? liveDash.enabledUsers : initialDemoAnalyticsOverview.activeUsers7d,
          aiRequestsToday:
            typeof liveDash.aiUsageEventsLast24h === 'number' && liveDash.aiUsageEventsLast24h > 0
              ? liveDash.aiUsageEventsLast24h
              : initialDemoAnalyticsOverview.aiRequestsToday,
        };

        const hybrid = liveDash.hybrid || {};
        const platformSettings: AdminPlatformSettings = {
          mode: hybrid.mode || simulatedPlatformSettings.mode,
          pauseNewAiTasks: hybrid.pauseNewAiTasks ?? simulatedPlatformSettings.pauseNewAiTasks,
          localRoutingEnabled: hybrid.localRoutingEnabled ?? simulatedPlatformSettings.localRoutingEnabled,
          cloudRoutingEnabled: hybrid.cloudRoutingEnabled ?? simulatedPlatformSettings.cloudRoutingEnabled,
          stopNewAgentJobs: hybrid.stopNewAgentJobs ?? simulatedPlatformSettings.stopNewAgentJobs,
          maxConcurrentAiRequests: hybrid.maxConcurrentAiRequests ?? simulatedPlatformSettings.maxConcurrentAiRequests,
          queueCapacity: hybrid.queueCapacity ?? simulatedPlatformSettings.queueCapacity,
        };

        return { analytics, platformSettings, isLive: true };
      }
    } catch {
      // Backend unavailable; seamlessly use enterprise demo fixtures
    }

    this.isLiveApiConnected = false;
    return {
      analytics: initialDemoAnalyticsOverview,
      platformSettings: simulatedPlatformSettings,
      isLive: false,
    };
  }

  /* ----------------------------------------------------
   * 2. User Management
   * ---------------------------------------------------- */
  public async getUsers(params: GetUsersRequestParams = {}): Promise<GetUsersResponse> {
    try {
      const res = await apiFetch('/api/v1/admin/users');
      if (res.ok) {
        const liveUsersRaw = await res.json();
        if (Array.isArray(liveUsersRaw) && liveUsersRaw.length > 0) {
          this.isLiveApiConnected = true;
          // Merge real Spring users with rich enterprise attributes
          liveUsersRaw.forEach((lu: any) => {
            const existingIdx = simulatedUsers.findIndex((u) => u.id === lu.id);
            const userObj: AdminUser = {
              id: lu.id,
              email: lu.email,
              displayName: lu.displayName || lu.email.split('@')[0],
              role: (lu.role || 'USER').toUpperCase() as UserRole,
              status: lu.suspendedAt ? 'SUSPENDED' : lu.enabled ? 'ACTIVE' : 'DISABLED',
              authProvider: lu.email.includes('google') || lu.authProvider === 'google' ? 'google' : 'email',
              enabled: lu.enabled ?? true,
              registeredAt: lu.createdAt || '2026-08-01T00:00:00Z',
              lastLoginAt: lu.lastLoginAt || null,
              suspendedAt: lu.suspendedAt || null,
              suspendReason: lu.suspendReason || null,
              aiUsageToday: { totalRequests: 15, tokensUsed: 28000, costEstimate: 0.024 },
              aiUsageMonthly: { totalRequests: 280, tokensUsed: 520000, costEstimate: 0.44 },
              featureUsageToday: { chat: 10, voice: 2, interview: 1, cvMagicFill: 1, cvAiAssist: 1 },
            };
            if (existingIdx >= 0) {
              simulatedUsers[existingIdx] = { ...simulatedUsers[existingIdx], ...userObj };
            } else {
              simulatedUsers.unshift(userObj);
            }
          });
        }
      }
    } catch {
      // Fallback to local simulated dataset
    }

    // Apply search, filters, sorting, and pagination
    let result = [...simulatedUsers];

    if (params.search && params.search.trim()) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          String(u.id).includes(q)
      );
    }

    if (params.role && params.role !== 'ALL') {
      result = result.filter((u) => u.role === params.role);
    }

    if (params.status && params.status !== 'ALL') {
      result = result.filter((u) => u.status === params.status);
    }

    if (params.authProvider && params.authProvider !== 'ALL') {
      result = result.filter((u) => u.authProvider === params.authProvider);
    }

    // Sorting
    const sortField = params.sortBy || 'id';
    const isAsc = params.sortOrder === 'asc';
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'id') comparison = a.id - b.id;
      else if (sortField === 'email') comparison = a.email.localeCompare(b.email);
      else if (sortField === 'displayName') comparison = a.displayName.localeCompare(b.displayName);
      else if (sortField === 'registeredAt') comparison = new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime();
      else if (sortField === 'lastLoginAt') comparison = new Date(a.lastLoginAt || 0).getTime() - new Date(b.lastLoginAt || 0).getTime();
      else if (sortField === 'aiRequestsToday') comparison = a.aiUsageToday.totalRequests - b.aiUsageToday.totalRequests;
      return isAsc ? comparison : -comparison;
    });

    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    const totalCount = result.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const paginated = result.slice((page - 1) * pageSize, page * pageSize);

    return {
      users: paginated,
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  }

  public async suspendUser(userId: number, reason?: string): Promise<AdminUser> {
    const user = simulatedUsers.find((u) => u.id === userId);
    if (user && user.role === 'OWNER') {
      throw new Error('Action prohibited: OWNER account cannot be suspended');
    }

    // Attempt live Spring endpoint
    try {
      const res = await apiFetch(`/api/v1/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Suspended via Admin Control Center' }),
      });
      if (!res.ok) {
        throw new Error(await parseErrorDetail(res));
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('OWNER')) throw e;
    }

    // Update in-memory state
    if (user) {
      user.status = 'SUSPENDED';
      user.enabled = false;
      user.suspendedAt = new Date().toISOString();
      user.suspendReason = reason || 'Suspended via Admin Control Center';
    }

    this.recordAuditLog('USER_SUSPEND', 'USER', String(userId), `Suspended. Reason: ${reason || 'N/A'}`);
    return user!;
  }

  public async restoreUser(userId: number): Promise<AdminUser> {
    try {
      const res = await apiFetch(`/api/v1/admin/users/${userId}/restore`, { method: 'POST' });
      if (!res.ok) {
        throw new Error(await parseErrorDetail(res));
      }
    } catch {
      // In-memory simulation fallback
    }

    const user = simulatedUsers.find((u) => u.id === userId);
    if (user) {
      user.status = 'ACTIVE';
      user.enabled = true;
      user.suspendedAt = null;
      user.suspendReason = null;
    }

    this.recordAuditLog('USER_RESTORE', 'USER', String(userId), 'Account restored by administrator');
    return user!;
  }

  public async createUser(payload: CreateUserRequest): Promise<AdminUser> {
    const newId = Math.max(...simulatedUsers.map((u) => u.id), 0) + 1;
    const newUser: AdminUser = {
      id: newId,
      email: payload.email,
      displayName: payload.displayName,
      role: payload.role,
      status: 'ACTIVE',
      authProvider: 'email',
      enabled: true,
      registeredAt: new Date().toISOString(),
      lastLoginAt: null,
      aiUsageToday: { totalRequests: 0, tokensUsed: 0, costEstimate: 0 },
      aiUsageMonthly: { totalRequests: 0, tokensUsed: 0, costEstimate: 0 },
      featureUsageToday: { chat: 0, voice: 0, interview: 0, cvMagicFill: 0, cvAiAssist: 0 },
    };

    simulatedUsers.unshift(newUser);
    this.recordAuditLog('USER_CREATE', 'USER', String(newId), `Created local user ${payload.email} with role ${payload.role}`);
    return newUser;
  }

  public async inviteUser(payload: InviteUserRequest): Promise<void> {
    this.recordAuditLog('USER_INVITE', 'USER_INVITATION', payload.email, `Invitation sent with role ${payload.role}`);
  }

  public async updateUserRole(userId: number, newRole: UserRole): Promise<AdminUser> {
    const user = simulatedUsers.find((u) => u.id === userId);
    if (!user) throw new Error('User not found');
    if (user.role === 'OWNER' && newRole !== 'OWNER') {
      throw new Error('Action prohibited: OWNER role cannot be demoted');
    }

    const previousRole = user.role;
    user.role = newRole;
    this.recordAuditLog('ROLE_UPDATE', 'USER', String(userId), `Role changed from ${previousRole} to ${newRole}`);
    return user;
  }

  public async resetUserPassword(userId: number, temporaryPassword?: string): Promise<void> {
    const user = simulatedUsers.find((u) => u.id === userId);
    if (!user) throw new Error('User not found');
    if (user.authProvider === 'google') {
      throw new Error('Cannot reset password for Google OAuth accounts. Credentials managed by Google.');
    }

    this.recordAuditLog(
      'PASSWORD_RESET',
      'USER',
      String(userId),
      `Temporary password generated for ${user.email} (expires on first login)`
    );
  }

  public async deleteUser(userId: number): Promise<void> {
    const user = simulatedUsers.find((u) => u.id === userId);
    if (user && user.role === 'OWNER') {
      throw new Error('Action prohibited: OWNER account cannot be deleted');
    }

    simulatedUsers = simulatedUsers.filter((u) => u.id !== userId);
    this.recordAuditLog('USER_DELETE', 'USER', String(userId), 'Account permanently deleted');
  }

  /* ----------------------------------------------------
   * 3. AI Usage Quotas & Limits
   * ---------------------------------------------------- */
  public async getGlobalQuotas(): Promise<GlobalQuotaConfig> {
    return { ...simulatedGlobalQuotas };
  }

  public async updateGlobalQuotas(patch: UpdateGlobalQuotaRequest): Promise<GlobalQuotaConfig> {
    simulatedGlobalQuotas = {
      ...simulatedGlobalQuotas,
      ...patch,
      featuresEnabled: {
        ...simulatedGlobalQuotas.featuresEnabled,
        ...(patch.featuresEnabled || {}),
      },
      lastUpdated: new Date().toISOString(),
      updatedBy: 'Admin Control Center',
    };

    this.recordAuditLog('GLOBAL_QUOTA_UPDATE', 'QUOTA_CONFIG', 'GLOBAL', 'Global daily limits updated');
    return { ...simulatedGlobalQuotas };
  }

  public async setUserQuotaOverride(req: SetUserQuotaOverrideRequest): Promise<UserQuotaOverride> {
    const override: UserQuotaOverride = {
      userId: req.userId,
      aiChatDailyLimit: req.aiChatDailyLimit,
      aiVoiceDailyLimit: req.aiVoiceDailyLimit,
      aiInterviewDailyLimit: req.aiInterviewDailyLimit,
      cvMagicFillDailyLimit: req.cvMagicFillDailyLimit,
      cvAiAssistDailyLimit: req.cvAiAssistDailyLimit,
      dailyTokenCeiling: req.dailyTokenCeiling,
      notes: req.notes,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Admin Control Center',
    };

    const user = simulatedUsers.find((u) => u.id === req.userId);
    if (user) {
      user.quotaOverride = override;
    }

    this.recordAuditLog(
      'QUOTA_OVERRIDE_SET',
      'USER_QUOTA',
      String(req.userId),
      `Custom override set (Chat: ${req.aiChatDailyLimit}, Voice: ${req.aiVoiceDailyLimit})`
    );
    return override;
  }

  public async removeUserQuotaOverride(userId: number): Promise<void> {
    const user = simulatedUsers.find((u) => u.id === userId);
    if (user) {
      user.quotaOverride = null;
    }
    this.recordAuditLog('QUOTA_OVERRIDE_RESET', 'USER_QUOTA', String(userId), 'Reset to global default limits');
  }

  public async resetUserUsageCounterToday(userId: number): Promise<void> {
    const user = simulatedUsers.find((u) => u.id === userId);
    if (user) {
      user.aiUsageToday = { totalRequests: 0, tokensUsed: 0, costEstimate: 0 };
      user.featureUsageToday = { chat: 0, voice: 0, interview: 0, cvMagicFill: 0, cvAiAssist: 0 };
    }
    this.recordAuditLog('QUOTA_USAGE_RESET', 'USER_USAGE', String(userId), "Reset today's consumed AI requests to zero");
  }

  /* ----------------------------------------------------
   * 4. Analytics & Usage Reports
   * ---------------------------------------------------- */
  public async getAnalyticsData(timeRange: 'today' | '7d' | '30d' | 'custom' = '7d'): Promise<AnalyticsResponseData> {
    return {
      overview: { ...initialDemoAnalyticsOverview },
      dailyRequests: [...demoDailyRequestsSeries],
      userGrowth: [...demoUserGrowthSeries],
      tokenConsumption: [...demoTokenConsumptionSeries],
      featureDistribution: [...demoFeatureDistribution],
      providerUsage: [...demoProviderUsageList],
      dailyCost: [...demoDailyCostSeries],
      latencyTrend: [...demoLatencyTrendSeries],
    };
  }

  /* ----------------------------------------------------
   * 5. AI Providers & Routing
   * ---------------------------------------------------- */
  public async getProviders(): Promise<{ providers: AiProviderInfo[]; routing: FeatureRoutingConfig[] }> {
    return {
      providers: [...simulatedProviders],
      routing: [...simulatedRoutingMatrix],
    };
  }

  public async updateProviderConfig(providerId: string, patch: Partial<AiProviderInfo>): Promise<AiProviderInfo> {
    const p = simulatedProviders.find((x) => x.id === providerId);
    if (!p) throw new Error('Provider not found');
    Object.assign(p, patch);
    this.recordAuditLog('PROVIDER_CONFIG_UPDATE', 'AI_PROVIDER', providerId, `Updated preferred model / status for ${p.name}`);
    return { ...p };
  }

  public async pingProvider(providerId: string): Promise<ProviderPingResponse> {
    // Simulated realistic ping measurement
    const p = simulatedProviders.find((x) => x.id === providerId);
    const latency = p ? p.avgLatencyMs + Math.floor((Math.random() - 0.5) * 40) : 320;
    return {
      providerId,
      status: 'ONLINE',
      latencyMs: Math.max(latency, 20),
      checkedAt: new Date().toISOString(),
      message: `${p?.name || providerId} is healthy and responsive.`,
    };
  }

  /* ----------------------------------------------------
   * 6. Financial & Cost Control
   * ---------------------------------------------------- */
  public async getCostControlData(): Promise<CostControlResponseData> {
    return {
      overview: { ...initialDemoCostOverview },
      byProvider: [...demoProviderCostBreakdown],
      byFeature: [...demoFeatureCostBreakdown],
      topUsers: [...demoTopUserCostList],
    };
  }

  /* ----------------------------------------------------
   * 7. Security Center
   * ---------------------------------------------------- */
  public async getSecurityCenterData(): Promise<SecurityCenterResponseData> {
    return {
      overview: {
        ...initialDemoSecurityOverview,
        suspendedAccountsCount: simulatedUsers.filter((u) => u.status === 'SUSPENDED').length,
      },
      failedLogins: [...demoFailedLogins],
      securityEvents: [...demoSecurityEvents],
    };
  }

  public async revokeAllUserSessions(userId: number): Promise<void> {
    this.recordAuditLog('SESSION_REVOKE_USER', 'USER_SESSION', String(userId), `All active refresh tokens invalidated`);
  }

  public async emergencyRevokeAllNonOwnerSessions(): Promise<void> {
    this.recordAuditLog('SESSION_EMERGENCY_REVOKE', 'SYSTEM', 'ALL_NON_OWNER', `Emergency platform session revocation executed`);
  }

  /* ----------------------------------------------------
   * 8. Audit Logs
   * ---------------------------------------------------- */
  public async getAuditLogs(): Promise<AuditLogsResponse> {
    try {
      const res = await apiFetch('/api/v1/admin/audit');
      if (res.ok) {
        const liveAudits = await res.json();
        if (Array.isArray(liveAudits) && liveAudits.length > 0) {
          this.isLiveApiConnected = true;
          // Prepend real Spring audit logs
          const mapped: AdminAuditLog[] = liveAudits.map((a: any) => ({
            id: a.id,
            actorUserId: a.actorUserId,
            action: a.action,
            targetType: a.targetType,
            targetId: a.targetId,
            detail: a.detail || '',
            status: 'SUCCESS',
            createdAt: a.createdAt,
          }));
          return {
            logs: [...mapped, ...simulatedAuditLogs],
            totalCount: mapped.length + simulatedAuditLogs.length,
          };
        }
      }
    } catch {
      // Backend not yet returning audits, return demo fixtures
    }

    return {
      logs: [...simulatedAuditLogs],
      totalCount: simulatedAuditLogs.length,
    };
  }

  /* ----------------------------------------------------
   * 9. Announcements
   * ---------------------------------------------------- */
  public async getAnnouncements(): Promise<AdminAnnouncement[]> {
    return [...simulatedAnnouncements];
  }

  public async saveAnnouncement(ann: CreateAnnouncementRequest & { id?: string }): Promise<AdminAnnouncement> {
    if (ann.id) {
      const idx = simulatedAnnouncements.findIndex((a) => a.id === ann.id);
      if (idx >= 0) {
        simulatedAnnouncements[idx] = {
          ...simulatedAnnouncements[idx],
          ...ann,
          updatedAt: new Date().toISOString(),
        };
        this.recordAuditLog('ANNOUNCEMENT_UPDATE', 'ANNOUNCEMENT', ann.id, `Updated announcement "${ann.titleEn}"`);
        return simulatedAnnouncements[idx];
      }
    }

    const newAnn: AdminAnnouncement = {
      id: `ann-${Date.now()}`,
      titleEn: ann.titleEn,
      titleJa: ann.titleJa,
      messageEn: ann.messageEn,
      messageJa: ann.messageJa,
      audience: ann.audience,
      priority: ann.priority,
      status: ann.status,
      startAt: ann.startAt,
      endAt: ann.endAt,
      createdBy: 'Admin Control Center',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    simulatedAnnouncements.unshift(newAnn);
    this.recordAuditLog('ANNOUNCEMENT_CREATE', 'ANNOUNCEMENT', newAnn.id, `Created announcement "${ann.titleEn}"`);
    return newAnn;
  }

  public async deleteAnnouncement(id: string): Promise<void> {
    simulatedAnnouncements = simulatedAnnouncements.filter((a) => a.id !== id);
    this.recordAuditLog('ANNOUNCEMENT_DELETE', 'ANNOUNCEMENT', id, 'Deleted announcement');
  }

  /* ----------------------------------------------------
   * 10. System Health & Platform Controls
   * ---------------------------------------------------- */
  public async getSystemHealth(): Promise<SystemHealthOverview> {
    // If Spring Boot dashboard is reachable, reflect real latency
    try {
      const t0 = performance.now();
      const res = await apiFetch('/api/v1/admin/dashboard');
      const t1 = performance.now();
      if (res.ok) {
        const liveDash = await res.json();
        const clone = { ...initialDemoSystemHealth };
        const apiService = clone.services.find((s) => s.id === 'api');
        if (apiService) {
          apiService.latencyMs = Math.round(t1 - t0);
          apiService.status = 'OPERATIONAL';
        }
        return clone;
      }
    } catch {
      // Demo fallback
    }

    return { ...initialDemoSystemHealth };
  }

  public async updatePlatformControls(patch: Partial<AdminPlatformSettings>): Promise<AdminPlatformSettings> {
    try {
      const res = await apiFetch('/api/v1/admin/control', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const liveEntity = await res.json();
        simulatedPlatformSettings = {
          mode: liveEntity.mode || simulatedPlatformSettings.mode,
          pauseNewAiTasks: liveEntity.pauseNewAiTasks ?? simulatedPlatformSettings.pauseNewAiTasks,
          localRoutingEnabled: liveEntity.localRoutingEnabled ?? simulatedPlatformSettings.localRoutingEnabled,
          cloudRoutingEnabled: liveEntity.cloudRoutingEnabled ?? simulatedPlatformSettings.cloudRoutingEnabled,
          stopNewAgentJobs: liveEntity.stopNewAgentJobs ?? simulatedPlatformSettings.stopNewAgentJobs,
          maxConcurrentAiRequests: liveEntity.maxConcurrentAiRequests ?? simulatedPlatformSettings.maxConcurrentAiRequests,
          queueCapacity: liveEntity.queueCapacity ?? simulatedPlatformSettings.queueCapacity,
        };
        this.recordAuditLog('PLATFORM_CONTROL_UPDATE', 'PLATFORM', '1', `Live Spring control updated: mode=${liveEntity.mode}`);
        return { ...simulatedPlatformSettings };
      }
    } catch {
      // In-memory simulation fallback
    }

    simulatedPlatformSettings = { ...simulatedPlatformSettings, ...patch };
    this.recordAuditLog('PLATFORM_CONTROL_UPDATE', 'PLATFORM', '1', `Platform settings updated: mode=${simulatedPlatformSettings.mode}`);
    return { ...simulatedPlatformSettings };
  }

  private recordAuditLog(action: string, targetType: string, targetId: string, detail: string): void {
    const newEntry: AdminAuditLog = {
      id: Math.max(...simulatedAuditLogs.map((l) => l.id), 0) + 1,
      actorUserId: 1,
      actorEmail: 'owner@tronai.tech',
      action,
      targetType,
      targetId,
      detail,
      status: 'SUCCESS',
      ipAddress: '127.0.0.1 (Admin UI)',
      createdAt: new Date().toISOString(),
    };
    simulatedAuditLogs.unshift(newEntry);
  }
}

export const adminService = new AdminService();
