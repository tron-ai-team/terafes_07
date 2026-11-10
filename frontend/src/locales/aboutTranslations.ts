export interface AboutTeamMemberTranslation {
  name: string;
  role: string;
  badge: string;
  bio: string;
  responsibilities: string[];
}

export interface AboutLetterTranslation {
  letter: string;
  name: string;
  role: string;
  strength: string;
}

export interface AboutCapabilityTranslation {
  title: string;
  badge: string;
  desc: string;
}

export interface AboutSectionTranslation {
  badge: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  description: string;
  inclusivityNote: string;
  capabilities: {
    chat: AboutCapabilityTranslation;
    voice: AboutCapabilityTranslation;
    interview: AboutCapabilityTranslation;
    cv: AboutCapabilityTranslation;
  };
  meaningOfTron: {
    badge: string;
    title: string;
    motto: string;
    description: string;
    letters: {
      t: AboutLetterTranslation;
      r: AboutLetterTranslation;
      o: AboutLetterTranslation;
      n: AboutLetterTranslation;
    };
  };
  mission: {
    badge: string;
    title: string;
    heading: string;
    description: string;
    quote: string;
    principles: string[];
  };
  vision: {
    badge: string;
    title: string;
    quote: string;
    story: string;
    principles: string[];
  };
  trustBar: {
    realPractice: string;
    jobSkills: string;
    practicalAi: string;
    forEveryone: string;
    confidencePill: string;
  };
  whyWeBuilt: {
    badge: string;
    title: string;
    subtitle: string;
    problemTitle: string;
    problemDesc: string;
    problems: string[];
    approachTitle: string;
    approachDesc: string;
    approaches: string[];
  };
  team: {
    badge: string;
    title: string;
    subtitle: string;
    roleLabel: string;
    responsibilitiesLabel: string;
    members: {
      thushan: AboutTeamMemberTranslation;
      rakib: AboutTeamMemberTranslation;
      minhaj: AboutTeamMemberTranslation;
      nayem: AboutTeamMemberTranslation;
    };
  };
  closing: {
    brand: string;
    tagline: string;
    motto: string;
    description: string;
    ctaInterview: string;
    ctaChat: string;
    ctaVoice: string;
    ctaCv: string;
  };
  // Backwards compatibility legacy fields
  desc?: string;
  pillar1Title?: string;
  pillar1Desc?: string;
  pillar2Title?: string;
  pillar2Desc?: string;
  pillar3Title?: string;
  pillar3Desc?: string;
  platformOverviewTitle?: string;
  platformOverviewDesc?: string;
}

