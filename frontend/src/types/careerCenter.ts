/** Career Center V1 types — aligned with Spring Boot controllers / handoff. */

export type CareerLanguage = 'en' | 'ja' | 'si' | 'bn' | 'ne' | 'my' | string;

export type EducationStatus =
  | 'Currently studying'
  | 'Graduated'
  | 'Expected graduation'
  | 'Withdrawn'
  | 'Other'
  | string;

export type SchoolType =
  | 'Junior High School'
  | 'High School'
  | 'Vocational / Specialized School'
  | 'University'
  | 'Graduate School'
  | 'Language School'
  | 'Other'
  | string;

export interface EducationEntry {
  id?: string;
  schoolName?: string;
  schoolNameJa?: string;
  country?: string;
  schoolType?: SchoolType;
  department?: string;
  course?: string;
  startYear?: number | null;
  startMonth?: number | null;
  endYear?: number | null;
  endMonth?: number | null;
  status?: EducationStatus;
  /** Legacy compatibility */
  school?: string;
  detail?: string;
  suggested?: boolean;
  needsReview?: boolean;
}

export interface CareerEntry {
  id?: string;
  company?: string;
  organization?: string;
  jobTitle?: string;
  role?: string;
  employmentType?: string;
  startDate?: string;
  endDate?: string;
  currentlyEmployed?: boolean;
  responsibilities?: string;
  achievements?: string;
  technologies?: string[];
  period?: string;
}

export interface SkillEntry {
  id?: string;
  name: string;
  category?: string;
  proficiency?: string;
  experienceMonths?: number | null;
}

export interface LanguageEntry {
  id?: string;
  language: string;
  proficiency?: string;
  certification?: string;
  score?: string;
  dateObtained?: string;
  verified?: boolean;
}

export interface ProjectEntry {
  id?: string;
  name: string;
  description?: string;
  projectType?: string;
  role?: string;
  technologies?: string[];
  startDate?: string;
  endDate?: string;
  githubUrl?: string;
  liveDemoUrl?: string;
  keyFeatures?: string;
  technicalChallenges?: string;
  solutions?: string;
  achievements?: string;
}

export interface CertificationEntry {
  id?: string;
  name: string;
  issuingOrganization?: string;
  dateObtained?: string;
  expirationDate?: string;
  status?: 'Obtained' | 'Studying' | 'Exam scheduled' | 'Expired' | string;
  credentialUrl?: string;
}

export interface CareerStories {
  selfPr?: string;
  gakuchika?: string;
  strengths?: string;
  weaknesses?: string;
  careerGoals?: string;
  reasonForIt?: string;
  learningExperiences?: string;
  technicalAchievements?: string;
  generalMotivation?: string;
  otherAchievements?: string;
  [key: string]: unknown;
}

export interface InternationalInfo {
  currentCountry?: string;
  nationality?: string;
  residenceStatus?: string;
  residenceExpiration?: string;
  workEligibility?: string;
  japaneseProficiency?: string;
  otherLanguages?: string;
  [key: string]: unknown;
}

export interface CareerPreferences {
  desiredJobTitles?: string[];
  preferredIndustries?: string[];
  preferredPrefectures?: string[];
  preferredLocations?: string[];
  preferredEmploymentTypes?: string[];
  expectedGraduationYear?: string;
  schoolCategory?: string;
  desiredStartDate?: string;
  desiredSalary?: string;
  preferredTechnologies?: string[];
  preferredCompanyEnvironment?: string[];
  willingnessToRelocate?: boolean | string;
  workStylePreference?: string;
  jobCategory?: string;
  employmentType?: string;
  [key: string]: unknown;
}

