import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = join('..', 'docs', 'tron-mobile-evidence', 'desktop-verification');
mkdirSync(outDir, { recursive: true });

async function main() {
  const browser = await chromium.launch();

  const desktopSizes = [
    { name: 'desktop-1440-after', width: 1440, height: 900 },
    { name: 'desktop-1920-after', width: 1920, height: 1080 },
  ];

  for (const s of desktopSizes) {
    const page = await browser.newPage({ viewport: { width: s.width, height: s.height } });
    await page.goto('http://127.0.0.1:4173');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: join(outDir, `${s.name}-ja.png`), fullPage: false });
    console.log(`Captured ${s.name}-ja.png`);

    // Switch to English
    const langBtn = page.locator('#tron-landing-language-button');
    if (await langBtn.isVisible()) {
      await langBtn.click();
      const enOpt = page.locator('#tron-landing-lang-en');
      if (await enOpt.isVisible()) {
        await enOpt.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: join(outDir, `${s.name}-en.png`), fullPage: false });
        console.log(`Captured ${s.name}-en.png`);
      }
    }
    await page.close();
  }

  await browser.close();
  console.log('Desktop verification screenshots captured successfully!');
}

main().catch(console.error);
