/**
 * TRON AI — Enterprise Admin Control Center
 * Demo Fixtures & Isolated Simulation Data (V1 + V2 + V3)
 *
 * NOTE: These are typed demo fixtures used for safe frontend staging and demonstration.
 * They represent the exact schema expected from Cursor backend Spring Boot endpoints.
 */

import {
  AdminUser,
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
 * Demo Users Fixtures (12 Realistic Enterprise Accounts)
 * ---------------------------------------------------- */
export const initialDemoUsers: AdminUser[] = [
  {
    id: 1,
    email: 'owner@tronai.tech',
    displayName: 'Thushan (TRON Founder)',
    role: 'OWNER',
    status: 'ACTIVE',
    authProvider: 'google',
    authProviderDetails: {
      googleId: '10984209183401928374',
      verifiedEmail: true,
      locale: 'ja-JP',
    },
    enabled: true,
    registeredAt: '2026-01-10T09:00:00Z',
    lastLoginAt: '2026-11-12T01:45:00Z',
    aiUsageToday: { totalRequests: 84, tokensUsed: 142000, costEstimate: 0.12 },
    aiUsageMonthly: { totalRequests: 1840, tokensUsed: 3120000, costEstimate: 2.85 },
    featureUsageToday: { chat: 42, voice: 18, interview: 6, cvMagicFill: 12, cvAiAssist: 6 },
  },
  {
    id: 2,
    email: 'admin.support@tronai.tech',
    displayName: 'Platform Administrator',
    role: 'ADMIN',
    status: 'ACTIVE',
    authProvider: 'email',
    enabled: true,
    registeredAt: '2026-02-01T10:30:00Z',
    lastLoginAt: '2026-11-12T00:15:00Z',
    aiUsageToday: { totalRequests: 45, tokensUsed: 89000, costEstimate: 0.08 },
    aiUsageMonthly: { totalRequests: 980, tokensUsed: 1940000, costEstimate: 1.65 },
    featureUsageToday: { chat: 20, voice: 10, interview: 5, cvMagicFill: 6, cvAiAssist: 4 },
  },
  {
    id: 3,
    email: 'kenji.sato@example.co.jp',
    displayName: 'Kenji Sato',
    role: 'USER',
    status: 'ACTIVE',
    authProvider: 'google',
    authProviderDetails: {
      googleId: '10482910482019482011',
      verifiedEmail: true,
      locale: 'ja-JP',
    },
    enabled: true,
    registeredAt: '2026-08-14T14:20:00Z',
    lastLoginAt: '2026-11-11T23:10:00Z',
    aiUsageToday: { totalRequests: 28, tokensUsed: 52000, costEstimate: 0.045 },
    aiUsageMonthly: { totalRequests: 410, tokensUsed: 780000, costEstimate: 0.68 },
    featureUsageToday: { chat: 18, voice: 4, interview: 2, cvMagicFill: 3, cvAiAssist: 1 },
    quotaOverride: {
      userId: 3,
      aiChatDailyLimit: 50,
      aiVoiceDailyLimit: 20,
      aiInterviewDailyLimit: 5,
      cvMagicFillDailyLimit: 10,
      cvAiAssistDailyLimit: 20,
      dailyTokenCeiling: 250000,
      notes: 'Job seeker beta tester elevated quota approved by admin.',
      updatedAt: '2026-11-01T12:00:00Z',
      updatedBy: 'owner@tronai.tech',
    },
  },
  {
    id: 4,
    email: 'yuki.tanaka@tokyo-tech.ac.jp',
    displayName: 'Yuki Tanaka',
    role: 'USER',
    status: 'ACTIVE',
    authProvider: 'email',
    enabled: true,
    registeredAt: '2026-09-02T11:15:00Z',
    lastLoginAt: '2026-11-11T19:40:00Z',
    aiUsageToday: { totalRequests: 19, tokensUsed: 38000, costEstimate: 0.032 },
    aiUsageMonthly: { totalRequests: 320, tokensUsed: 610000, costEstimate: 0.52 },
    featureUsageToday: { chat: 12, voice: 3, interview: 1, cvMagicFill: 2, cvAiAssist: 1 },
  },
  {
    id: 5,
    email: 'elena.rostova@global-it.com',
    displayName: 'Elena Rostova',
    role: 'USER',
    status: 'ACTIVE',
    authProvider: 'google',
    authProviderDetails: {
      googleId: '10992384910293847291',
      verifiedEmail: true,
      locale: 'en-US',
    },
    enabled: true,
    registeredAt: '2026-09-18T16:45:00Z',
    lastLoginAt: '2026-11-11T18:22:00Z',
    aiUsageToday: { totalRequests: 15, tokensUsed: 29000, costEstimate: 0.025 },
    aiUsageMonthly: { totalRequests: 280, tokensUsed: 540000, costEstimate: 0.46 },
    featureUsageToday: { chat: 9, voice: 2, interview: 2, cvMagicFill: 1, cvAiAssist: 1 },
  },
  {
    id: 6,
    email: 'spam.bot99@suspicious-domain.xyz',
    displayName: 'Spam Crawler 99',
    role: 'USER',
    status: 'SUSPENDED',
    authProvider: 'email',
    enabled: false,
    registeredAt: '2026-10-04T03:12:00Z',
    lastLoginAt: '2026-10-05T04:22:00Z',
    suspendedAt: '2026-10-05T05:00:00Z',
    suspendReason: 'Automated rapid scraping attempt exceeding rate limit by 400%',
    aiUsageToday: { totalRequests: 0, tokensUsed: 0, costEstimate: 0 },
    aiUsageMonthly: { totalRequests: 0, tokensUsed: 0, costEstimate: 0 },
    featureUsageToday: { chat: 0, voice: 0, interview: 0, cvMagicFill: 0, cvAiAssist: 0 },
  },
  {
    id: 7,
    email: 'michael.chen@devops-sf.net',
    displayName: 'Michael Chen',
    role: 'USER',
    status: 'ACTIVE',
    authProvider: 'email',
    enabled: true,
    registeredAt: '2026-10-12T08:00:00Z',
    lastLoginAt: '2026-11-11T12:05:00Z',
    aiUsageToday: { totalRequests: 24, tokensUsed: 46000, costEstimate: 0.039 },
    aiUsageMonthly: { totalRequests: 390, tokensUsed: 740000, costEstimate: 0.63 },
    featureUsageToday: { chat: 15, voice: 4, interview: 2, cvMagicFill: 2, cvAiAssist: 1 },
  },
  {
    id: 8,
    email: 'haruto.watanabe@career-quest.jp',
    displayName: 'Haruto Watanabe',
    role: 'USER',
    status: 'ACTIVE',
    authProvider: 'google',
    authProviderDetails: {
      googleId: '10748291048201948202',
      verifiedEmail: true,
      locale: 'ja-JP',
    },
    enabled: true,
    registeredAt: '2026-10-19T14:30:00Z',
    lastLoginAt: '2026-11-11T11:18:00Z',
    aiUsageToday: { totalRequests: 12, tokensUsed: 22000, costEstimate: 0.019 },
    aiUsageMonthly: { totalRequests: 190, tokensUsed: 360000, costEstimate: 0.31 },
    featureUsageToday: { chat: 8, voice: 1, interview: 1, cvMagicFill: 1, cvAiAssist: 1 },
  },
  {
    id: 9,
    email: 'retired.engineer@test-corp.com',
    displayName: 'Former Contractor',
    role: 'USER',
    status: 'DISABLED',
    authProvider: 'email',
    enabled: false,
    registeredAt: '2026-06-15T09:00:00Z',
    lastLoginAt: '2026-08-30T17:00:00Z',
    aiUsageToday: { totalRequests: 0, tokensUsed: 0, costEstimate: 0 },
    aiUsageMonthly: { totalRequests: 0, tokensUsed: 0, costEstimate: 0 },
    featureUsageToday: { chat: 0, voice: 0, interview: 0, cvMagicFill: 0, cvAiAssist: 0 },
  },
  {
    id: 10,
    email: 'charlotte.dubois@paris-ai.fr',
    displayName: 'Charlotte Dubois',
    role: 'USER',
    status: 'ACTIVE',
    authProvider: 'google',
    authProviderDetails: {
      googleId: '10394820194820194829',
      verifiedEmail: true,
      locale: 'fr-FR',
    },
    enabled: true,
    registeredAt: '2026-10-25T19:00:00Z',
    lastLoginAt: '2026-11-11T09:12:00Z',
    aiUsageToday: { totalRequests: 21, tokensUsed: 41000, costEstimate: 0.035 },
    aiUsageMonthly: { totalRequests: 210, tokensUsed: 420000, costEstimate: 0.36 },
    featureUsageToday: { chat: 14, voice: 3, interview: 2, cvMagicFill: 1, cvAiAssist: 1 },
  },
  {
    id: 11,
    email: 'alex.novak@tech-consulting.io',
    displayName: 'Alex Novak',
    role: 'ADMIN',
    status: 'ACTIVE',
    authProvider: 'google',
    authProviderDetails: {
      googleId: '10884920194820194833',
      verifiedEmail: true,
      locale: 'en-US',
    },
    enabled: true,
    registeredAt: '2026-05-10T11:00:00Z',
    lastLoginAt: '2026-11-11T22:30:00Z',
    aiUsageToday: { totalRequests: 32, tokensUsed: 62000, costEstimate: 0.053 },
    aiUsageMonthly: { totalRequests: 650, tokensUsed: 1290000, costEstimate: 1.1 },
    featureUsageToday: { chat: 18, voice: 6, interview: 3, cvMagicFill: 3, cvAiAssist: 2 },
  },
  {
    id: 12,
    email: 'daiki.nakamura@shibuya-works.jp',
    displayName: 'Daiki Nakamura',
    role: 'USER',
    status: 'ACTIVE',
    authProvider: 'email',
    enabled: true,
    registeredAt: '2026-11-02T13:40:00Z',
    lastLoginAt: '2026-11-11T16:50:00Z',
    aiUsageToday: { totalRequests: 16, tokensUsed: 31000, costEstimate: 0.026 },
    aiUsageMonthly: { totalRequests: 95, tokensUsed: 180000, costEstimate: 0.15 },
    featureUsageToday: { chat: 10, voice: 2, interview: 2, cvMagicFill: 1, cvAiAssist: 1 },
  },
];

/* ----------------------------------------------------
 * Demo Global Quota Settings
 * Matches Demo Defaults from user specification
 * ---------------------------------------------------- */
export const initialDemoGlobalQuotas: GlobalQuotaConfig = {
  aiChatDailyLimit: 30, // 30 requests / day
  aiVoiceDailyLimit: 10, // 10 turns / day
  aiInterviewDailyLimit: 3, // 3 sessions / day
  cvMagicFillDailyLimit: 5, // 5 generations / day
  cvAiAssistDailyLimit: 10, // 10 requests / day
  dailyTokenBudget: 100000, // 100k tokens per user / day
  monthlyTokenBudget: 2500000, // 2.5M tokens / month
  monthlySpendingCapUsd: 15.0, // $15 / month cap
  resetSchedule: 'Daily at 00:00 JST (15:00 UTC)',
  featuresEnabled: {
    aiChat: true,
    aiVoice: true,
    aiInterview: true,
    cvMagicFill: true,
    cvAiAssist: true,
  },
  rolePresets: {
    USER: {
      aiChatDailyLimit: 30,
      aiVoiceDailyLimit: 10,
      aiInterviewDailyLimit: 3,
      cvMagicFillDailyLimit: 5,
      cvAiAssistDailyLimit: 10,
    },
    ADMIN: {
      aiChatDailyLimit: 300,
      aiVoiceDailyLimit: 100,
      aiInterviewDailyLimit: 30,
      cvMagicFillDailyLimit: 50,
      cvAiAssistDailyLimit: 100,
    },
    OWNER: {
      aiChatDailyLimit: 9999,
      aiVoiceDailyLimit: 9999,
      aiInterviewDailyLimit: 9999,
      cvMagicFillDailyLimit: 9999,
      cvAiAssistDailyLimit: 9999,
    },
  },
  lastUpdated: '2026-11-11T18:00:00Z',
  updatedBy: 'owner@tronai.tech',
};

/* ----------------------------------------------------
 * Demo Analytics & Metrics (Matches Mockup Screen)
 * ---------------------------------------------------- */
export const initialDemoAnalyticsOverview: AnalyticsOverview = {
  totalUsers: 1248, // Matches mockup: 1,248 (+12% 7d)
  activeUsers7d: 892, // Matches mockup: 892 (+8% 7d)
  newRegistrations7d: 134,
  aiRequestsToday: 18420, // Matches mockup: 18,420 (+24%)
  aiRequestsMonth: 412850,
  tokensConsumedToday: 38400000,
  tokensConsumedMonth: 846000000,
  estimatedAiSpendToday: 12.68, // Matches mockup: $12.68 (-6%)
  estimatedAiSpendMonth: 342.18,
  failedRequestsToday: 34,
  failureRate: 0.18, // 99.82% success rate
  avgLatencyMs: 420, // Matches mockup: 420 ms
};

export const demoDailyRequestsSeries: DailyRequestsDataPoint[] = [
  { date: 'Nov 5', totalRequests: 5400, chatRequests: 2800, voiceRequests: 980, interviewRequests: 650, cvRequests: 540, failedRequests: 12 },
  { date: 'Nov 6', totalRequests: 9200, chatRequests: 4800, voiceRequests: 1650, interviewRequests: 1100, cvRequests: 920, failedRequests: 18 },
  { date: 'Nov 7', totalRequests: 8600, chatRequests: 4500, voiceRequests: 1550, interviewRequests: 1030, cvRequests: 860, failedRequests: 15 },
  { date: 'Nov 8', totalRequests: 11400, chatRequests: 5900, voiceRequests: 2050, interviewRequests: 1370, cvRequests: 1140, failedRequests: 22 },
  { date: 'Nov 9', totalRequests: 14800, chatRequests: 7700, voiceRequests: 2660, interviewRequests: 1780, cvRequests: 1480, failedRequests: 27 },
  { date: 'Nov 10', totalRequests: 16200, chatRequests: 8400, voiceRequests: 2920, interviewRequests: 1940, cvRequests: 1620, failedRequests: 29 },
  { date: 'Nov 11', totalRequests: 18420, chatRequests: 9578, voiceRequests: 3316, interviewRequests: 2210, cvRequests: 1842, failedRequests: 34 },
];

export const demoUserGrowthSeries: UserGrowthDataPoint[] = [
  { date: 'Nov 5', totalUsers: 1114, activeUsers: 780, newSignups: 18 },
  { date: 'Nov 6', totalUsers: 1136, activeUsers: 810, newSignups: 22 },
  { date: 'Nov 7', totalUsers: 1155, activeUsers: 805, newSignups: 19 },
  { date: 'Nov 8', totalUsers: 1178, activeUsers: 835, newSignups: 23 },
  { date: 'Nov 9', totalUsers: 1204, activeUsers: 860, newSignups: 26 },
  { date: 'Nov 10', totalUsers: 1228, activeUsers: 875, newSignups: 24 },
  { date: 'Nov 11', totalUsers: 1248, activeUsers: 892, newSignups: 20 },
];

export const demoTokenConsumptionSeries: TokenConsumptionDataPoint[] = [
  { date: 'Nov 5', chatTokens: 6200000, voiceTokens: 2400000, interviewTokens: 1800000, cvTokens: 900000, totalTokens: 11300000 },
  { date: 'Nov 6', chatTokens: 9800000, voiceTokens: 4100000, interviewTokens: 2900000, cvTokens: 1600000, totalTokens: 18400000 },
  { date: 'Nov 7', chatTokens: 9100000, voiceTokens: 3800000, interviewTokens: 2700000, cvTokens: 1500000, totalTokens: 17100000 },
  { date: 'Nov 8', chatTokens: 12500000, voiceTokens: 5200000, interviewTokens: 3800000, cvTokens: 2100000, totalTokens: 23600000 },
  { date: 'Nov 9', chatTokens: 16100000, voiceTokens: 6700000, interviewTokens: 4900000, cvTokens: 2800000, totalTokens: 30500000 },
  { date: 'Nov 10', chatTokens: 17800000, voiceTokens: 7400000, interviewTokens: 5300000, cvTokens: 3100000, totalTokens: 33600000 },
  { date: 'Nov 11', chatTokens: 19900000, voiceTokens: 8500000, interviewTokens: 6100000, cvTokens: 3900000, totalTokens: 38400000 },
];

export const demoFeatureDistribution: FeatureDistributionItem[] = [
  { featureKey: 'chat', featureName: 'AI Chat', requests: 9578, percentage: 52, color: '#3B82F6' },
  { featureKey: 'voice', featureName: 'AI Voice', requests: 3316, percentage: 18, color: '#A855F7' },
  { featureKey: 'interview', featureName: 'AI Interview', requests: 2210, percentage: 12, color: '#06B6D4' },
  { featureKey: 'cvMagic', featureName: 'CV Magic Fill', requests: 1842, percentage: 10, color: '#F59E0B' },
  { featureKey: 'other', featureName: 'Other / Coding', requests: 1474, percentage: 8, color: '#94A3B8' },
];

export const demoProviderUsageList: ProviderUsageItem[] = [
  { providerId: 'groq', providerName: 'Groq (Llama 3.3)', requestCount: 12430, percentage: 67.5, color: '#EF4444' },
  { providerId: 'gemini', providerName: 'Google Gemini', requestCount: 3560, percentage: 19.3, color: '#3B82F6' },
  { providerId: 'mistral', providerName: 'Mistral AI', requestCount: 1420, percentage: 7.7, color: '#F97316' },
  { providerId: 'openrouter', providerName: 'OpenRouter', requestCount: 980, percentage: 5.3, color: '#10B981' },
  { providerId: 'ollama', providerName: 'Ollama (Local)', requestCount: 30, percentage: 0.2, color: '#64748B' },
];

export const demoDailyCostSeries: DailyCostDataPoint[] = [
  { date: 'Nov 5', cost: 4.2, projectedCost: 5.0 },
  { date: 'Nov 6', cost: 6.8, projectedCost: 7.5 },
  { date: 'Nov 7', cost: 6.3, projectedCost: 7.0 },
  { date: 'Nov 8', cost: 8.4, projectedCost: 9.0 },
  { date: 'Nov 9', cost: 10.9, projectedCost: 11.5 },
  { date: 'Nov 10', cost: 11.8, projectedCost: 12.2 },
  { date: 'Nov 11', cost: 12.68, projectedCost: 13.0 },
];

export const demoLatencyTrendSeries: LatencyDataPoint[] = [
  { time: '00:00', p50: 310, p95: 580, p99: 920 },
  { time: '04:00', p50: 290, p95: 520, p99: 840 },
  { time: '08:00', p50: 420, p95: 750, p99: 1200 },
  { time: '12:00', p50: 460, p95: 840, p99: 1450 },
  { time: '16:00', p50: 440, p95: 790, p99: 1310 },
  { time: '20:00', p50: 420, p95: 710, p99: 1180 },
];

/* ----------------------------------------------------
 * Demo AI Providers
 * Matches Mockup Screen (Groq, Gemini, Mistral, OpenRouter, Ollama)
 * ---------------------------------------------------- */
export const initialDemoProviders: AiProviderInfo[] = [
  {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-low latency inference engine (LPU)',
    status: 'ONLINE',
    enabled: true,
    isLocal: false,
    credentialConfigured: true,
    credentialMasked: 'GROQ_API_KEY (gsk_●●●●-9f8a)',
    availableModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    preferredModel: 'llama-3.3-70b-versatile',
    fallbackRank: 1,
    requestCountToday: 12430, // Matches mockup: 12,430 req
    failedCountToday: 8,
    avgLatencyMs: 240,
    tokensUsedToday: 24800000,
    estimatedCostToday: 4.12,
    lastSuccessfulRequestAt: '2026-11-12T01:58:12Z',
    spendingLimitMonthlyUsd: 150.0,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Google multimodal foundation models',
    status: 'ONLINE',
    enabled: true,
    isLocal: false,
    credentialConfigured: true,
    credentialMasked: 'GEMINI_API_KEY (AIza●●●●-4k2m)',
    availableModels: ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    preferredModel: 'gemini-2.0-flash-exp',
    fallbackRank: 2,
    requestCountToday: 3560, // Matches mockup: 3,560 req
    failedCountToday: 4,
    avgLatencyMs: 480,
    tokensUsedToday: 8900000,
    estimatedCostToday: 3.56,
    lastSuccessfulRequestAt: '2026-11-12T01:59:04Z',
    spendingLimitMonthlyUsd: 200.0,
  },
  {
    id: 'mistral',
    name: 'Mistral',
    description: 'Frontier European multilingual AI models',
    status: 'ONLINE',
    enabled: true,
    isLocal: false,
    credentialConfigured: true,
    credentialMasked: 'MISTRAL_API_KEY (mis_●●●●-7q3x)',
    availableModels: ['mistral-large-2411', 'codestral-2501', 'mistral-small-2409'],
    preferredModel: 'mistral-large-2411',
    fallbackRank: 3,
    requestCountToday: 1420, // Matches mockup: 1,420 req
    failedCountToday: 2,
    avgLatencyMs: 620,
    tokensUsedToday: 3200000,
    estimatedCostToday: 2.84,
    lastSuccessfulRequestAt: '2026-11-12T01:54:22Z',
    spendingLimitMonthlyUsd: 100.0,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Unified high-availability router & gateway',
    status: 'ONLINE',
    enabled: true,
    isLocal: false,
    credentialConfigured: true,
    credentialMasked: 'OPENROUTER_API_KEY (sk-or-●●●●-8w1z)',
    availableModels: ['anthropic/claude-3.5-sonnet', 'deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct'],
    preferredModel: 'anthropic/claude-3.5-sonnet',
    fallbackRank: 4,
    requestCountToday: 980, // Matches mockup: 980 req
    failedCountToday: 1,
    avgLatencyMs: 740,
    tokensUsedToday: 1480000,
    estimatedCostToday: 2.16,
    lastSuccessfulRequestAt: '2026-11-12T01:50:41Z',
    spendingLimitMonthlyUsd: 80.0,
  },
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Local on-premise GPU workstation runner',
    status: 'ONLINE',
    enabled: true,
    isLocal: true,
    credentialConfigured: true,
    credentialMasked: 'LOCAL_ENDPOINT (http://127.0.0.1:11434)',
    availableModels: ['llama3.2:3b', 'qwen2.5-coder:7b', 'deepseek-r1:8b'],
    preferredModel: 'llama3.2:3b',
    fallbackRank: 5,
    requestCountToday: 30, // Matches mockup: 30 req
    failedCountToday: 0,
    avgLatencyMs: 380,
    tokensUsedToday: 20000,
    estimatedCostToday: 0.0, // Free local GPU
    lastSuccessfulRequestAt: '2026-11-12T01:30:15Z',
    spendingLimitMonthlyUsd: 0.0,
  },
];

