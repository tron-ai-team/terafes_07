import { chromium } from "playwright";

const viewports = [
  { name: "Small phone (320x568)", width: 320, height: 568, allowScroll: true },
  { name: "Compact Android (360x740)", width: 360, height: 740, allowScroll: false },
  { name: "Common iPhone (375x812)", width: 375, height: 812, allowScroll: false },
  { name: "iPhone (390x844)", width: 390, height: 844, allowScroll: false },
  { name: "Large iPhone (393x852)", width: 393, height: 852, allowScroll: false },
  { name: "Large Android (412x915)", width: 412, height: 915, allowScroll: false },
  { name: "iPhone Pro Max (430x932)", width: 430, height: 932, allowScroll: false },
  { name: "Tablet (768x1024)", width: 768, height: 1024, allowScroll: false },
  { name: "Desktop (1440x900)", width: 1440, height: 900, allowScroll: false },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  let hasFailure = false;

  console.log("=== Testing Real Application Viewports on http://localhost:4173 ===");

  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
    });

    try {
      await page.goto("http://localhost:4173", { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);

      const metrics = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        const landingPage = document.querySelector(".landing-page");
        const chatCard = Array.from(document.querySelectorAll("button")).find((b) =>
          b.textContent?.includes("AI Chat")
        );
        const cvCard = Array.from(document.querySelectorAll("button")).find((b) =>
          b.textContent?.includes("Create CV")
        );
        const ctaBtn = document.getElementById("tron-mobile-launch-cta-button");
        const bottomNav = document.querySelector('nav[aria-label="Mobile Bottom Navigation"]');

        const isVisibleInViewport = (el) => {
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= window.innerHeight &&
            rect.right <= window.innerWidth
          );
        };

        return {
          windowInnerHeight: window.innerHeight,
          windowInnerWidth: window.innerWidth,
          htmlScrollHeight: html.scrollHeight,
          htmlClientHeight: html.clientHeight,
          bodyScrollHeight: body.scrollHeight,
          landingScrollHeight: landingPage ? landingPage.scrollHeight : null,
          landingClientHeight: landingPage ? landingPage.clientHeight : null,
          chatCardVisible: isVisibleInViewport(chatCard),
          cvCardVisible: isVisibleInViewport(cvCard),
          ctaBtnVisible: isVisibleInViewport(ctaBtn),
          bottomNavVisible: isVisibleInViewport(bottomNav),
          chatCardRect: chatCard ? chatCard.getBoundingClientRect() : null,
          cvCardRect: cvCard ? cvCard.getBoundingClientRect() : null,
          ctaBtnRect: ctaBtn ? ctaBtn.getBoundingClientRect() : null,
          bottomNavRect: bottomNav ? bottomNav.getBoundingClientRect() : null,
        };
      });

      const isMobile = vp.width < 1024;
      const effectiveScrollHeight = Math.max(metrics.htmlScrollHeight, metrics.bodyScrollHeight);
      const isSingleScreen = effectiveScrollHeight <= vp.height + 1;

      console.log(`\nDevice: ${vp.name}`);
      console.log(`  Viewport: ${vp.width}x${vp.height}`);
      console.log(`  ScrollHeight: ${effectiveScrollHeight}, ClientHeight: ${vp.height}`);
      console.log(`  Fits in 1 Screen without scroll: ${isSingleScreen ? "YES" : "NO"}`);
      if (isMobile) {
        console.log(`  CTA Button in Viewport: ${metrics.ctaBtnVisible}`);
        console.log(`  AI Chat Card in Viewport: ${metrics.chatCardVisible}`);
        console.log(`  Create CV Card in Viewport: ${metrics.cvCardVisible}`);
        console.log(`  Bottom Nav in Viewport: ${metrics.bottomNavVisible}`);
      }

      // Screenshot for visual evidence
      await page.screenshot({
        path: `../docs/tron-mobile-evidence/viewport-${vp.width}x${vp.height}.png`,
        fullPage: false,
      });

      if (!vp.allowScroll && !isSingleScreen) {
        console.error(`  FAIL: Viewport ${vp.name} exceeded height (${effectiveScrollHeight} > ${vp.height})`);
        hasFailure = true;
      } else {
        console.log(`  PASS`);
      }
    } catch (err) {
      console.error(`  ERROR testing ${vp.name}:`, err.message);
      hasFailure = true;
    } finally {
      await page.close();
    }
  }

  await browser.close();
  if (hasFailure) {
    process.exit(1);
  }
}

main();
