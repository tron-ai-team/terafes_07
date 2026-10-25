import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types/user';
import { InterviewConfig, InterviewAnalysisResult } from '../types/interview';
import { ChatMessage, ChatSession, SearchMode } from '../types/chat';
import { AiProfile, AiProfileDefinition, AiMode, UltraCreditsInfo } from '../types/aiProfile';
import {
  AI_MODE_STORAGE_KEY,
  ULTRA_CREDITS_STORAGE_KEY,
  DEFAULT_ULTRA_CREDITS,
  ULTRA_CREDIT_COSTS,
  AI_MODES,
  mapAiModeToBackendProfile,
} from '../config/aiModes';
import { requestAssistantReply } from '../services/chatClient';
import { authApi, apiClient, setAccessToken as setHttpAccessToken, refreshSessionSingleFlight } from '../services/httpClient';
import { CORE_API_URL } from '../config/api';

import {
  SupportedLanguage,
  UILocale,
  resolveLanguage,
  isSupportedLanguage,
  resolveInterviewLanguage,
  LANGUAGE_STORAGE_KEY,
  LEGACY_LANGUAGE_STORAGE_KEY,
} from '../utils/languageResolver';
import { getTranslation, TranslationSchema } from '../locales';

export type { SupportedLanguage, UILocale };

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export type AppMode = 'chat' | 'voice' | 'workspace' | 'career' | 'interview' | 'agent';

interface AppContextType {
  user: UserProfile | null;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  refreshAuth: () => Promise<boolean>;
  setAuthSession: (accessToken: string, user: any) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  toasts: Toast[];
  addToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;

  // Unified Language Experience
  t: TranslationSchema;
  selectedLanguage: SupportedLanguage;
  setSelectedLanguage: (lang: SupportedLanguage) => void;
  uiLocale: UILocale;
  aiLanguage: SupportedLanguage;
  uiLanguage: UILocale; // Backward compatibility alias
  setUiLanguage: (lang: SupportedLanguage) => void; // Backward compatibility alias
  searchMode: SearchMode;
  setSearchMode: (mode: SearchMode) => void;
  interviewConfig: InterviewConfig;
  setInterviewConfig: React.Dispatch<React.SetStateAction<InterviewConfig>>;
  lastAnalysis: InterviewAnalysisResult | null;
  setLastAnalysis: (analysis: InterviewAnalysisResult | null) => void;
  activeMode: AppMode;
  setActiveMode: (mode: AppMode) => void;

  // Chat Mode Management
  chatSessions: ChatSession[];
  activeChatId: string | null;
  activeChatMessages: ChatMessage[];
  isChatSending: boolean;
  chatNotice: string | null;
  createNewChat: () => string;
  selectChat: (sessionId: string) => void;
  deleteChat: (sessionId: string) => void;
  sendChatMessage: (content: string) => Promise<void>;

  // Backend Connectivity Status
  backendStatus: 'checking' | 'connected' | 'offline';
  backendMessage: string;
  checkBackendHealth: () => Promise<void>;

  // Universal AI Profile & Centralized AI Mode System
  selectedAiMode: AiMode;
  setSelectedAiMode: (mode: AiMode) => void;
  ultraCredits: UltraCreditsInfo;
  consumeUltraCredit: (required?: number) => boolean;
  resetUltraCredits: () => void;
  isUltraLimitModalOpen: boolean;
  setUltraLimitModalOpen: (open: boolean) => void;
  isAdvancedAiModalOpen: boolean;
  setAdvancedAiModalOpen: (open: boolean) => void;

  aiProfiles: AiProfileDefinition[];
  preferredAiProfile: AiProfile;
  setPreferredAiProfile: (profile: AiProfile) => void;
  updateSessionProfile: (sessionId: string, profile: AiProfile) => void;
  loadAiProfiles: () => Promise<void>;
}

const defaultInterviewConfig: InterviewConfig = {
  companyName: 'LINEヤフー株式会社 (LY Corporation)',
  companyNameJa: 'LINEヤフー株式会社',
  jobPosition: 'Software Engineer (Backend)',
  jobPositionJa: 'ソフトウェアエンジニア (バックエンド)',
  jobDescription: 'Java / Go / 分散システム開発およびAPI設計',
  industry: 'IT / Webサービス',
  language: 'japanese',
  type: 'technical',
  difficulty: 'intermediate',
  mode: 'manual',
  questionCount: 5,
};

