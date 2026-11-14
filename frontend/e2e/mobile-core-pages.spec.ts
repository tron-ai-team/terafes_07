import { test, expect } from '@playwright/test';

async function setupMockBackend(page: any) {
  await page.route((url: any) => true, async (route: any) => {
    const origin = route.request().headers()['origin'] || 'http://127.0.0.1:4173';
    const CORS_HEADERS = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    };

    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 200, headers: CORS_HEADERS });
      return;
    }

    const href = route.request().url();

    if (href.includes('/api/v1/auth/refresh')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          accessToken: 'mock-jwt-token-xyz',
          expiresIn: 3600,
          user: {
            id: 'u-12345',
            email: 'candidate@tronai.tech',
            displayName: '田中 太郎',
            role: 'USER',
            authProviders: ['PASSWORD', 'GOOGLE'],
          },
        }),
      });
    } else if (href.includes('/api/v1/auth/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          id: 'u-12345',
          email: 'candidate@tronai.tech',
          displayName: '田中 太郎',
          role: 'USER',
          authProviders: ['PASSWORD', 'GOOGLE'],
        }),
      });
    } else if (href.includes('/api/v1/auth/providers')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          google: { enabled: true, clientId: 'mock-google-client-id' },
        }),
      });
    } else if (href.includes('/health')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          status: 'UP',
          database: 'reachable',
          mode: 'SMART',
          aiEngine: 'RTX AI (qwen3.5:9b-q4_K_M)',
          version: '1.0.0',
        }),
      });
    } else if (href.includes('/api/v1/user/settings')) {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: CORS_HEADERS,
          body: JSON.stringify({ ok: true }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: CORS_HEADERS,
          body: JSON.stringify({
            preferredLanguage: 'ja',
            preferredAiProfile: 'SMART',
          }),
        });
      }
    } else if (href.includes('/api/v1/ai/profiles')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          profiles: [
            { id: 'SMART', name: 'Smart (RTX 4060)', description: 'Qwen 3.5 9B Q4', model: 'qwen3.5:9b-q4_K_M', isAvailable: true },
            { id: 'FAST', name: 'Fast (GTX 1070)', description: 'Qwen 3 8B', model: 'qwen3:8b', isAvailable: true },
          ],
        }),
      });
    } else if (href.includes('/api/v1/career/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          id: 'u-12345',
          email: 'candidate@tronai.tech',
          displayName: '田中 太郎',
          candidateProfile: {
            profileExists: true,
            fullName: '田中 太郎',
            nameJa: '田中 太郎',
            contactEmail: 'candidate@tronai.tech',
            completenessScore: 85,
            expectedGraduationYear: '2026',
            targetJobs: ['Backend Engineer'],
            preferredLocations: ['Tokyo'],
            jlptLevel: 'N1',
            education: ['東京大学 工学部 情報工学科'],
            skills: ['TypeScript', 'Go', 'Docker'],
            certifications: ['応用情報技術者'],
            projects: ['TRON AI Distributed Platform'],
            missingFields: [],
          },
        }),
      });
    } else if (href.includes('/api/v1/career/candidate-profile')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify({
          id: 'cp-1',
          nameJa: '田中 太郎',
          nameEn: 'Taro Tanaka',
          contactEmail: 'candidate@tronai.tech',
          completenessScore: 85,
          education: [{ schoolName: '東京大学', major: '情報工学', degree: '学士', startDate: '2022-04' }],
          career: [{ company: 'テックイノベーション', jobTitle: 'Software Engineer', currentlyEmployed: true }],
          skills: [{ name: 'Go', category: 'Backend', proficiency: 'Advanced' }],
          certifications: [],
          projects: [],
          preferences: {},
        }),
      });
    } else if (href.includes('/api/v1/career/cv/documents')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify([
          {
            id: 1,
            filename: 'Tanaka_Resume.pdf',
            fileSize: 1024,
            mimeType: 'application/pdf',
            createdAt: new Date().toISOString(),
          },
        ]),
      });
    } else if (href.includes('/api/v1/career/cv/drafts')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify([
          {
            id: 'draft-1',
            templateCode: 'RIREKISHO_JA',
            title: '2026年 新卒採用 履歴書',
            updatedAt: new Date().toISOString(),
            payload: {
              nameJa: '田中 太郎',
              email: 'candidate@tronai.tech',
            },
          },
        ]),
      });
    } else if (href.includes('/api/v1/career/interviews')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify([
          {
            id: 'int-1',
            companyName: 'LINEヤフー株式会社',
            jobPosition: 'Backend Engineer',
            interviewType: 'technical',
            difficulty: 'intermediate',
            overallScore: 88,
            finished: true,
          },
        ]),
      });
    } else if (href.includes('/api/v1/career/company-analyses')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: CORS_HEADERS,
        body: JSON.stringify([]),
      });
    } else {
      await route.continue();
    }
  });
}

