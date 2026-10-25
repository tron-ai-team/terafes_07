import type { ChatSendRequest, ChatSendResult } from '../types/chat';
import { CORE_API_URL } from '../config/api';
import { apiFetch, parseErrorDetail } from './httpClient';

export const AI_NOT_CONNECTED_LABEL = 'AI Backend Offline';
export const AI_NOT_CONNECTED_DETAIL =
  'Spring Boot backend service is not running or not responding at localhost:8080. Chat integration is ready to connect once the service is started.';

export { CORE_API_URL };
const CHAT_TIMEOUT_MS = 60000; // 60 seconds for Ollama qwen3:8b execution

/**
 * Chat client that connects to the Spring Boot backend (/api/v1/chat)
 * running at :8080 powered by Ollama qwen3:8b. Reports real status honestly without mock fallbacks.
 */
export async function requestAssistantReply(
  request: ChatSendRequest,
  externalSignal?: AbortSignal
): Promise<ChatSendResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort());
  }

  try {
    const payload: Record<string, any> = {
      sessionId: request.sessionId,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (request.language) {
      payload.language = request.language;
    }
    if (request.searchMode) {
      payload.searchMode = request.searchMode;
    }
    if (request.aiProfile) {
      payload.aiProfile = request.aiProfile;
    }

    const res = await apiFetch('/api/v1/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const replyText = data.reply || data.content || '';
      return {
        status: 'idle',
        label: 'Connected',
        detail: replyText,
        language: data.language,
        truncated: !!data.truncated,
        finishReason: data.finishReason,
        search: data.search,
        evalCount: data.evalCount,
        promptEvalCount: data.promptEvalCount,
        aiProfile: data.aiProfile,
        model: data.model,
      };
    } else {
      const detailMsg = await parseErrorDetail(res);
      return {
        status: 'unavailable',
        label: `Server Error (${res.status})`,
        detail: detailMsg,
      };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      return {
        status: 'unavailable',
        label: 'Request Timeout',
        detail: 'The AI model took longer than 60 seconds to respond. Please try again.',
      };
    }
    return {
      status: 'unavailable',
      label: AI_NOT_CONNECTED_LABEL,
      detail: AI_NOT_CONNECTED_DETAIL,
    };
  }
}
