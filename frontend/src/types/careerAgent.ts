import { AiProfile } from './aiProfile';

export interface CareerJobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  sourceUrl: string;
  sourceProvider?: string | null;

  matchScore: number; // 0 to 100 — relevance estimate, not hiring probability
  matchTier?: 'HIGH' | 'MEDIUM' | 'LOW';
  matchScoreDisclosure?: string | null;

  employmentType?: string | null;
  newGraduateEligible?: boolean | null;

  requiredSkills?: string[];
  matchedSkills?: string[];
  missingSkills?: string[];

  japaneseRequirement?: string | null;
  educationRequirement?: string | null;
  experienceRequirement?: string | null;
  visaSupport?: boolean | string | null;
  salary?: string | null;

  reasons?: string[] | string;
  risks?: string[] | string;

  discoveredAt?: string;
  lastVerifiedAt?: string | null;
  applicationStatus?: string | null;
  internationalStudentPolicy?: string | null;
  verificationNotes?: string | null;
  fullDescription?: string | null;
  saved?: boolean;
}

export interface CareerAgentStep {
  step: number;
  title: string;
  description?: string;
  status: 'pending' | 'running' | 'completed' | 'warning' | 'failed';
  timestamp?: string;
}

export interface CareerAgentMetrics {
  jobsDiscovered: number;
  jobsAnalyzed: number;
  jobsMatched: number;
  durationMs: number;
  aiProfile?: string;
}

export interface CareerSearchRequest {
  websiteUrl: string;
  targetRole: string;
  location: string;
  keywords: string[];
  minimumMatch: number;
  maxResults: number;
  cvId?: number;
  language: 'ja' | 'en' | string;
  aiProfile: AiProfile;

  // Advanced Filters
  employmentType?: string;
  newGraduateOnly?: boolean;
  japaneseLevel?: string;
}

export interface CareerSearchResponse {
  runId: string;
  status: 'running' | 'completed' | 'failed' | 'blocked';
  steps: CareerAgentStep[];
  results: CareerJobResult[];
  metrics: CareerAgentMetrics;
  blockedReason?: string;
  error?: string;
  isDemo?: boolean;
}
