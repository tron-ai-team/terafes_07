import {
  InterviewConfig,
  InterviewQuestion,
  InterviewAnalysisResult,
  TranscriptMessage,
  InterviewHistoryItem,
} from '../types/interview';

import { LEGACY_API_URL, CORE_API_URL } from '../config/api';
import { apiFetch, parseErrorDetail } from './httpClient';

export const BACKEND_BASE_URL = CORE_API_URL;
export { LEGACY_API_URL, CORE_API_URL };

export interface V1VoiceTurnResponse {
  sessionId: string;
  transcript: string;
  reply: string;
  content: string;
  audio_url: string;
  audioContentType: string;
  language?: string;
  speechSupported?: boolean;
  speechDetail?: string;
  latency_ms: {
    stt: number;
    llm: number;
    tts: number;
    total: number;
  };
}

export interface V1InterviewVoiceAnswerResponse {
  interviewId: string;
  transcript: string;
  nextQuestionText: string;
  nextQuestionIndex: number;
  isFinished: boolean;
  audio_url: string;
  audioContentType: string;
  latency_ms: {
    stt: number;
    llm: number;
    tts: number;
    total: number;
  };
}

// Local storage keys
const STORAGE_HISTORY_KEY = 'tron_ai_interview_history';

export const tronApi = {
  /**
   * Helper to resolve backend-relative audio paths to full URLs
   */
  resolveAudioUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
      return path;
    }
    return `${BACKEND_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  },

  /**
   * Start a new interview session using the Spring backend (/api/v1/interviews/start)
   */
  async startInterview(config: Partial<InterviewConfig>): Promise<{
    interviewId: string;
    config: InterviewConfig;
    questions: InterviewQuestion[];
    currentQuestionIndex: number;
    transcript: TranscriptMessage[];
  }> {
    const fullConfig: InterviewConfig = {
      companyName: config.companyName || 'LINEヤフー株式会社 (LY Corporation)',
      companyNameJa: config.companyNameJa || config.companyName || 'LINEヤフー株式会社',
      jobPosition: config.jobPosition || 'Software Engineer (Backend)',
      jobPositionJa: config.jobPositionJa || config.jobPosition || 'ソフトウェアエンジニア (バックエンド)',
      jobDescription: config.jobDescription || 'Java / Go / 分散システム開発およびAPI設計',
      industry: config.industry || 'IT / Webサービス',
      language: config.language || 'japanese',
      type: config.type || 'technical',
      difficulty: config.difficulty || 'intermediate',
      mode: config.mode || 'manual',
      questionCount: Math.min(8, Math.max(1, config.questionCount || 5)),
      cvFileName: config.cvFileName,
      aiProfile: config.aiProfile || 'FAST',
      cvDocumentId: config.cvDocumentId,
      companyAnalysisId: config.companyAnalysisId,
      jobId: config.jobId,
    };

    const payload: Record<string, unknown> = { ...fullConfig };
    if (payload.cvDocumentId == null) delete payload.cvDocumentId;
    if (!payload.companyAnalysisId) delete payload.companyAnalysisId;
    if (!payload.jobId) delete payload.jobId;

    const res = await apiFetch('/api/v1/interviews/start', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new Error(detail || `Interview start failed with status ${res.status}`);
    }

    return await res.json();
  },

  /**
   * Submit interview answer to backend (/api/v1/interviews/{interviewId}/answers)
   */
  async submitAnswer(
    interviewId: string,
    questionIndex: number,
    _totalQuestions: number,
    answerText: string,
    _audioBlob?: Blob
  ): Promise<{
    userMessage: TranscriptMessage;
    aiFollowUpMessage: TranscriptMessage;
    nextQuestionIndex: number;
    isFinished: boolean;
  }> {
    const res = await apiFetch(`/api/v1/interviews/${interviewId}/answers`, {
      method: 'POST',
      body: JSON.stringify({ questionIndex, answerText }),
    });

    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new Error(detail || `Answer submission failed with status ${res.status}`);
    }

    return await res.json();
  },

  /**
   * Fetch interview analysis results from backend (/api/v1/interviews/{interviewId}/analysis)
   */
  async getInterviewAnalysis(
    interviewId: string,
    config?: InterviewConfig,
    _transcript: TranscriptMessage[] = []
  ): Promise<InterviewAnalysisResult> {
    const res = await apiFetch(`/api/v1/interviews/${interviewId}/analysis`);

    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new Error(detail || `Analysis generation failed with status ${res.status}`);
    }

    const result: InterviewAnalysisResult = await res.json();

    // Persist real completed interview to local history
    tronApi.saveHistoryItem({
      id: interviewId,
      date: result.completionDate || new Date().toLocaleDateString('ja-JP'),
      companyName: result.companyName || config?.companyName || 'LINEヤフー株式会社',
      jobPosition: result.jobPosition || config?.jobPosition || 'Software Engineer',
      interviewType: result.interviewType || config?.type || 'technical',
      difficulty: result.difficulty || config?.difficulty || 'intermediate',
      score: result.overallScore || 0,
      durationMinutes: result.durationMinutes || 1,
      status: 'completed',
    });

    return result;
  },

  /**
   * Submit interview voice answer audio to dedicated backend route
   * POST /api/v1/interviews/{interview_id}/voice-answer
   */
  async submitInterviewVoiceAnswer(
    interviewId: string,
    audioBlob: Blob,
    questionIndex: number
  ): Promise<V1InterviewVoiceAnswerResponse> {
    const formData = new FormData();
    const isWebm = audioBlob.type.includes('webm');
    const filename = isWebm ? 'answer.webm' : 'answer.wav';
    formData.append('file', audioBlob, filename);
    formData.append('question_index', questionIndex.toString());

    const res = await apiFetch(`/api/v1/interviews/${interviewId}/voice-answer`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      const error: any = new Error(detail || `Interview voice answer failed with status ${res.status}`);
      error.status = res.status;
      throw error;
    }

    return await res.json();
  },

  /**
   * Submit voice turn audio to backend (/api/v1/voice/turn)
   */
  async submitVoiceTurn(
    audioBlob: Blob,
    sessionId?: string,
    language?: string,
    aiProfile?: string
  ): Promise<V1VoiceTurnResponse> {
    const formData = new FormData();
    const isWebm = audioBlob.type.includes('webm');
    const filename = isWebm ? 'mic.webm' : 'mic.wav';
    formData.append('file', audioBlob, filename);
    if (sessionId) {
      formData.append('session_id', sessionId);
    }
    if (language) {
      formData.append('language', language);
    }
    if (aiProfile) {
      formData.append('aiProfile', aiProfile);
    }

    const res = await apiFetch('/api/v1/voice/turn', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new Error(detail || `Voice processing failed with status ${res.status}`);
    }

    return await res.json();
  },

  /**
   * Synthesize Japanese speech using backend VOICEVOX (/demo/voice/speak)
   */
  async synthesizeSpeech(text: string): Promise<string> {
    const cleanText = text.trim().slice(0, 399);
    const res = await apiFetch('/demo/voice/speak', {
      method: 'POST',
      body: JSON.stringify({ text: cleanText }),
    });

    if (!res.ok) {
      throw new Error(`TTS synthesis failed with status ${res.status}`);
    }

    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },

  /**
   * Upload and extract real CV metadata using Spring Boot backend (/demo/cv/upload)
   */
  async uploadCV(file: File): Promise<{
    cvId?: string;
    fileName: string;
    fileSize: number;
    skills: string[];
    experienceYears: number;
    education: string;
    certifications: string[];
    rawSummary?: string;
  }> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const res = await apiFetch('/demo/cv/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const detailMsg = await parseErrorDetail(res);
      throw new Error(detailMsg);
    }

    const data = await res.json();
    const educationStr =
      Array.isArray(data.education) && data.education.length > 0
        ? data.education.map((e: any) => e.school || e.detail).filter(Boolean).join(', ')
        : 'Information Technology / Computer Science';
    const experienceYears = Array.isArray(data.work_experience) ? Math.max(1, data.work_experience.length) : 2;
    const skills =
      Array.isArray(data.skills) && data.skills.length > 0
        ? data.skills
        : ['Software Engineering', 'System Architecture', 'API Design'];

    const summaryNotes = [
      `Skills: ${skills.join(', ')}`,
      `Education: ${educationStr}`,
      `Experience: ${experienceYears} year(s)`,
    ].join(' | ');

    return {
      fileName: data.filename || file.name,
      fileSize: file.size,
      skills,
      experienceYears,
      education: educationStr,
      certifications: Array.isArray(data.extraction_notes) ? data.extraction_notes : [],
      rawSummary: summaryNotes,
    };
  },

  /**
   * Get past interview history from local storage
   */
  getInterviewHistory(): InterviewHistoryItem[] {
    try {
      const saved = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }

    // No seeded fake interviews — empty until the user has real local or server history.
    return [];
  },

  /**
   * Save interview history item
   */
  saveHistoryItem(item: InterviewHistoryItem) {
    try {
      const history = tronApi.getInterviewHistory();
      const updated = [item, ...history.filter((h) => h.id !== item.id)];
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  },
};
