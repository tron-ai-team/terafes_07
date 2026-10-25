import { CareerJobResult, CareerAgentStep, CareerAgentMetrics } from '../types/careerAgent';

export const DEMO_CAREER_STEPS: CareerAgentStep[] = [
  {
    step: 1,
    title: 'Candidate Profile Loaded',
    description: 'Extracted candidate technical skills, education, and language proficiencies from active CV.',
    status: 'completed',
    timestamp: '00:01',
  },
  {
    step: 2,
    title: 'Target Website Opened',
    description: 'Navigated to public careers portal: https://www.lycorp.co.jp/ja/careers/jobs.',
    status: 'completed',
    timestamp: '00:03',
  },
  {
    step: 3,
    title: '34 Job Listings Discovered',
    description: 'Located active job postings under Engineering and Technology divisions.',
    status: 'completed',
    timestamp: '00:07',
  },
  {
    step: 4,
    title: '27 Relevant Job Pages Analyzed',
    description: 'Inspected role requirements, tech stack requirements, and visa/education criteria.',
    status: 'completed',
    timestamp: '00:12',
  },
  {
    step: 5,
    title: '4 Duplicate Listings Removed',
    description: 'Pruned redundant entries and external recruiter reposts.',
    status: 'completed',
    timestamp: '00:14',
  },
  {
    step: 6,
    title: '23 Jobs Compared Against Profile',
    description: 'Evaluated Java, Spring Boot, database skills, and Japanese JLPT level fit.',
    status: 'completed',
    timestamp: '00:16',
  },
  {
    step: 7,
    title: 'Top Shortlist Ranked',
    description: 'Generated top recommendations ordered by weighted match score.',
    status: 'completed',
    timestamp: '00:18',
  },
];

export const DEMO_CAREER_METRICS: CareerAgentMetrics = {
  jobsDiscovered: 34,
  jobsAnalyzed: 23,
  jobsMatched: 3,
  durationMs: 18400,
  aiProfile: 'QUALITY',
};