export const initialFeatureRoutingMatrix: FeatureRoutingConfig[] = [
  {
    featureId: 'chat',
    featureName: 'AI Chat Assistant',
    preferredProviderId: 'groq',
    preferredModel: 'llama-3.3-70b-versatile',
    fallbackProviderId: 'gemini',
    fallbackModel: 'gemini-2.0-flash-exp',
  },
  {
    featureId: 'voice',
    featureName: 'AI Real-time Voice Turns',
    preferredProviderId: 'gemini',
    preferredModel: 'gemini-2.0-flash-exp',
    fallbackProviderId: 'groq',
    fallbackModel: 'llama-3.3-70b-versatile',
  },
  {
    featureId: 'interview',
    featureName: 'AI Technical Interview Engine',
    preferredProviderId: 'mistral',
    preferredModel: 'mistral-large-2411',
    fallbackProviderId: 'gemini',
    fallbackModel: 'gemini-1.5-pro',
  },
  {
    featureId: 'cv_magic',
    featureName: 'CV Builder Magic Fill & Polish',
    preferredProviderId: 'gemini',
    preferredModel: 'gemini-2.0-flash-exp',
    fallbackProviderId: 'mistral',
    fallbackModel: 'codestral-2501',
  },
  {
    featureId: 'agent',
    featureName: 'Desktop Coding Agent',
    preferredProviderId: 'openrouter',
    preferredModel: 'anthropic/claude-3.5-sonnet',
    fallbackProviderId: 'ollama',
    fallbackModel: 'qwen2.5-coder:7b',
  },
];

