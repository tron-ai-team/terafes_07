/**
 * TRON AI — Enterprise Admin Control Center
 * Core Domain Models & Type Definitions (V1 + V2 + V3)
 */

export type AdminTab =
  | 'overview'
  | 'users'
  | 'quotas'
  | 'analytics'
  | 'providers'
  | 'costs'
  | 'security'
  | 'audit'
  | 'announcements'
  | 'health'
  | 'settings';

export type UserRole = 'OWNER' | 'ADMIN' | 'USER';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
export type AuthProviderType = 'google' | 'email' | 'github';

export interface AdminUser {
  id: number;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  status: UserStatus;
  authProvider: AuthProviderType;
  authProviderDetails?: {
    googleId?: string;
    verifiedEmail?: boolean;
    locale?: string;
  };
  enabled: boolean;
  registeredAt: string;
  lastLoginAt: string | null;
  suspendedAt?: string | null;
  suspendReason?: string | null;
  aiUsageToday: {
    totalRequests: number;
    tokensUsed: number;
    costEstimate: number;
  };
  aiUsageMonthly: {
    totalRequests: number;
    tokensUsed: number;
    costEstimate: number;
  };
  featureUsageToday: {
    chat: number;
    voice: number;
    interview: number;
    cvMagicFill: number;
    cvAiAssist: number;
  };
  quotaOverride?: UserQuotaOverride | null;
}

