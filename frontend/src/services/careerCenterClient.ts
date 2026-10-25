import { apiFetch, ApiError, parseErrorDetail, getAccessToken } from './httpClient';
import { CORE_API_URL } from '../config/api';
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
export const careerCenterClient = {
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
    const headers = new Headers();
    const token = getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const res = await fetch(`${CORE_API_URL}${path}`, {
      method: 'GET',
      credentials: 'include',
      headers,
    });
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