/* ----------------------------------------------------
 * Demo Financial & Cost Controls
 * ---------------------------------------------------- */
export const initialDemoCostOverview: CostOverview = {
  todayEstimatedCostUsd: 12.68,
  todayCostDeltaPct: -6.0,
  monthlyEstimatedCostUsd: 342.18,
  monthlyBudgetCapUsd: 500.0,
  budgetUsagePct: 68.4,
  projectedMonthEndCostUsd: 465.0,
  avgCostPerUserUsd: 0.27,
  avgCostPerRequestUsd: 0.00068,
};

export const demoProviderCostBreakdown: ProviderCostItem[] = [
  { providerId: 'groq', providerName: 'Groq', requestCount: 285400, tokensUsed: 540000000, costUsd: 142.5, costPct: 41.6 },
  { providerId: 'gemini', providerName: 'Gemini', requestCount: 78900, tokensUsed: 195000000, costUsd: 112.4, costPct: 32.8 },
  { providerId: 'mistral', providerName: 'Mistral', requestCount: 32400, tokensUsed: 72000000, costUsd: 64.2, costPct: 18.8 },
  { providerId: 'openrouter', providerName: 'OpenRouter', requestCount: 16100, tokensUsed: 39000000, costUsd: 23.08, costPct: 6.8 },
  { providerId: 'ollama', providerName: 'Ollama (Local)', requestCount: 50, tokensUsed: 120000, costUsd: 0.0, costPct: 0.0 },
];

