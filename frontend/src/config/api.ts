/**
 * TRON AI - API Configuration
 *
 * MEGA MISSION 1 — COMPLETE FASTAPI RUNTIME EXIT:
 * All routes (Chat, CV, Interview, Voice, TTS, Audio) route through Spring Boot (:8080).
 * FastAPI (:8000) is completely exited from the active runtime path.
 */

// Empty string = same-origin (production Nginx serves SPA + proxies /api).
// Unset falls back to local Spring Boot during Vite dev.
function readViteUrl(key: 'VITE_CORE_API_URL' | 'VITE_LEGACY_API_URL', fallback: string): string {
  const env = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  if (env && Object.prototype.hasOwnProperty.call(env, key)) {
    return String(env[key] ?? '');
  }
  return fallback;
}

export const CORE_API_URL: string = readViteUrl('VITE_CORE_API_URL', 'http://localhost:8080');

// Default LEGACY_API_URL alias points directly to CORE_API_URL for full cutover compatibility
export const LEGACY_API_URL: string = readViteUrl('VITE_LEGACY_API_URL', CORE_API_URL);
