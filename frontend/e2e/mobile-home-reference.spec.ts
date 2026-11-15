import { test, expect } from '@playwright/test';

test.describe('TRON AI Mobile Homepage Reference Validation', () => {

  test('mobile header composition at 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // TRON AI logo and branding
    const logo = page.locator('img[alt="TRON AI Logo"]').first();
    await expect(logo).toBeVisible();
    await expect(page.getByText('Your AI Partner').first()).toBeVisible();

    // Mobile Language Selector
    const mobileLangBtn = page.locator('#tron-landing-language-button-mobile');
    await expect(mobileLangBtn).toBeVisible();

    // Mobile Hamburger Menu
    const hamburgerBtn = page.getByRole('button', { name: /toggle navigation menu/i });
    await expect(hamburgerBtn).toBeVisible();
  });

  test('mobile language switching updates hero and benefits (JP <-> EN)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Default Japanese - check visible mobile hero
    const mobileHero = page.locator('.lg\\:hidden').filter({ hasText: /学習・面接・キャリア準備を/ });
    await expect(mobileHero).toBeVisible();
    await expect(mobileHero.getByText('学習・面接・キャリア準備を')).toBeVisible();
    await expect(mobileHero.getByText('AIでトータルサポート')).toBeVisible();
    await expect(mobileHero.getByText('無料で始める')).toBeVisible();
    await expect(mobileHero.getByText('日英バイリンガルAI')).toBeVisible();
    await expect(mobileHero.getByText('4つの主要AI機能')).toBeVisible();
    await expect(page.locator('#tron-mobile-launch-cta-button')).toContainText('今すぐ始める');

    // Switch to English
    const mobileLangBtn = page.locator('#tron-landing-language-button-mobile');
    await mobileLangBtn.click();
    const enOpt = page.locator('#tron-landing-mobile-lang-en');
    await expect(enOpt).toBeVisible();
    await enOpt.click();

    // English assertions
    await expect(page.locator('.lg\\:hidden').getByText('Your AI Partner for')).toBeVisible();
    await expect(page.locator('.lg\\:hidden').getByText('Learning, Interviews & Career Success')).toBeVisible();
    await expect(page.locator('.lg\\:hidden').getByText('Get Started Free')).toBeVisible();
    await expect(page.locator('.lg\\:hidden').getByText('Japanese & English AI')).toBeVisible();
    await expect(page.locator('.lg\\:hidden').getByText('Four Core AI Features')).toBeVisible();
    await expect(page.locator('#tron-mobile-launch-cta-button')).toContainText('Get Started');

    // Switch back to Japanese
    await mobileLangBtn.click();
    const jaOpt = page.locator('#tron-landing-mobile-lang-ja');
    await expect(jaOpt).toBeVisible();
    await jaOpt.click();

    // Japanese restored
    await expect(page.locator('.lg\\:hidden').getByText('学習・面接・キャリア準備を')).toBeVisible();
    await expect(page.locator('.lg\\:hidden').getByText('AIでトータルサポート')).toBeVisible();
  });

  test('single video element with correct attributes and poster fallback', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const videos = page.locator('video');
    await expect(videos).toHaveCount(1); // EXACTLY ONE VIDEO ELEMENT, NO DUPLICATES

    const video = videos.first();
    await expect(video).toHaveAttribute('poster', '/images/tron-ai-hero-poster.webp');
    await expect(video).toHaveAttribute('playsinline', '');

    const isMuted = await video.evaluate((el: HTMLVideoElement) => el.muted);
    expect(isMuted).toBe(true);
  });

  test('mobile CTA button routes to chat or safe auth return', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const cta = page.locator('#tron-mobile-launch-cta-button');
    await expect(cta).toBeVisible();
    await cta.click();

    // Guest should be redirected to auth signup with safe return to /chat
    await page.waitForURL(/\/auth\?mode=signup&returnTo=%2Fchat/);
    expect(page.url()).toContain('/auth?mode=signup&returnTo=%2Fchat');
  });

  test('four main feature cards displayed in 2x2 grid and route properly', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const chatCard = page.locator('.lg\\:hidden').getByRole('heading', { name: 'AI Chat' });
    const voiceCard = page.locator('.lg\\:hidden').getByRole('heading', { name: 'AI Voice' });
    const interviewCard = page.locator('.lg\\:hidden').getByRole('heading', { name: 'Interview Practice' });
    const cvCard = page.locator('.lg\\:hidden').getByRole('heading', { name: 'Create CV' });

    await expect(chatCard).toBeVisible();
    await expect(voiceCard).toBeVisible();
    await expect(interviewCard).toBeVisible();
    await expect(cvCard).toBeVisible();

    // Click AI Chat card
    await chatCard.click();
    await page.waitForURL(/\/chat/);
    await expect(page.getByRole('heading', { name: /sign in required|ログインが必要/i })).toBeVisible();
  });

  test('fixed mobile bottom navigation has 6 destinations with Home active', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const bottomNav = page.getByRole('navigation', { name: /mobile bottom navigation/i });
    await expect(bottomNav).toBeVisible();

    // 6 buttons
    const buttons = bottomNav.getByRole('button');
    await expect(buttons).toHaveCount(6);

    // Home is active
    const homeBtn = bottomNav.getByRole('button', { name: /ホーム|home/i });
    await expect(homeBtn).toHaveAttribute('aria-current', 'page');

    // Click Chat tab
    const chatBtn = bottomNav.getByRole('button', { name: 'Chat' });
    await chatBtn.click();
    await page.waitForURL(/\/chat/);
    await expect(page.getByRole('heading', { name: /sign in required|ログインが必要/i })).toBeVisible();
  });

  test('zero horizontal overflow across narrowest screen 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto('/');

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);

    // Assert key elements are visible at 320px
    await expect(page.locator('#tron-mobile-launch-cta-button')).toBeVisible();
    await expect(page.locator('.lg\\:hidden').getByRole('heading', { name: 'AI Chat' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /mobile bottom navigation/i })).toBeVisible();
  });

  test('desktop protection at 1440px preserves cinematic desktop layout', async ({ page }, testInfo) => {
    // Only run this test on desktop project to avoid project viewport override conflicts
    test.skip(testInfo.project.name.startsWith('mobile'), 'Desktop test');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    // Mobile bottom nav must NOT be visible on desktop
    const mobileBottomNav = page.getByRole('navigation', { name: /mobile bottom navigation/i });
    await expect(mobileBottomNav).toBeHidden();

    // Desktop navbar navigation pills must be visible
    await expect(page.getByRole('navigation', { name: /main navigation/i })).toBeVisible();
    await expect(page.locator('#tron-launch-cta-button')).toBeVisible();

    // Four feature cards in desktop column
    const desktopCards = page.locator('.hidden.lg\\:flex');
    await expect(desktopCards.getByRole('heading', { name: 'AI Chat' })).toBeVisible();
    await expect(desktopCards.getByRole('heading', { name: 'AI Voice' })).toBeVisible();
    await expect(desktopCards.getByRole('heading', { name: 'Interview Practice' })).toBeVisible();
    await expect(desktopCards.getByRole('heading', { name: 'Create CV' })).toBeVisible();

    // Exactly one video element
    const videos = page.locator('video');
    await expect(videos).toHaveCount(1);
  });

  test('adaptive single-screen viewport fit on 360x740, 375x812, 390x844, 430x932 without vertical scroll', async ({ page }) => {
    const supportedViewports = [
      { name: 'Compact Android', width: 360, height: 740 },
      { name: 'Common iPhone', width: 375, height: 812 },
      { name: 'iPhone', width: 390, height: 844 },
      { name: 'iPhone Pro Max', width: 430, height: 932 },
    ];

    for (const vp of supportedViewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');

      // Check scrollHeight <= clientHeight + 1 (no vertical page scroll)
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        return {
          scrollHeight: Math.max(doc.scrollHeight, body.scrollHeight),
          clientHeight: window.innerHeight,
        };
      });

      expect(metrics.scrollHeight, `${vp.name} (${vp.width}x${vp.height}) should fit in single viewport without scrolling`).toBeLessThanOrEqual(metrics.clientHeight + 1);

      // Verify all 4 feature cards and CTA are inside the viewport bounds
      const isInViewport = await page.evaluate(() => {
        const cta = document.getElementById('tron-mobile-launch-cta-button');
        const cvCard = Array.from(document.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Create CV')
        );
        const chatCard = Array.from(document.querySelectorAll('button')).find((b) =>
          b.textContent?.includes('AI Chat')
        );
        const bottomNav = document.querySelector('nav[aria-label="Mobile Bottom Navigation"]');

        const checkInView = (el) => {
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return rect.top >= 0 && rect.bottom <= window.innerHeight;
        };

        return {
          cta: checkInView(cta),
          chatCard: checkInView(chatCard),
          cvCard: checkInView(cvCard),
          bottomNav: checkInView(bottomNav),
        };
      });

      expect(isInViewport.cta, `${vp.name}: CTA should be in viewport`).toBe(true);
      expect(isInViewport.chatCard, `${vp.name}: AI Chat card should be in viewport`).toBe(true);
      expect(isInViewport.cvCard, `${vp.name}: Create CV card should be in viewport`).toBe(true);
      expect(isInViewport.bottomNav, `${vp.name}: Bottom nav should be in viewport`).toBe(true);
    }
  });

  test('graceful fallback scrolling on very short screens (320x568) without content clipping', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');

    // Verify key elements exist and are accessible
    await expect(page.locator('#tron-mobile-launch-cta-button')).toBeVisible();
    await expect(page.locator('.lg\\:hidden').getByRole('heading', { name: 'AI Chat' })).toBeVisible();
    await expect(page.locator('.lg\\:hidden').getByRole('heading', { name: 'Create CV' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /mobile bottom navigation/i })).toBeVisible();

    // Verify scrolling works without clipping
    const canScroll = await page.evaluate(() => {
      window.scrollTo(0, 100);
      return window.scrollY > 0;
    });
    expect(canScroll).toBe(true);
  });
});
