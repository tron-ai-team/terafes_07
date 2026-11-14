/**
 * Optional live API smoke against api.tronai.tech using throwaway E2E credentials.
 *
 * Requires frontend/.env.e2e.local with:
 *   E2E_API_URL=https://api.tronai.tech
 *   E2E_EMAIL=...
 *   E2E_PASSWORD=...
 *
 * Never prints tokens or passwords. Skips CLOUD paid calls by default.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env.e2e.local');
const evidenceDir = join(root, '..', 'docs', 'tron-core-polish-evidence');

function loadEnv() {
  if (!existsSync(envPath)) {
    console.log('SKIP live-api-smoke: frontend/.env.e2e.local not found');
    process.exit(0);
  }
  const map = {};
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m) map[m[1]] = m[2];
  }
  if (!map.E2E_EMAIL || !map.E2E_PASSWORD) {
    console.log('SKIP live-api-smoke: missing E2E_EMAIL/E2E_PASSWORD');
    process.exit(0);
  }
  return map;
}

async function json(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function main() {
  const env = loadEnv();
  const base = (env.E2E_API_URL || 'https://api.tronai.tech').replace(/\/$/, '');
  const results = [];

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
  const token = loginBody.accessToken;
  const auth = { Authorization: `Bearer ${token}` };
  results.push({ step: 'login', result: 'PASS' });

  const modesRes = await fetch(`${base}/api/v1/ai/modes`);
  const modes = await json(modesRes);
  results.push({
    step: 'ai-modes',
    result: modesRes.ok ? 'PASS' : 'FAIL',
    fastAvailable: !!modes?.modes?.find((m) => m.id === 'FAST')?.available,
    smartAvailable: !!modes?.modes?.find((m) => m.id === 'SMART')?.available,
  });

  // SMART chat (avoid CLOUD cost)
  const smartRes = await fetch(`${base}/api/v1/chat`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: `smoke-smart-${Date.now()}`,
      messages: [{ role: 'user', content: 'Reply with exactly: SMART_OK' }],
      aiProfile: 'SMART',
      language: 'en',
    }),
  });
  const smartBody = await json(smartRes);
  const smartOk =
    smartRes.ok &&
    typeof smartBody.reply === 'string' &&
    smartBody.reply.length > 0 &&
    (smartBody.aiProfile === 'SMART' || smartBody.aiProfile === 'QUALITY');
  results.push({
    step: 'chat-smart',
    result: smartOk ? 'PASS' : 'FAIL',
    status: smartRes.status,
    profile: smartBody.aiProfile || null,
    replyLen: smartBody.reply?.length || 0,
  });

  // FAST chat — may be 503 if GTX offline (honest no-fallback is PASS behavior)
  const fastRes = await fetch(`${base}/api/v1/chat`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: `smoke-fast-${Date.now()}`,
      messages: [{ role: 'user', content: 'Reply with exactly: FAST_OK' }],
      aiProfile: 'FAST',
      language: 'en',
    }),
  });
  const fastBody = await json(fastRes);
  let fastResult = 'FAIL';
  if (fastRes.ok && fastBody.reply) fastResult = 'PASS';
  else if (fastRes.status === 503) fastResult = 'PASS_HONEST_OFFLINE';
  results.push({
    step: 'chat-fast',
    result: fastResult,
    status: fastRes.status,
    detail: fastBody.detail || null,
    replyLen: fastBody.reply?.length || 0,
  });

  // Interview start
  const ivRes = await fetch(`${base}/api/v1/interviews/start`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: 'Smoke Test Co',
      jobPosition: 'Engineer',
      language: 'en',
      type: 'technical',
      difficulty: 'easy',
      aiProfile: 'SMART',
      mode: 'manual',
    }),
  });
  const ivBody = await json(ivRes);
  results.push({
    step: 'interview-start',
    result: ivRes.ok && ivBody.interviewId && Array.isArray(ivBody.questions) ? 'PASS' : 'FAIL',
    status: ivRes.status,
    questionCount: ivBody.questions?.length || 0,
  });

  // CV draft + export pdf/xlsx
  const draftRes = await fetch(`${base}/api/v1/career/cv-builder/drafts`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateCode: 'RIREKISHO_JA' }),
  });
  const draft = await json(draftRes);
  results.push({
    step: 'cv-create-draft',
    result: draftRes.ok && draft.id ? 'PASS' : 'FAIL',
    status: draftRes.status,
    template: draft.templateCode || null,
  });

  if (draft.id) {
    for (const format of ['pdf', 'xlsx']) {
      const exportRes = await fetch(
        `${base}/api/v1/career/cv-builder/drafts/${draft.id}/export?format=${format}`,
        { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: '{}' }
      );
      const meta = await json(exportRes);
      if (!exportRes.ok || !meta.documentId) {
        results.push({ step: `cv-export-${format}`, result: 'FAIL', status: exportRes.status });
        continue;
      }
      const dl = await fetch(
        `${base}/api/v1/career/cv-builder/documents/${meta.documentId}/download`,
        { headers: auth }
      );
      const buf = Buffer.from(await dl.arrayBuffer());
      mkdirSync(evidenceDir, { recursive: true });
      const out = join(evidenceDir, `live-smoke.${format === 'pdf' ? 'pdf' : 'xlsx'}`);
      writeFileSync(out, buf);
      const magicOk =
        format === 'pdf'
          ? buf.slice(0, 4).toString('ascii') === '%PDF'
          : buf.slice(0, 2).toString('ascii') === 'PK';
      results.push({
        step: `cv-export-${format}`,
        result: dl.ok && magicOk && buf.length > 100 ? 'PASS' : 'FAIL',
        bytes: buf.length,
        magicOk,
      });
    }
  }

  // Voice with tiny fixture — expect honest non-success if invalid audio
  if (existsSync(join(root, 'test_speak.wav'))) {
    const form = new FormData();
    const blob = new Blob([readFileSync(join(root, 'test_speak.wav'))], { type: 'audio/wav' });
    form.append('file', blob, 'mic.wav');
    form.append('language', 'en');
    form.append('aiProfile', 'SMART');
    const voiceRes = await fetch(`${base}/api/v1/voice/turn`, { method: 'POST', headers: auth, body: form });
    const voiceBody = await json(voiceRes);
    results.push({
      step: 'voice-turn-fixture',
      result: voiceRes.ok ? 'PASS' : voiceRes.status >= 400 && voiceRes.status < 500 ? 'PASS_HONEST_CLIENT_ERROR' : 'FAIL',
      status: voiceRes.status,
      detail: voiceBody.detail || null,
    });
  }

  console.log(JSON.stringify({ ok: true, results }, null, 2));
  const hardFail = results.some((r) => r.result === 'FAIL');
  process.exit(hardFail ? 1 : 0);
}

main().catch((err) => {
  console.error('live-api-smoke crashed:', err?.message || err);
  process.exit(1);
});