export interface UserQuotaOverride {
  userId: number;
  aiChatDailyLimit: number;
  aiVoiceDailyLimit: number;
  aiInterviewDailyLimit: number;
  cvMagicFillDailyLimit: number;
  cvAiAssistDailyLimit: number;
  dailyTokenCeiling: number;
  notes?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface GlobalQuotaConfig {
  aiChatDailyLimit: number; // default: 30 requests
  aiVoiceDailyLimit: number; // default: 10 turns
  aiInterviewDailyLimit: number; // default: 3 sessions
  cvMagicFillDailyLimit: number; // default: 5 generations
  cvAiAssistDailyLimit: number; // default: 10 requests
  dailyTokenBudget: number; // default: 100,000 tokens
  monthlyTokenBudget: number; // default: 2,500,000 tokens
  monthlySpendingCapUsd: number; // default: $15.00
  resetSchedule: string; // e.g. "Daily at 00:00 JST (15:00 UTC)"
  featuresEnabled: {
    aiChat: boolean;
    aiVoice: boolean;
    aiInterview: boolean;
    cvMagicFill: boolean;
    cvAiAssist: boolean;
  };
  rolePresets: {
    USER: Record<string, number>;
    ADMIN: Record<string, number>;
    OWNER: Record<string, number>;
  };
  lastUpdated: string;
  updatedBy: string;
}

export interface AnalyticsOverview {
  totalUsers: number;
  activeUsers7d: number;
  newRegistrations7d: number;
  aiRequestsToday: number;
  aiRequestsMonth: number;
  tokensConsumedToday: number;
  tokensConsumedMonth: number;
  estimatedAiSpendToday: number;
  estimatedAiSpendMonth: number;
  failedRequestsToday: number;
  failureRate: number;
  avgLatencyMs: number;
}

export interface DailyRequestsDataPoint {
  date: string;
  totalRequests: number;
  chatRequests: number;
  voiceRequests: number;
  interviewRequests: number;
  cvRequests: number;
  failedRequests: number;
}

export interface UserGrowthDataPoint {
  date: string;
  totalUsers: number;
  activeUsers: number;
  newSignups: number;
}

export interface TokenConsumptionDataPoint {
  date: string;
  chatTokens: number;
  voiceTokens: number;
  interviewTokens: number;
  cvTokens: number;
  totalTokens: number;
}

export interface FeatureDistributionItem {
  featureKey: string;
  featureName: string;
  requests: number;
  percentage: number;
  color: string;
}

export interface ProviderUsageItem {
  providerId: string;
  providerName: string;
  requestCount: number;
  percentage: number;
  color: string;
}

export interface DailyCostDataPoint {
  date: string;
  cost: number;
  projectedCost: number;
}

export interface LatencyDataPoint {
  time: string;
  p50: number;
  p95: number;
  p99: number;
}

export type ProviderStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE';

export interface AiProviderInfo {
  id: 'groq' | 'gemini' | 'mistral' | 'openrouter' | 'ollama';
  name: string;
  description: string;
  status: ProviderStatus;
  enabled: boolean;
  isLocal: boolean;
  credentialConfigured: boolean;
  credentialMasked: string; // e.g. "GROQ_API_KEY (●●●●-9f8a)"
  availableModels: string[];
  preferredModel: string;
  fallbackRank: number; // 1 = Primary, 2 = Secondary, etc.
  requestCountToday: number;
  failedCountToday: number;
  avgLatencyMs: number;
  tokensUsedToday: number;
  estimatedCostToday: number;
  lastSuccessfulRequestAt: string;
  spendingLimitMonthlyUsd?: number;
}

export interface FeatureRoutingConfig {
  featureId: 'chat' | 'voice' | 'interview' | 'cv_magic' | 'agent';
  featureName: string;
  preferredProviderId: string;
  preferredModel: string;
  fallbackProviderId: string;
  fallbackModel: string;
}

export interface CostOverview {
  todayEstimatedCostUsd: number;
  todayCostDeltaPct: number;
  monthlyEstimatedCostUsd: number;
  monthlyBudgetCapUsd: number;
  budgetUsagePct: number;
  projectedMonthEndCostUsd: number;
  avgCostPerUserUsd: number;
  avgCostPerRequestUsd: number;
}

export interface ProviderCostItem {
  providerId: string;
  providerName: string;
  requestCount: number;
  tokensUsed: number;
  costUsd: number;
  costPct: number;
}

export interface FeatureCostItem {
  featureKey: string;
  featureName: string;
  requests: number;
  costUsd: number;
  costPct: number;
}

export interface UserCostItem {
  userId: number;
  email: string;
  displayName: string;
  requestsMonth: number;
  tokensMonth: number;
  costMonthUsd: number;
}

export interface SecurityOverview {
  googleOAuthConfigured: boolean;
  localAuthEnabled: boolean;
  adminMfaEnforced: boolean;
  totalActiveSessions: number;
  suspendedAccountsCount: number;
  failedLoginsLast24h: number;
  suspiciousEventsLast24h: number;
}

export interface FailedLoginRecord {
  id: string;
  email: string;
  ipAddress: string;
  location: string;
  attemptedAt: string;
  failureReason: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: string;
  description: string;
  ipAddress: string;
  resolved: boolean;
}

export interface AdminAuditLog {
  id: number;
  actorUserId: number;
  actorEmail?: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: string;
  status: 'SUCCESS' | 'DENIED' | 'WARNING';
  ipAddress?: string;
  createdAt: string;
}

export type AnnouncementAudience = 'ALL' | 'FREE' | 'PREMIUM' | 'ADMINS';
export type AnnouncementPriority = 'INFO' | 'ANNOUNCEMENT' | 'MAINTENANCE' | 'CRITICAL';
export type AnnouncementStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'EXPIRED';

export interface AdminAnnouncement {
  id: string;
  titleEn: string;
  titleJa: string;
  messageEn: string;
  messageJa: string;
  audience: AnnouncementAudience;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  startAt: string;
  endAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceHealthItem {
  id: string;
  name: string;
  role: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  latencyMs: number;
  uptimePct: number;
  version?: string;
  details?: Record<string, unknown>;
}

export interface SystemHealthOverview {
  overallStatus: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  uptimePct: number;
  avgLatencyMs: number;
  successRatePct: number;
  lastCheckedAt: string;
  services: ServiceHealthItem[];
  recentErrors: {
    id: string;
    timestamp: string;
    service: string;
    level: 'WARN' | 'ERROR';
    message: string;
  }[];
}

export interface AdminPlatformSettings {
  mode: 'NORMAL' | 'EXHIBITION' | 'MAINTENANCE';
  pauseNewAiTasks: boolean;
  localRoutingEnabled: boolean;
  cloudRoutingEnabled: boolean;
  stopNewAgentJobs: boolean;
  maxConcurrentAiRequests: number;
  queueCapacity: number;
}