export const demoFeatureCostBreakdown: FeatureCostItem[] = [
  { featureKey: 'chat', featureName: 'AI Chat', requests: 214000, costUsd: 150.55, costPct: 44.0 },
  { featureKey: 'voice', featureName: 'AI Voice', requests: 74200, costUsd: 88.96, costPct: 26.0 },
  { featureKey: 'interview', featureName: 'AI Interview', requests: 49500, costUsd: 61.59, costPct: 18.0 },
  { featureKey: 'cvMagic', featureName: 'CV Magic Fill', requests: 41200, costUsd: 41.08, costPct: 12.0 },
];

export const demoTopUserCostList: UserCostItem[] = [
  { userId: 1, email: 'owner@tronai.tech', displayName: 'Thushan (TRON Founder)', requestsMonth: 1840, tokensMonth: 3120000, costMonthUsd: 2.85 },
  { userId: 2, email: 'admin.support@tronai.tech', displayName: 'Platform Administrator', requestsMonth: 980, tokensMonth: 1940000, costMonthUsd: 1.65 },
  { userId: 11, email: 'alex.novak@tech-consulting.io', displayName: 'Alex Novak', requestsMonth: 650, tokensMonth: 1290000, costMonthUsd: 1.1 },
  { userId: 3, email: 'kenji.sato@example.co.jp', displayName: 'Kenji Sato', requestsMonth: 410, tokensMonth: 780000, costMonthUsd: 0.68 },
  { userId: 7, email: 'michael.chen@devops-sf.net', displayName: 'Michael Chen', requestsMonth: 390, tokensMonth: 740000, costMonthUsd: 0.63 },
  { userId: 4, email: 'yuki.tanaka@tokyo-tech.ac.jp', displayName: 'Yuki Tanaka', requestsMonth: 320, tokensMonth: 610000, costMonthUsd: 0.52 },
];

