import {
  AiMode,
  AiModeDefinition,
  UltraCreditsInfo,
  AdvancedModelConfig,
  AIErrorDetail,
} from '../types/aiProfile';

export const AI_MODE_STORAGE_KEY = 'tron_selected_ai_mode';
export const ULTRA_CREDITS_STORAGE_KEY = 'tron_ultra_credits';

export const DEFAULT_ULTRA_CREDITS: UltraCreditsInfo = {
  remaining: 5,
  total: 5,
  resetTime: 'Resets daily at 00:00 UTC',
  requiredCreditsPerTask: 1,
};

/** Ultra credit costs aligned with Spring AiFeature defaults. */
export const ULTRA_CREDIT_COSTS = {
  chat: 1,
  interview: 2,
  codingAgent: 2,
  browserAgent: 2,
  cvReview: 1,
} as const;

export const AI_MODES: Record<AiMode, AiModeDefinition> = {
  AUTO: {
    id: 'AUTO',
    displayName: 'Auto',
    badgeText: 'Adaptive',
    shortDesc: 'Intelligent dynamic routing',
    description: 'Automatically routes to the fastest or smartest model based on query complexity and intent.',
    model: 'TRON Gateway Routing',
    provider: 'TRON AI Gateway',
    available: true,
    status: 'Available',
    icon: 'auto',
  },
  FAST: {
    id: 'FAST',
    displayName: 'Fast',
    badgeText: 'Low Latency',
    shortDesc: 'Instant conversational speed',
    description: 'Ultra-low latency inference for day-to-day queries, quick checks, and real-time voice interactions.',
    model: 'qwen3:8b',
    provider: 'Local Ollama',
    available: true,
    status: 'Available',
    icon: 'fast',
  },
  SMART: {
    id: 'SMART',
    displayName: 'Smart',
    badgeText: 'Balanced',
    shortDesc: 'Balanced cloud / local quality',
    description: 'Routes through the TRON AI gateway to a verified working model (Groq / OpenRouter / Ollama).',
    model: 'Gateway SMART route',
    provider: 'TRON AI Gateway',
    available: true,
    status: 'Available',
    icon: 'smart',
  },
  ULTRA: {
    id: 'ULTRA',
    displayName: 'Ultra Pro Max',
    badgeText: 'Premium',
    shortDesc: 'Highest verified gateway quality',
    description: 'Uses the strongest verified configured Ultra route. Consumes daily Ultra credits. Unavailable when no Ultra provider is configured.',
    model: 'Gateway ULTRA route',
    provider: 'TRON AI Gateway',
    available: true,
    status: 'Available',
    icon: 'ultra',
    requiresCredits: true,
  },
};

export const ADVANCED_PROVIDERS = [
  {
    id: 'ollama',
    name: 'Local Ollama',
    type: 'local' as const,
    endpoint: 'http://127.0.0.1:11434',
    status: 'Available' as const,
    description: 'Runs on local GPU/CPU. Zero data leaves your machine.',
    modelsCount: 2,
    latency: '< 15ms local link',
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    type: 'cloud' as const,
    endpoint: 'Secure Gateway',
    status: 'Available' as const,
    description: 'Ultra-fast LPU inference managed by TRON server gateway.',
    modelsCount: 1,
    latency: '~ 120ms',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    type: 'cloud' as const,
    endpoint: 'Secure Gateway',
    status: 'Available' as const,
    description: 'Unified gateway for DeepSeek R1, Claude, and specialized open models.',
    modelsCount: 2,
    latency: '~ 250ms',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    type: 'cloud' as const,
    endpoint: 'Edge Network',
    status: 'Beta' as const,
    description: 'Global edge inference for low-latency regional queries.',
    modelsCount: 1,
    latency: '~ 180ms',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    type: 'cloud' as const,
    endpoint: 'Secure Gateway',
    status: 'Unavailable' as const,
    description: 'Not configured on this deployment (no Gemini inference key).',
    modelsCount: 0,
    latency: 'n/a',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    type: 'cloud' as const,
    endpoint: 'Secure Gateway',
    status: 'Unavailable' as const,
    description: 'Credential present but currently rate-limited (HTTP 429). Not selected as active Ultra.',
    modelsCount: 1,
    latency: 'n/a',
  },
];

