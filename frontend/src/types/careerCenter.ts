/** Career Center V1 types — aligned with Spring Boot controllers / handoff. */

export type CareerLanguage = 'en' | 'ja' | 'si' | 'bn' | 'ne' | 'my' | string;

export interface CandidateProfile {
  id?: number;
  fullName?: string;
  nameJa?: string;
  furigana?: string;
  dateOfBirth?: string | null;
  nationality?: string;
  addressText?: string;
  email?: string;
  phone?: string;
  photoObjectKey?: string;
  education?: Array<Record<string, unknown>>;
  career?: Array<Record<string, unknown>>;
  skills?: string[];
  languages?: string[];
  selfPr?: string;
  careerGoals?: string;
  motivation?: string;
  preferences?: Record<string, unknown>;
  completenessScore?: number;
  confirmedFields?: string[];
  missingFields?: string[];
  updatedAt?: string;
}

export interface CandidateProfileRequest extends Omit<CandidateProfile, 'id' | 'completenessScore' | 'missingFields' | 'updatedAt' | 'photoObjectKey'> {
  allowOverwriteConfirmed?: boolean;
}

export interface CvTemplateSummary {
  code: string;
  displayName: string;
  locale: string;
}

export interface CvTemplateSchema {
  code: string;
  fields: string[];
}

export interface CvDraft {
  id: string;
  templateCode: string;
  versionLabel?: string;
  payload?: Record<string, unknown>;
  primary?: boolean;
  status?: string;
  updatedAt?: string;
  suggestions?: CvSuggestion[];
}

export interface CvSuggestion {
  suggestionId?: string;
  id?: string;
  fieldKey: string;
  originalText?: string;
  proposedText?: string;
  reason?: string;
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | string;
}

export interface CvExportMeta {
  documentId: string;
  format: string;
  filename: string;
  contentType?: string;
  sizeBytes?: number;
  sha256?: string;
  downloadPath: string;
  fidelityNote?: string;
}

export interface CompanyAnalysisSource {
  url?: string;
  sourceUrl?: string;
  title?: string;
  excerpt?: string;
}

export interface CompanyAnalysisSuggestion {
  id: string;
  fieldKey?: string;
  proposedText?: string;
  reason?: string;
  status?: string;
}

export interface CompanyAnalysis {
  id: string;
  companyName?: string;
  websiteUrl?: string;
  recruitmentUrl?: string;
  cvDraftId?: string | null;
  cvDocumentId?: number | null;
  language?: string;
  status?: string;
  overview?: Record<string, unknown>;
  requirements?: Record<string, unknown>;
  comparison?: Record<string, unknown>;
  preparation?: Record<string, unknown>;
  sources?: CompanyAnalysisSource[];
  suggestions?: CompanyAnalysisSuggestion[];
  completedAt?: string;
}

export interface JobSearchRequest {
  query?: string;
  location?: string;
  keywords?: string[];
  employmentType?: string;
  newGraduateOnly?: boolean;
  maxResults?: number;
  language?: string;
}

export interface OpsProviderStatus {
  id?: string;
  name?: string;
  status?: string;
  detail?: string;
  message?: string;
}
