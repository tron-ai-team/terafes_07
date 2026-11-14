import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = join('..', 'docs', 'tron-mobile-evidence', 'viewports');
mkdirSync(outDir, { recursive: true });

async function main() {
  const browser = await chromium.launch();

  const viewports = [
    { name: 'mobile-320', width: 320, height: 740 },
    { name: 'mobile-360', width: 360, height: 800 },
    { name: 'mobile-375', width: 375, height: 812 },
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'mobile-414', width: 414, height: 896 },
    { name: 'mobile-430', width: 430, height: 932 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'tablet-1024', width: 1024, height: 768 },
    { name: 'desktop-1440', width: 1440, height: 900 },
  ];

  console.log('Testing and capturing viewports...');
  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
    });

    await page.goto('http://127.0.0.1:4173');
    await page.waitForTimeout(600);

    // Verify horizontal overflow
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
      };
    });
    const hasOverflow = overflow.scrollWidth > overflow.clientWidth + 1;
    console.log(`Viewport ${vp.name} (${vp.width}x${vp.height}): scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth}, overflow=${hasOverflow}`);

    // Capture standard viewport screenshot (Japanese)
    await page.screenshot({ path: join(outDir, `${vp.name}-ja.png`), fullPage: false });
    // Capture full-page scroll screenshot (Japanese)
    await page.screenshot({ path: join(outDir, `${vp.name}-ja-full.png`), fullPage: true });

    // Switch to English
    const mobileLangBtn = page.locator('#tron-landing-language-button-mobile');
    const desktopLangBtn = page.locator('#tron-landing-language-button');
    const langBtn = (await mobileLangBtn.isVisible()) ? mobileLangBtn : desktopLangBtn;

    if (await langBtn.isVisible()) {
      await langBtn.click();
      await page.waitForTimeout(200);

      const enOptMobile = page.locator('#tron-landing-mobile-lang-en');
      const enOptDesktop = page.locator('#tron-landing-lang-en');
      const enOpt = (await enOptMobile.isVisible()) ? enOptMobile : enOptDesktop;

      if (await enOpt.isVisible()) {
        await enOpt.click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: join(outDir, `${vp.name}-en.png`), fullPage: false });
        await page.screenshot({ path: join(outDir, `${vp.name}-en-full.png`), fullPage: true });
      }
    }

    await page.close();
  }

  // Interaction Test: Mobile 390
  console.log('\nRunning mobile interaction tests (390x844)...');
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://127.0.0.1:4173');
  await page.waitForTimeout(600);

  // 1. Language Dropdown state screenshot
  const mobileLangBtn = page.locator('#tron-landing-language-button-mobile');
  await mobileLangBtn.click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(outDir, 'mobile-390-lang-dropdown.png') });
  // Close by clicking again or outside
  await page.mouse.click(10, 10);
  await page.waitForTimeout(200);

  // 2. Mobile Menu toggle screenshot
  const menuBtn = page.getByRole('button', { name: /toggle navigation menu/i });
  await menuBtn.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(outDir, 'mobile-390-hamburger-drawer.png') });
  await menuBtn.click(); // close
  await page.waitForTimeout(200);

  // 3. CTA button click
  const cta = page.locator('#tron-mobile-launch-cta-button');
  console.log('CTA button visible:', await cta.isVisible());

  // 4. Feature cards visibility
  console.log('Feature cards visible:');
  console.log(' - AI Chat:', await page.getByRole('heading', { name: 'AI Chat' }).isVisible());
  console.log(' - AI Voice:', await page.getByRole('heading', { name: 'AI Voice' }).isVisible());
  console.log(' - Interview Practice:', await page.getByRole('heading', { name: 'Interview Practice' }).isVisible());
  console.log(' - Create CV:', await page.getByRole('heading', { name: 'Create CV' }).isVisible());

  // 5. Bottom Navigation visibility
  const bottomNav = page.getByRole('navigation', { name: /mobile bottom navigation/i });
  console.log('Bottom Navigation visible:', await bottomNav.isVisible());

  await page.close();
  await browser.close();
  console.log('\nAll viewport tests and screenshots completed successfully!');
}

main().catch(console.error);
