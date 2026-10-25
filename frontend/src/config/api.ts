/**
 * TRON AI - API Configuration
 *
 * MEGA MISSION 1 — COMPLETE FASTAPI RUNTIME EXIT:
 * All routes (Chat, CV, Interview, Voice, TTS, Audio) route through Spring Boot (:8080).
 * FastAPI (:8000) is completely exited from the active runtime path.
 */

export const CORE_API_URL: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_CORE_API_URL) || 'http://localhost:8080';

// Default LEGACY_API_URL alias points directly to CORE_API_URL (:8080) for full cutover compatibility
export const LEGACY_API_URL: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_LEGACY_API_URL) || CORE_API_URL;
