import { apiFetch, ApiError, parseErrorDetail } from './httpClient';
import type {
  CandidateProfile,
  CandidateProfileRequest,
  CompanyAnalysis,
  CvDraft,
  CvExportMeta,
  CvSuggestion,
  CvTemplateSchema,
  CvTemplateSummary,
  JobSearchRequest,
  OpsProviderStatus,
  ProfileAiSuggestRequest,
  ProfileAiSuggestResponse,
} from '../types/careerCenter';
import type { CareerJobResult } from '../types/careerAgent';

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await parseErrorDetail(res);
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

function suggestionId(s: CvSuggestion): string {
  return String(s.suggestionId || s.id || '');
}

/**
 * Career Center V1 — Spring Boot API client
 * Base paths: /api/v1/career/*
 */
export interface UserMeWithCandidate {
  id?: number;
  email?: string;
  displayName?: string;
  role?: string;
  createdAt?: string;
  candidateProfile?: {
    profileExists?: boolean;
    fullName?: string | null;
    nameJa?: string | null;
    furigana?: string | null;
    photoUrl?: string | null;
    hasPhoto?: boolean;
    education?: string[];
    expectedGraduationYear?: string | null;
    targetJobs?: string[];
    preferredLocations?: string[];
    skills?: string[];
    certifications?: string[];
    jlptLevel?: string | null;
    projects?: string[];
    completenessScore?: number;
    missingFields?: string[];
    contactEmail?: string | null;
  };
}

