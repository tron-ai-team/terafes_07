import { AiProfile } from './aiProfile';

export type AIInterviewerState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export type InterviewType = 'general' | 'technical' | 'hr' | 'behavioral';
export type InterviewDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type InterviewMode = 'manual' | 'auto';
export type InterviewLanguage = 'japanese' | 'english' | 'sinhala' | 'bengali' | 'nepali' | 'myanmar' | string;

export interface InterviewConfig {
  companyName: string;
  companyNameJa?: string;
  jobPosition: string;
  jobPositionJa?: string;
  jobDescription?: string;
  industry?: string;
  language: InterviewLanguage;
  type: InterviewType;
  difficulty: InterviewDifficulty;
  mode: InterviewMode;
  questionCount: number;
  cvFileName?: string;
  cvFileData?: string;
  aiProfile?: AiProfile;
}

export interface InterviewQuestion {
  id: string;
  questionNumber: number;
  totalQuestions?: number;
  category?: string;
  categoryJa?: string;
  textJa: string;
  textEn?: string;
  expectedKeypoints?: string[];
  suggestedFollowUp?: string;
  difficulty?: string;
}

export interface TranscriptMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  textEn?: string;
  timestamp: string;
  audioDuration?: string;
  isFollowUp?: boolean;
}

export interface StarMethodFeedback {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface MetricBreakdown {
  category: string;
  categoryJa: string;
  score: number; // 0 - 100
  benchmark: number;
  feedback: string;
}

export interface InterviewAnalysisResult {
  interviewId: string;
  companyName: string;
  jobPosition: string;
  interviewType: string;
  difficulty: string;
  overallScore: number;
  communicationScore: number;
  japaneseScore: number;
  technicalScore: number;
  confidenceScore: number;
  radarData: {
    metric: string;
    metricJa: string;
    score: number;
    benchmark: number;
  }[];
  strongPoints: string[];
  weakPoints: string[];
  aiOverallFeedback: string;
  starSuggestion: StarMethodFeedback;
  durationMinutes: number;
  completionDate: string;
  transcript: TranscriptMessage[];
}

export interface InterviewHistoryItem {
  id: string;
  date: string;
  companyName: string;
  jobPosition: string;
  interviewType: string;
  difficulty: string;
  score: number;
  durationMinutes: number;
  status: 'completed' | 'in-progress' | 'cancelled';
}
