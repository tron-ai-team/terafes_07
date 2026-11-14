import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const evidenceDir = join('..', 'docs', 'tron-core-polish-evidence', 'playwright');

test.beforeAll(() => {
  mkdirSync(evidenceDir, { recursive: true });
});

test.describe('Guest routing & auth honesty', () => {
  test('guest /chat shows sign-in required, not 404', async ({ page }, testInfo) => {
    await page.goto('/chat');
    await expect(page.getByRole('heading', { name: /sign in required|ログインが必要/i })).toBeVisible();
    await expect(page.getByText(/404|could not be found|見つかりません/i)).toHaveCount(0);
    await page.screenshot({
      path: join(evidenceDir, `guest-chat-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });

  test('guest /voice shows sign-in required', async ({ page }) => {
    await page.goto('/voice');
    await expect(page.getByRole('heading', { name: /sign in required|ログインが必要/i })).toBeVisible();
  });

  test('guest /career/cv-builder shows sign-in required', async ({ page }) => {
    await page.goto('/career/cv-builder');
    await expect(page.getByRole('heading', { name: /sign in required|ログインが必要/i })).toBeVisible();
  });

  test('unknown path shows branded 404', async ({ page }, testInfo) => {
    await page.goto('/this-page-does-not-exist-phase2');
    await expect(page.getByText(/404/)).toBeVisible();
    await expect(page.getByRole('heading', { name: /could not be found|見つかりません/i })).toBeVisible();
    await page.screenshot({
      path: join(evidenceDir, `not-found-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });

  test('workspace is feature-unavailable, not an active desktop agent UI', async ({ page }) => {
    await page.goto('/workspace');
    await expect(
      page.getByRole('heading', { name: /not published|公開されていません/i })
    ).toBeVisible();
    await expect(page.getByText(/Coding Agent|Active Tasks|Execution History/i)).toHaveCount(0);
  });

  test('home preserves four core feature cards', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'AI Chat' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'AI Voice' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Interview Practice' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create CV' })).toBeVisible();
    await page.screenshot({
      path: join(evidenceDir, `home-${testInfo.project.name}.png`),
      fullPage: false,
    });
  });
});
