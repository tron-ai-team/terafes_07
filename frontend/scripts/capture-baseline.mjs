import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const outDir = join('..', 'docs', 'tron-mobile-evidence', 'baseline');
mkdirSync(outDir, { recursive: true });

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // wait
    }
    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error(`Server did not respond within ${timeoutMs}ms`);
}

async function run() {
  console.log('Starting preview server...');
  const server = spawn('npm.cmd', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'], {
    shell: true,
    stdio: 'inherit',
  });

  try {
    await waitForServer('http://127.0.0.1:4173');
    console.log('Preview server ready at http://127.0.0.1:4173');

    const browser = await chromium.launch();
    const viewports = [
      { name: 'desktop-1440', width: 1440, height: 900 },
      { name: 'mobile-390', width: 390, height: 844 },
      { name: 'mobile-375', width: 375, height: 812 },
      { name: 'mobile-320', width: 320, height: 740 },
      { name: 'mobile-430', width: 430, height: 932 },
      { name: 'tablet-768', width: 768, height: 1024 },
    ];

    for (const vp of viewports) {
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
      });
      await page.goto('http://127.0.0.1:4173');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: join(outDir, `${vp.name}-ja.png`), fullPage: false });
      await page.screenshot({ path: join(outDir, `${vp.name}-ja-full.png`), fullPage: true });

      // Switch to English if language selector button exists
      const langBtn = page.locator('#tron-landing-language-button');
      if (await langBtn.isVisible()) {
        await langBtn.click();
        const enOpt = page.locator('#tron-landing-lang-en');
        if (await enOpt.isVisible()) {
          await enOpt.click();
          await page.waitForTimeout(500);
          await page.screenshot({ path: join(outDir, `${vp.name}-en.png`), fullPage: false });
        }
      }
      await page.close();
      console.log(`Captured baseline for ${vp.name}`);
    }

    await browser.close();
    console.log('Baseline capture complete!');
  } finally {
    server.kill();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