/* ----------------------------------------------------
 * Demo Security Center Fixtures
 * ---------------------------------------------------- */
export const initialDemoSecurityOverview: SecurityOverview = {
  googleOAuthConfigured: true,
  localAuthEnabled: true,
  adminMfaEnforced: true,
  totalActiveSessions: 428,
  suspendedAccountsCount: 2,
  failedLoginsLast24h: 7,
  suspiciousEventsLast24h: 1,
};

export const demoFailedLogins: FailedLoginRecord[] = [
  { id: 'fl-1', email: 'guest.unknown@telecom.de', ipAddress: '185.220.101.5', location: 'Frankfurt, Germany (Tor Exit Node)', attemptedAt: '2026-11-12T01:14:00Z', failureReason: 'Invalid credentials (bad password)' },
  { id: 'fl-2', email: 'guest.unknown@telecom.de', ipAddress: '185.220.101.5', location: 'Frankfurt, Germany (Tor Exit Node)', attemptedAt: '2026-11-12T01:14:32Z', failureReason: 'Invalid credentials (bad password)' },
  { id: 'fl-3', email: 'spam.bot99@suspicious-domain.xyz', ipAddress: '91.240.118.12', location: 'Saint Petersburg, Russia', attemptedAt: '2026-11-11T19:02:00Z', failureReason: 'Account suspended by admin' },
  { id: 'fl-4', email: 'elena.rostova@global-it.com', ipAddress: '194.26.29.110', location: 'Tokyo, Japan', attemptedAt: '2026-11-11T09:44:00Z', failureReason: 'Expired refresh token session' },
];

