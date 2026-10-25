/**
 * Comprehensive verification of Single-Flight Refresh and 401 Interceptor
 */
import { setAccessToken, getAccessToken, refreshSessionSingleFlight, apiFetch } from '../httpClient.js';

// Simple assert helper
function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runTests() {
  console.log('=== TEST 1: Concurrency Deduplication in refreshSessionSingleFlight ===');
  let networkRefreshCount = 0;
  const originalFetch = globalThis.fetch;

  // Mock fetch
  globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = url.toString();
    if (urlStr.includes('/api/v1/auth/refresh')) {
      networkRefreshCount++;
      // Simulate 50ms network delay
      await new Promise(r => setTimeout(r, 50));
      return new Response(JSON.stringify({
        accessToken: `token-flight-${networkRefreshCount}`,
        tokenType: 'Bearer',
        expiresIn: 900,
        user: { id: 1, email: 'test@example.com' }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  // Launch 10 concurrent refresh calls
  const promises = Array.from({ length: 10 }, () => refreshSessionSingleFlight());
  const results = await Promise.all(promises);

  console.log(`Launched 10 concurrent refresh calls. Network fetch calls made: ${networkRefreshCount}`);
  assert(networkRefreshCount === 1, `Expected exactly 1 network refresh call, got ${networkRefreshCount}`);
  assert(results.every(r => r.accessToken === 'token-flight-1'), 'All callers must receive the exact same token');
  assert(getAccessToken() === 'token-flight-1', 'inMemoryAccessToken must be updated to flight-1');
  console.log('PASS: TEST 1 passed (10 callers -> exactly 1 network refresh)');

  console.log('\n=== TEST 2: 5 Concurrent Protected API Calls receiving 401 simultaneously ===');
  setAccessToken('stale-token');
  networkRefreshCount = 0;
  let protectedCallCount = 0;
  let retriedCallCount = 0;

  globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = url.toString();
    if (urlStr.includes('/api/v1/auth/refresh')) {
      networkRefreshCount++;
      await new Promise(r => setTimeout(r, 60));
      return new Response(JSON.stringify({
        accessToken: 'fresh-refreshed-token',
        tokenType: 'Bearer',
        expiresIn: 900,
        user: { id: 1, email: 'test@example.com' }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (urlStr.includes('/api/v1/chat/sessions')) {
      protectedCallCount++;
      const headers = new Headers(init?.headers);
      const auth = headers.get('Authorization');
      if (auth === 'Bearer fresh-refreshed-token') {
        retriedCallCount++;
        return new Response(JSON.stringify([{ id: 'sess-1', title: 'Session 1' }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      // Stale token returns 401
      return new Response(JSON.stringify({ detail: 'Token expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({}), { status: 200 });
  };

  // Fire 5 protected calls at the exact same moment
  const protectedCalls = Array.from({ length: 5 }, () => apiFetch('/api/v1/chat/sessions'));
  const responses = await Promise.all(protectedCalls);

  console.log(`Protected calls received. Total initial + retry attempts: ${protectedCallCount}`);
  console.log(`Network refresh count: ${networkRefreshCount}`);
  console.log(`Retried calls that succeeded with fresh token: ${retriedCallCount}`);

  assert(networkRefreshCount === 1, `Expected exactly 1 refresh call during storm, got ${networkRefreshCount}`);
  assert(retriedCallCount === 5, `Expected all 5 calls to retry and succeed, got ${retriedCallCount}`);
  assert(responses.every(r => r.status === 200), 'All 5 returned responses must be HTTP 200');
  console.log('PASS: TEST 2 passed (5 concurrent 401s -> exactly 1 refresh -> all 5 retry & succeed)');

  console.log('\n=== TEST 3: Never Refresh a Refresh (Bypass check) ===');
  networkRefreshCount = 0;
  globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = url.toString();
    if (urlStr.includes('/api/v1/auth/refresh')) {
      networkRefreshCount++;
      return new Response(JSON.stringify({ detail: 'Refresh token invalid' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  };

  try {
    await refreshSessionSingleFlight();
    assert(false, 'Should have thrown ApiError on 401 refresh');
  } catch (err: any) {
    console.log(`Caught expected refresh failure: ${err.message || err.detail}`);
  }

  assert(networkRefreshCount === 1, `Bypass check failed; refresh count was ${networkRefreshCount}`);
  console.log('PASS: TEST 3 passed (No infinite loop on refresh 401)');

  console.log('\n=== TEST 4: Bypassed auth endpoints (login, register, logout, providers) ===');
  let loginAttempts = 0;
  networkRefreshCount = 0;
  globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = url.toString();
    if (urlStr.includes('/api/v1/auth/login')) {
      loginAttempts++;
      return new Response(JSON.stringify({ detail: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    if (urlStr.includes('/api/v1/auth/refresh')) {
      networkRefreshCount++;
      return new Response(JSON.stringify({ accessToken: 'unexpected' }), { status: 200 });
    }
    return new Response(JSON.stringify({}), { status: 200 });
  };

  const loginRes = await apiFetch('/api/v1/auth/login', { method: 'POST', body: '{}' });
  assert(loginRes.status === 401, 'Login 401 should be returned directly');
  assert(loginAttempts === 1, 'Login should not be retried');
  assert(networkRefreshCount === 0, 'Login 401 must NEVER trigger refresh');
  console.log('PASS: TEST 4 passed (/auth/login 401 bypassed refresh interceptor)');

  // Restore fetch
  globalThis.fetch = originalFetch;
  console.log('\nALL CONCURRENCY AND RESILIENCE TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  (globalThis as any).process?.exit?.(1);
});
