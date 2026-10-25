import { CORE_API_URL } from '../config/api';

/**
 * TRON AI — Centralized Authenticated HTTP Client
 *
 * Requirements (Phase AD, AE, AF):
 * - Keeps short-lived access token in memory ONLY (never in localStorage/sessionStorage).
 * - Transparently handles HttpOnly refresh token cookie via `credentials: 'include'`.
 * - Centralizes Authorization Bearer header injection.
 * - Correctly handles FormData without overriding multipart boundaries.
 * - Parses and preserves standard backend `{"detail": "..."}` error contracts.
 */

let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<AuthResponse> | null = null;

export function setAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export interface ApiErrorDetail {
  detail?: string | Array<{ msg?: string; loc?: string[] }>;
  message?: string;
  status?: number;
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Format error response from Spring backend `{"detail": "..."}`
 */
export async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.detail === 'string') {
      return data.detail;
    }
    if (Array.isArray(data.detail)) {
      return data.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ');
    }
    if (typeof data.message === 'string') {
      return data.message;
    }
  } catch {
    // Non-JSON or empty response
  }
  return `HTTP error ${res.status}: ${res.statusText || 'Request failed'}`;
}

export interface ApiFetchOptions extends RequestInit {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
}

/**
 * Checks if the endpoint path should bypass the 401 refresh interceptor
 * to prevent loops or unwanted refreshes on unauthenticated endpoints.
 */
function shouldBypassAuthRefresh(path: string): boolean {
  const normalized = path.toLowerCase();
  return (
    normalized.includes('/api/v1/auth/refresh') ||
    normalized.includes('/api/v1/auth/login') ||
    normalized.includes('/api/v1/auth/register') ||
    normalized.includes('/api/v1/auth/logout') ||
    normalized.includes('/api/v1/auth/providers') ||
    normalized.includes('/oauth2/') ||
    normalized.includes('/login/oauth2/')
  );
}

/**
 * Performs the actual single network call to /api/v1/auth/refresh using credentials: 'include'.
 * Direct fetch is used here to bypass apiFetch interceptors completely.
 */
async function performActualRefresh(): Promise<AuthResponse> {
  const url = `${CORE_API_URL}/api/v1/auth/refresh`;
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    setAccessToken(null);
    const detail = await parseErrorDetail(res);
    throw new ApiError(res.status, detail);
  }

  const data: AuthResponse = await res.json();
  setAccessToken(data.accessToken);
  return data;
}

/**
 * Authoritative Single-Flight Session Refresh.
 * Guarantees that there is NEVER more than ONE active POST /api/v1/auth/refresh
 * running across the entire frontend application instance.
 */
export async function refreshSessionSingleFlight(): Promise<AuthResponse> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = performActualRefresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