export const demoSecurityEvents: SecurityEvent[] = [
  {
    id: 'sec-1',
    timestamp: '2026-11-12T01:15:00Z',
    severity: 'MEDIUM',
    type: 'BRUTE_FORCE_THROTTLED',
    description: 'Repeated authentication attempts from 185.220.101.5 throttled for 15 minutes by Spring Security.',
    ipAddress: '185.220.101.5',
    resolved: true,
  },
  {
    id: 'sec-2',
    timestamp: '2026-11-11T14:30:00Z',
    severity: 'LOW',
    type: 'ADMIN_LOGIN_SUCCESS',
    description: 'Owner session authenticated via Google OAuth with 2FA verified.',
    ipAddress: '133.200.45.12',
    resolved: true,
  },
  {
    id: 'sec-3',
    timestamp: '2026-10-05T05:00:00Z',
    severity: 'HIGH',
    type: 'ACCOUNT_SUSPENSION_ENFORCED',
    description: 'Account spam.bot99@suspicious-domain.xyz suspended and all refresh tokens revoked.',
    ipAddress: '91.240.118.12',
    resolved: true,
  },
];

/* ----------------------------------------------------
 * Demo Audit Logs
 * ---------------------------------------------------- */
export const initialDemoAuditLogs: AdminAuditLog[] = [
  {
    id: 101,
    actorUserId: 1,
    actorEmail: 'owner@tronai.tech',
    action: 'PLATFORM_CONTROL_UPDATE',
    targetType: 'PLATFORM_MODE',
    targetId: 'NORMAL',
    detail: 'Platform mode verified as NORMAL; cloudRoutingEnabled=true; localRoutingEnabled=true.',
    status: 'SUCCESS',
    ipAddress: '133.200.45.12',
    createdAt: '2026-11-12T01:45:10Z',
  },
  {
    id: 102,
    actorUserId: 1,
    actorEmail: 'owner@tronai.tech',
    action: 'QUOTA_OVERRIDE_UPDATE',
    targetType: 'USER_QUOTA',
    targetId: '3',
    detail: 'Elevated quota assigned to Kenji Sato (Chat: 50, Voice: 20, Interview: 5).',
    status: 'SUCCESS',
    ipAddress: '133.200.45.12',
    createdAt: '2026-11-11T12:00:00Z',
  },
  {
    id: 103,
    actorUserId: 2,
    actorEmail: 'admin.support@tronai.tech',
    action: 'USER_RESTORE',
    targetType: 'USER',
    targetId: '7',
    detail: 'Account restored after verification confirmation.',
    status: 'SUCCESS',
    ipAddress: '210.140.10.88',
    createdAt: '2026-11-10T14:22:00Z',
  },
  {
    id: 104,
    actorUserId: 1,
    actorEmail: 'owner@tronai.tech',
    action: 'PROVIDER_CONFIG_UPDATE',
    targetType: 'AI_PROVIDER',
    targetId: 'groq',
    detail: 'Set fallback priority 1 and model to llama-3.3-70b-versatile.',
    status: 'SUCCESS',
    ipAddress: '133.200.45.12',
    createdAt: '2026-11-09T08:15:00Z',
  },
  {
    id: 105,
    actorUserId: 2,
    actorEmail: 'admin.support@tronai.tech',
    action: 'ANNOUNCEMENT_PUBLISH',
    targetType: 'ANNOUNCEMENT',
    targetId: 'ann-1',
    detail: 'Published Japanese CV Builder V3 Canonical release announcement to ALL users.',
    status: 'SUCCESS',
    ipAddress: '210.140.10.88',
    createdAt: '2026-11-08T10:00:00Z',
  },
  {
    id: 106,
    actorUserId: 1,
    actorEmail: 'owner@tronai.tech',
    action: 'USER_SUSPEND',
    targetType: 'USER',
    targetId: '6',
    detail: 'Suspended automated scraping bot account; 2 active refresh tokens revoked.',
    status: 'SUCCESS',
    ipAddress: '133.200.45.12',
    createdAt: '2026-10-05T05:00:00Z',
  },
];

