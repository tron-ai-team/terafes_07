import { chromium } from "playwright";
import { join } from "path";

const baselineDir = join("..", "docs", "tron-mobile-chat-evidence", "baseline");

const viewports = [
  { name: "small-320x568", width: 320, height: 568 },
  { name: "compact-360x740", width: 360, height: 740 },
  { name: "common-375x812", width: 375, height: 812 },
  { name: "iphone-390x844", width: 390, height: 844 },
  { name: "large-430x932", width: 430, height: 932 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "desktop-1440x900", width: 1440, height: 900 },
];

async function setupMockAuth(page) {
  await page.route("**/health/ready", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", database: "reachable" }),
    });
  });

  await page.route("**/api/v1/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        accessToken: "mock-test-access-token-12345",
        expiresIn: 3600,
        user: {
          id: "usr_test_mock_1",
          email: "tester@tronai.tech",
          displayName: "Tron Tester",
          role: "USER",
          authProviders: ["PASSWORD"],
        },
      }),
    });
  });

  await page.route("**/api/v1/user/settings", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        preferredLanguage: "ja",
        preferredAiProfile: "SMART",
      }),
    });
  });

  await page.route("**/api/v1/chat/sessions", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.route("**/api/v1/ai/profiles", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        profiles: [
          { id: "SMART", name: "Smart (RTX 4060)", description: "Qwen 3.5 9B Q4", model: "qwen3.5:9b-q4_K_M", isAvailable: true },
          { id: "FAST", name: "Fast (GTX 1070)", description: "Qwen 3 8B", model: "qwen3:8b", isAvailable: true },
        ],
      }),
    });
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  console.log("=== Capturing Baseline Chat Screenshots on http://localhost:4173 ===");

  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
    });

    try {
      await setupMockAuth(page);
      await page.goto("http://localhost:4173/chat", { waitUntil: "networkidle" });
      await page.waitForTimeout(800);

      const screenshotPath = join(baselineDir, `chat-${vp.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Captured baseline: ${screenshotPath}`);
    } catch (err) {
      console.error(`Failed on ${vp.name}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log("=== Baselines Captured Successfully ===");
}

main();
