/** Retry CV + voice TTS→turn after transient 502s. Never prints secrets. */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = join(root, '.env.e2e.local');
const evidenceDir = join(root, '..', 'docs', 'tron-core-polish-evidence');

function loadEnv() {
  const map = {};
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m) map[m[1]] = m[2];
  }
  return map;
}

async function json(res) {
  const text = await res.text();
  try {
    return { parsed: JSON.parse(text), raw: text.slice(0, 400) };
  } catch {
    return { parsed: null, raw: text.slice(0, 400) };
  }
}

async function main() {
  const env = loadEnv();
  const base = (env.E2E_API_URL || 'https://api.tronai.tech').replace(/\/$/, '');
  const login = await fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.E2E_EMAIL, password: env.E2E_PASSWORD }),
  });
  const lb = await json(login);
  if (!login.ok) {
    console.log(JSON.stringify({ login: 'FAIL', status: login.status, raw: lb.raw }));
    process.exit(1);
  }
  const auth = { Authorization: `Bearer ${lb.parsed.accessToken}` };
  mkdirSync(evidenceDir, { recursive: true });
  const out = {};

  // CV create + export
  const draftRes = await fetch(`${base}/api/v1/career/cv-builder/drafts`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateCode: 'RIREKISHO_JA' }),
  });
  const draftJ = await json(draftRes);
  out.cvCreate = { status: draftRes.status, template: draftJ.parsed?.templateCode, id: !!draftJ.parsed?.id, raw: draftJ.raw };
  if (draftRes.ok && draftJ.parsed?.id) {
    const id = draftJ.parsed.id;
    await fetch(`${base}/api/v1/career/cv-builder/drafts/${id}`, {
      method: 'PUT',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentJson: {
          ...(draftJ.parsed.contentJson || {}),
          personal: { ...(draftJ.parsed.contentJson?.personal || {}), name: 'E2E Verify User' },
        },
      }),
    });
    for (const format of ['pdf', 'xlsx']) {
      const exportRes = await fetch(
        `${base}/api/v1/career/cv-builder/drafts/${id}/export?format=${format}`,
        { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: '{}' }
      );
      const meta = await json(exportRes);
      if (!exportRes.ok) {
        out[`export-${format}`] = { status: exportRes.status, raw: meta.raw };
        continue;
      }
      const dl = await fetch(`${base}/api/v1/career/cv-builder/documents/${meta.parsed.documentId}/download`, {
        headers: auth,
      });
      const buf = Buffer.from(await dl.arrayBuffer());
      writeFileSync(join(evidenceDir, `phase3-cv-retry.${format}`), buf);
      const ascii = buf.toString('latin1');
      out[`export-${format}`] = {
        status: dl.status,
        bytes: buf.length,
        magic: buf.slice(0, 4).toString('ascii'),
        hasName: ascii.includes('E2E Verify User') || ascii.includes('Verify'),
      };
    }
  }

  // TTS → voice turn
  const speakRes = await fetch(`${base}/demo/voice/speak`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Hello TRON phase three.', language: 'en' }),
  });
  out.tts = { status: speakRes.status, bytes: 0 };
  if (speakRes.ok) {
    const ttsBuf = Buffer.from(await speakRes.arrayBuffer());
    out.tts.bytes = ttsBuf.length;
    writeFileSync(join(evidenceDir, 'phase3-tts-retry.wav'), ttsBuf);
    const form = new FormData();
    form.append('file', new Blob([ttsBuf], { type: 'audio/wav' }), 'mic.wav');
    form.append('language', 'en');
    form.append('aiProfile', 'SMART');
    const turnRes = await fetch(`${base}/api/v1/voice/turn`, { method: 'POST', headers: auth, body: form });
    const turnJ = await json(turnRes);
    out.voiceTurn = {
      status: turnRes.status,
      keys: turnJ.parsed ? Object.keys(turnJ.parsed).slice(0, 20) : [],
      detail: turnJ.parsed?.detail || null,
      transcript: turnJ.parsed?.transcript || turnJ.parsed?.user_text || turnJ.parsed?.userText || null,
      replyLen: (turnJ.parsed?.reply || turnJ.parsed?.assistant_text || turnJ.parsed?.text || '').length || 0,
      audioUrl: turnJ.parsed?.audio_url || turnJ.parsed?.audioUrl || null,
      raw: turnJ.raw,
    };
  } else {
    const sj = await json(speakRes);
    out.tts.raw = sj.raw;
  }

  writeFileSync(join(evidenceDir, 'phase3-retry-502.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
