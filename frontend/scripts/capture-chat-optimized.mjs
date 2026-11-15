import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_DIR = path.resolve(__dirname, '../../docs/tron-mobile-chat-evidence/optimized');
fs.mkdirSync(OUT_DIR, { recursive: true });

const VIEWPORTS = [
  { name: 'chat-small-320x568', width: 320, height: 568 },
  { name: 'chat-compact-360x740', width: 360, height: 740 },
  { name: 'chat-common-375x812', width: 375, height: 812 },
  { name: 'chat-iphone-390x844', width: 390, height: 844 },
  { name: 'chat-large-430x932', width: 430, height: 932 },
  { name: 'chat-tablet-768x1024', width: 768, height: 1024 },
  { name: 'chat-desktop-1440x900', width: 1440, height: 900 },
];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'http://localhost:4173',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

async function setupRoutes(page) {
  // Handle CORS preflights
  await page.route(url => true, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 200,
        headers: CORS_HEADERS,
      });
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
            id: 'u-12345',
            email: 'user@example.com',
            displayName: 'Test User',
            role: 'user',
            authProviders: ['PASSWORD']
          }
        })
      });
    } else if (href.includes('/health')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          status: 'UP',
          database: 'reachable',
          mode: 'SMART',
          aiEngine: 'RTX AI',
          version: '1.0.0'
        })
      });
    } else if (href.includes('/api/v1/chat/sessions')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify([])
      });
    } else if (href.includes('/api/v1/chat')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          sessionId: 'sess-123',
          message: 'Here is a recommended FastAPI architecture with background tasks and async database connection pooling.',
          mode: 'SMART',
          model: 'qwen3.5:9b-q4_K_M',
          isLocked: true
        })
      });
    } else {
      await route.continue();
    }
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await setupRoutes(page);

    try {
      await page.goto('http://localhost:4173/chat', { waitUntil: 'networkidle' });
      // Wait for auth to settle and empty state to render
      await page.waitForSelector('text=TRON AI Chat', { timeout: 10000 });
      await page.waitForTimeout(600);

      // Screenshot 1: default empty state
      const outPath = path.join(OUT_DIR, `${vp.name}.png`);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`Saved ${outPath}`);

      // On 390x844, capture additional states
      if (vp.width === 390) {
        // State A: Click a suggestion card
        const suggestionCard = page.locator('button:has-text("Python /")');
        if (await suggestionCard.isVisible()) {
          await suggestionCard.click();
          await page.waitForTimeout(500);
          await page.screenshot({ path: path.join(OUT_DIR, 'chat-iphone-prompt-selected-390x844.png') });
          console.log('Saved prompt-selected');
        }

        // State B: Open sidebar / history drawer
        const hamburger = page.locator('button[aria-label="Toggle navigation menu"]');
        if (await hamburger.isVisible()) {
          await hamburger.click();
          await page.waitForTimeout(500);
          await page.screenshot({ path: path.join(OUT_DIR, 'chat-iphone-history-drawer-390x844.png') });
          console.log('Saved history-drawer');
          // Close drawer
          const closeBtn = page.locator('button[aria-label="Close sidebar"]');
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
          } else {
            const backdrop = page.locator('.fixed.inset-0.bg-black\\/40');
            if (await backdrop.isVisible()) {
              await backdrop.click();
            }
          }
          await page.waitForTimeout(600);
        }

        // State C: Type and send chat message
        const textarea = page.locator('textarea').first();
        if (await textarea.isVisible()) {
          await textarea.fill('How do I build a production FastAPI backend with background workers?');
          await page.waitForTimeout(300);
          await page.keyboard.press('Enter');
          // Wait for message bubble or state update
          await page.waitForSelector('text=FastAPI backend with background workers', { timeout: 5000 }).catch(() => {});
          await page.waitForTimeout(1000);
          await page.screenshot({ path: path.join(OUT_DIR, 'chat-iphone-conversation-active-390x844.png') });
          console.log('Saved conversation-active');
        }
      }
    } catch (e) {
      console.error(`Error on ${vp.name}:`, e.message);
    } finally {
      await context.close();
    }
  }

  await browser.close();
}

run();
