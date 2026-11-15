/**
 * Comprehensive responsive overflow + screenshot capture for UI/UX audit.
 * Targets local Vite preview (http://127.0.0.1:4173) by default.
 * Set AUDIT_BASE_URL to hit production read-only (https://www.tronai.tech).
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const baseURL = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4173';
const outDir = join('..', 'docs', 'tron-ui-ux-audit-evidence');
mkdirSync(outDir, { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });

const viewports = [
  { name: '320x568', width: 320, height: 568 },
  { name: '360x740', width: 360, height: 740 },
  { name: '375x812', width: 375, height: 812 },
  { name: '390x844', width: 390, height: 844 },
  { name: '414x896', width: 414, height: 896 },
  { name: '430x932', width: 430, height: 932 },
  { name: '540x720', width: 540, height: 720 },
  { name: '768x1024', width: 768, height: 1024 },
  { name: '1024x768', width: 1024, height: 768 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '2560x1440', width: 2560, height: 1440 },
];

const routes = [
  { id: 'home', path: '/' },
  { id: 'auth', path: '/auth' },
  { id: 'chat', path: '/chat' },
  { id: 'voice', path: '/voice' },
  { id: 'career', path: '/career' },
  { id: 'interview', path: '/career/interview' },
  { id: 'cv-builder', path: '/career/cv-builder' },
  { id: 'candidate-profile', path: '/career/profile' },
  { id: 'settings', path: '/settings' },
  { id: 'help', path: '/help' },
  { id: 'about', path: '/about' },
  { id: 'profile', path: '/profile' },
  { id: 'not-found', path: '/this-route-does-not-exist-audit' },
  { id: 'feature-unavailable', path: '/workspace' },
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
  const startedAt = new Date().toISOString();

  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.width < 768,
      hasTouch: vp.width < 1024,
    });
    for (const route of routes) {
      try {
        await page.goto(`${baseURL}${route.path}`, {
          waitUntil: 'domcontentloaded',
          timeout: 45_000,
        });
        await page.waitForTimeout(700);
        const metrics = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          scrollHeight: document.documentElement.scrollHeight,
          clientHeight: document.documentElement.clientHeight,
          title: document.title,
        }));
        const report = overflowReport(metrics);
        const file = `${route.id}-${vp.name}.png`;
        await page.screenshot({
          path: join(outDir, 'screenshots', file),
          fullPage: false,
        });
        results.push({
          route: route.id,
          path: route.path,
          viewport: vp.name,
          file: `screenshots/${file}`,
          ...report,
          error: null,
        });
        console.log(
          `${route.id}@${vp.name}: overflow=${report.hasHorizontalOverflow} ${report.scrollWidth}x${report.scrollHeight}`,
        );
      } catch (err) {
        results.push({
          route: route.id,
          path: route.path,
          viewport: vp.name,
          file: null,
          hasHorizontalOverflow: null,
          error: String(err?.message || err),
        });
        console.log(`${route.id}@${vp.name}: ERROR ${err?.message || err}`);
      }
    }
    await page.close();
  }

  // Extra: mobile landscape + zoom samples
  const extras = [
    { name: '390x844-landscape', width: 844, height: 390, path: '/', id: 'home-landscape' },
    { name: '390x844-zoom150', width: 260, height: 563, path: '/', id: 'home-zoom150' },
  ];
  for (const extra of extras) {
    const page = await browser.newPage({
      viewport: { width: extra.width, height: extra.height },
    });
    await page.goto(`${baseURL}${extra.path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));
    const report = overflowReport(metrics);
    const file = `${extra.id}-${extra.name}.png`;
    await page.screenshot({ path: join(outDir, 'screenshots', file), fullPage: false });
    results.push({
      route: extra.id,
      path: extra.path,
      viewport: extra.name,
      file: `screenshots/${file}`,
      ...report,
      error: null,
    });
    await page.close();
  }

  const summary = {
    baseURL,
    startedAt,
    finishedAt: new Date().toISOString(),
    total: results.length,
    overflowCount: results.filter((r) => r.hasHorizontalOverflow === true).length,
    errorCount: results.filter((r) => r.error).length,
    note: 'Chromium emulation only — not equivalent to physical iPhone/Android devices.',
  };

  writeFileSync(join(outDir, 'overflow-report.json'), JSON.stringify({ summary, results }, null, 2));
  console.log(`\nCaptured ${results.length}. Overflow: ${summary.overflowCount}. Errors: ${summary.errorCount}`);
  if (summary.overflowCount > 0) {
    for (const b of results.filter((r) => r.hasHorizontalOverflow)) {
      console.log(`  FAIL ${b.route}@${b.viewport}`);
    }
    process.exitCode = 1;
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
