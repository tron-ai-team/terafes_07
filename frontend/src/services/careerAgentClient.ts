import { apiFetch, ApiError, parseErrorDetail } from './httpClient';
import {
  CareerSearchRequest,
  CareerSearchResponse,
  CareerJobResult,
} from '../types/careerAgent';

/**
 * TRON AI — Career Search Agent Service Client
 *
 * Communicates with the future Playwright/Browser Automation Agent backend
 * while preserving clean, authenticated Spring Boot API contracts.
 */
export const careerAgentClient = {
  /**
   * Run autonomous career search agent on the specified job website
   * POST /api/v1/agents/career-search/run
   */
  async runCareerSearch(request: CareerSearchRequest): Promise<CareerSearchResponse> {
    const res = await apiFetch('/api/v1/agents/career-search/run', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }

    return await res.json();
  },

  /**
   * Retrieve a previous career search run by ID
   * GET /api/v1/agents/career-search/runs/:runId
   */
  async getCareerSearchRun(runId: string): Promise<CareerSearchResponse> {
    const res = await apiFetch(`/api/v1/agents/career-search/runs/${encodeURIComponent(runId)}`, {
      method: 'GET',
    });

    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }

    return await res.json();
  },

  /**
   * Bookmark or save a shortlisted job result
   * POST /api/v1/agents/career-search/jobs/:jobId/save
   */
  async toggleSaveJob(jobId: string, saved: boolean): Promise<{ success: boolean; saved: boolean }> {
    const res = await apiFetch(`/api/v1/agents/career-search/jobs/${encodeURIComponent(jobId)}/save`, {
      method: 'POST',
      body: JSON.stringify({ saved }),
    });

    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      throw new ApiError(res.status, detail);
    }

    return await res.json();
  },
};
