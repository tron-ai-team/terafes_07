import { AiProfile } from './aiProfile';

export interface AgentRunRequest {
  goal: string;
  companyName: string;
  jobPosition: string;
  jobDescription: string;
  language?: string;
  cvId?: number;
  aiProfile?: AiProfile;
}

export interface AgentStepDto {
  step: number;
  action: string;
  description: string;
  status: string;
}

export interface PracticeQuestion {
  question: string;
  category: string;
  difficulty: string;
  whyThisQuestionMatters: string;
  preparationHint: string;
}

export interface InterviewStrategy {
  priorityTopics?: string[];
  technicalPreparation?: string[];
  behavioralPreparation?: string[];
  communicationPreparation?: string[];
  japanesePreparation?: string[];
  studyOrder?: string[];
  likelyQuestionAreas?: string[];
  riskMitigation?: string[];
}

export interface AgentResultDto {
  candidateStrengths: string[];
  skillGaps: string[];
  priorityTopics: string[];
  interviewStrategy: InterviewStrategy;
  practiceQuestions: PracticeQuestion[];
}

export interface AgentMetricsDto {
  stepsExecuted: number;
  toolsUsed: string[];
  model: string;
  durationMs: number;
}

export interface AgentRunResponse {
  runId: string;
  status: string;
  goal: string;
  companyName: string;
  jobPosition: string;
  steps: AgentStepDto[];
  result?: AgentResultDto;
  metrics: AgentMetricsDto;
  aiProfile?: AiProfile;
  modelId?: string;
}