export const aboutEn: AboutSectionTranslation = {
  badge: 'About TRON AI',
  title: 'TRON AI —',
  titleHighlight: 'Empowering Your Next Opportunity',
  subtitle: 'Learn. Practice. Build Confidence. Move Forward.',
  description:
    'TRON AI is an AI-powered platform designed to help people develop communication skills, practice real-world conversations, prepare for Japanese job interviews, and create professional career documents. By bringing AI Chat, natural voice interaction, interview preparation, and resume creation together, we aim to make practical career preparation more accessible and effective.',
  inclusivityNote:
    'Designed for Everyone — Japanese Users, International Talents, Students, and Career Professionals Alike',
  capabilities: {
    chat: {
      title: 'AI Chat',
      badge: 'Learn & Practice',
      desc: 'Ask questions, explore ideas, and practice written conversations with intelligent guidance.',
    },
    voice: {
      title: 'AI Voice',
      badge: 'Speak Naturally',
      desc: 'Develop spoken communication and natural conversation flow through AI-powered voice interaction.',
    },
    interview: {
      title: 'Interview Practice',
      badge: 'Realistic Simulation',
      desc: 'Prepare for Japanese job interviews through realistic practice scenarios and structured feedback.',
    },
    cv: {
      title: 'Create CV',
      badge: 'Professional Resume',
      desc: 'Prepare professional Japanese resumes and English resumes using assisted document creation.',
    },
  },
  meaningOfTron: {
    badge: 'Brand Story',
    title: 'The Meaning of TRON',
    motto: 'Four Individuals. One Vision. TRON.',
    description:
      'TRON represents the collaboration of four developers who brought their different skills together to build something meaningful. Each letter represents a person. Each person contributes a different strength. Together, those strengths form TRON AI.',
    letters: {
      t: {
        letter: 'T',
        name: 'THUSHAN RATHNAYAKA',
        role: 'System Architect & Lead Engineer',
        strength: 'System Architecture, Full-Stack, AI Integration & DevOps',
      },
      r: {
        letter: 'R',
        name: 'MD RAKIB HOSSAIN',
        role: 'Frontend Developer',
        strength: 'Frontend Architecture, React Interfaces & Responsive Design',
      },
      o: {
        letter: 'O',
        name: 'MINHAJ HOSSAIN OPU',
        role: 'Desktop Application Developer',
        strength: 'Desktop Applications, Cross-Platform Functionality & Client Logic',
      },
      n: {
        letter: 'N',
        name: 'MD NAYEM',
        role: 'Backend Developer',
        strength: 'Backend Services, API Architecture & System Scalability',
      },
    },
  },
  mission: {
    badge: 'Our Purpose',
    title: 'Our Mission',
    heading: 'Confidence Through Preparation',
    description:
      'Our mission is to make practical AI-powered learning and career preparation accessible to everyone. We want to help people strengthen their communication abilities, practice interviews with greater confidence, and develop the skills needed to pursue meaningful opportunities. Through realistic practice and continuous improvement, TRON AI aims to help users feel better prepared before important career moments.',
    quote: 'Confidence is built through preparation, not promises.',
    principles: [
      'Practical Learning',
      'Communication Development',
      'Interview Preparation',
      'Accessible AI Tools',
      'Continuous Improvement',
    ],
  },
  vision: {
    badge: 'Our Determination',
    title: 'Our Vision',
    quote: 'Never Give Up. Keep Building. Keep Improving.',
    story:
      'We believe meaningful innovation can begin with a small team and a shared determination to solve real problems. TRON AI started with four developers bringing together their technical skills, ideas, and ambitions. Our vision is to continue learning, improving our technology, and building AI tools that help people overcome challenges and move toward their goals. We may be a small team today, but our ambition is to create technology that makes a meaningful difference. We believe progress comes from persistence, collaboration, and the courage to keep improving.',
    principles: [
      'Small Team, Real Impact',
      'Continuous Learning & Iteration',
      'Persistence in Problem Solving',
      'Human-Centered Practical AI',
    ],
  },
  trustBar: {
    realPractice: 'Real Interview Practice',
    jobSkills: 'Build Job-Ready Skills',
    practicalAi: 'AI-Powered & Practical',
    forEveryone: 'For Everyone (Including Japanese Users)',
    confidencePill: 'Confidence Through Preparation',
  },
  whyWeBuilt: {
    badge: 'Why We Built TRON AI',
    title: 'Solving Real Communication & Interview Challenges',
    subtitle:
      'Preparing for interviews and professional communication can be difficult. We built the tools we wished existed.',
    problemTitle: 'The Real Challenges People Face',
    problemDesc:
      'Preparing for career moments without structured guidance creates unnecessary stress and uncertainty.',
    problems: [
      'Uncertainty on how to structure answers for tough behavioral and technical questions',
      'Limited opportunities to practice spoken Japanese conversations consistently',
      'Struggling to express complex ideas clearly under pressure',
      'Developing genuine confidence without high-stakes trial and error',
      'Preparing professional Japanese resumes (Rirekisho & Shokumukeirekisho) and English CVs',
      'Finding a safe, constructive environment to practice repeatedly without judgment',
    ],
    approachTitle: 'Our Practical Approach',
    approachDesc:
      'We believe AI can make preparation more interactive, accessible, and personalized. TRON AI brings together practical tools to help users prepare, practice, and improve in a safe environment.',
    approaches: [
      'Zero-pressure interactive practice environment available anytime',
      'Realistic Japanese interview simulations matching real company standards',
      'Multi-turn voice interactions to build conversational cadence and fluency',
      'Assisted resume builder for both Japanese corporate and international formats',
    ],
  },
  team: {
    badge: 'Meet Our Team',
    title: 'Meet Our Team',
    subtitle: 'The people behind TRON AI — a passionate team of engineers and creators.',
    roleLabel: 'Role & Specialization',
    responsibilitiesLabel: 'Key Responsibilities',
    members: {
      thushan: {
        name: 'THUSHAN RATHNAYAKA',
        role: 'System Architect & Lead Engineer',
        badge: 'Architecture & Lead',
        bio: "Leads TRON AI's overall technical architecture and works across the complete development stack, including frontend, backend, desktop applications, AI integration, infrastructure, and deployment workflows. Coordinates the technical direction and brings the different platform components together into one unified system.",
        responsibilities: [
          'Overall System Architecture',
          'Full-Stack Development',
          'Frontend Development',
          'Backend Development',
          'Desktop Application Development',
          'AI Model and Service Integration',
          'DevOps Engineering & CI/CD',
          'Infrastructure Integration',
          'Technical System Coordination',
        ],
      },
      rakib: {
        name: 'MD RAKIB HOSSAIN',
        role: 'Frontend Developer',
        badge: 'Frontend & UI/UX',
        bio: "Contributes to the development of TRON AI's web interface, focusing on frontend implementation, responsive components, and the overall user experience.",
        responsibilities: [
          'Frontend Development',
          'React Interface Development',
          'User Interface Implementation',
          'Responsive Layouts Across Devices',
          'Frontend Component Development',
          'Performance & Accessibility Optimization',
        ],
      },
      minhaj: {
        name: 'MINHAJ HOSSAIN OPU',
        role: 'Desktop Application Developer',
        badge: 'Desktop Engineering',
        bio: "Contributes to the development of TRON AI's desktop application, helping build the desktop experience and integrate application functionality into a usable interface.",
        responsibilities: [
          'Desktop Application Development',
          'Desktop Interface Implementation',
          'Application Functionality & Logic',
          'Desktop Integration & Platform Performance',
          'Client-Side Workflow Integration',
        ],
      },
      nayem: {
        name: 'MD NAYEM',
        role: 'Backend Developer',
        badge: 'Backend & Systems',
        bio: "Contributes to TRON AI's backend development, supporting application logic, API implementation, and integration between the frontend and backend services.",
        responsibilities: [
          'Backend Development',
          'API Architecture & Development',
          'Server-Side Application Logic',
          'Backend Service Integration',
          'Data Processing, Stability & Scaling',
        ],
      },
    },
  },
  closing: {
    brand: 'TRON AI',
    tagline: 'Four Minds. One Vision. Endless Possibilities.',
    motto: 'Never Give Up. Keep Building. Keep Improving.',
    description:
      'From individual practice sessions to decisive career opportunities, TRON AI is built to help you grow with confidence and reach your potential.',
    ctaInterview: 'Start Interview Practice',
    ctaChat: 'Launch AI Chat',
    ctaVoice: 'Start AI Voice Mode',
    ctaCv: 'Build Professional CV',
  },
};