export const careerCenterClient = {
  // ── User Profile (auth + live Candidate Profile summary) ───────────
  async getUserMe(): Promise<UserMeWithCandidate> {
    const res = await apiFetch('/api/v1/users/me');
    return jsonOrThrow(res);
  },

  /** Fetch authorized profile photo as an object URL (caller must revoke). */
  async getProfilePhotoObjectUrl(): Promise<string | null> {
    const res = await apiFetch('/api/v1/career/profile/photo', { method: 'GET' });
    if (res.status === 404) return null;
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }
    const blob = await res.blob();
    if (!blob || blob.size === 0) return null;
    return URL.createObjectURL(blob);
  },

  // ── Candidate Profile ──────────────────────────────────────────────
  async getProfile(): Promise<CandidateProfile> {
    const res = await apiFetch('/api/v1/career/profile');
    return jsonOrThrow(res);
  },

  async getProfileCompleteness(): Promise<CandidateProfile> {
    const res = await apiFetch('/api/v1/career/profile/completeness');
    return jsonOrThrow(res);
  },

  async upsertProfile(body: CandidateProfileRequest): Promise<CandidateProfile> {
    const res = await apiFetch('/api/v1/career/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return jsonOrThrow(res);
  },

  async uploadProfilePhoto(file: File): Promise<CandidateProfile> {
    const form = new FormData();
    form.append('file', file);
    const res = await apiFetch('/api/v1/career/profile/photo', {
      method: 'POST',
      body: form,
    });
    return jsonOrThrow(res);
  },

  async suggestProfileText(body: ProfileAiSuggestRequest): Promise<ProfileAiSuggestResponse> {
    const res = await apiFetch('/api/v1/career/profile/ai-suggest', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return jsonOrThrow(res);
  },

  // ── CV Builder ─────────────────────────────────────────────────────
  async listTemplates(): Promise<CvTemplateSummary[]> {
    const res = await apiFetch('/api/v1/career/cv-builder/templates');
    return jsonOrThrow(res);
  },

  async getTemplateSchema(code: string): Promise<CvTemplateSchema> {
    const res = await apiFetch(`/api/v1/career/cv-builder/templates/${encodeURIComponent(code)}/schema`);
    const data = await jsonOrThrow<{ code: string; fields?: string[]; schema?: unknown }>(res);
    const fields = Array.isArray(data.fields)
      ? data.fields
      : Array.isArray((data as any).schema)
        ? ((data as any).schema as string[])
        : [];
    return { code: data.code || code, fields };
  },

  async listDrafts(): Promise<CvDraft[]> {
    const res = await apiFetch('/api/v1/career/cv-builder/drafts');
    return jsonOrThrow(res);
  },

  async createDraft(body: {
    templateCode: string;
    payload?: Record<string, unknown>;
    versionLabel?: string;
  }): Promise<CvDraft> {
    const res = await apiFetch('/api/v1/career/cv-builder/drafts', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return jsonOrThrow(res);
  },

  async getDraft(id: string): Promise<CvDraft> {
    const res = await apiFetch(`/api/v1/career/cv-builder/drafts/${encodeURIComponent(id)}`);
    return jsonOrThrow(res);
  },

  async updateDraft(
    id: string,
    body: { payload?: Record<string, unknown>; versionLabel?: string; templateCode?: string }
  ): Promise<CvDraft> {
    const res = await apiFetch(`/api/v1/career/cv-builder/drafts/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return jsonOrThrow(res);
  },

  async deleteDraft(draftId: string): Promise<{ id: string; deleted: boolean; status?: string; message?: string }> {
    const res = await apiFetch(`/api/v1/career/cv-builder/drafts/${encodeURIComponent(draftId)}`, {
      method: 'DELETE',
    });
    return jsonOrThrow(res);
  },

  async uploadDraftPhoto(draftId: string, file: File, alsoUpdateProfile = false): Promise<CvDraft> {
    const form = new FormData();
    form.append('file', file);
    const q = alsoUpdateProfile ? '?alsoUpdateProfile=true' : '';
    const res = await apiFetch(
      `/api/v1/career/cv-builder/drafts/${encodeURIComponent(draftId)}/photo${q}`,
      { method: 'POST', body: form }
    );
    return jsonOrThrow(res);
  },

  async useProfilePhotoForDraft(draftId: string): Promise<CvDraft> {
    const res = await apiFetch(
      `/api/v1/career/cv-builder/drafts/${encodeURIComponent(draftId)}/photo/from-profile`,
      { method: 'POST', body: '{}' }
    );
    return jsonOrThrow(res);
  },

  async removeDraftPhoto(draftId: string): Promise<CvDraft> {
    const res = await apiFetch(
      `/api/v1/career/cv-builder/drafts/${encodeURIComponent(draftId)}/photo`,
      { method: 'DELETE' }
    );
    return jsonOrThrow(res);
  },

  async getDraftPhotoObjectUrl(draftId: string): Promise<string | null> {
    const res = await apiFetch(
      `/api/v1/career/cv-builder/drafts/${encodeURIComponent(draftId)}/photo`,
      { method: 'GET' }
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }
    const blob = await res.blob();
    if (!blob || blob.size === 0) return null;
    return URL.createObjectURL(blob);
  },

  async magicFill(
    draftId: string,
    body?: {
      payload?: Record<string, unknown>;
      language?: string;
      companyContext?: string;
      allowCloud?: boolean;
    }
  ): Promise<{
    draftId: string;
    suggestions: CvSuggestion[];
    missingRequired?: string[];
    warnings?: string[];
    engine?: string;
    ollamaUsed?: boolean;
    cloudUsed?: boolean;
    applied?: boolean;
    message?: string;
  }> {
    const res = await apiFetch(
      `/api/v1/career/cv-builder/drafts/${encodeURIComponent(draftId)}/magic-fill`,
      { method: 'POST', body: JSON.stringify(body || {}) }
    );
    return jsonOrThrow(res);
  },

  async decideMagicFill(
    draftId: string,
    body: { acceptIds?: string[]; rejectIds?: string[]; acceptAll?: boolean; rejectAll?: boolean }
  ): Promise<{ draftId: string; accepted: number; rejected: number; draft?: CvDraft }> {
    const res = await apiFetch(
      `/api/v1/career/cv-builder/drafts/${encodeURIComponent(draftId)}/magic-fill/decide`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    return jsonOrThrow(res);
  },

  async previewDraft(draftId: string, format: 'pdf' | 'xlsx' = 'pdf'): Promise<CvExportMeta> {
    const res = await apiFetch(
      `/api/v1/career/cv-builder/drafts/${encodeURIComponent(draftId)}/preview?format=${encodeURIComponent(format)}`,
      { method: 'POST', body: '{}' }
    );
    return jsonOrThrow(res);
  },

  async refreshFromProfile(draftId: string, replaceAll = false): Promise<CvDraft> {
    const res = await apiFetch(
      `/api/v1/career/cv-builder/drafts/${encodeURIComponent(draftId)}/refresh-from-profile`,
      { method: 'POST', body: JSON.stringify({ replaceAll }) }
    );
    return jsonOrThrow(res);
  },

  async educationPreview(draftId: string): Promise<import('../types/careerCenter').CvEducationPreview> {
    const res = await apiFetch(
      `/api/v1/career/cv-builder/drafts/${encodeURIComponent(draftId)}/education-preview`
    );
    return jsonOrThrow(res);
  },

  async sanitizeEducation(draftId: string): Promise<CvDraft> {
    const res = await apiFetch(
      `/api/v1/career/cv-builder/drafts/${encodeURIComponent(draftId)}/sanitize-education`,
      { method: 'POST', body: '{}' }
    );
    return jsonOrThrow(res);
  },

  async listVersions(draftId: string): Promise<import('../types/careerCenter').CvVersionSummary[]> {
    const res = await apiFetch(
      `/api/v1/career/cv-builder/drafts/${encodeURIComponent(draftId)}/versions`
    );
    return jsonOrThrow(res);
  },

  async restoreVersion(draftId: string, versionId: string): Promise<CvDraft> {
    const res = await apiFetch(
      `/api/v1/career/cv-builder/drafts/${encodeURIComponent(draftId)}/versions/${encodeURIComponent(versionId)}/restore`,
      { method: 'POST', body: '{}' }
    );
    return jsonOrThrow(res);
  },

  async aiAssist(
    draftId: string,
    body: { fieldKey: string; instruction?: string; language?: string }
  ): Promise<CvSuggestion> {
    const res = await apiFetch(
      `/api/v1/career/cv-builder/drafts/${encodeURIComponent(draftId)}/ai-assist`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    const data = await jsonOrThrow<CvSuggestion>(res);
    if (!data.suggestionId && data.id) data.suggestionId = data.id;
    return data;
  },

  async acceptSuggestion(draftId: string, suggestionIdValue: string): Promise<CvDraft | CvSuggestion> {
    const res = await apiFetch(
      `/api/v1/career/cv-builder/drafts/${encodeURIComponent(draftId)}/suggestions/${encodeURIComponent(suggestionIdValue)}/accept`,
      { method: 'POST', body: '{}' }
    );
    return jsonOrThrow(res);
  },

  async rejectSuggestion(draftId: string, suggestionIdValue: string): Promise<CvDraft | CvSuggestion> {
    const res = await apiFetch(
      `/api/v1/career/cv-builder/drafts/${encodeURIComponent(draftId)}/suggestions/${encodeURIComponent(suggestionIdValue)}/reject`,
      { method: 'POST', body: '{}' }
    );
    return jsonOrThrow(res);
  },

  async saveVersion(draftId: string): Promise<Record<string, unknown>> {
    const res = await apiFetch(
      `/api/v1/career/cv-builder/drafts/${encodeURIComponent(draftId)}/versions`,
      { method: 'POST', body: '{}' }
    );
    return jsonOrThrow(res);
  },

  async exportDraft(draftId: string, format: 'xlsx' | 'pdf'): Promise<CvExportMeta> {
    const res = await apiFetch(
      `/api/v1/career/cv-builder/drafts/${encodeURIComponent(draftId)}/export?format=${encodeURIComponent(format)}`,
      { method: 'POST', body: '{}' }
    );
    return jsonOrThrow(res);
  },

  /**
   * Download generated CV binary with Bearer auth and trigger browser save.
   * Returns byte length so callers can verify a non-empty file.
   */
  async downloadDocument(documentId: string, filenameHint?: string): Promise<{ bytes: number; filename: string }> {
    const path = `/api/v1/career/cv-builder/documents/${encodeURIComponent(documentId)}/download`;
    const res = await apiFetch(path, { method: 'GET' });
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }
    const blob = await res.blob();
    if (!blob || blob.size === 0) {
      throw new ApiError(500, 'Downloaded document is empty');
    }
    let filename = filenameHint || `cv-${documentId}`;
    const cd = res.headers.get('Content-Disposition') || '';
    const m = /filename="?([^";]+)"?/i.exec(cd);
    if (m?.[1]) filename = m[1];
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { bytes: blob.size, filename };
  },

  suggestionId,

  // ── Jobs (Mynavi + CareerMap product providers) ────────────────────
  async searchJobs(request: JobSearchRequest): Promise<CareerJobResult[]> {
    const res = await apiFetch('/api/v1/career/jobs/search', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return jsonOrThrow(res);
  },

  async getJobSources(request: JobSearchRequest = {}): Promise<{
    providers?: OpsProviderStatus[];
    externalSearchUrls?: string[];
    emptyStateMessage?: string;
  }> {
    const res = await apiFetch('/api/v1/career/jobs/sources', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return jsonOrThrow(res);
  },

  async refreshJobs(request: JobSearchRequest): Promise<{
    success?: boolean;
    count?: number;
    results?: CareerJobResult[];
    mynaviStatus?: string;
    careermapStatus?: string;
  }> {
    const res = await apiFetch('/api/v1/career/jobs/refresh', {
      method: 'POST',
      body: JSON.stringify({ ...request, forceRefresh: true }),
    });
    return jsonOrThrow(res);
  },

  async listSavedJobs(): Promise<CareerJobResult[]> {
    const res = await apiFetch('/api/v1/career/jobs/saved');
    return jsonOrThrow(res);
  },

  async importJob(sourceUrl: string, language = 'ja'): Promise<CareerJobResult> {
    const res = await apiFetch('/api/v1/career/jobs/import', {
      method: 'POST',
      body: JSON.stringify({ sourceUrl, language }),
    });
    return jsonOrThrow(res);
  },

  async toggleSaveJob(jobId: string, saved: boolean): Promise<{ success: boolean; saved: boolean }> {
    const res = await apiFetch(`/api/v1/career/jobs/${encodeURIComponent(jobId)}/save`, {
      method: 'POST',
      body: JSON.stringify({ saved }),
    });
    return jsonOrThrow(res);
  },

  async getOpsStatus(): Promise<{ providers?: OpsProviderStatus[]; [k: string]: unknown }> {
    const res = await apiFetch('/api/v1/career/ops/status');
    return jsonOrThrow(res);
  },

  // ── Company analyses (Interview Agent) ─────────────────────────────
  async listCompanyAnalyses(): Promise<CompanyAnalysis[]> {
    const res = await apiFetch('/api/v1/career/company-analyses');
    return jsonOrThrow(res);
  },

  async analyzeCompany(body: {
    companyName: string;
    websiteUrl?: string;
    recruitmentUrl?: string;
    cvDraftId?: string;
    cvDocumentId?: number | null;
    language?: string;
  }): Promise<CompanyAnalysis> {
    const res = await apiFetch('/api/v1/career/company-analyses', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return jsonOrThrow(res);
  },

  async getCompanyAnalysis(id: string): Promise<CompanyAnalysis> {
    const res = await apiFetch(`/api/v1/career/company-analyses/${encodeURIComponent(id)}`);
    return jsonOrThrow(res);
  },

  async requestCompanySuggestions(
    id: string,
    body: { fieldKey?: string; instruction?: string; language?: string } = {}
  ): Promise<CompanyAnalysis> {
    const res = await apiFetch(
      `/api/v1/career/company-analyses/${encodeURIComponent(id)}/suggestions`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    return jsonOrThrow(res);
  },

  async transferSuggestionsToCv(
    analysisId: string,
    body: { draftId: string; suggestionIds?: string[] }
  ): Promise<{ draftUnchanged?: boolean; transferred?: Array<{ cvSuggestionId: string; status: string }> }> {
    const res = await apiFetch(
      `/api/v1/career/company-analyses/${encodeURIComponent(analysisId)}/transfer-to-cv`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    return jsonOrThrow(res);
  },
};