export interface CandidateProfile {
  id?: number;
  fullName?: string;
  nameJa?: string;
  furigana?: string;
  dateOfBirth?: string | null;
  nationality?: string;
  gender?: string;
  addressText?: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  streetAddress?: string;
  building?: string;
  email?: string;
  phone?: string;
  photoObjectKey?: string;
  education?: EducationEntry[];
  educationLegacyText?: string;
  educationMigrationStatus?: string;
  educationSuggestions?: EducationEntry[];
  career?: CareerEntry[];
  noWorkExperience?: boolean;
  skills?: SkillEntry[] | string[];
  languages?: LanguageEntry[] | string[];
  projects?: ProjectEntry[];
  certifications?: CertificationEntry[];
  selfPr?: string;
  careerGoals?: string;
  /** Master-profile general motivation — not company-specific 志望動機. */
  motivation?: string;
  careerStories?: CareerStories;
  international?: InternationalInfo;
  preferences?: CareerPreferences;
  completenessScore?: number;
  confirmedFields?: string[];
  missingFields?: string[];
  completenessBreakdown?: Record<string, boolean | unknown>;
  updatedAt?: string;
}

export interface CandidateProfileRequest {
  fullName?: string;
  nameJa?: string;
  furigana?: string;
  dateOfBirth?: string | null;
  nationality?: string;
  gender?: string;
  addressText?: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  streetAddress?: string;
  building?: string;
  email?: string;
  phone?: string;
  education?: EducationEntry[];
  educationLegacyText?: string;
  confirmEducationMigration?: boolean;
  career?: CareerEntry[];
  noWorkExperience?: boolean;
  skills?: SkillEntry[] | string[];
  languages?: LanguageEntry[] | string[];
  projects?: ProjectEntry[];
  certifications?: CertificationEntry[];
  selfPr?: string;
  careerGoals?: string;
  motivation?: string;
  careerStories?: CareerStories;
  international?: InternationalInfo;
  preferences?: CareerPreferences;
  confirmedFields?: string[];
  allowOverwriteConfirmed?: boolean;
}

export interface ProfileAiSuggestRequest {
  fieldKey: string;
  currentText?: string;
  instruction?: string;
  language?: string;
  allowCloud?: boolean;
}

export interface ProfileAiSuggestResponse {
  fieldKey: string;
  originalText?: string;
  proposedText?: string;
  reason?: string;
  engine?: string;
  requiresApproval?: boolean;
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

export interface CvEducationPreview {
  inputCount?: number;
  keptCount?: number;
  rejectedCount?: number;
  duplicateCount?: number;
  templateCapacity?: number;
  exportCount?: number;
  overflow?: boolean;
  kept?: Array<Record<string, unknown>>;
  rejected?: Array<Record<string, unknown>>;
  willExport?: Array<Record<string, unknown>>;
  message?: string;
  draftId?: string;
  templateCode?: string;
}

export interface CvVersionSummary {
  versionId: string;
  versionNumber: number;
  versionLabel?: string;
  templateCode?: string;
  createdAt?: string;
}

export interface CvPhotoMeta {
  included?: boolean;
  hasDraftPhoto?: boolean;
  hasProfilePhoto?: boolean;
  source?: string;
  available?: boolean;
}

export interface CvSyncReport {
  mode: 'FILL_BLANK' | 'OVERWRITE_SCALARS' | 'REPLACE_ALL' | string;
  filled: string[];
  preserved: string[];
  conflicts: string[];
  missingInProfile: string[];
  draftOnlyPreserved: string[];
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
  educationPreview?: CvEducationPreview;
  refreshedFromProfile?: boolean;
  sanitizedEducation?: boolean;
  photo?: CvPhotoMeta;
  syncReport?: CvSyncReport;
  syncMode?: string;
  replaceAll?: boolean;
}

export interface CvSuggestion {
  suggestionId?: string;
  id?: string;
  fieldKey: string;
  originalText?: string;
  proposedText?: string;
  reason?: string;
  category?: string;
  requiresConfirmation?: boolean;
  clarificationNeeded?: boolean;
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
  useProfilePreferences?: boolean;
  forceRefresh?: boolean;
  aiExplain?: boolean;
}

export interface OpsProviderStatus {
  id?: string;
  name?: string;
  provider?: string;
  status?: string;
  detail?: string;
  message?: string;
  externalSearchUrl?: string;
  cachedFreshCount?: number;
}

export interface JobSourcesResponse {
  providers?: OpsProviderStatus[];
  externalSearchUrls?: string[];
  emptyStateMessage?: string;
}
