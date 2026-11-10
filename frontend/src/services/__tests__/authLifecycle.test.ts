/**
 * Auth lifecycle regression tests:
 * - Access-token expiry triggers single-flight refresh
 * - Failed refresh clears in-memory token and notifies session-invalid handler
 * - Proactive expiry scheduling uses expiresIn
 */
import {
  setAccessToken,
  getAccessToken,
  getAccessTokenExpiresAtMs,
  setAuthSessionInvalidHandler,
  refreshSessionSingleFlight,
  apiFetch,
  ensureFreshAccessToken,
} from '../httpClient.js';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runTests() {
  const originalFetch = globalThis.fetch;
  let invalidReasons: string[] = [];

  console.log('=== AUTH LIFECYCLE TEST 1: expiresIn stored on setAccessToken ===');
  setAccessToken('tok-a', 900);
  assert(getAccessToken() === 'tok-a', 'token stored');
  const exp = getAccessTokenExpiresAtMs();
  assert(exp != null && exp > Date.now() + 800_000, 'expiry ~15m in future');
  console.log('PASS: TEST 1');

  console.log('\n=== AUTH LIFECYCLE TEST 2: failed refresh notifies session invalid handler ===');
  invalidReasons = [];
  setAuthSessionInvalidHandler((reason) => {
    invalidReasons.push(reason);
  });
  setAccessToken('stale', 1);
  globalThis.fetch = async (url: RequestInfo | URL) => {
    if (url.toString().includes('/api/v1/auth/refresh')) {
      return new Response(JSON.stringify({ detail: 'Refresh token expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('{}', { status: 500 });
  };
  let threw = false;
  try {
    await refreshSessionSingleFlight();
  } catch {
    threw = true;
  }
  assert(threw, 'refresh must throw on 401');
  assert(getAccessToken() === null, 'in-memory token cleared');
  assert(invalidReasons.length === 1, 'session invalid handler called once');
  assert(invalidReasons[0].includes('expired') || invalidReasons[0].includes('Refresh'), 'useful reason');
  console.log('PASS: TEST 2');

  console.log('\n=== AUTH LIFECYCLE TEST 3: 401 on protected call + failed refresh returns 401 ===');
  setAuthSessionInvalidHandler((reason) => {
    invalidReasons.push(reason);
  });
  invalidReasons = [];
  setAccessToken('expired-access', 1);
  globalThis.fetch = async (url: RequestInfo | URL) => {
    const u = url.toString();
    if (u.includes('/api/v1/auth/refresh')) {
      return new Response(JSON.stringify({ detail: 'Session expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ detail: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const res = await apiFetch('/api/v1/chat/sessions');
  assert(res.status === 401, 'original 401 returned after failed refresh');
  assert(getAccessToken() === null, 'token cleared after failed refresh');
  assert(invalidReasons.length >= 1, 'handler notified');
  console.log('PASS: TEST 3');

  console.log('\n=== AUTH LIFECYCLE TEST 4: ensureFreshAccessToken refreshes near expiry ===');
  setAuthSessionInvalidHandler(null);
  setAccessToken('almost-expired', 30); // within 60s skew
  let refreshCount = 0;
  globalThis.fetch = async (url: RequestInfo | URL) => {
    if (url.toString().includes('/api/v1/auth/refresh')) {
      refreshCount++;
      return new Response(
        JSON.stringify({
          accessToken: 'renewed-token',
          tokenType: 'Bearer',
          expiresIn: 900,
          user: { id: 1, email: 'a@b.com' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('{}', { status: 200 });
  };
  const fresh = await ensureFreshAccessToken();
  assert(fresh === 'renewed-token', 'proactive refresh returns new token');
  assert(refreshCount === 1, 'exactly one refresh');
  assert(getAccessToken() === 'renewed-token', 'memory updated');
  console.log('PASS: TEST 4');

  console.log('\n=== AUTH LIFECYCLE TEST 5: ensureFreshAccessToken skips refresh when far from expiry ===');
  setAccessToken('still-fresh', 900);
  refreshCount = 0;
  globalThis.fetch = async () => {
    refreshCount++;
    return new Response('{}', { status: 200 });
  };
  const kept = await ensureFreshAccessToken();
  assert(kept === 'still-fresh', 'keeps current token');
  assert(refreshCount === 0, 'no network refresh when far from expiry');
  console.log('PASS: TEST 5');

  setAuthSessionInvalidHandler(null);
  setAccessToken(null);
  globalThis.fetch = originalFetch;
  console.log('\nALL AUTH LIFECYCLE TESTS PASSED');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  (globalThis as any).process?.exit?.(1);
});
