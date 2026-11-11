/**
 * TRON AI — Enterprise Admin API Contract
 * TypeScript request/response contracts for Cursor Backend Engineering
 */

import {
  AdminUser,
  UserRole,
  UserQuotaOverride,
  GlobalQuotaConfig,
  AnalyticsOverview,
  DailyRequestsDataPoint,
  UserGrowthDataPoint,
  TokenConsumptionDataPoint,
  FeatureDistributionItem,
  ProviderUsageItem,
  DailyCostDataPoint,
  LatencyDataPoint,
  AiProviderInfo,
  FeatureRoutingConfig,
  CostOverview,
  ProviderCostItem,
  FeatureCostItem,
  UserCostItem,
  SecurityOverview,
  FailedLoginRecord,
  SecurityEvent,
  AdminAuditLog,
  AdminAnnouncement,
  SystemHealthOverview,
  AdminPlatformSettings,
} from '../../types/admin';

/* ----------------------------------------------------
 * 1. Users API Contracts (V1)
 * ---------------------------------------------------- */

export interface GetUsersRequestParams {
  search?: string;
  role?: UserRole | 'ALL';
  status?: 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'ALL';
  authProvider?: 'google' | 'email' | 'ALL';
  page?: number;
  pageSize?: number;
  sortBy?: 'id' | 'email' | 'displayName' | 'registeredAt' | 'lastLoginAt' | 'aiRequestsToday';
  sortOrder?: 'asc' | 'desc';
}

export interface GetUsersResponse {
  users: AdminUser[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateUserRequest {
  email: string;
  displayName: string;
  role: UserRole;
  temporaryPassword?: string;
  sendWelcomeEmail?: boolean;
}

export interface InviteUserRequest {
  email: string;
  role: UserRole;
  personalNote?: string;
  expiresInDays?: number;
}

export interface UpdateUserRoleRequest {
  role: UserRole;
}

export interface ResetUserPasswordRequest {
  temporaryPassword?: string;
  requirePasswordChangeOnLogin?: boolean;
}

export interface SuspendUserRequest {
  reason?: string;
}

/* ----------------------------------------------------
 * 2. Quota Management API Contracts (V1)
 * ---------------------------------------------------- */

export interface UpdateGlobalQuotaRequest {
  aiChatDailyLimit?: number;
  aiVoiceDailyLimit?: number;
  aiInterviewDailyLimit?: number;
  cvMagicFillDailyLimit?: number;
  cvAiAssistDailyLimit?: number;
  dailyTokenBudget?: number;
  monthlyTokenBudget?: number;
  monthlySpendingCapUsd?: number;
  resetSchedule?: string;
  featuresEnabled?: {
    aiChat?: boolean;
    aiVoice?: boolean;
    aiInterview?: boolean;
    cvMagicFill?: boolean;
    cvAiAssist?: boolean;
  };
}

export interface SetUserQuotaOverrideRequest {
  userId: number;
  aiChatDailyLimit: number;
  aiVoiceDailyLimit: number;
  aiInterviewDailyLimit: number;
  cvMagicFillDailyLimit: number;
  cvAiAssistDailyLimit: number;
  dailyTokenCeiling: number;
  notes?: string;
}

/* ----------------------------------------------------
 * 3. Analytics API Contracts (V2)
 * ---------------------------------------------------- */

export interface GetAnalyticsRequestParams {
  timeRange: 'today' | '7d' | '30d' | 'custom';
  startDate?: string;
  endDate?: string;
}

export interface AnalyticsResponseData {
  overview: AnalyticsOverview;
  dailyRequests: DailyRequestsDataPoint[];
  userGrowth: UserGrowthDataPoint[];
  tokenConsumption: TokenConsumptionDataPoint[];
  featureDistribution: FeatureDistributionItem[];
  providerUsage: ProviderUsageItem[];
  dailyCost: DailyCostDataPoint[];
  latencyTrend: LatencyDataPoint[];
}

/* ----------------------------------------------------
 * 4. Provider Management API Contracts (V2)
 * ---------------------------------------------------- */

export interface UpdateProviderConfigRequest {
  providerId: string;
  enabled?: boolean;
  preferredModel?: string;
  fallbackRank?: number;
  spendingLimitMonthlyUsd?: number;
}

export interface UpdateFeatureRoutingRequest {
  routingMatrix: FeatureRoutingConfig[];
}

export interface ProviderPingResponse {
  providerId: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  latencyMs: number;
  checkedAt: string;
  message?: string;
}

/* ----------------------------------------------------
 * 5. Cost Control API Contracts (V2)
 * ---------------------------------------------------- */

export interface CostControlResponseData {
  overview: CostOverview;
  byProvider: ProviderCostItem[];
  byFeature: FeatureCostItem[];
  topUsers: UserCostItem[];
}

export interface UpdateBudgetThresholdsRequest {
  monthlyBudgetCapUsd: number;
  warningAlertThresholdPct: number; // e.g. 80
  criticalAlertThresholdPct: number; // e.g. 95
  alertEmailRecipients: string[];
}

/* ----------------------------------------------------
 * 6. Security Center API Contracts (V3)
 * ---------------------------------------------------- */

export interface SecurityCenterResponseData {
  overview: SecurityOverview;
  failedLogins: FailedLoginRecord[];
  securityEvents: SecurityEvent[];
}

export interface RevokeUserSessionsRequest {
  userId: number;
  reason?: string;
}

/* ----------------------------------------------------
 * 7. Audit Logs API Contracts (V3)
 * ---------------------------------------------------- */

export interface GetAuditLogsParams {
  action?: string;
  actorUserId?: number;
  status?: 'SUCCESS' | 'DENIED' | 'WARNING';
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogsResponse {
  logs: AdminAuditLog[];
  totalCount: number;
}

/* ----------------------------------------------------
 * 8. Announcements API Contracts (V3)
 * ---------------------------------------------------- */

export interface CreateAnnouncementRequest {
  titleEn: string;
  titleJa: string;
  messageEn: string;
  messageJa: string;
  audience: 'ALL' | 'FREE' | 'PREMIUM' | 'ADMINS';
  priority: 'INFO' | 'ANNOUNCEMENT' | 'MAINTENANCE' | 'CRITICAL';
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'EXPIRED';
  startAt: string;
  endAt?: string | null;
}

export interface UpdateAnnouncementRequest extends Partial<CreateAnnouncementRequest> {
  id: string;
}

/* ----------------------------------------------------
 * 9. Platform Health & Controls (V1 - V3)
 * ---------------------------------------------------- */

export interface UpdatePlatformControlRequest {
  mode?: 'NORMAL' | 'EXHIBITION' | 'MAINTENANCE';
  pauseNewAiTasks?: boolean;
  localRoutingEnabled?: boolean;
  cloudRoutingEnabled?: boolean;
  stopNewAgentJobs?: boolean;
  maxConcurrentAiRequests?: number;
  queueCapacity?: number;
}
