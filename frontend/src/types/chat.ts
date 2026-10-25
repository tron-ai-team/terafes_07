import { AiProfile } from './aiProfile';
import { SupportedLanguage } from '../utils/languageResolver';

export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatStatus = 'idle' | 'sending' | 'error' | 'unavailable';

export type ChatLanguage = SupportedLanguage;

export type SearchMode = 'off' | 'auto' | 'on';

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchStatus {
  mode: SearchMode;
  performed: boolean;
  status: 'skipped' | 'unavailable' | 'ok' | 'timeout' | 'error';
  query?: string;
  detail?: string;
  results?: SearchResultItem[];
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  truncated?: boolean;
  finishReason?: string;
  search?: SearchStatus;
  language?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  aiProfile?: AiProfile;
  modelId?: string;
  modelDisplayName?: string;
  locked?: boolean;
}

export interface ChatSendRequest {
  sessionId: string;
  messages: ChatMessage[];
  language?: ChatLanguage;
  searchMode?: SearchMode;
  aiProfile?: AiProfile;
}

export interface ChatSendResult {
  status: ChatStatus;
  label: string;
  detail: string;
  language?: string;
  truncated?: boolean;
  finishReason?: string;
  search?: SearchStatus;
  evalCount?: number;
  promptEvalCount?: number;
  aiProfile?: AiProfile;
  model?: string;
}

