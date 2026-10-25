export type AiMode = 'AUTO' | 'FAST' | 'SMART' | 'ULTRA';

export type AiProfile = AiMode | 'QUALITY' | 'GEMINI' | 'OPENAI' | 'CLAUDE' | (string & {});

export type AiProviderType = 'local' | 'cloud' | 'tron_local' | 'groq' | 'openrouter' | 'mistral' | 'cloudflare' | 'gemini' | string;

export type FeatureAvailabilityStatus = 'Available' | 'Beta' | 'Unavailable' | 'Coming Soon';

export interface UltraCreditsInfo {
  remaining: number;
  total: number;
  resetTime: string;
  requiredCreditsPerTask: number;
}

export interface AiModeDefinition {
  id: AiMode;
  displayName: string;
  badgeText?: string;
  shortDesc: string;
  description: string;
  model: string;
  provider: string;
  available: boolean;
  status: FeatureAvailabilityStatus;
  reasonUnavailable?: string;
  icon: 'auto' | 'fast' | 'smart' | 'ultra';
  requiresCredits?: boolean;
}

export type AIErrorType =
  | 'daily_quota_exhausted'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'model_unsupported'
  | 'ollama_offline'
  | 'unknown';

export interface AIErrorDetail {
  type: AIErrorType;
  title: string;
  message: string;
  actionLabel?: string;
  actionTarget?: 'switch_smart' | 'view_usage' | 'settings' | 'retry';
}

export interface ModelCapabilityItem {
  id: string;
  name: string;
  supported: boolean;
}

export interface AdvancedModelConfig {
  id: string;
  displayName: string;
  provider: string;
  providerType: 'local' | 'cloud';
  modelIdentifier: string;
  capabilities: string[];
  availability: FeatureAvailabilityStatus;
  isDefaultRouting: boolean;
  routedFeatures: string[];
  latencyTier: 'Ultra-low' | 'Moderate' | 'Deep Reasoning';
  contextWindow: number;
}

export interface AiProfileDefinition {
  id: string;
  displayName: string;
  description: string;
  available: boolean;
  provider?: AiProviderType;
  reasonUnavailable?: string;
  modelDisplayName?: string;
  icon?: string;
  status?: FeatureAvailabilityStatus;
  capabilities?: string[];
}

export interface AiProfilesResponse {
  profiles: AiProfileDefinition[];
  defaultProfile: string;
}