const initialSampleChatSession: ChatSession = {
  id: 'session-default-1',
  title: 'Welcome to TRON AI',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  aiProfile: 'FAST',
  locked: true,
  messages: [
    {
      id: 'msg-welcome-ai',
      role: 'assistant',
      content:
        'Hello! I am TRON AI, your advanced assistant. I can help with general inquiries, Japanese career advice, tech interview prep, and culture. How may I assist you today?',
      createdAt: new Date().toISOString(),
    },
  ],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedLanguage, setSelectedLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved =
        localStorage.getItem(LANGUAGE_STORAGE_KEY) ||
        localStorage.getItem(LEGACY_LANGUAGE_STORAGE_KEY);
      if (saved && isSupportedLanguage(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'en';
  });

  const languageResolution = resolveLanguage(selectedLanguage);
  const uiLocale = languageResolution.uiLocale;
  const aiLanguage = languageResolution.aiLanguage;
  const t = getTranslation(selectedLanguage);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = selectedLanguage;
    }
  }, [selectedLanguage]);

  const [searchMode, setSearchMode] = useState<SearchMode>('auto');
  const [interviewConfig, setInterviewConfig] = useState<InterviewConfig>(() => ({
    ...defaultInterviewConfig,
    language: resolveInterviewLanguage(selectedLanguage),
  }));
  const [lastAnalysis, setLastAnalysis] = useState<InterviewAnalysisResult | null>(null);
  const [activeMode, setActiveMode] = useState<AppMode>('chat');

  // Chat Mode State
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([initialSampleChatSession]);
  const [activeChatId, setActiveChatId] = useState<string | null>('session-default-1');
  const [isChatSending, setIsChatSending] = useState(false);
  const [chatNotice, setChatNotice] = useState<string | null>(null);

  // Backend Health Status
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [backendMessage, setBackendMessage] = useState('Connecting to TRON Core backend at localhost:8080...');

  // Centralized AI Mode State (AUTO | FAST | SMART | ULTRA)
  const [selectedAiMode, setSelectedAiModeState] = useState<AiMode>(() => {
    try {
      const saved = localStorage.getItem(AI_MODE_STORAGE_KEY);
      if (saved && ['AUTO', 'FAST', 'SMART', 'ULTRA'].includes(saved)) {
        return saved as AiMode;
      }
    } catch {}
    return 'SMART';
  });

  // Daily Ultra Credits State (3 of 5 remaining by default, survives reload)
  const [ultraCredits, setUltraCreditsState] = useState<UltraCreditsInfo>(() => {
    try {
      const saved = localStorage.getItem(ULTRA_CREDITS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.remaining === 'number' && typeof parsed?.total === 'number') {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_ULTRA_CREDITS;
  });

  const [isUltraLimitModalOpen, setUltraLimitModalOpen] = useState(false);
  const [isAdvancedAiModalOpen, setAdvancedAiModalOpen] = useState(false);

  // Universal AI Profile System State
  const [aiProfiles, setAiProfiles] = useState<AiProfileDefinition[]>([
    {
      id: 'FAST',
      displayName: 'Fast',
      description: 'Fast responses. Best for everyday use.',
      available: true,
      modelDisplayName: 'qwen3:8b',
    },
    {
      id: 'QUALITY',
      displayName: 'Quality',
      description: 'Higher-quality answers and deeper reasoning. May respond more slowly.',
      available: true,
      modelDisplayName: 'gemma3:12b',
    },
  ]);
  const [preferredAiProfile, setPreferredAiProfileState] = useState<AiProfile>('QUALITY');

  const setSelectedAiMode = useCallback(
    (mode: AiMode) => {
      setSelectedAiModeState(mode);
      try {
        localStorage.setItem(AI_MODE_STORAGE_KEY, mode);
      } catch {}

      const mappedProfile = mapAiModeToBackendProfile(mode) as AiProfile;
      setPreferredAiProfileState(mappedProfile);

      if (user && accessToken) {
        void authApi.updateSettings({ preferredAiProfile: mode }).catch(() => {});
      }
    },
    [user, accessToken]
  );

  const setPreferredAiProfile = (profile: AiProfile) => {
    setPreferredAiProfileState(profile);
    const upper = profile.toUpperCase();
    if (upper === 'QUALITY') setSelectedAiModeState('SMART');
    else if (upper === 'FAST') setSelectedAiModeState('FAST');
    else if (['AUTO', 'FAST', 'SMART', 'ULTRA'].includes(upper)) setSelectedAiModeState(upper as AiMode);

    if (user && accessToken) {
      void authApi.updateSettings({ preferredAiProfile: profile }).catch(() => {});
    }
  };

  const consumeUltraCredit = useCallback(
    (required = 1): boolean => {
      if (ultraCredits.remaining < required) {
        setUltraLimitModalOpen(true);
        return false;
      }
      const updated: UltraCreditsInfo = {
        ...ultraCredits,
        remaining: Math.max(0, ultraCredits.remaining - required),
      };
      setUltraCreditsState(updated);
      try {
        localStorage.setItem(ULTRA_CREDITS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return true;
    },
    [ultraCredits]
  );

  const resetUltraCredits = useCallback(() => {
    setUltraCreditsState(DEFAULT_ULTRA_CREDITS);
    try {
      localStorage.setItem(ULTRA_CREDITS_STORAGE_KEY, JSON.stringify(DEFAULT_ULTRA_CREDITS));
    } catch {}
  }, []);

  const loadAiProfiles = useCallback(async () => {
    try {
      const data = await apiClient.getAiProfiles();
      if (data && Array.isArray(data.profiles) && data.profiles.length > 0) {
        setAiProfiles(data.profiles);
      }
    } catch {
      // Keep sensible default profiles if endpoint temporarily offline
    }
  }, []);

  /** Sync Ultra credits + Ultra availability from Spring gateway (never invent cloud models). */
  const refreshAiGatewayState = useCallback(async () => {
    try {
      const modes = await apiClient.getAiModes();
      if (typeof modes?.dailyUltraCredits === 'number') {
        setUltraCreditsState((prev) => {
          const next = {
            ...prev,
            total: modes.dailyUltraCredits,
            remaining:
              typeof prev.remaining === 'number'
                ? Math.min(prev.remaining, modes.dailyUltraCredits)
                : modes.dailyUltraCredits,
          };
          try {
            localStorage.setItem(ULTRA_CREDITS_STORAGE_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      }
      if (modes?.ultraAvailable === false || modes?.ultraEnabled === false) {
        AI_MODES.ULTRA.available = false;
        AI_MODES.ULTRA.status = 'Unavailable';
        setSelectedAiModeState((current) => (current === 'ULTRA' ? 'SMART' : current));
      } else if (modes?.ultraAvailable === true) {
        AI_MODES.ULTRA.available = true;
        AI_MODES.ULTRA.status = 'Available';
        if (modes.ultraModelId) {
          AI_MODES.ULTRA.model = modes.ultraModelId;
        }
        if (modes.ultraProvider) {
          AI_MODES.ULTRA.provider = modes.ultraProvider;
        }
      }
    } catch {
      // modes endpoint may be unauthenticated-ok; ignore soft failures
    }

    try {
      const usage = await apiClient.getAiUsage();
      if (usage && typeof usage.remaining === 'number' && typeof usage.dailyLimit === 'number') {
        const next: UltraCreditsInfo = {
          remaining: usage.remaining,
          total: usage.dailyLimit,
          resetTime: usage.utcDay
            ? `Resets next UTC day (current ${usage.utcDay})`
            : DEFAULT_ULTRA_CREDITS.resetTime,
          requiredCreditsPerTask: ULTRA_CREDIT_COSTS.chat,
        };
        setUltraCreditsState(next);
        try {
          localStorage.setItem(ULTRA_CREDITS_STORAGE_KEY, JSON.stringify(next));
        } catch {}
      }
    } catch {
      // usage requires auth — ignore when logged out
    }
  }, []);

  const setSelectedLanguage = useCallback(
    (lang: SupportedLanguage) => {
      setSelectedLanguageState(lang);
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
        localStorage.setItem(LEGACY_LANGUAGE_STORAGE_KEY, lang);
      } catch {}

      // Keep default interview config in sync with global selection
      setInterviewConfig((prev) => ({
        ...prev,
        language: resolveInterviewLanguage(lang),
      }));

      if (user && accessToken) {
        void authApi.updateSettings({ preferredLanguage: lang }).catch(() => {});
      }
    },
    [user, accessToken]
  );

  // Alias for backward compatibility
  const setUiLanguage = setSelectedLanguage;
  const uiLanguage = uiLocale;

  const addToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const checkBackendHealth = useCallback(async () => {
    setBackendStatus('checking');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${CORE_API_URL}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setBackendStatus('connected');
        setBackendMessage(`Connected to TRON Core (${data.ollama === 'reachable' ? 'Ollama ready' : 'ready'})`);
      } else {
        setBackendStatus('offline');
        setBackendMessage('TRON Core backend responded with error status: ' + res.status);
      }
    } catch {
      setBackendStatus('offline');
      setBackendMessage('TRON Core backend offline at localhost:8080.');
    }
  }, []);

  // Helper to load persistent sessions and settings
  const loadUserData = useCallback(async () => {
    try {
      const settings = await authApi.getSettings();
      if (settings.preferredLanguage && isSupportedLanguage(settings.preferredLanguage)) {
        setSelectedLanguageState(settings.preferredLanguage);
      }
      if (settings.preferredAiProfile) {
        const upper = settings.preferredAiProfile.toUpperCase();
        if (['AUTO', 'FAST', 'SMART', 'ULTRA'].includes(upper)) {
          setSelectedAiModeState(upper as AiMode);
          setPreferredAiProfileState(mapAiModeToBackendProfile(upper as AiMode) as AiProfile);
        } else if (upper === 'QUALITY') {
          setSelectedAiModeState('SMART');
          setPreferredAiProfileState('QUALITY');
        } else if (upper === 'FAST') {
          setSelectedAiModeState('FAST');
          setPreferredAiProfileState('FAST');
        }
      }
    } catch {
      // ignore
    }

    try {
      const remoteSessions = await authApi.getChatSessions();
      if (Array.isArray(remoteSessions) && remoteSessions.length > 0) {
        const mappedSessions: ChatSession[] = remoteSessions.map((rs: any) => ({
          id: rs.clientSessionId || `session-${rs.id}`,
          title: rs.title || 'Conversation',
          createdAt: rs.createdAt || new Date().toISOString(),
          updatedAt: rs.updatedAt || new Date().toISOString(),
          aiProfile: (rs.aiProfile as AiProfile) || 'FAST',
          modelId: rs.modelId,
          modelDisplayName: rs.modelDisplayName,
          locked: rs.locked !== undefined ? rs.locked : (Array.isArray(rs.messages) && rs.messages.length > 0),
          messages: Array.isArray(rs.messages)
            ? rs.messages.map((rm: any) => ({
                id: `msg-${rm.id}`,
                role: rm.role,
                content: rm.content,
                createdAt: rm.createdAt || new Date().toISOString(),
              }))
            : [],
        }));
        setChatSessions(mappedSessions);
        setActiveChatId(mappedSessions[0].id);
      }
    } catch {
      // ignore
    }
  }, []);

  // On mount: attempt silent refresh using HttpOnly cookie (except on /auth/callback where AuthCallbackPage owns bootstrap)
  useEffect(() => {
    let isMounted = true;
    async function initAuth() {
      // Requirement 7: Coordinate initialization. On /auth/callback, AuthCallbackPage owns session bootstrap
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/callback')) {
        if (isMounted) setIsLoadingAuth(false);
        return;
      }

      try {
        const authData = await refreshSessionSingleFlight();
        if (isMounted && authData?.user) {
          const profile: UserProfile = {
            id: authData.user.id,
            name: authData.user.displayName || authData.user.email.split('@')[0],
            email: authData.user.email,
            targetRole: 'Backend Engineer',
            jlptLevel: 'N2',
            isAuthenticated: true,
            authProviders: authData.user.authProviders || ['PASSWORD'],
          };
          setUser(profile);
          setAccessTokenState(authData.accessToken);
          setHttpAccessToken(authData.accessToken);
          await loadUserData();
        }
      } catch {
        // Unauthenticated visitor (guest mode)
        if (isMounted) {
          setUser(null);
          setAccessTokenState(null);
          setHttpAccessToken(null);
        }
      } finally {
        if (isMounted) setIsLoadingAuth(false);
      }
    }

    void initAuth();
    void checkBackendHealth();
    void loadAiProfiles();
    void refreshAiGatewayState();

    return () => {
      isMounted = false;
    };
  }, [checkBackendHealth, loadAiProfiles, loadUserData, refreshAiGatewayState]);

  const setAuthSession = async (token: string, userData: any) => {
    setAccessTokenState(token);
    setHttpAccessToken(token);
    const profile: UserProfile = {
      id: userData.id,
      name: userData.displayName || userData.email.split('@')[0],
      email: userData.email,
      targetRole: 'Backend Engineer',
      jlptLevel: 'N2',
      isAuthenticated: true,
      authProviders: userData.authProviders || ['PASSWORD'],
    };
    setUser(profile);
    setIsLoadingAuth(false);
    await loadUserData();
    await refreshAiGatewayState();
  };

  const refreshAuth = async (): Promise<boolean> => {
    try {
      const authData = await refreshSessionSingleFlight();
      if (authData?.accessToken) {
        setAccessTokenState(authData.accessToken);
        setHttpAccessToken(authData.accessToken);
        let meUser = authData.user;
        try {
          meUser = await authApi.getMe();
        } catch {
          // fallback to authData.user if /me fails
        }
        const profile: UserProfile = {
          id: meUser.id,
          name: meUser.displayName || meUser.email.split('@')[0],
          email: meUser.email,
          targetRole: 'Backend Engineer',
          jlptLevel: 'N2',
          isAuthenticated: true,
          authProviders: meUser.authProviders || authData.user?.authProviders || ['PASSWORD'],
        };
        setUser(profile);
        await loadUserData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    const authData = await authApi.login(email, password);
    const profile: UserProfile = {
      id: authData.user.id,
      name: authData.user.displayName || authData.user.email.split('@')[0],
      email: authData.user.email,
      targetRole: 'Backend Engineer',
      jlptLevel: 'N2',
      isAuthenticated: true,
      authProviders: authData.user.authProviders || ['PASSWORD'],
    };
    setUser(profile);
    setAccessTokenState(authData.accessToken);
    setHttpAccessToken(authData.accessToken);
    addToast(`Welcome back to TRON AI, ${profile.name}!`, 'success');
    await loadUserData();
  };

  const register = async (email: string, password: string, displayName?: string) => {
    const authData = await authApi.register(email, password, displayName);
    const profile: UserProfile = {
      id: authData.user.id,
      name: authData.user.displayName || displayName || authData.user.email.split('@')[0],
      email: authData.user.email,
      targetRole: 'Backend Engineer',
      jlptLevel: 'N2',
      isAuthenticated: true,
      authProviders: authData.user.authProviders || ['PASSWORD'],
    };
    setUser(profile);
    setAccessTokenState(authData.accessToken);
    setHttpAccessToken(authData.accessToken);
    addToast(`Account created successfully! Welcome, ${profile.name}!`, 'success');
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    setUser(null);
    setAccessTokenState(null);
    setHttpAccessToken(null);
    setChatSessions([initialSampleChatSession]);
    setActiveChatId('session-default-1');
    addToast('Logged out successfully', 'info');
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.location.href = '/';
    }
  };

  // Chat Actions
  const createNewChat = () => {
    const newId = 'session-' + Date.now();
    const newSession: ChatSession = {
      id: newId,
      title: 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      aiProfile: selectedAiMode,
      locked: false,
      messages: [],
    };
    setChatSessions((prev) => [newSession, ...prev]);
    setActiveChatId(newId);
    setChatNotice(null);
    return newId;
  };

  const selectChat = (sessionId: string) => {
    setActiveChatId(sessionId);
    setChatNotice(null);
  };

  const deleteChat = (sessionId: string) => {
    setChatSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (activeChatId === sessionId) {
        setActiveChatId(filtered[0]?.id || null);
      }
      return filtered;
    });
    addToast('Conversation removed', 'info');
  };

  const updateSessionProfile = (sessionId: string, profile: AiProfile) => {
    setChatSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          if (s.locked || (s.messages && s.messages.length > 0)) {
            addToast('AI profile is locked for this session. Start a new session to choose another profile.', 'warning');
            return s;
          }
          return { ...s, aiProfile: profile };
        }
        return s;
      })
    );
  };

  const activeSession = chatSessions.find((s) => s.id === activeChatId) || chatSessions[0];
  const activeChatMessages = activeSession?.messages || [];

  const sendChatMessage = async (content: string) => {
    const text = content.trim();
    if (!text || isChatSending) return;

    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    let targetSessionId = activeChatId;
    if (!targetSessionId || !activeSession) {
      targetSessionId = 'session-' + Date.now();
    }

    const currentSession = chatSessions.find((s) => s.id === targetSessionId) || activeSession;
    const sessionProfile: AiProfile = currentSession?.aiProfile || selectedAiMode;

    if (sessionProfile === 'ULTRA') {
      if (ultraCredits.remaining <= 0) {
        setUltraLimitModalOpen(true);
        setChatNotice('Your Ultra credits are finished for today. Please switch to Smart mode.');
        return;
      }
      consumeUltraCredit(1);
    }

    // Update session title on first message and lock the profile
    setChatSessions((prev) => {
      const exists = prev.find((s) => s.id === targetSessionId);
      if (exists) {
        return prev.map((s) =>
          s.id === targetSessionId
            ? {
                ...s,
                title: s.title === 'New Conversation' ? text.slice(0, 32) : s.title,
                messages: [...s.messages, userMsg],
                aiProfile: sessionProfile,
                locked: true,
                updatedAt: new Date().toISOString(),
              }
            : s
        );
      } else {
        const newSession: ChatSession = {
          id: targetSessionId!,
          title: text.slice(0, 32),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          aiProfile: sessionProfile,
          locked: true,
          messages: [userMsg],
        };
        return [newSession, ...prev];
      }
    });

    setIsChatSending(true);
    setChatNotice(null);

    // Call chatClient with selected language, searchMode, and mapped backend aiProfile
    const backendProfile = mapAiModeToBackendProfile(sessionProfile as AiMode);
    try {
      const result = await requestAssistantReply({
        sessionId: targetSessionId!,
        messages: [...activeChatMessages, userMsg],
        language: aiLanguage,
        searchMode: searchMode,
        aiProfile: backendProfile,
      });

      setIsChatSending(false);

      if (result.status === 'unavailable') {
        setChatNotice(`${result.label}: ${result.detail}`);
      } else if (result.detail) {
        const aiMsg: ChatMessage = {
          id: 'ai-' + Date.now(),
          role: 'assistant',
          content: result.detail,
          createdAt: new Date().toISOString(),
        };

        setChatSessions((prev) =>
          prev.map((s) =>
            s.id === targetSessionId
              ? {
                  ...s,
                  messages: [...s.messages, aiMsg],
                  aiProfile: result.aiProfile || sessionProfile,
                  modelDisplayName: result.model || s.modelDisplayName,
                  locked: true,
                  updatedAt: new Date().toISOString(),
                }
              : s
          )
        );
      }
    } catch {
      setIsChatSending(false);
      setChatNotice('Failed to communicate with TRON AI backend');
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        accessToken,
        isAuthenticated: !!user && !!accessToken,
        isLoadingAuth,
        refreshAuth,
        setAuthSession,
        login,
        register,
        logout,
        toasts,
        addToast,
        removeToast,
        t,
        selectedLanguage,
        setSelectedLanguage,
        uiLocale,
        aiLanguage,
        uiLanguage,
        setUiLanguage,
        searchMode,
        setSearchMode,
        interviewConfig,
        setInterviewConfig,
        lastAnalysis,
        setLastAnalysis,
        activeMode,
        setActiveMode,
        chatSessions,
        activeChatId,
        activeChatMessages,
        isChatSending,
        chatNotice,
        createNewChat,
        selectChat,
        deleteChat,
        sendChatMessage,
        backendStatus,
        backendMessage,
        checkBackendHealth,
        selectedAiMode,
        setSelectedAiMode,
        ultraCredits,
        consumeUltraCredit,
        resetUltraCredits,
        isUltraLimitModalOpen,
        setUltraLimitModalOpen,
        isAdvancedAiModalOpen,
        setAdvancedAiModalOpen,
        aiProfiles,
        preferredAiProfile,
        setPreferredAiProfile,
        updateSessionProfile,
        loadAiProfiles,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