export const aboutJa: AboutSectionTranslation = {
  badge: 'TRON AI について',
  title: 'TRON AI —',
  titleHighlight: '次の可能性を切り拓くパートナー',
  subtitle: '学び、対話し、自信を築き、次の一歩へ。',
  description:
    'TRON AIは、コミュニケーション能力の向上、実践的な対話練習、日本の就職面接対策、そしてプロフェッショナルな応募書類の作成をトータルで支援するAIプラットフォームです。AIチャット、自然な音声対話、面接シミュレーション、履歴書作成をひとつに統合し、より身近で効果的なキャリア準備を実現します。',
  inclusivityNote:
    'すべての人のために — 日本国内の求職者、留学生、グローバル人材、学生まで幅広く対応',
  capabilities: {
    chat: {
      title: 'AIチャット',
      badge: '学習と実践',
      desc: '質問、アイデアの整理、論理的な文章対話をスムーズに練習。',
    },
    voice: {
      title: 'AI音声モード',
      badge: '自然な発話対話',
      desc: '自然なAI音声対話を通じて、リアルな発話力と瞬発力を養成。',
    },
    interview: {
      title: '面接対策',
      badge: 'リアルな面接体験',
      desc: '日本の採用基準に即した実践的な模擬面接で本番対応力を習得。',
    },
    cv: {
      title: '履歴書作成',
      badge: 'プロ品質の応募書類',
      desc: '日本語の履歴書・職務経歴書および英文レジュメを効率的に作成。',
    },
  },
  meaningOfTron: {
    badge: 'ブランドストーリー',
    title: 'TRONという名前に込めた意味',
    motto: '4人の個性。ひとつのビジョン。TRON。',
    description:
      'TRONという名前は、4人の開発メンバーそれぞれの頭文字から名付けられました。異なる強みを持つエンジニアが集い、互いの技術と情熱を重ね合わせて生まれたのがTRON AIです。それぞれの文字が一人を表し、それぞれが独自の価値を提供しています。',
    letters: {
      t: {
        letter: 'T',
        name: 'THUSHAN RATHNAYAKA',
        role: 'システムアーキテクト & リードエンジニア',
        strength: 'システム全体の設計、フルスタック開発、AI統合、DevOps基盤',
      },
      r: {
        letter: 'R',
        name: 'MD RAKIB HOSSAIN',
        role: 'フロントエンドエンジニア',
        strength: 'React UI実装、レスポンシブデザイン、快適なユーザー体験',
      },
      o: {
        letter: 'O',
        name: 'MINHAJ HOSSAIN OPU',
        role: 'デスクトップアプリエンジニア',
        strength: 'デスクトップ環境開発、マルチプラットフォーム機能統合',
      },
      n: {
        letter: 'N',
        name: 'MD NAYEM',
        role: 'バックエンドエンジニア',
        strength: 'サーバーサイドロジック、API開発、堅牢なデータ通信',
      },
    },
  },
  mission: {
    badge: '私たちのミッション',
    title: '私たちのミッション',
    heading: '準備が生み出す自信',
    description:
      '私たちのミッションは、実用的なAI学習とキャリア準備の機会を、すべての人へ平等に届けることです。対話力を磨き、面接に対する自信を育み、自分らしい未来を切り拓くためのスキル習得を支えます。実践的な練習と日々の改善を通じて、人生の大切な瞬間に胸を張って臨めるようサポートします。',
    quote: '「自信とは、約束ではなく準備によって築かれるもの。」',
    principles: [
      '実践重視の学習',
      'コミュニケーション能力の向上',
      '体系的な面接対策',
      '誰もが使いやすいAIツール',
      '継続的な改善と前進',
    ],
  },
  vision: {
    badge: '私たちのビジョン',
    title: '私たちのビジョン',
    quote: '「諦めずに、挑戦し続ける。創り続け、改善し続ける。」',
    story:
      '小さなチームであっても、確固たる決意と課題解決への情熱があれば、価値あるイノベーションを生み出せると信じています。TRON AIは4人のエンジニアが集い、技術とアイデア、そして志を共有することから始まりました。学び続け、技術を磨き、誰もが壁を乗り越えて目標へ進めるAIツールを創り届けること——私たちはまだ始まったばかりのチームですが、着実な技術で世の中に確かな価値をもたらす挑戦を止めません。',
    principles: [
      '少人数チームによる確かな価値の創出',
      '学びと改善を止めない継続力',
      '課題に対する粘り強い探求',
      'ユーザーに寄り添う実用技術の追求',
    ],
  },
  trustBar: {
    realPractice: '実践的な面接シミュレーション',
    jobSkills: '実務で活きるスキルの習得',
    practicalAi: '実用性を追求したAIツール',
    forEveryone: 'すべてのユーザーに向けた設計（日本国内・海外人材）',
    confidencePill: '準備が生み出す自信',
  },
  whyWeBuilt: {
    badge: '私たちがTRON AIを創った理由',
    title: 'キャリア準備と面接における課題を解決するために',
    subtitle: '面接への不安を、自信へと変える実践環境をつくりたい。',
    problemTitle: '面接準備において直面するリアルな課題',
    problemDesc:
      '面接やプロフェッショナルな対話の準備には、多くの人が高いハードルを感じています。',
    problems: [
      '質問に対してどう答えるべきか、構造的な答え方に迷ってしまう',
      '日常的に日本語で話す練習機会が不足している',
      '緊張した場面で自分の考えや技術的強みを明確に伝えられない',
      '本番前に確固たる自信を築くのが難しい',
      '日本の様式に適合した履歴書・職務経歴書の作成に手間がかかる',
      '評価や失敗を気にせず安心して練習できる機会が限られている',
    ],
    approachTitle: '私たちのアプローチ',
    approachDesc:
      '私たちは、AIを活用することで準備のプロセスをより対話的で、身近で、一人ひとりに適したものにできると考えています。TRON AIは、誰もがプレッシャーを感じることなく実践を重ね、着実に成長できるツールを統合しました。',
    approaches: [
      'いつでも24時間、心理的プレッシャーなく対話できる練習環境',
      '日本の採用基準に即した実践的な面接シミュレーション',
      '自然な音声対話による発話リズムと表現力の向上',
      '日・英バイリンガルに対応したアシスト型履歴書作成ツール',
    ],
  },
  team: {
    badge: '開発チームの紹介',
    title: 'TRON AIを創るエンジニアたち',
    subtitle: '4人の開発者がそれぞれの専門性を結集し、実用的で信頼できるAIを追求しています。',
    roleLabel: '担当領域',
    responsibilitiesLabel: '主な開発領域',
    members: {
      thushan: {
        name: 'THUSHAN RATHNAYAKA',
        role: 'System Architect & Lead Engineer',
        badge: 'アーキテクチャ & リード',
        bio: 'TRON AI全体の技術アーキテクチャを統括し、フロントエンド、バックエンド、デスクトップアプリ、AI統合、インフラ基盤、CI/CDまでフルスタックで開発を担当。各システムを有機的に結合し、統一されたプラットフォームとして牽引しています。',
        responsibilities: [
          'システム全体のアーキテクチャ設計・統括',
          'フルスタック開発',
          'フロントエンド開発',
          'バックエンド開発',
          'デスクトップアプリケーション開発',
          'AIモデルおよび各クラウドサービスの統合',
          'DevOpsエンジニアリングおよびCI/CDパイプライン構築',
          'インフラ環境連携とシステム間協調',
          '技術全体の品質管理と方向性の統括',
        ],
      },
      rakib: {
        name: 'MD RAKIB HOSSAIN',
        role: 'Frontend Developer',
        badge: 'フロントエンド & UI/UX',
        bio: 'TRON AIのWebインターフェース開発を担当し、Reactコンポーネントの実装、レスポンシブデザイン、および直感的で快適なユーザー体験の構築に注力しています。',
        responsibilities: [
          'フロントエンド開発',
          'Reactインターフェース開発',
          'ユーザーインターフェースの実装',
          '多様な画面サイズに対応するレスポンシブレイアウト',
          'フロントエンドコンポーネントの設計・実装',
          '操作性とデザインシステムの最適化',
        ],
      },
      minhaj: {
        name: 'MINHAJ HOSSAIN OPU',
        role: 'Desktop Application Developer',
        badge: 'デスクトップ開発',
        bio: 'TRON AIのデスクトップアプリケーション開発を担当し、各OS環境で快適かつ安定して動作するデスクトップ体験の実現と機能連携を担っています。',
        responsibilities: [
          'デスクトップアプリケーション開発',
          'デスクトップユーザーインターフェース実装',
          'アプリケーション機能と状態管理の実装',
          'デスクトッププラットフォーム連携',
          'ネイティブ環境での動作最適化',
        ],
      },
      nayem: {
        name: 'MD NAYEM',
        role: 'Backend Developer',
        badge: 'バックエンド & API',
        bio: 'TRON AIのバックエンド開発を担当し、アプリケーションロジック、各種APIの実装、およびフロントエンドとサーバーサイドサービスの円滑な連携を支えています。',
        responsibilities: [
          'バックエンド開発',
          'API設計・実装',
          'サーバーサイドアプリケーションロジック',
          'バックエンドサービス統合',
          'データ通信の安定性と保守',
        ],
      },
    },
  },
  closing: {
    brand: 'TRON AI',
    tagline: 'Four Minds. One Vision. Endless Possibilities.',
    motto: '「諦めずに、挑戦し続ける。創り続け、改善し続ける。」',
    description:
      '日々の練習セッションから、大切なキャリアの決定的な瞬間まで。TRON AIはあなたの成長を後押しし、可能性を広げ続けます。',
    ctaInterview: '面接シミュレーションを始める',
    ctaChat: 'AIチャットを開く',
    ctaVoice: '音声モードを試す',
    ctaCv: '履歴書を作成する',
  },
};