export const DEMO_CAREER_RESULTS: CareerJobResult[] = [
  {
    id: 'demo-job-1',
    title: 'Backend Software Engineer (Java / Spring Boot / Distributed Systems)',
    company: 'LINE Yahoo Corporation (LINEヤフー株式会社)',
    location: 'Tokyo, Japan (Kioicho HQ / Hybrid)',
    sourceUrl: 'https://www.lycorp.co.jp/ja/careers/jobs/backend-engineer-tokyo',
    matchScore: 92,
    matchTier: 'HIGH',
    employmentType: 'Full-time (正社員)',
    newGraduateEligible: true,
    requiredSkills: ['Java', 'Spring Boot', 'SQL / RDBMS', 'REST API', 'Git', 'Linux'],
    matchedSkills: ['Java', 'Spring Boot', 'SQL', 'REST API', 'Git'],
    missingSkills: ['Apache Kafka', 'Distributed Cache (Redis)'],
    japaneseRequirement: 'Business Japanese (JLPT N2+ equivalent)',
    educationRequirement: '専門学校 (Vocational College) / University Degree Eligible',
    experienceRequirement: 'Entry Level / New Graduate or 1+ years development experience',
    visaSupport: true,
    salary: '5,200,000 - 7,500,000 JPY / year',
    reasons: [
      'Strong match with your Java 17 and Spring Boot core competencies.',
      'Explicitly accepts Japanese vocational college (専門学校) graduates.',
      'International engineering environment with working visa sponsorship support.',
    ],
    risks: [
      'System design questions regarding database concurrency and caching will be evaluated.',
      'Japanese communication during technical interview will assess polite workplace speech (丁寧語).',
    ],
    discoveredAt: '2026-10-16T14:30:00Z',
    fullDescription: `LINEヤフー株式会社では、大規模トラフィックを支えるバックエンドエンジニアを募集しています。
主な業務内容:
- Java / Spring Bootを用いたマイクロサービスAPIの設計・開発・運用
- 高可用性データベースおよび分散キャッシュの最適化
- コードレビューおよびCI/CDパイプラインを活用した継続的デリバリー
求めるスキル:
- Javaを用いたWebアプリケーション開発経験
- RDBMS（MySQL / PostgreSQL）のテーブル設計およびクエリ最適化
- チームでのGitを用いた協調開発経験
歓迎スキル:
- Kafka / RabbitMQ等のメッセージングシステムの利用経験
- Docker / Kubernetes等によるコンテナ運用知識
- JLPT N2以上の日本語コミュニケーション能力`,
    saved: false,
  },
  {
    id: 'demo-job-2',
    title: 'Server-Side Engineer (Go / Microservices Architecture)',
    company: 'Mercari, Inc. (株式会社メルカリ)',
    location: 'Tokyo, Japan (Roppongi Hills / Full Remote Compatible)',
    sourceUrl: 'https://careers.mercari.com/open-positions/backend-engineer',
    matchScore: 84,
    matchTier: 'HIGH',
    employmentType: 'Full-time (正社員)',
    newGraduateEligible: true,
    requiredSkills: ['Go or Java', 'MySQL', 'Docker', 'REST API / gRPC', 'Microservices'],
    matchedSkills: ['Backend Architecture', 'SQL', 'REST API', 'Docker basics'],
    missingSkills: ['Go production experience', 'gRPC Protocol Buffers'],
    japaneseRequirement: 'Conversational Japanese (N3+) with English proficiency',
    educationRequirement: 'Not stated (Skills & portfolio evaluated directly)',
    experienceRequirement: 'New Graduate / Junior developer with web backend projects',
    visaSupport: true,
    salary: '5,000,000 - 7,000,000 JPY / year',
    reasons: [
      'High overlap in backend fundamentals and software design patterns.',
      'Mercari provides intensive internal language training (English & Japanese).',
      'Flexible work-from-anywhere policy across Japan.',
    ],
    risks: [
      'Core backend production stack is written in Go; candidate with Java background must demonstrate fast learning agility.',
    ],
    discoveredAt: '2026-10-16T14:31:00Z',
    fullDescription: `メルカリのマーケットプレイスを支えるサーバーサイドシステムの開発・運用を担当します。
主な業務:
- 大規模分散マイクロサービスの開発およびスケーラビリティ向上
- GCP / Kubernetes環境でのサービス運用
- 決済や取引における高信頼性トランザクションの設計`,
    saved: false,
  },
  {
    id: 'demo-job-3',
    title: 'Web Application Engineer (Java / TypeScript / Spring)',
    company: 'Rakuten Group, Inc. (楽天グループ株式会社)',
    location: 'Tokyo, Japan (Futako-Tamagawa Crimson House)',
    sourceUrl: 'https://corp.rakuten.co.jp/careers/opportunities/application-engineer',
    matchScore: 78,
    matchTier: 'MEDIUM',
    employmentType: 'Full-time (正社員)',
    newGraduateEligible: true,
    requiredSkills: ['Java', 'Spring', 'HTML/CSS/JavaScript', 'Oracle / MySQL', 'English'],
    matchedSkills: ['Java', 'Spring', 'Database design', 'Web fundamentals'],
    missingSkills: ['TOEIC 800+ score certification'],
    japaneseRequirement: 'Business Japanese (N2) & English communication',
    educationRequirement: '専門学校 / 短大 / 4年制大学卒業資格',
    experienceRequirement: 'Entry Level / 2026-2027 New Graduate eligible',
    visaSupport: true,
    salary: '4,800,000 - 6,500,000 JPY / year',
    reasons: [
      'Extensive career development roadmap for new engineering graduates.',
      'Strong fit with candidate Java enterprise framework knowledge.',
    ],
    risks: [
      'Company policy requires TOEIC 800+ English score before completion of onboarding or promotion.',
    ],
    discoveredAt: '2026-10-16T14:32:00Z',
    fullDescription: `楽天エコシステムのコアサービスを担うエンジニアを募集しています。
Javaによる堅牢なバックエンド開発と、現代的なフロントエンド技術を組み合わせたフルスタックな成長環境が整っています。`,
    saved: false,
  },
];