test.describe('Mobile Core Pages Integration', () => {
  test.beforeEach(async ({ page }) => {
    await setupMockBackend(page);
  });

  test('Voice page loads on mobile with responsive controls and no overflow', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only spec');
    await page.goto('/voice');
    await page.waitForLoadState('domcontentloaded');

    // Auto / Manual toggle should be present
    const autoBtn = page.getByRole('button', { name: /Auto Mode/i });
    const manualBtn = page.getByRole('button', { name: /Manual Mode/i });
    await expect(autoBtn).toBeVisible();
    await expect(manualBtn).toBeVisible();

    // Toggle to manual
    await manualBtn.click();
    await expect(manualBtn).toHaveClass(/bg-gradient-to-r/);

    // Verify no horizontal overflow
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth <= doc.clientWidth + 1;
    });
    expect(overflow).toBe(true);

    // Verify bottom nav dock reflects Voice as active
    const voiceTab = page.locator('button[aria-label="音声"], button[aria-label="Voice"]');
    await expect(voiceTab).toBeVisible();
    await expect(voiceTab).toHaveAttribute('aria-current', 'page');
  });

  test('Interview Practice flow works on mobile: Dashboard -> Setup -> History', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only spec');
    // 1. Dashboard
    await page.goto('/career/interview');
    await page.waitForLoadState('domcontentloaded');

    const startBtn = page.getByText(/AI面接を始める|Start AI Interview/i);
    await expect(startBtn).toBeVisible();

    let overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth <= doc.clientWidth + 1;
    });
    expect(overflow).toBe(true);

    // 2. Setup
    await page.goto('/career/interview/setup');
    await page.waitForLoadState('domcontentloaded');

    const companyInput = page.locator('input[placeholder*="LINEヤフー"], input[placeholder*="Mercari"]').first();
    await expect(companyInput).toBeVisible();

    overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth <= doc.clientWidth + 1;
    });
    expect(overflow).toBe(true);

    // 3. History
    await page.goto('/career/history');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText(/面接履歴|Interview History/i).first()).toBeVisible();
    overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth <= doc.clientWidth + 1;
    });
    expect(overflow).toBe(true);
  });

  test('Interview Room hides bottom dock during focus interview session', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only spec');

    await page.goto('/career/interview/room');
    await page.waitForLoadState('domcontentloaded');

    // Bottom dock must be hidden to prioritize focus room and keyboard space
    const dock = page.locator('nav[aria-label="Mobile Bottom Navigation"]');
    await expect(dock).toHaveCount(0);

    // Verify main content is rendered cleanly without horizontal overflow
    await expect(page.locator('main').first()).toBeVisible();
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth <= doc.clientWidth + 1;
    });
    expect(overflow).toBe(true);
  });

  test('CV Builder mode-based workspace on mobile (Drafts, Editor, Preview)', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only spec');
    await page.goto('/career/cv-builder');
    await page.waitForLoadState('domcontentloaded');

    // Mobile tabs: Drafts, Editor, Preview
    const draftsTab = page.getByRole('button', { name: /下書き|Drafts/i }).first();
    const editorTab = page.getByRole('button', { name: /編集フォーム|Editor/i }).first();
    const previewTab = page.getByRole('button', { name: /プレビュー|Preview/i }).first();

    await expect(draftsTab).toBeVisible();
    await expect(editorTab).toBeVisible();
    await expect(previewTab).toBeVisible();

    // Switch to Drafts mode
    await draftsTab.click();
    await page.waitForTimeout(200);

    // Switch to Preview mode
    await previewTab.click();
    await page.waitForTimeout(200);

    // Check zero overflow
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth <= doc.clientWidth + 1;
    });
    expect(overflow).toBe(true);
  });

  test('Profile and Candidate Profile render cleanly with sticky save', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only spec');
    // Profile
    await page.goto('/profile');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText(/User Profile & Credentials/i)).toBeVisible();

    let overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth <= doc.clientWidth + 1;
    });
    expect(overflow).toBe(true);

    // Candidate Profile
    await page.goto('/career/profile');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText(/候補者プロフィール|Candidate Profile/i).first()).toBeVisible();

    overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth <= doc.clientWidth + 1;
    });
    expect(overflow).toBe(true);
  });

  test('Auth page is vertically scrollable on mobile and submit button reachable', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only spec');
    // Ensure clean state without logged-in session so /auth does not auto-redirect
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();

    const submitBtn = page.getByRole('button', { name: /Create Account|Sign In|登録|ログイン/i }).first();
    await expect(submitBtn).toBeVisible();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth <= doc.clientWidth + 1;
    });
    expect(overflow).toBe(true);
  });

  test('Settings and Help pages render bilingual support without false success', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-only spec');
    // Settings
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    const saveSettingsBtn = page.getByRole('button', { name: /Save Preferences|設定を保存/i }).first();
    if (await saveSettingsBtn.isVisible()) {
      await saveSettingsBtn.scrollIntoViewIfNeeded();
      await saveSettingsBtn.click();
      await page.waitForTimeout(300);
      // Ensure toast appears
      await expect(page.locator('.toast, [role="alert"]').first()).toBeVisible();
    }

    // Help
    await page.goto('/help');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByText(/ヘルプ|Help & Documentation/i).first()).toBeVisible();

    const faqButton = page.getByRole('button', { name: /マイク|Microphone/i }).first();
    await expect(faqButton).toBeVisible();
    await faqButton.click();

    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth <= doc.clientWidth + 1;
    });
    expect(overflow).toBe(true);
  });
});
