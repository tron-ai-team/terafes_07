import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const evidenceDir = join('..', 'docs', 'tron-core-polish-evidence', 'viewports-p3');
const widths = [320, 360, 375, 390, 430, 768, 1024, 1440];

const routes = [
  { path: '/', name: 'home' },
  { path: '/chat', name: 'chat-guest' },
  { path: '/voice', name: 'voice-guest' },
  { path: '/career/interview', name: 'interview-guest' },
  { path: '/career/cv-builder', name: 'cv-guest' },
  { path: '/auth', name: 'auth' },
];

test.beforeAll(() => {
  mkdirSync(evidenceDir, { recursive: true });
});

for (const width of widths) {
  test.describe(`viewport ${width}`, () => {
    test.use({ viewport: { width, height: width < 768 ? 720 : 900 } });

    for (const route of routes) {
      test(`${route.name} no horizontal overflow @${width}`, async ({ page }) => {
        await page.goto(route.path);
        await page.waitForTimeout(400);
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return {
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
          };
        });
        expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
        await page.screenshot({
          path: join(evidenceDir, `${route.name}-${width}.png`),
          fullPage: true,
        });
      });
    }
  });
}