export const ADVANCED_MODELS: AdvancedModelConfig[] = [
  {
    id: 'qwen3-8b',
    displayName: 'Qwen3 8B',
    provider: 'Local Ollama',
    providerType: 'local',
    modelIdentifier: 'qwen3:8b',
    capabilities: ['Chat', 'Coding', 'Interview', 'Multilingual'],
    availability: 'Available',
    isDefaultRouting: true,
    routedFeatures: ['Normal Chat (Fast)', 'Voice Chat', 'General Inquiries'],
    latencyTier: 'Ultra-low',
    contextWindow: 4096,
  },
  {
    id: 'gemma3-12b',
    displayName: 'Gemma3 12B',
    provider: 'Local Ollama',
    providerType: 'local',
    modelIdentifier: 'gemma3:12b',
    capabilities: ['Chat', 'Coding', 'Interview', 'Reasoning', 'CV Review'],
    availability: 'Available',
    isDefaultRouting: true,
    routedFeatures: ['Coding Agent', 'Interview Practice', 'CV Analysis', 'Normal Chat (Smart)'],
    latencyTier: 'Deep Reasoning',
    contextWindow: 8192,
  },
  {
    id: 'groq-qwen3-8-27b',
    displayName: 'Qwen3.8 27B (Groq)',
    provider: 'Groq Cloud',
    providerType: 'cloud',
    modelIdentifier: 'qwen/qwen3.8-27b',
    capabilities: ['Chat', 'Coding', 'Reasoning', 'Multilingual'],
    availability: 'Available',
    isDefaultRouting: true,
    routedFeatures: ['SMART Chat', 'FAST cloud fallback'],
    latencyTier: 'Ultra-low',
    contextWindow: 32768,
  },
  {
    id: 'openrouter-llama-3.3-70b',
    displayName: 'Llama 3.3 70B Instruct',
    provider: 'OpenRouter',
    providerType: 'cloud',
    modelIdentifier: 'meta-llama/llama-3.3-70b-instruct',
    capabilities: ['Chat', 'Coding', 'Reasoning', 'Multilingual'],
    availability: 'Available',
    isDefaultRouting: true,
    routedFeatures: ['SMART Chat', 'Interview', 'CV'],
    latencyTier: 'Moderate',
    contextWindow: 128000,
  },
  {
    id: 'openrouter-deepseek-chat',
    displayName: 'DeepSeek Chat',
    provider: 'OpenRouter',
    providerType: 'cloud',
    modelIdentifier: 'deepseek/deepseek-chat',
    capabilities: ['Coding', 'Reasoning', 'Chat'],
    availability: 'Available',
    isDefaultRouting: true,
    routedFeatures: ['ULTRA Chat', 'ULTRA Agents'],
    latencyTier: 'Deep Reasoning',
    contextWindow: 64000,
  },
  {
    id: 'cf-llama-3.1-8b',
    displayName: 'Llama 3.1 8B (Cloudflare)',
    provider: 'Cloudflare Workers AI',
    providerType: 'cloud',
    modelIdentifier: '@cf/meta/llama-3.1-8b-instruct',
    capabilities: ['Chat'],
    availability: 'Available',
    isDefaultRouting: false,
    routedFeatures: ['FAST cloud fallback'],
    latencyTier: 'Ultra-low',
    contextWindow: 8192,
  },
  {
    id: 'gemini-disabled',
    displayName: 'Gemini (not configured)',
    provider: 'Google Gemini',
    providerType: 'cloud',
    modelIdentifier: 'gemini-2.0-flash',
    capabilities: ['Multimodal', 'Reasoning'],
    availability: 'Unavailable',
    isDefaultRouting: false,
    routedFeatures: [],
    latencyTier: 'Moderate',
    contextWindow: 1000000,
  },
];

/**
 * Maps frontend AiMode into backend-compatible aiProfile string.
 * SMART/ULTRA/AUTO must reach Spring as-is (Mission 10).
 * QUALITY remains a legacy alias accepted by the backend.
 */
export function mapAiModeToBackendProfile(mode: AiMode | string): string {
  const upper = (mode || 'FAST').toString().trim().toUpperCase();
  if (upper === 'QUALITY') return 'QUALITY';
  if (upper === 'SMART') return 'SMART';
  if (upper === 'ULTRA') return 'ULTRA';
  if (upper === 'AUTO') return 'AUTO';
  if (upper === 'FAST') return 'FAST';
  return 'FAST';
}

/**
 * Parses any backend error response or status into a clean, human-readable AI error detail.
 * Never displays raw JSON or technical stack traces to the user.
 */
export function parseAIError(err: any): AIErrorDetail {
  const message = typeof err === 'string' ? err : err?.message || err?.detail || '';

  if (message.toLowerCase().includes('quota') || message.toLowerCase().includes('credits') || message.toLowerCase().includes('exhausted')) {
    return {
      type: 'daily_quota_exhausted',
      title: 'Ultra Credits Limit Reached',
      message: 'Your Ultra credits are finished for today. Daily credits will reset at midnight.',
      actionLabel: 'Continue with Smart',
      actionTarget: 'switch_smart',
    };
  }

  if (message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('429')) {
    return {
      type: 'rate_limited',
      title: 'AI Provider Rate Limited',
      message: 'The upstream AI model provider is currently experiencing heavy traffic. Please wait a moment or try Smart mode.',
      actionLabel: 'Retry Operation',
      actionTarget: 'retry',
    };
  }

  if (message.toLowerCase().includes('ollama') || message.toLowerCase().includes('connection refused') || message.toLowerCase().includes('11434')) {
    return {
      type: 'ollama_offline',
      title: 'Local Ollama Offline',
      message: 'Cannot reach local Ollama on port 11434. Please start Ollama or switch to Cloud mode.',
      actionLabel: 'Open AI Settings',
      actionTarget: 'settings',
    };
  }

  if (message.toLowerCase().includes('unsupported') || message.toLowerCase().includes('capability')) {
    return {
      type: 'model_unsupported',
      title: 'AI Model Unsupported',
      message: 'The requested action is not supported by the active model profile.',
      actionLabel: 'Switch to Smart',
      actionTarget: 'switch_smart',
    };
  }

  if (message.toLowerCase().includes('unavailable') || message.toLowerCase().includes('503') || message.toLowerCase().includes('timeout')) {
    return {
      type: 'provider_unavailable',
      title: 'AI Provider Temporarily Unavailable',
      message: 'The selected AI provider service is currently unavailable. Automatic failover is standing by.',
      actionLabel: 'Continue with Smart',
      actionTarget: 'switch_smart',
    };
  }

  return {
    type: 'unknown',
    title: 'AI Service Notice',
    message: message || 'An unexpected error occurred while communicating with the AI service.',
    actionLabel: 'Continue with Smart',
    actionTarget: 'switch_smart',
  };
}
