/**
 * Sanitize post-login return destinations.
 * Rejects open redirects, protocol-relative URLs, and external domains.
 */

const DEFAULT_RETURN_TO = '/chat';

const BLOCKED_PREFIXES = [
  '/workspace',
  '/career/jobs',
  '/career/company-analysis',
  '/career/interview-agent',
  '/mentor',
  '/agent',
  '/dashboard',
];

/**
 * Returns a safe internal path+search string, or the default core destination.
 */
export function sanitizeReturnTo(
  raw: string | null | undefined,
  fallback: string = DEFAULT_RETURN_TO,
): string {
  if (!raw || typeof raw !== 'string') return fallback;

  let decoded = raw.trim();
  try {
    // Decode once; reject if still encoded with dangerous schemes after decode.
    decoded = decodeURIComponent(decoded);
  } catch {
    return fallback;
  }

  decoded = decoded.trim();
  if (!decoded) return fallback;

  const lower = decoded.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('http:') ||
    lower.startsWith('https:') ||
    lower.startsWith('//') ||
    lower.includes('://')
  ) {
    return fallback;
  }

  // Must be a root-relative path
  if (!decoded.startsWith('/')) return fallback;

  // Disallow path traversal / backslash tricks
  if (decoded.includes('\\') || decoded.includes('..')) return fallback;

  // Strip hash fragments for navigation safety
  const withoutHash = decoded.split('#')[0] || fallback;
  const pathOnly = withoutHash.split('?')[0] || '/';

  // Known unfinished/hidden product areas → safe core default
  if (BLOCKED_PREFIXES.some((p) => pathOnly === p || pathOnly.startsWith(`${p}/`))) {
    return fallback;
  }

  return withoutHash || fallback;
}

export function storeAuthReturnTo(raw: string | null | undefined): string {
  const safe = sanitizeReturnTo(raw);
  try {
    sessionStorage.setItem('tron_auth_return_url', safe);
  } catch {
    // ignore storage failures (private mode)
  }
  return safe;
}

export function consumeAuthReturnTo(fallback: string = DEFAULT_RETURN_TO): string {
  try {
    const stored = sessionStorage.getItem('tron_auth_return_url');
    sessionStorage.removeItem('tron_auth_return_url');
    return sanitizeReturnTo(stored, fallback);
  } catch {
    return fallback;
  }
}
