import { test, expect } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Authenticated Chat E2E against the public web origin.
 *
 * Local Vite preview cannot call api.tronai.tech from the browser
 * (Origin rejection → "Failed to fetch"). Use the deployed SPA origin.
 */
const evidenceDir = join('..', 'docs', 'tron-core-polish-evidence', 'playwright');
const WEB_ORIGIN = process.env.E2E_WEB_URL || 'https://tronai.tech';

function loadE2ECreds(): { email: string; password: string } | null {
  if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) {
    return { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD };
  }
  for (const p of [join('.env.e2e.local'), join('frontend', '.env.e2e.local')]) {
    if (!existsSync(p)) continue;
    const map: Record<string, string> = {};
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m) map[m[1]] = m[2];
    }
    if (map.E2E_EMAIL && map.E2E_PASSWORD) {
      return { email: map.E2E_EMAIL, password: map.E2E_PASSWORD };
    }
  }
  return null;
}

const creds = loadE2ECreds();

test.describe('Authenticated chat (live web)', () => {
  test.use({ baseURL: WEB_ORIGIN });

  test.beforeAll(() => {
    mkdirSync(evidenceDir, { recursive: true });
  });

  test.skip(!creds, 'Requires frontend/.env.e2e.local (E2E_EMAIL / E2E_PASSWORD)');

  test('login → chat SMART API reply → FAST honest/success → refresh', async ({ page }, testInfo) => {
    test.setTimeout(180_000);

    await page.goto('/auth?mode=signin&returnTo=/chat');
    await expect(page.locator('form').getByRole('button', { name: /sign in/i })).toBeVisible();

    const googleBtn = page.getByRole('button', { name: /continue with google/i });
    const googleDisabled = await googleBtn.isDisabled().catch(() => true);
    const googleHintCount = await page.getByText(/google sign-in is not configured/i).count();
    const googleConfigured = !(googleDisabled || googleHintCount > 0);

    await page.getByPlaceholder('you@example.com').fill(creds!.email);
    await page.getByPlaceholder(/enter your password/i).fill(creds!.password);
    await page.locator('form').getByRole('button', { name: /sign in/i }).click();

    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 45_000 });

    // Prefer a fresh unlocked session
    const newChat = page.getByRole('button', { name: /新規チャット|new chat|new conversation/i });
    if ((await newChat.count()) > 0) {
      await newChat.first().click();
      await page.waitForTimeout(800);
    }

    await page.screenshot({
      path: join(evidenceDir, `auth-chat-ready-${testInfo.project.name}.png`),
      fullPage: true,
    });

    const composer = page.locator('textarea').first();

    async function selectProfile(label: RegExp) {
      // Composer compact selector button (shows Fast/Smart/…)
      const trigger = page.locator('button').filter({ hasText: /^(Fast|Smart|Auto|Cloud|Ultra)/i }).first();
      if ((await trigger.count()) > 0) {
        await trigger.click();
        await page.waitForTimeout(200);
      }
      const option = page.getByRole('button', { name: label }).or(page.getByText(label)).first();
      if ((await option.count()) > 0) {
        await option.click();
        await page.waitForTimeout(200);
      }
    }

    await selectProfile(/smart/i);
    const marker = `P3_SMART_${Date.now()}`;
    const smartWait = page.waitForResponse(
      (r) =>
        r.url().includes('/api/v1/chat') &&
        r.request().method() === 'POST' &&
        (r.request().postData() || '').includes(marker),
      { timeout: 120_000 }
    );
    await composer.fill(`Reply with exactly: ${marker}`);
    await page.locator('button[title="Send"], button[title="送信"]').first().click();
    const smartRes = await smartWait;
    const smartStatus = smartRes.status();
    const smartJson = await smartRes.json().catch(() => ({} as { reply?: string; detail?: string; aiProfile?: string }));
    const smartPost = smartRes.request().postData() || '';
    expect(smartPost, 'request must select SMART').toMatch(/SMART|QUALITY/i);
    expect(smartStatus, `SMART chat HTTP ${smartStatus} detail=${smartJson.detail || ''}`).toBe(200);
    expect(typeof smartJson.reply).toBe('string');
    expect((smartJson.reply as string).length).toBeGreaterThan(0);

    // New session for FAST probe (session locks profile after first message)
    if ((await newChat.count()) > 0) {
      await newChat.first().click();
      await page.waitForTimeout(500);
    }
    await selectProfile(/^fast$/i);

    const fastMarker = `P3_FAST_${Date.now()}`;
    const fastWait = page.waitForResponse(
      (r) =>
        r.url().includes('/api/v1/chat') &&
        r.request().method() === 'POST' &&
        (r.request().postData() || '').includes(fastMarker),
      { timeout: 120_000 }
    );
    await composer.fill(`Reply with exactly: ${fastMarker}`);
    await page.locator('button[title="Send"], button[title="送信"]').first().click();
    const fastRes = await fastWait;
    const fastStatus = fastRes.status();
    const fastJson = await fastRes.json().catch(() => ({} as { reply?: string; detail?: string }));
    const fastPost = fastRes.request().postData() || '';
    expect(fastPost, 'request must select FAST').toMatch(/"aiProfile"\s*:\s*"FAST"|aiProfile.:.FAST/i);
    const fastOk =
      (fastStatus === 200 && typeof fastJson.reply === 'string' && fastJson.reply.length > 0) ||
      fastStatus === 503;
    expect(fastOk, `FAST unexpected status ${fastStatus}`).toBeTruthy();

    await page.reload();
    await expect(page.locator('textarea').first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('heading', { name: /sign in required|ログインが必要/i })).toHaveCount(0);

    await page.screenshot({
      path: join(evidenceDir, `auth-chat-after-refresh-${testInfo.project.name}.png`),
      fullPage: true,
    });

    writeFileSync(
      join(evidenceDir, '..', 'phase3-auth-chat-e2e.json'),
      JSON.stringify(
        {
          at: new Date().toISOString(),
          webOrigin: WEB_ORIGIN,
          googleConfigured,
          interactiveGoogleLogin: 'NOT_TESTED',
          emailPasswordLogin: 'PASS',
          smartChatHttp: smartStatus,
          smartReplyLen: (smartJson.reply || '').length,
          fastChatHttp: fastStatus,
          fastDetail: fastJson.detail || null,
          fastResult: fastStatus === 200 ? 'PASS' : 'PASS_HONEST_OFFLINE',
          sessionAfterRefresh: 'PASS',
        },
        null,
        2
      )
    );
  });
});