/* ----------------------------------------------------
 * Demo Announcements (Dual Language EN & JA)
 * ---------------------------------------------------- */
export const initialDemoAnnouncements: AdminAnnouncement[] = [
  {
    id: 'ann-1',
    titleEn: 'TRON AI 2.0 Released: Real-time Voice & Japanese CV Builder V3',
    titleJa: 'TRON AI 2.0 正式リリース：リアルタイム音声面接＆JIS規格履歴書ビルダーV3',
    messageEn:
      'We are excited to introduce our canonical Japanese Rirekisho & Shokumukeirekisho engine alongside ultra-low latency voice interview coaching.',
    messageJa:
      'JIS規格に完全準拠した履歴書・職務経歴書のPDF出力エンジン、および超低遅延のリアルタイムAI音声面接シミュレーターが正式に利用可能になりました。',
    audience: 'ALL',
    priority: 'ANNOUNCEMENT',
    status: 'PUBLISHED',
    startAt: '2026-11-08T00:00:00Z',
    endAt: '2026-11-30T23:59:59Z',
    createdBy: 'owner@tronai.tech',
    createdAt: '2026-11-08T09:30:00Z',
    updatedAt: '2026-11-08T10:00:00Z',
  },
  {
    id: 'ann-2',
    titleEn: 'Scheduled Platform Maintenance Notice',
    titleJa: '定期システムメンテナンスのお知らせ',
    messageEn:
      'TRON AI will undergo brief infrastructure upgrades on Nov 18 from 03:00 to 04:00 JST. AI Chat and CV generation may experience brief latency.',
    messageJa:
      '11月18日(水) 午前3:00〜4:00 (JST) にインフラ更新を実施いたします。作業時間中、AI機能に応答遅延が発生する場合があります。',
    audience: 'ALL',
    priority: 'MAINTENANCE',
    status: 'SCHEDULED',
    startAt: '2026-11-18T03:00:00Z',
    endAt: '2026-11-18T04:00:00Z',
    createdBy: 'admin.support@tronai.tech',
    createdAt: '2026-11-11T15:00:00Z',
    updatedAt: '2026-11-11T15:00:00Z',
  },
  {
    id: 'ann-3',
    titleEn: 'Premium Tier AI Quota Expansion Preview',
    titleJa: '有料プラン向けAI利用枠拡大プレビュー',
    messageEn: 'Upcoming daily quota increases for high-volume engineering interview candidates.',
    messageJa: '技術職・バイリンガル就職活動生向けの上位クォータプランの仕様プレビューです。',
    audience: 'PREMIUM',
    priority: 'INFO',
    status: 'DRAFT',
    startAt: '2026-12-01T00:00:00Z',
    endAt: null,
    createdBy: 'owner@tronai.tech',
    createdAt: '2026-11-10T12:00:00Z',
    updatedAt: '2026-11-10T12:00:00Z',
  },
];

