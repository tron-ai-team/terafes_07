import { test, expect } from '@playwright/test';

async function setupChatRoutes(page: any) {
  await page.route((url: any) => true, async (route: any) => {
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
            id: 'u-12345',
            email: 'user@example.com',
            displayName: 'Test User',
            role: 'user',
            authProviders: ['PASSWORD'],
          },
        }),
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
          aiEngine: 'RTX AI (qwen3.5:9b-q4_K_M)',
          version: '1.0.0',
        }),
      });
    } else if (href.includes('/api/v1/chat/sessions')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify([]),
      });
    } else if (href.includes('/api/v1/chat')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          sessionId: 'sess-123',
          message: 'Here is an asynchronous FastAPI architecture with background tasks and health endpoints.',
          mode: 'SMART',
          model: 'qwen3.5:9b-q4_K_M',
          isLocked: true,
        }),
      });
    } else {
      await route.continue();
    }
  });
}

test.describe('TRON AI Mobile Chat UI Specification', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only specifications');
    await setupChatRoutes(page);
    await page.goto('/chat', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'TRON AI Chat' })).toBeVisible({ timeout: 10000 });
  });

  test('Renders 3-row mobile header with logo, tabs, and status badge', async ({ page }) => {
    // Row 1: Logo & Partner subtitle
    await expect(page.getByText('Your AI Partner')).toBeVisible();
    await expect(page.getByRole('button', { name: /toggle navigation menu/i })).toBeVisible();

    // Row 2: 4 Core Navigation Tabs
    const chatTab = page.getByRole('button', { name: /チャット|Chat/i }).first();
    const voiceTab = page.getByRole('button', { name: /音声|Voice/i }).first();
    const interviewTab = page.getByRole('button', { name: /面接|Interview/i }).first();
    const cvTab = page.getByRole('button', { name: /履歴書|CV/i }).first();

    await expect(chatTab).toBeVisible();
    await expect(voiceTab).toBeVisible();
    await expect(interviewTab).toBeVisible();
    await expect(cvTab).toBeVisible();

    // Row 3: Connection status (in mobile topbar)
    await expect(page.locator('.md\\:hidden').getByText(/TRON Core Online/i).first()).toBeVisible();
  });

  test('Renders 2x2 starter suggestion cards in empty chat state', async ({ page }) => {
    await expect(page.locator('button:has-text("Python / Algorithm Coding")')).toBeVisible();
    await expect(page.locator('button:has-text("FastAPI Backend Architecture")')).toBeVisible();
    await expect(page.locator('button:has-text("Japanese Self-Introduction")')).toBeVisible();
    await expect(page.locator('button:has-text("STAR Method Framing")')).toBeVisible();
  });

  test('Clicking a starter suggestion card populates composer textarea and focuses it', async ({ page }) => {
    const pythonCard = page.locator('button:has-text("Python / Algorithm Coding")');
    await pythonCard.click();

    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeFocused();
    await expect(textarea).toHaveValue(/palindrome/i);
  });

  test('Opens and closes sidebar history drawer via hamburger button', async ({ page }) => {
    const hamburger = page.getByRole('button', { name: /toggle navigation menu/i });
    await hamburger.click();

    // Drawer should become visible
    await expect(page.getByRole('button', { name: /新規チャット|New Chat/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /close sidebar/i })).toBeVisible();

    // Close drawer
    await page.getByRole('button', { name: /close sidebar/i }).click();
    await expect(page.locator('aside')).toHaveClass(/-translate-x-full/);
  });

  test('Web search mode toggle cycles between OFF, AUTO, and ON', async ({ page }) => {
    const searchBtn = page.getByRole('button', { name: /search:/i });
    await expect(searchBtn).toBeVisible();
    await expect(searchBtn).toContainText('AUTO');

    await searchBtn.click();
    await expect(searchBtn).toContainText('ON');

    await searchBtn.click();
    await expect(searchBtn).toContainText('OFF');

    await searchBtn.click();
    await expect(searchBtn).toContainText('AUTO');
  });

  test('Sending a message transitions to active conversation and shows message bubbles', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    await textarea.fill('Hello TRON AI, give me an architecture overview');
    await page.keyboard.press('Enter');

    // Empty state should be hidden
    await expect(page.locator('button:has-text("Python / Algorithm Coding")')).toBeHidden();

    // User message bubble should appear
    await expect(page.locator('.whitespace-pre-wrap', { hasText: 'Hello TRON AI, give me an architecture overview' })).toBeVisible();
  });

  test('Fixed 6-item mobile bottom navigation remains pinned with active Chat item', async ({ page }) => {
    const nav = page.locator('nav.fixed.bottom-0');
    await expect(nav).toBeVisible();
    await expect(nav.getByText(/チャット|Chat/i)).toBeVisible();
    await expect(nav.getByText(/ホーム|Home/i)).toBeVisible();
    await expect(nav.getByText(/音声|Voice/i)).toBeVisible();
    await expect(nav.getByText(/面接|Interview/i)).toBeVisible();
    await expect(nav.getByText(/履歴書|CV/i)).toBeVisible();
    await expect(nav.getByText(/プロフィール|Profile/i)).toBeVisible();
  });
});

test.describe('Desktop Layout Preservation', () => {
  test('Desktop layout preserves topbar, left sidebar, and desktop composer', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop-only verification');
    await setupChatRoutes(page);
    await page.goto('/chat', { waitUntil: 'networkidle' });

    // Desktop sidebar is visible
    const aside = page.locator('aside');
    await expect(aside).toBeVisible();
    await expect(aside.getByRole('button', { name: /新規チャット|New Chat/i })).toBeVisible();

    // Mobile bottom nav is hidden on desktop
    await expect(page.locator('nav.fixed.bottom-0')).toBeHidden();

    // Desktop topbar has language selector and user profile avatar
    await expect(page.locator('header').first()).toBeVisible();
  });
});
