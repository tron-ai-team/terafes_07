import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const targetMode = process.argv.includes('--optimized') ? 'optimized' : 'baseline';
const outDir = join('..', 'docs', 'tron-mobile-core-pages-evidence', targetMode);
mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: 'iphone-390x844', width: 390, height: 844 },
  { name: 'small-320x568', width: 320, height: 568 },
  { name: 'desktop-1440x900', width: 1440, height: 900 },
];

const pagesToCapture = [
  { path: '/voice', name: 'voice' },
  { path: '/career/interview', name: 'interview-dashboard' },
  { path: '/career/interview/setup', name: 'interview-setup' },
  { path: '/career/interview/room', name: 'interview-room' },
  { path: '/career/interview/feedback', name: 'interview-feedback' },
  { path: '/career/history', name: 'interview-history' },
  { path: '/career/cv-builder', name: 'cv-builder' },
  { path: '/career/cv', name: 'cv-management' },
  { path: '/profile', name: 'profile' },
  { path: '/career/profile', name: 'candidate-profile' },
  { path: '/auth', name: 'auth' },
  { path: '/settings', name: 'settings' },
  { path: '/help', name: 'help' },
  { path: '/about', name: 'about' },
  { path: '/404', name: 'not-found' },
];

async function setupMocks(page) {
  await page.route('**/health/ready', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', database: 'reachable' }),
    });
  });

  await page.route('**/api/v1/auth/refresh', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'mock-token-xyz',
        expiresIn: 3600,
        user: {
          id: 'usr_test_1',
          email: 'candidate@tronai.tech',
          displayName: '田中 太郎',
          role: 'USER',
          authProviders: ['PASSWORD', 'GOOGLE'],
        },
      }),
    });
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'usr_test_1',
        email: 'candidate@tronai.tech',
        displayName: '田中 太郎',
        role: 'USER',
        authProviders: ['PASSWORD', 'GOOGLE'],
      }),
    });
  });

  await page.route('**/api/v1/auth/providers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        google: { enabled: true, clientId: 'mock-google-client-id' },
      }),
    });
  });

  await page.route('**/api/v1/user/settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        preferredLanguage: 'ja',
        preferredAiProfile: 'SMART',
      }),
    });
  });

  await page.route('**/api/v1/ai/profiles', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        profiles: [
          { id: 'SMART', name: 'Smart (RTX 4060)', description: 'Qwen 3.5 9B Q4', model: 'qwen3.5:9b-q4_K_M', isAvailable: true },
          { id: 'FAST', name: 'Fast (GTX 1070)', description: 'Qwen 3 8B', model: 'qwen3:8b', isAvailable: true },
        ],
      }),
    });
  });

  await page.route('**/api/v1/career/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'usr_test_1',
        email: 'candidate@tronai.tech',
        displayName: '田中 太郎',
        candidateProfile: {
          profileExists: true,
          fullName: '田中 太郎',
          nameJa: '田中 太郎',
          contactEmail: 'candidate@tronai.tech',
          completenessScore: 85,
          expectedGraduationYear: '2026',
          targetJobs: ['Backend Engineer', 'AI Engineer'],
          preferredLocations: ['Tokyo', 'Remote'],
          jlptLevel: 'N1',
          education: ['東京大学 工学部 情報工学科 (2022 - 2026)'],
          skills: ['TypeScript', 'React', 'Go', 'Python', 'Docker'],
          certifications: ['応用情報技術者 (AP)', 'JLPT N1'],
          projects: ['TRON AI Distributed Platform', 'Microservices Pipeline'],
          missingFields: [],
        },
      }),
    });
  });

  await page.route('**/api/v1/career/candidate-profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'cp_test_1',
        nameJa: '田中 太郎',
        nameEn: 'Taro Tanaka',
        contactEmail: 'candidate@tronai.tech',
        phoneNumber: '090-1234-5678',
        completenessScore: 85,
        education: [
          {
            schoolName: '東京大学',
            major: '情報理工学系研究科',
            degree: '修士',
            startDate: '2022-04',
            endDate: '2024-03',
            status: 'Graduated',
          },
        ],
        career: [
          {
            company: 'テックイノベーション株式会社',
            jobTitle: 'Backend Engineer',
            startDate: '2024-04',
            currentlyEmployed: true,
            responsibilities: '分散マイクロサービス基盤の開発・運用',
          },
        ],
        skills: [
          { name: 'Go', category: 'Backend', proficiency: 'Advanced' },
          { name: 'TypeScript', category: 'Frontend', proficiency: 'Advanced' },
        ],
        certifications: [
          { name: '応用情報技術者', issuingOrganization: 'IPA', dateObtained: '2023-04' },
        ],
        projects: [
          { name: 'TRON AI Web App', description: 'Real-time AI career platform', role: 'Lead Architect' },
        ],
        preferences: {
          desiredPositions: ['Software Engineer'],
          workStyles: ['Full Remote', 'Hybrid'],
        },
      }),
    });
  });

  await page.route('**/api/v1/career/cv/documents', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          filename: 'Tanaka_Taro_Resume_2026.pdf',
          fileSize: 1048576,
          mimeType: 'application/pdf',
          profile: {
            education: [{ school: '東京大学' }],
            skills: ['Go', 'TypeScript', 'Docker'],
            workExperience: [{ company: 'テックイノベーション' }],
          },
          createdAt: new Date().toISOString(),
        },
      ]),
    });
  });

  await page.route('**/api/v1/career/cv/drafts', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'draft-1',
          templateCode: 'RIREKISHO_JA',
          title: 'LINEヤフー提出用 履歴書',
          updatedAt: new Date().toISOString(),
          payload: {
            nameJa: '田中 太郎',
            nameKana: 'タナカ タロウ',
            email: 'candidate@tronai.tech',
            phone: '090-1234-5678',
            address: '東京都千代田区1-1',
            education: [{ date: '2024-03', description: '東京大学大学院 修了' }],
            career: [{ date: '2024-04', description: 'テックイノベーション株式会社 入社' }],
          },
        },
      ]),
    });
  });

  await page.route('**/api/v1/career/interviews', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'int-1',
          companyName: 'LINEヤフー株式会社',
          jobPosition: 'Backend Engineer',
          interviewType: 'technical',
          difficulty: 'intermediate',
          overallScore: 88,
          startedAt: new Date(Date.now() - 86400000).toISOString(),
          completedAt: new Date(Date.now() - 85000000).toISOString(),
          finished: true,
        },
      ]),
    });
  });

  await page.route('**/api/v1/career/company-analyses', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

async function isPortOpen(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}`);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log(`=== Starting Capture: Mode=${targetMode} ===`);

  let serverProcess = null;
  const port = 4173;
  const running = await isPortOpen(port);

  if (!running) {
    console.log(`Starting vite preview on port ${port}...`);
    serverProcess = spawn('npx', ['vite', 'preview', '--port', String(port), '--host', '127.0.0.1'], {
      shell: true,
      stdio: 'inherit',
    });

    let attempts = 0;
    while (attempts < 30) {
      await new Promise((r) => setTimeout(r, 500));
      if (await isPortOpen(port)) break;
      attempts++;
    }
  }

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const pageDef of pagesToCapture) {
    for (const vp of viewports) {
      const page = await browser.newPage({
        viewport: { width: vp.width, height: vp.height },
      });

      try {
        await setupMocks(page);
        const url = `http://127.0.0.1:${port}${pageDef.path}`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(600);

        // Check overflow
        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return {
            scrollWidth: doc.scrollWidth,
            clientWidth: doc.clientWidth,
          };
        });

        const hasOverflow = overflow.scrollWidth > overflow.clientWidth + 1;
        const filename = `${pageDef.name}-${vp.name}.png`;
        const filepath = join(outDir, filename);

        await page.screenshot({ path: filepath, fullPage: false });

        results.push({
          page: pageDef.path,
          name: pageDef.name,
          viewport: vp.name,
          scrollWidth: overflow.scrollWidth,
          clientWidth: overflow.clientWidth,
          hasOverflow,
          file: filename,
        });

        console.log(`[${targetMode}] ${pageDef.name} @ ${vp.name}: overflow=${hasOverflow} (${overflow.scrollWidth}/${overflow.clientWidth}) -> ${filename}`);
      } catch (err) {
        console.error(`Error on ${pageDef.path} @ ${vp.name}:`, err.message);
      } finally {
        await page.close();
      }
    }
  }

  await browser.close();

  if (serverProcess) {
    serverProcess.kill();
  }

  console.log(`=== Done Capturing ${results.length} screenshots in ${outDir} ===`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
