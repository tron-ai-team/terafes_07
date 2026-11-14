/**
 * Phase 3: diagnose FAST 503 vs modes health. Never prints tokens/passwords.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env.e2e.local');
const evidenceDir = join(root, '..', 'docs', 'tron-core-polish-evidence');

function loadEnv() {
  if (!existsSync(envPath)) {
    console.log('SKIP: no .env.e2e.local');
    process.exit(0);
  }
  const map = {};
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m) map[m[1]] = m[2];
  }
  if (!map.E2E_EMAIL || !map.E2E_PASSWORD) {
    console.log('SKIP: missing credentials');
    process.exit(0);
  }
  return map;
}

async function json(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 800) };
  }
}

function modeSummary(modes, id) {
  const m = modes?.modes?.find((x) => x.id === id) || null;
  if (!m) return null;
  return {
    id: m.id,
    available: !!m.available,
    description: m.description || null,
    model: m.model || m.defaultModel || null,
  };
}

async function main() {
  const env = loadEnv();
  const base = (env.E2E_API_URL || 'https://api.tronai.tech').replace(/\/$/, '');

  const loginRes = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.E2E_EMAIL, password: env.E2E_PASSWORD }),
  });
  const loginBody = await json(loginRes);
  if (!loginRes.ok || !loginBody.accessToken) {
    console.error('FAIL login', loginRes.status);
    process.exit(1);
  }
  const auth = { Authorization: `Bearer ${loginBody.accessToken}` };

  const modesRes = await fetch(`${base}/api/v1/ai/modes`);
  const modes = await json(modesRes);

  const providersRes = await fetch(`${base}/api/v1/ai/providers`, { headers: auth });
  const providersBody = await json(providersRes);

  let providerViews = [];
  if (Array.isArray(providersBody?.providers)) {
    providerViews = providersBody.providers.map((p) => ({
      id: p.id || p.provider || p.name || null,
      status: p.status || p.health || null,
      available: p.available,
      model: p.model || p.defaultModel || null,
      detail: typeof p.detail === 'string' ? p.detail.slice(0, 200) : p.detail || null,
    }));
  } else if (providersBody && typeof providersBody === 'object') {
    providerViews = Object.keys(providersBody).slice(0, 20);
  }

  const fastRes = await fetch(`${base}/api/v1/chat`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: `p3-fast-${Date.now()}`,
      messages: [{ role: 'user', content: 'Reply with exactly: GTX_FAST_OK' }],
      aiProfile: 'FAST',
      language: 'en',
    }),
  });
  const fastBody = await json(fastRes);

  const smartRes = await fetch(`${base}/api/v1/chat`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: `p3-smart-${Date.now()}`,
      messages: [{ role: 'user', content: 'Reply with exactly: SMART_OK' }],
      aiProfile: 'SMART',
      language: 'en',
    }),
  });
  const smartBody = await json(smartRes);

  const out = {
    at: new Date().toISOString(),
    gtxFastModeEnabled: modes?.gtxFastModeEnabled ?? null,
    rtxSmartModeEnabled: modes?.rtxSmartModeEnabled ?? null,
    modesHttp: modesRes.status,
    fastMode: modeSummary(modes, 'FAST'),
    smartMode: modeSummary(modes, 'SMART'),
    providersHttp: providersRes.status,
    providers: providerViews,
    fastChat: {
      status: fastRes.status,
      detail: fastBody.detail || fastBody.message || fastBody.title || null,
      aiProfile: fastBody.aiProfile || null,
      model: fastBody.model || null,
      provider: fastBody.provider || null,
      replyLen: typeof fastBody.reply === 'string' ? fastBody.reply.length : 0,
      replyPreview:
        typeof fastBody.reply === 'string' ? fastBody.reply.slice(0, 120) : null,
      keys: Object.keys(fastBody || {}),
    },
    smartChat: {
      status: smartRes.status,
      detail: smartBody.detail || null,
      aiProfile: smartBody.aiProfile || null,
      model: smartBody.model || null,
      provider: smartBody.provider || null,
      replyLen: typeof smartBody.reply === 'string' ? smartBody.reply.length : 0,
      replyPreview:
        typeof smartBody.reply === 'string' ? smartBody.reply.slice(0, 120) : null,
    },
  };

  mkdirSync(evidenceDir, { recursive: true });
  const outPath = join(evidenceDir, 'phase3-fast-diagnose.json');
  writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  console.log('WROTE', outPath);
}

main().catch((err) => {
  console.error('FATAL', err?.message || String(err));
  process.exit(1);
});
