/**
 * Verifies homepage cinematic background video actually loads and plays.
 * Usage: node ./scripts/verify-homepage-video.mjs [baseURL]
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const baseURL = process.argv[2] || process.env.VIDEO_BASE_URL || 'http://127.0.0.1:4173';
const outDir = join('..', 'docs', 'tron-emergency-frontend-rollback-evidence');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const videoRequests = [];
page.on('response', async (res) => {
  const url = res.url();
  if (url.includes('tron-ai-hero') || url.includes('.mp4') || url.includes('poster')) {
    videoRequests.push({
      url,
      status: res.status(),
      contentType: res.headers()['content-type'] || '',
    });
  }
});

await page.goto(`${baseURL}/`, { waitUntil: 'networkidle', timeout: 60_000 });
await page.waitForTimeout(1500);

const report = await page.evaluate(async () => {
  const video = document.querySelector('video.landing-background-video, video');
  if (!video) {
    return { ok: false, error: 'No video element found' };
  }

  // Ensure muted autoplay path
  video.muted = true;
  try {
    await video.play();
  } catch (e) {
    // may already be playing
  }

  await new Promise((r) => setTimeout(r, 1200));

  const style = window.getComputedStyle(video);
  const rect = video.getBoundingClientRect();
  const t0 = video.currentTime;
  await new Promise((r) => setTimeout(r, 800));
  const t1 = video.currentTime;

  return {
    ok: true,
    src: video.currentSrc || video.querySelector('source')?.src || '',
    readyState: video.readyState,
    networkState: video.networkState,
    paused: video.paused,
    muted: video.muted,
    videoWidth: video.videoWidth,
    videoHeight: video.videoHeight,
    currentTimeStart: t0,
    currentTimeEnd: t1,
    advanced: t1 > t0 + 0.05,
    display: style.display,
    visibility: style.visibility,
    opacity: style.opacity,
    zIndex: style.zIndex,
    rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
    visibleInViewport: rect.width > 100 && rect.height > 100 && style.visibility !== 'hidden' && style.display !== 'none' && Number(style.opacity || '1') > 0.05,
  };
});

await page.screenshot({ path: join(outDir, 'homepage-video-desktop-1440.png'), fullPage: false });

const pageMobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await pageMobile.goto(`${baseURL}/`, { waitUntil: 'networkidle', timeout: 60_000 });
await pageMobile.waitForTimeout(1000);
await pageMobile.screenshot({ path: join(outDir, 'homepage-video-mobile-390.png'), fullPage: false });
await pageMobile.close();

const mp4Ok = videoRequests.some(
  (r) => r.url.includes('tron-ai-hero.mp4') && r.status >= 200 && r.status < 400,
);
const pass =
  report.ok &&
  mp4Ok &&
  report.videoWidth > 0 &&
  report.videoHeight > 0 &&
  report.advanced &&
  report.visibleInViewport;

const full = {
  baseURL,
  pass,
  report,
  videoRequests,
  checkedAt: new Date().toISOString(),
};

writeFileSync(join(outDir, 'homepage-video-report.json'), JSON.stringify(full, null, 2));
console.log(JSON.stringify(full, null, 2));
await browser.close();
process.exit(pass ? 0 : 1);
