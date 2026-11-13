/**
 * Contract tests for post-login returnTo sanitization.
 * Keep in sync with src/utils/safeReturnTo.ts
 */
import assert from 'node:assert/strict';

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

function sanitizeReturnTo(raw, fallback = DEFAULT_RETURN_TO) {
  if (!raw || typeof raw !== 'string') return fallback;

  let decoded = raw.trim();
  try {
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

  if (!decoded.startsWith('/')) return fallback;
  if (decoded.includes('\\') || decoded.includes('..')) return fallback;

  const withoutHash = decoded.split('#')[0] || fallback;
  const pathOnly = withoutHash.split('?')[0] || '/';

  if (BLOCKED_PREFIXES.some((p) => pathOnly === p || pathOnly.startsWith(`${p}/`))) {
    return fallback;
  }

  return withoutHash || fallback;
}

assert.equal(sanitizeReturnTo('/chat'), '/chat');
assert.equal(sanitizeReturnTo('/voice?x=1'), '/voice?x=1');
assert.equal(sanitizeReturnTo('/career/cv-builder'), '/career/cv-builder');
assert.equal(sanitizeReturnTo('https://evil.example/phish'), '/chat');
assert.equal(sanitizeReturnTo('//evil.example'), '/chat');
assert.equal(sanitizeReturnTo('javascript:alert(1)'), '/chat');
assert.equal(sanitizeReturnTo('/workspace'), '/chat');
assert.equal(sanitizeReturnTo('/workspace/agent'), '/chat');
assert.equal(sanitizeReturnTo('/career/jobs'), '/chat');
assert.equal(sanitizeReturnTo('../etc/passwd'), '/chat');
assert.equal(sanitizeReturnTo(null), '/chat');
assert.equal(sanitizeReturnTo('%2Fchat'), '/chat');
assert.equal(sanitizeReturnTo('%2F%2Fevil.com'), '/chat');

console.log('verify-safe-return-to: ok');
