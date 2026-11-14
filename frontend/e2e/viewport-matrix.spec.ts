import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const widths = [320, 360, 375, 390, 430, 768, 1024, 1440];
const evidenceDir = join('..', 'docs', 'tron-core-polish-evidence', 'viewports');

test.beforeAll(() => {
  mkdirSync(evidenceDir, { recursive: true });
});

for (const width of widths) {
  test(`home has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    await page.screenshot({ path: join(evidenceDir, `home-${width}.png`) });
  });

  test(`guest chat usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/chat');
    await expect(page.getByRole('heading', { name: /sign in required|ログインが必要/i })).toBeVisible();
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    await page.screenshot({ path: join(evidenceDir, `chat-guest-${width}.png`) });
  });
}
