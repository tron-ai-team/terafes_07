export type SupportedLanguage = 'en' | 'ja' | 'si' | 'bn' | 'ne' | 'my';

export interface LanguageInfo {
  code: SupportedLanguage;
  label: string;
  nativeName: string;
}

export interface FeatureTranslation {
  title: string;
  shortDesc: string;
  badge: string;
  fullDesc: string;
  keyFeatures: string[];
  actionText: string;
}

export interface TranslationSchema {
  nav: {
    home: string;
    features: string;
    aiModels: string;
    pricing: string;
    about: string;
    help: string;
    signIn: string;
    getStarted: string;
    workspace: string;
    logOut: string;
  };
  hero: {
    badge: string;
    titlePart1: string;
    titleHighlight1: string;
    titlePart2: string;
    titleHighlight2: string;
    description: string;
    startForFree: string;
    watchDemo: string;
    demoOverview: string;
    exploreTron: string;
    badgeLocalCloud: string;
    badgeJapaneseInterview: string;
    badgeMultilingual: string;
  };
  features: {
    sectionBadge: string;
    sectionTitle: string;
    sectionDesc: string;
    chat: FeatureTranslation;
    voice: FeatureTranslation;
    interview: FeatureTranslation;
    coding: FeatureTranslation;
    career: FeatureTranslation;
    launchInApp: string;
    donePreviewing: string;
    interactiveDemoTitle: string;
    modalSubtitle: string;
  };
  stats: {
    trustedBy: string;
    engineers: string;
    conversations: string;
    passRate: string;
    support: string;
  };
  howItWorks: {
    badge: string;
    title: string;
    subtitle: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
  };
  intelligence: {
    badge: string;
    title: string;
    desc: string;
    localAiTitle: string;
    localAiDesc: string;
    localAiBullet1: string;
    localAiBullet2: string;
    localAiBullet3: string;
    cloudAiTitle: string;
    cloudAiDesc: string;
    cloudAiBullet1: string;
    cloudAiBullet2: string;
    cloudAiBullet3: string;
    hybridRoutingTitle: string;
    hybridRoutingDesc: string;
    hybridRoutingBullet1: string;
    hybridRoutingBullet2: string;
    hybridRoutingBullet3: string;
    disclaimer: string;
  };
  desktopAgent: {
    badge: string;
    title: string;
    desc: string;
    feature1: string;
    feature2: string;
    feature3: string;
    feature4: string;
    note: string;
    windowTitle: string;
    terminalTab: string;
    diffTab: string;
    securityTab: string;
    openWorkspaceAgent: string;
  };
  aiModels: {
    badge: string;
    title: string;
    desc: string;
    autoTitle: string;
    autoDesc: string;
    fastTitle: string;
    fastDesc: string;
    smartTitle: string;
    smartDesc: string;
    ultraTitle: string;
    ultraDesc: string;
    localEngine: string;
    cloudEngine: string;
    configuredProviders: string;
  };
  pricing: {
    badge: string;
    title: string;
    desc: string;
    plansComingSoon: string;
    plansComingSoonDesc: string;
    freeTierName: string;
    freeTierDesc: string;
    freeTierPrice: string;
    freeTierPeriod: string;
    proTierName: string;
    proTierDesc: string;
    proTierPrice: string;
    proTierPeriod: string;
    enterpriseTierName: string;
    enterpriseTierDesc: string;
    enterpriseTierPrice: string;
    enterpriseTierPeriod: string;
    getStartedFree: string;
    joinWaitlist: string;
    contactUs: string;
  };
  about: {
    badge: string;
    title: string;
    desc: string;
    pillar1Title: string;
    pillar1Desc: string;
    pillar2Title: string;
    pillar2Desc: string;
    pillar3Title: string;
    pillar3Desc: string;
    platformOverviewTitle: string;
    platformOverviewDesc: string;
  };
  help: {
    badge: string;
    title: string;
    desc: string;
    faqTitle: string;
    faq1Q: string;
    faq1A: string;
    faq2Q: string;
    faq2A: string;
    faq3Q: string;
    faq3A: string;
    faq4Q: string;
    faq4A: string;
    supportNote: string;
  };
  cta: {
    title: string;
    subtitle: string;
    button: string;
    secondary: string;
  };
  footer: {
    tagline: string;
    product: string;
    resources: string;
    company: string;
    chatModule: string;
    voiceModule: string;
    interviewModule: string;
    codingModule: string;
    careerModule: string;
    docs: string;
    guides: string;
    about: string;
    privacy: string;
    terms: string;
    copyright: string;
  };
  auth: {
    signInTitle: string;
    signUpTitle: string;
    emailLabel: string;
    emailPlaceholder: string;
    passwordLabel: string;
    passwordPlaceholder: string;
    fullNameLabel: string;
    fullNamePlaceholder: string;
    confirmPasswordLabel: string;
    confirmPasswordPlaceholder: string;
    agreeTerms: string;
    signInBtn: string;
    signUpBtn: string;
    alreadyHaveAccount: string;
    dontHaveAccount: string;
    googleSignIn: string;
    googleUnavailable: string;
    authenticating: string;
  };
  sidebar: {
    chat: string;
    voice: string;
    workspace: string;
    careerCenter: string;
    codingAgent: string;
    devices: string;
    activeTasks: string;
    history: string;
    settings: string;
    admin: string;
    help: string;
    about: string;
    logout: string;
    newChat: string;
    newVoice: string;
    newCodingTask: string;
    newInterview: string;
  };
  topbar: {
    chat: string;
    voice: string;
    workspace: string;
    careerCenter: string;
    language: string;
    profile: string;
    connected: string;
    offline: string;
  };
  common: {
    loading: string;
    error: string;
    success: string;
    close: string;
    cancel: string;
    save: string;
    confirm: string;
    back: string;
    launchApp: string;
    openWorkspace: string;
    returnToLanding: string;
  };
}
