import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = join('..', 'docs', 'tron-mobile-final-integration-evidence', 'production');
mkdirSync(out, { recursive: true });

const viewports = [
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

const routes = [
  { id: 'home', path: '/' },
  { id: 'chat', path: '/chat' },
  { id: 'voice', path: '/voice' },
  { id: 'cv-builder', path: '/career/cv-builder' },
];

const browser = await chromium.launch();
for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  for (const route of routes) {
    await page.goto(`https://www.tronai.tech${route.path}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    const file = `${route.id}-${vp.name}.png`;
    await page.screenshot({ path: join(out, file), fullPage: false });
    console.log(`${route.id}@${vp.name} overflow=${overflow}`);
  }
  await page.close();
}
await browser.close();
console.log('production smoke screenshots complete');