/**
 * Centralized fetch helper for all TRON AI API calls.
 * Transparently injects Bearer token and includes credentials.
 * Automatically retries 401 responses ONCE using centralized single-flight refresh.
 */
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const url = path.startsWith('http://') || path.startsWith('https://')
    ? path
    : `${CORE_API_URL}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers = new Headers(options.headers || {});

  // Add Bearer token if present and not already supplied
  if (inMemoryAccessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }

  // Ensure JSON Content-Type only when body is not FormData
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const finalOptions: RequestInit = {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  };

  const response = await fetch(url, finalOptions);

  // 401 Interceptor with single-flight mutex & retry-once protection
  if (
    response.status === 401 &&
    !options._retry &&
    !options.skipAuthRefresh &&
    !shouldBypassAuthRefresh(path)
  ) {
    const usedToken = headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || null;

    // Fast-path: If another concurrent request already refreshed the in-memory token,
    // retry immediately with the updated token without initiating another refresh.
    if (inMemoryAccessToken && usedToken && inMemoryAccessToken !== usedToken) {
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set('Authorization', `Bearer ${inMemoryAccessToken}`);
      return await apiFetch(path, {
        ...options,
        headers: retryHeaders,
        _retry: true,
      });
    }

    // Await the shared single-flight refresh
    try {
      const refreshed = await refreshSessionSingleFlight();
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set('Authorization', `Bearer ${refreshed.accessToken}`);
      return await apiFetch(path, {
        ...options,
        headers: retryHeaders,
        _retry: true,
      });
    } catch {
      // Shared refresh failed (e.g. unauthenticated or expired cookie) -> return original 401
      return response;
    }
  }

  return response;
}

export interface AuthUser {
  id: number | string;
  email: string;
  displayName?: string;
  role?: string;
  authProviders?: string[];
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUser;
}

export interface UserSettingsResponse {
  preferredLanguage?: string;
  preferredModel?: string;
  preferredAiProfile?: string;
}

export const authApi = {
  /**
   * Register a new user account
   */
  async register(email: string, password: string, displayName?: string): Promise<AuthResponse> {
    const res = await apiFetch('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });

    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }

    const data: AuthResponse = await res.json();
    setAccessToken(data.accessToken);
    return data;
  },

  /**
   * Authenticate an existing user
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await apiFetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }

    const data: AuthResponse = await res.json();
    setAccessToken(data.accessToken);
    return data;
  },

  /**
   * Silently refresh access token using HttpOnly cookie via centralized single-flight mutex
   */
  async refresh(): Promise<AuthResponse> {
    return await refreshSessionSingleFlight();
  },

  /**
   * Terminate session, revoke refresh token and clear cookie
   */
  async logout(): Promise<void> {
    try {
      await fetch(`${CORE_API_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore network errors on logout
    } finally {
      setAccessToken(null);
      refreshPromise = null;
    }
  },

  /**
   * Retrieve current user profile
   */
  async getMe(): Promise<AuthUser> {
    const res = await apiFetch('/api/v1/auth/me');
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }
    return await res.json();
  },

  /**
   * Retrieve available auth providers (e.g. Google, Password)
   */
  async getProviders(): Promise<{ google?: { enabled: boolean }; password?: { enabled: boolean } }> {
    try {
      const res = await apiFetch('/api/v1/auth/providers');
      if (!res.ok) {
        return { google: { enabled: false }, password: { enabled: true } };
      }
      return await res.json();
    } catch {
      return { google: { enabled: false }, password: { enabled: true } };
    }
  },

  /**
   * Retrieve current user settings
   */
  async getSettings(): Promise<UserSettingsResponse> {
    const res = await apiFetch('/api/v1/users/me/settings');
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }
    return await res.json();
  },

  /**
   * Update user settings (preferredLanguage, preferredModel, preferredAiProfile)
   */
  async updateSettings(settings: { preferredLanguage?: string; preferredModel?: string; preferredAiProfile?: string }): Promise<UserSettingsResponse> {
    const res = await apiFetch('/api/v1/users/me/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }
    return await res.json();
  },

  /**
   * Get user chat sessions
   */
  async getChatSessions(): Promise<any[]> {
    const res = await apiFetch('/api/v1/chat/sessions');
    if (!res.ok) return [];
    return await res.json();
  },

  /**
   * Get specific chat session with messages
   */
  async getChatSession(sessionId: string): Promise<any> {
    const res = await apiFetch(`/api/v1/chat/sessions/${sessionId}`);
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }
    return await res.json();
  },

  /**
   * Get user uploaded CVs
   */
  async getCvDocuments(): Promise<any[]> {
    const res = await apiFetch('/api/v1/cv');
    if (!res.ok) return [];
    return await res.json();
  },

  /**
   * Get user interview sessions
   */
  async getInterviews(): Promise<any[]> {
    const res = await apiFetch('/api/v1/interviews');
    if (!res.ok) return [];
    return await res.json();
  },

  /**
   * Run autonomous interview preparation agent
   */
  async runAgent(request: any): Promise<any> {
    const res = await apiFetch('/api/v1/agents/interview-prep/run', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }
    return await res.json();
  },

  /**
   * Get all agent runs for user
   */
  async getAgentRuns(): Promise<any[]> {
    const res = await apiFetch('/api/v1/agents/runs');
    if (!res.ok) return [];
    return await res.json();
  },

  /**
   * Get specific agent run details
   */
  async getAgentRun(runId: string): Promise<any> {
    const res = await apiFetch(`/api/v1/agents/runs/${runId}`);
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }
    return await res.json();
  },

  /**
   * Delete an agent run
   */
  async deleteAgentRun(runId: string): Promise<void> {
    const res = await apiFetch(`/api/v1/agents/runs/${runId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }
  },

  /**
   * Launch interview directly from agent run
   */
  async startInterviewFromAgent(runId: string): Promise<any> {
    const res = await apiFetch(`/api/v1/agents/runs/${runId}/start-interview`, {
      method: 'POST',
    });
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }
    return await res.json();
  },

  /**
   * Universal AI Profiles
   */
  async getAiProfiles(): Promise<any> {
    const res = await apiFetch('/api/v1/ai-profiles');
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }
    return await res.json();
  },

  /** Spring AI gateway modes (includes ultraAvailable). */
  async getAiModes(): Promise<any> {
    const res = await apiFetch('/api/v1/ai/modes');
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }
    return await res.json();
  },

  /** Authenticated Ultra usage summary from Spring. */
  async getAiUsage(): Promise<any> {
    const res = await apiFetch('/api/v1/ai/usage');
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }
    return await res.json();
  },

  /** Provider health snapshots (no secrets). */
  async getAiProviders(): Promise<any> {
    const res = await apiFetch('/api/v1/ai/providers');
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }
    return await res.json();
  },

  /** Public allowlisted model catalog. */
  async getAiModels(): Promise<any> {
    const res = await apiFetch('/api/v1/ai/models');
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }
    return await res.json();
  },

  /**
   * Get user settings including preferredAiProfile
   */
  async getUserSettings(): Promise<any> {
    const res = await apiFetch('/api/v1/users/me/settings');
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }
    return await res.json();
  },

  /**
   * Update user settings
   */
  async updateUserSettings(settings: any): Promise<any> {
    const res = await apiFetch('/api/v1/users/me/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }
    return await res.json();
  },
};

export const apiClient = authApi;

