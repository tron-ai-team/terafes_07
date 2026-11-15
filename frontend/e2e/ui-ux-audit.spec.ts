import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const evidenceDir = join('..', 'docs', 'tron-ui-ux-audit-evidence', 'e2e');

const LONG_URL =
  'https://example.com/research/articles/very-long-path-segment-that-must-wrap-on-narrow-viewports-without-horizontal-overflow?query=param&another=value&extra=1234567890';

const ASSISTANT_REPLY = [
  '## Summary',
  '',
  'TRON AI researched this topic [Source][1] and also [2].',
  '',
  'See the docs at ' + LONG_URL,
  '',
  '- First finding',
  '- Second finding',
  '',
  '```ts',
  'export const hello = (name: string) => `hi ${name}`;',
  '```',
].join('\n');

async function setupAuthenticatedChat(page: import('@playwright/test').Page) {
  await page.route(() => true, async (route) => {
    const origin = route.request().headers()['origin'] || 'http://127.0.0.1:4173';
    const CORS_HEADERS = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };

    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 200, headers: CORS_HEADERS });
      return;
    }

    const href = route.request().url();

    if (href.includes('/api/v1/auth/refresh')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          accessToken: 'mock-jwt-token-xyz',
          expiresIn: 3600,
          user: {
            id: 'u-audit',
            email: 'audit@tronai.tech',
            displayName: 'Audit User',
            role: 'USER',
            authProviders: ['PASSWORD'],
          },
        }),
      });
      return;
    }

    if (href.includes('/api/v1/auth/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          id: 'u-audit',
          email: 'audit@tronai.tech',
          displayName: 'Audit User',
          role: 'USER',
          authProviders: ['PASSWORD'],
        }),
      });
      return;
    }

    if (href.includes('/api/v1/auth/providers')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({ google: { enabled: true, clientId: 'mock' } }),
      });
      return;
    }

    if (href.includes('/health')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          status: 'UP',
          database: 'reachable',
          mode: 'SMART',
          aiEngine: 'RTX AI (qwen3.5:9b-q4_K_M)',
          version: '1.0.0',
        }),
      });
      return;
    }

    if (href.includes('/api/v1/user/settings')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          uiLanguage: 'en',
          aiLanguage: 'en',
          aiMode: 'SMART',
          searchMode: 'on',
        }),
      });
      return;
    }

    if (href.includes('/api/v1/chat/sessions')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify([]),
      });
      return;
    }

    if (href.match(/\/api\/v1\/chat\/?(\?|$)/) || href.endsWith('/api/v1/chat')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          reply: ASSISTANT_REPLY,
          language: 'en',
          truncated: false,
          finishReason: 'stop',
          model: 'qwen3.5:9b-q4_K_M',
          search: {
            mode: 'on',
            performed: true,
            status: 'ok',
            query: 'TRON AI research',
            results: [
              {
                title: 'Official TRON AI Docs',
                url: 'https://www.tronai.tech/help',
                snippet: 'Product help and guidance.',
              },
              {
                title: 'Example Research',
                url: 'https://example.com/research',
                snippet: 'Supporting research article.',
              },
            ],
          },
        }),
      });
      return;
    }

    await route.continue();
  });
}

test.beforeAll(() => {
  mkdirSync(evidenceDir, { recursive: true });
});

test.describe('UI/UX audit — chat markdown & sources (mocked auth)', () => {
  test('renders clickable citations, source cards, and no overflow for long URLs', async ({
    page,
    isMobile,
  }) => {
    await setupAuthenticatedChat(page);
    await page.setViewportSize(isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
    await page.goto('/chat', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: /TRON AI Chat/i })).toBeVisible({
      timeout: 15_000,
    });

    const textarea = page.locator('textarea').first();
    await textarea.fill('Research TRON AI with sources please');
    await page.keyboard.press('Enter');

    await expect(page.getByText('Summary')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('link', { name: '[1]' })).toBeVisible();
    await expect(page.getByRole('link', { name: '[2]' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Official TRON AI Docs/i })).toBeVisible();
    await expect(page.getByRole('link', { name: LONG_URL })).toBeVisible();
    await expect(page.getByText('First finding')).toBeVisible();
    await expect(page.getByText(/export const hello/)).toBeVisible();

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);

    await page.screenshot({
      path: join(evidenceDir, `chat-markdown-${isMobile ? 'mobile' : 'desktop'}.png`),
    });
  });
});

test.describe('UI/UX audit — guest responsive matrix', () => {
  const routes = ['/', '/auth', '/chat', '/help', '/about', '/404'];
  const widths = [320, 375, 390, 768, 1440, 1920];

  for (const width of widths) {
    for (const route of routes) {
      test(`no horizontal overflow ${route} @ ${width}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        const metrics = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
      });
    }
  }
});

test.describe('UI/UX audit — mobile bottom nav', () => {
  test('bottom nav has adequate touch targets and active state', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const nav = page.getByRole('navigation', { name: /Mobile Bottom Navigation/i });
    await expect(nav).toBeVisible();
    const home = nav.getByRole('button', { name: /ホーム|Home/i });
    const box = await home.boundingBox();
    expect(box).toBeTruthy();
    expect((box?.height || 0)).toBeGreaterThanOrEqual(40);
    await expect(home).toHaveAttribute('aria-current', 'page');
  });
});

test.describe('UI/UX audit — auth form', () => {
  test('auth signup fields remain usable at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/auth?mode=signup', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible();
    await page.getByPlaceholder('Enter your full name').fill('Audit User');
    await page.getByPlaceholder('you@example.com').fill('audit@example.com');
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    await page.screenshot({ path: join(evidenceDir, 'auth-320.png') });
  });
});