/* ----------------------------------------------------
 * Demo System Health (Matches Mockup Screen)
 * All Systems Operational, Uptime 99.95%, Avg. Latency 420ms, Success Rate 99.8%
 * Badges: API (ok), DB (ok), AI Gateway (ok), Gotenberg (ok)
 * ---------------------------------------------------- */
export const initialDemoSystemHealth: SystemHealthOverview = {
  overallStatus: 'OPERATIONAL', // Matches mockup: "All Systems Operational"
  uptimePct: 99.95, // Matches mockup: 99.95%
  avgLatencyMs: 420, // Matches mockup: 420 ms
  successRatePct: 99.8, // Matches mockup: 99.8%
  lastCheckedAt: '2026-11-12T02:00:00Z',
  services: [
    {
      id: 'api',
      name: 'Spring Boot Backend API',
      role: 'Authentication & Business Logic',
      status: 'OPERATIONAL', // Matches mockup: API [ok]
      latencyMs: 42,
      uptimePct: 99.98,
      version: 'v2.4.1-enterprise',
      details: { port: 8080, jvmMemoryUsedMb: 412, activeThreads: 36 },
    },
    {
      id: 'db',
      name: 'MySQL Database',
      role: 'User State, Flyway Migrations & Audit',
      status: 'OPERATIONAL', // Matches mockup: DB [ok]
      latencyMs: 18,
      uptimePct: 99.99,
      version: 'MySQL 8.4 LTS',
      details: { activeConnections: 14, poolMax: 50, slowQueriesLast24h: 0 },
    },
    {
      id: 'gateway',
      name: 'AI Gateway & Supervisor',
      role: 'LPU Routing, Fallback & Token Metering',
      status: 'OPERATIONAL', // Matches mockup: AI Gateway [ok]
      latencyMs: 110,
      uptimePct: 99.94,
      version: 'v4.0.0-supervisor',
      details: { inFlightAiRequests: 2, queueSize: 0, supervisorRoute: 'CLOUD_HYBRID' },
    },
    {
      id: 'gotenberg',
      name: 'Gotenberg Chromium Engine',
      role: 'Canonical Japanese PDF Rendering',
      status: 'OPERATIONAL', // Matches mockup: Gotenberg [ok]
      latencyMs: 250,
      uptimePct: 99.92,
      version: 'Gotenberg 8.17.3',
      details: { dockerContainer: 'terafes-gotenberg', memoryLimitMb: 1024 },
    },
  ],
  recentErrors: [
    {
      id: 'err-1',
      timestamp: '2026-11-11T21:40:12Z',
      service: 'AI Gateway',
      level: 'WARN',
      message: 'Groq provider transient latency spike (820ms). Successfully handled without failover.',
    },
    {
      id: 'err-2',
      timestamp: '2026-11-11T14:12:05Z',
      service: 'Security Filter',
      level: 'WARN',
      message: 'Blocked invalid authorization bearer token from 185.220.101.5.',
    },
    {
      id: 'err-3',
      timestamp: '2026-11-10T08:05:44Z',
      service: 'Gotenberg Engine',
      level: 'WARN',
      message: 'Client closed preview connection prematurely during PDF stream.',
    },
  ],
};

/* ----------------------------------------------------
 * Demo Platform Control Settings
 * ---------------------------------------------------- */
export const initialDemoPlatformSettings: AdminPlatformSettings = {
  mode: 'NORMAL',
  pauseNewAiTasks: false,
  localRoutingEnabled: true,
  cloudRoutingEnabled: true,
  stopNewAgentJobs: false,
  maxConcurrentAiRequests: 25,
  queueCapacity: 100,
};