// Fallback translations for bn, ne, my (English base with native headings)
export const aboutBn: AboutSectionTranslation = {
  ...aboutEn,
  badge: 'TRON AI পরিচিতি',
  title: 'TRON AI —',
  titleHighlight: 'আপনার পরবর্তী সুযোগকে বাস্তব রূপ দিন',
  subtitle: 'শিখুন। অনুশীলন করুন। আত্মবিশ্বাস গড়ুন। এগিয়ে যান।',
};

export const aboutNe: AboutSectionTranslation = {
  ...aboutEn,
  badge: 'TRON AI को बारेमा',
  title: 'TRON AI —',
  titleHighlight: 'तपाईंको नयाँ अवसरको साझेदार',
  subtitle: 'सिक्नुहोस्। अभ्यास गर्नुहोस्। आत्मविश्वास बढाउनुहोस्। अघि बढ्नुहोस्।',
};

export const aboutMy: AboutSectionTranslation = {
  ...aboutEn,
  badge: 'TRON AI အကြောင်း',
  title: 'TRON AI —',
  titleHighlight: 'သင်၏ နောက်အခွင့်အလမ်းသစ်ကို တည်ဆောက်ပါ',
  subtitle: 'လေ့လာပါ။ လက်တွေ့လေ့ကျင့်ပါ။ ယုံကြည်မှုတည်ဆောက်ပါ။ ရှေ့သို့လှမ်းပါ။',
};

