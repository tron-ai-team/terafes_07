import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outDir = join('..', 'docs', 'tron-mobile-final-integration-evidence');
mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: '320x568', width: 320, height: 568 },
  { name: '360x740', width: 360, height: 740 },
  { name: '390x844', width: 390, height: 844 },
  { name: '430x932', width: 430, height: 932 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
];

const routes = [
  { id: 'home', path: '/' },
  { id: 'chat', path: '/chat' },
  { id: 'voice', path: '/voice' },
  { id: 'interview', path: '/career/interview' },
  { id: 'cv-builder', path: '/career/cv-builder' },
  { id: 'candidate-profile', path: '/career/profile' },
  { id: 'auth', path: '/auth' },
  { id: 'settings', path: '/settings' },
  { id: 'help', path: '/help' },
];

function overflowReport(metrics) {
  return {
    ...metrics,
    hasHorizontalOverflow: metrics.scrollWidth > metrics.clientWidth + 1,
  };
}

async function main() {
  const browser = await chromium.launch();
  const results = [];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    for (const route of routes) {
      await page.goto(`http://127.0.0.1:4173${route.path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const metrics = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
      }));
      const report = overflowReport(metrics);
      const file = `${route.id}-${vp.name}.png`;
      await page.screenshot({ path: join(outDir, file), fullPage: false });
      results.push({ route: route.id, path: route.path, viewport: vp.name, file, ...report });
      console.log(
        `${route.id}@${vp.name}: overflow=${report.hasHorizontalOverflow} scroll=${report.scrollWidth}x${report.scrollHeight}`,
      );
    }
    await page.close();
  }

  writeFileSync(join(outDir, 'overflow-report.json'), JSON.stringify(results, null, 2));
  const bad = results.filter((r) => r.hasHorizontalOverflow);
  console.log(`\nCaptured ${results.length} screenshots. Horizontal overflow cases: ${bad.length}`);
  if (bad.length) {
    for (const b of bad) console.log(`  FAIL ${b.route}@${b.viewport}`);
    process.exitCode = 1;
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
