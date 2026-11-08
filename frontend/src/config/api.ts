/**
 * TRON AI - API Configuration
 *
 * MEGA MISSION 1 — COMPLETE FASTAPI RUNTIME EXIT:
 * All routes (Chat, CV, Interview, Voice, TTS, Audio) route through Spring Boot (:8080).
 * FastAPI (:8000) is completely exited from the active runtime path.
 *
 * Environment variables (Vite, public — no secrets):
 * - VITE_CORE_API_URL   Primary Spring API base URL
 * - VITE_LEGACY_API_URL Compatibility alias (defaults to CORE)
 *
 * Modes:
 * - Explicit empty string → same-origin (Vite proxy / nginx reverse-proxy)
 * - Unset in production build → https://api.tronai.tech (Vercel SPA → API host)
 * - Unset in local Vite dev → http://localhost:8080
 *
 * Production site: https://tronai.tech
 * Production API:  https://api.tronai.tech
 */

const PRODUCTION_API_URL = 'https://api.tronai.tech';
const LOCAL_DEV_API_URL = 'http://localhost:8080';

function readViteEnv(key: 'VITE_CORE_API_URL' | 'VITE_LEGACY_API_URL'): string | undefined {
  const env = typeof import.meta !== 'undefined' ? (import.meta as ImportMeta).env : undefined;
  if (!env || !Object.prototype.hasOwnProperty.call(env, key)) {
    return undefined;
  }
  return String(env[key] ?? '');
}

function resolveCoreApiUrl(): string {
  const configured = readViteEnv('VITE_CORE_API_URL');
  if (configured !== undefined) {
    // Empty string is intentional same-origin mode.
    return configured;
  }
  if (import.meta.env.PROD) {
    return PRODUCTION_API_URL;
  }
  return LOCAL_DEV_API_URL;
}

export const CORE_API_URL: string = resolveCoreApiUrl();

// Default LEGACY_API_URL alias points directly to CORE_API_URL for full cutover compatibility
export const LEGACY_API_URL: string = (() => {
  const configured = readViteEnv('VITE_LEGACY_API_URL');
  if (configured !== undefined) {
    return configured;
  }
  return CORE_API_URL;
})();
