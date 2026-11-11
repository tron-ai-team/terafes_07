/**
 * TRON AI — Enterprise Admin Control Center
 * Comprehensive Bilingual Localization (English & Japanese)
 */

export interface AdminTranslationDict {
  badge: {
    adminTitle: string;
    controlCenter: string;
    fullAccess: string;
    managerAccess: string;
    demoMode: string;
    liveApi: string;
    demoNote: string;
    ownerProtected: string;
  };
  sidebar: {
    overview: string;
    userManagement: string;
    quotas: string;
    analytics: string;
    providers: string;
    costs: string;
    security: string;
    auditLogs: string;
    announcements: string;
    systemHealth: string;
    settings: string;
    returnToApp: string;
    collapse: string;
    expand: string;
  };
  header: {
    refresh: string;
    refreshing: string;
    notifications: string;
    profile: string;
    logout: string;
    demoBannerTitle: string;
    demoBannerDesc: string;
  };
  overview: {
    title: string;
    subtitle: string;
    totalUsers: string;
    activeUsers: string;
    aiRequestsToday: string;
    estAiCostToday: string;
    vsLastWeek: string;
    vsAvg: string;
    aiRequests7Days: string;
    aiFeatureUsageToday: string;
    aiProvidersStatus: string;
    systemHealth: string;
    allSystemsOperational: string;
    requests: string;
    viewAllProviders: string;
    viewSystemHealth: string;
    uptime: string;
    avgLatency: string;
    successRate: string;
  };
  users: {
    title: string;
    subtitle: string;
    createUser: string;
    inviteUser: string;
    exportCsv: string;
    searchPlaceholder: string;
    allFilter: string;
    activeFilter: string;
    suspendedFilter: string;
    disabledFilter: string;
    googleFilter: string;
    emailFilter: string;
    adminFilter: string;
    columns: {
      user: string;
      id: string;
      provider: string;
      role: string;
      status: string;
      registered: string;
      lastLogin: string;
      usageToday: string;
      actions: string;
    };
    drawer: {
      profileTitle: string;
      accountDetails: string;
      googleAuthNote: string;
      aiUsageBreakdown: string;
      dailyRequests: string;
      monthlyRequests: string;
      tokensConsumed: string;
      estimatedCost: string;
      accountControls: string;
      suspendAccount: string;
      restoreAccount: string;
      changeRole: string;
      resetPassword: string;
      customQuotas: string;
      deleteAccount: string;
      historyTitle: string;
    };
    modal: {
      createUserTitle: string;
      inviteUserTitle: string;
      resetPasswordTitle: string;
      suspendTitle: string;
      restoreTitle: string;
      deleteTitle: string;
      emailLabel: string;
      nameLabel: string;
      roleLabel: string;
      tempPasswordLabel: string;
      suspendReasonLabel: string;
      deleteConfirmPrompt: string;
      deleteTypeEmailPrompt: string;
    };
  };
  quotas: {
    title: string;
    subtitle: string;
    globalLimitsTitle: string;
    globalLimitsDesc: string;
    editGlobalLimits: string;
    chatLimit: string;
    voiceLimit: string;
    interviewLimit: string;
    cvMagicLimit: string;
    cvAssistLimit: string;
    dailyTokens: string;
    monthlyTokens: string;
    monthlySpendCap: string;
    resetSchedule: string;
    featureTogglesTitle: string;
    rolePresetsTitle: string;
    individualOverridesTitle: string;
    individualOverridesDesc: string;
    addOverride: string;
    overrideActive: string;
    inheritingGlobal: string;
    resetToDefault: string;
    resetUsageToday: string;
  };
  analytics: {
    title: string;
    subtitle: string;
    timeRange: {
      today: string;
      last7d: string;
      last30d: string;
      custom: string;
    };
    kpi: {
      totalUsers: string;
      activeUsers: string;
      newSignups: string;
      requestsToday: string;
      requestsMonth: string;
      tokensConsumed: string;
      estimatedSpend: string;
      failedRequests: string;
    };
    charts: {
      dailyRequests: string;
      userGrowth: string;
      tokenBreakdown: string;
      featureDistribution: string;
      providerTraffic: string;
      dailyCostTrend: string;
      latencyErrorTrend: string;
    };
  };
  providers: {
    title: string;
    subtitle: string;
    activeProviders: string;
    fallbackOrderTitle: string;
    routingMatrixTitle: string;
    credentialSecure: string;
    testPing: string;
    latencyMs: string;
    requests24h: string;
    preferredModel: string;
    status: string;
  };
  costs: {
    title: string;
    subtitle: string;
    todayCost: string;
    monthCost: string;
    budgetCap: string;
    projectedCost: string;
    budgetUsage: string;
    costByProvider: string;
    costByFeature: string;
    topUsersCost: string;
    configureAlerts: string;
  };
  security: {
    title: string;
    subtitle: string;
    authOverview: string;
    googleOauth: string;
    emailAuth: string;
    adminMfa: string;
    activeSessions: string;
    failedLogins: string;
    revokeAllUserSessions: string;
    emergencyRevoke: string;
    securityEvents: string;
    roleMatrix: string;
  };
  audit: {
    title: string;
    subtitle: string;
    filterAction: string;
    filterAdmin: string;
    filterResult: string;
    exportLogs: string;
    timestamp: string;
    admin: string;
    action: string;
    target: string;
    result: string;
    details: string;
    drawerTitle: string;
  };
  announcements: {
    title: string;
    subtitle: string;
    newAnnouncement: string;
    all: string;
    published: string;
    scheduled: string;
    drafts: string;
    expired: string;
    titleField: string;
    messageField: string;
    audienceField: string;
    priorityField: string;
    dateRange: string;
    preview: string;
    publishNow: string;
    saveDraft: string;
  };
  health: {
    title: string;
    subtitle: string;
    allSystemsOk: string;
    serviceStatus: string;
    uptimePercentage: string;
    averageLatency: string;
    errorRate: string;
    runHealthProbe: string;
    recentSystemLogs: string;
    componentStatus: string;
  };
  settings: {
    title: string;
    subtitle: string;
    platformMode: string;
    normalMode: string;
    exhibitionMode: string;
    maintenanceMode: string;
    routingControls: string;
    localRouting: string;
    cloudRouting: string;
    pauseAi: string;
    stopAgentJobs: string;
    uiPreferences: string;
    language: string;
    currency: string;
    refreshInterval: string;
    saveChanges: string;
  };
  common: {
    save: string;
    cancel: string;
    confirm: string;
    delete: string;
    edit: string;
    close: string;
    loading: string;
    noData: string;
    statusActive: string;
    statusSuspended: string;
    statusDisabled: string;
    statusOnline: string;
    statusOffline: string;
    statusDegraded: string;
    successToast: string;
    errorToast: string;
    copied: string;
  };
}

export const adminTranslations: Record<'en' | 'ja', AdminTranslationDict> = {
  en: {
    badge: {
      adminTitle: 'TRON AI',
      controlCenter: 'Admin Control Center',
      fullAccess: 'Owner (Full Access)',
      managerAccess: 'Administrator (Manage)',
      demoMode: 'DEMO FIXTURES',
      liveApi: 'LIVE SPRING API',
      demoNote: 'Actions simulate enterprise flows. Safe mode enabled for backend handoff.',
      ownerProtected: 'Protected System Account',
    },
    sidebar: {
      overview: 'Overview',
      userManagement: 'User Management',
      quotas: 'AI Usage & Quotas',
      analytics: 'AI Analytics',
      providers: 'AI Providers',
      costs: 'Costs & Budgets',
      security: 'Security Center',
      auditLogs: 'Audit Logs',
      announcements: 'Announcements',
      systemHealth: 'System Health',
      settings: 'Admin Settings',
      returnToApp: 'Return to TRON AI App',
      collapse: 'Collapse Sidebar',
      expand: 'Expand Sidebar',
    },
    header: {
      refresh: 'Refresh',
      refreshing: 'Refreshing...',
      notifications: 'Notifications',
      profile: 'Admin Profile',
      logout: 'Sign Out',
      demoBannerTitle: 'Enterprise Admin Sandbox Active',
      demoBannerDesc:
        'Connected to live Spring Boot endpoints where available with rich typed fallback fixtures ready for Cursor backend integration.',
    },
    overview: {
      title: 'Overview',
      subtitle: 'Platform overview, usage, and system status.',
      totalUsers: 'Total Users',
      activeUsers: 'Active Users',
      aiRequestsToday: 'AI Requests Today',
      estAiCostToday: 'Est. AI Cost (Today)',
      vsLastWeek: 'vs 7d ago',
      vsAvg: 'vs daily avg',
      aiRequests7Days: 'AI Requests (Last 7 Days)',
      aiFeatureUsageToday: 'AI Feature Usage (Today)',
      aiProvidersStatus: 'AI Providers Status',
      systemHealth: 'System Health',
      allSystemsOperational: 'All Systems Operational',
      requests: 'Requests',
      viewAllProviders: 'Manage Providers →',
      viewSystemHealth: 'View Health Details →',
      uptime: 'Uptime',
      avgLatency: 'Avg. Latency',
      successRate: 'Success Rate',
    },
    users: {
      title: 'User Management',
      subtitle: 'Manage user accounts, authentication providers, and access roles.',
      createUser: '+ Add User',
      inviteUser: 'Invite User',
      exportCsv: 'Export CSV',
      searchPlaceholder: 'Search by name, email, or user ID...',
      allFilter: 'All Users',
      activeFilter: 'Active',
      suspendedFilter: 'Suspended',
      disabledFilter: 'Disabled',
      googleFilter: 'Google Sign-In',
      emailFilter: 'Email / Password',
      adminFilter: 'Administrators',
      columns: {
        user: 'User / Identity',
        id: 'ID',
        provider: 'Auth Provider',
        role: 'Role',
        status: 'Status',
        registered: 'Registered',
        lastLogin: 'Last Active',
        usageToday: 'AI Today',
        actions: 'Actions',
      },
      drawer: {
        profileTitle: 'User Profile & Identity',
        accountDetails: 'Account Metadata',
        googleAuthNote:
          'Authenticated via Google OAuth. User passwords are managed by Google and are never stored or accessible to admins.',
        aiUsageBreakdown: 'AI Usage & Token Consumption',
        dailyRequests: 'Daily Requests',
        monthlyRequests: 'Monthly Requests',
        tokensConsumed: 'Tokens Consumed',
        estimatedCost: 'Estimated Cost',
        accountControls: 'Administrative Controls',
        suspendAccount: 'Suspend User',
        restoreAccount: 'Restore User',
        changeRole: 'Assign Role',
        resetPassword: 'Reset Password',
        customQuotas: 'Set Individual Quotas',
        deleteAccount: 'Delete Account',
        historyTitle: 'User Administrative Audit History',
      },
      modal: {
        createUserTitle: 'Create New User Account',
        inviteUserTitle: 'Send User Invitation',
        resetPasswordTitle: 'Reset Local Account Password',
        suspendTitle: 'Suspend User Account',
        restoreTitle: 'Restore User Account',
        deleteTitle: 'Permanently Delete User Account',
        emailLabel: 'Email Address',
        nameLabel: 'Full Display Name',
        roleLabel: 'Role Permission',
        tempPasswordLabel: 'Temporary Password',
        suspendReasonLabel: 'Reason for Suspension (recorded in Audit Log)',
        deleteConfirmPrompt: 'This action is irreversible. All associated sessions and data will be permanently removed.',
        deleteTypeEmailPrompt: 'Type the user email to confirm deletion:',
      },
    },
    quotas: {
      title: 'AI Usage & Quotas',
      subtitle: 'Configure daily limits, token budgets, and per-user custom overrides.',
      globalLimitsTitle: 'Global Daily Quotas (Defaults)',
      globalLimitsDesc: 'These limits apply automatically to standard users unless an individual override is configured.',
      editGlobalLimits: 'Configure Global Quotas',
      chatLimit: 'AI Chat Limit',
      voiceLimit: 'AI Voice Turns',
      interviewLimit: 'AI Interview Sessions',
      cvMagicLimit: 'CV Magic Fill Generations',
      cvAssistLimit: 'CV AI Assist Requests',
      dailyTokens: 'Daily Token Budget',
      monthlyTokens: 'Monthly Token Budget',
      monthlySpendCap: 'Monthly Spending Cap ($)',
      resetSchedule: 'Quota Reset Schedule',
      featureTogglesTitle: 'Feature Master Toggles',
      rolePresetsTitle: 'Role-Based Default Ceilings',
      individualOverridesTitle: 'Individual User Quota Overrides',
      individualOverridesDesc: 'Apply custom elevated or restricted limits to specific users.',
      addOverride: '+ Add Custom User Override',
      overrideActive: 'CUSTOM OVERRIDE',
      inheritingGlobal: 'GLOBAL DEFAULT',
      resetToDefault: 'Reset to Default',
      resetUsageToday: 'Reset Today Counter',
    },
    analytics: {
      title: 'AI Analytics & Usage Reports',
      subtitle: 'Track platform adoption, token consumption, provider throughput, and error rates.',
      timeRange: {
        today: 'Today',
        last7d: 'Last 7 Days',
        last30d: 'Last 30 Days',
        custom: 'Custom Range',
      },
      kpi: {
        totalUsers: 'Total Users',
        activeUsers: 'Active Users',
        newSignups: 'New Signups (7d)',
        requestsToday: 'AI Requests Today',
        requestsMonth: 'AI Requests (Month)',
        tokensConsumed: 'Tokens Consumed',
        estimatedSpend: 'Estimated Spend (MTD)',
        failedRequests: 'Error Rate',
      },
      charts: {
        dailyRequests: 'Daily AI Request Volume',
        userGrowth: 'User Growth & Active Users',
        tokenBreakdown: 'Token Consumption by Feature',
        featureDistribution: 'Feature Usage Breakdown',
        providerTraffic: 'AI Provider Traffic Share',
        dailyCostTrend: 'Daily Estimated AI Cost ($)',
        latencyErrorTrend: 'Response Latency & Error Rate',
      },
    },
    providers: {
      title: 'AI Provider Management',
      subtitle: 'Monitor model status, failover priorities, token costs, and feature routing.',
      activeProviders: 'Connected AI Providers',
      fallbackOrderTitle: 'Global Fallback Priority Order',
      routingMatrixTitle: 'Feature-Specific Model Routing Matrix',
      credentialSecure: 'Credential Status',
      testPing: 'Ping Provider',
      latencyMs: 'Average Latency',
      requests24h: 'Requests (24h)',
      preferredModel: 'Preferred Model',
      status: 'Provider Status',
    },
    costs: {
      title: 'Costs & Budgets',
      subtitle: 'Monitor estimated AI expenditures, monthly budget caps, and unit economics.',
      todayCost: "Today's Est. Cost",
      monthCost: 'Month-to-Date Spend',
      budgetCap: 'Monthly Budget Cap',
      projectedCost: 'Projected Month-End',
      budgetUsage: 'Budget Consumed',
      costByProvider: 'Expenditure by AI Provider',
      costByFeature: 'Expenditure by AI Feature',
      topUsersCost: 'Top Consuming Accounts',
      configureAlerts: 'Budget Alert Thresholds',
    },
    security: {
      title: 'Security Center',
      subtitle: 'Authentication safeguards, session controls, and security posture monitoring.',
      authOverview: 'Authentication Providers',
      googleOauth: 'Google OAuth 2.0',
      emailAuth: 'Email / Password (BCrypt)',
      adminMfa: 'Admin Two-Factor Auth (TOTP)',
      activeSessions: 'Active User Sessions',
      failedLogins: 'Recent Failed Login Attempts',
      revokeAllUserSessions: 'Revoke User Sessions',
      emergencyRevoke: 'Emergency Session Revocation',
      securityEvents: 'Security Event Audit Log',
      roleMatrix: 'Role Permissions & Access Control',
    },
    audit: {
      title: 'Audit Logs',
      subtitle: 'Comprehensive immutable record of administrative actions and security events.',
      filterAction: 'Filter by Action',
      filterAdmin: 'Filter by Admin',
      filterResult: 'Filter by Result',
      exportLogs: 'Export Audit Log (CSV)',
      timestamp: 'Timestamp (JST)',
      admin: 'Administrator',
      action: 'Action',
      target: 'Target Resource',
      result: 'Result',
      details: 'Audit Details',
      drawerTitle: 'Audit Event Inspection',
    },
    announcements: {
      title: 'Announcements',
      subtitle: 'Create and broadcast system banners, maintenance alerts, and release notices.',
      newAnnouncement: '+ New Announcement',
      all: 'All',
      published: 'Published',
      scheduled: 'Scheduled',
      drafts: 'Drafts',
      expired: 'Expired',
      titleField: 'Announcement Title',
      messageField: 'Message Body (Markdown)',
      audienceField: 'Target Audience',
      priorityField: 'Priority Level',
      dateRange: 'Display Schedule',
      preview: 'Live Preview',
      publishNow: 'Publish Now',
      saveDraft: 'Save as Draft',
    },
    health: {
      title: 'System Health',
      subtitle: 'Live infrastructure telemetry, service status, and runtime diagnostics.',
      allSystemsOk: 'All Systems Operational',
      serviceStatus: 'Core Services Status',
      uptimePercentage: 'System Uptime (30d)',
      averageLatency: 'Average Latency',
      errorRate: 'Request Error Rate',
      runHealthProbe: 'Run Diagnostics Probe',
      recentSystemLogs: 'Recent System Diagnostics & Log Stream',
      componentStatus: 'Component Health',
    },
    settings: {
      title: 'Admin Settings',
      subtitle: 'Configure platform operational mode, AI routing rules, and admin preferences.',
      platformMode: 'Platform Operational Mode',
      normalMode: 'Normal Mode',
      exhibitionMode: 'Exhibition Mode',
      maintenanceMode: 'Maintenance Mode',
      routingControls: 'AI Routing Controls',
      localRouting: 'Local Routing Enabled',
      cloudRouting: 'Cloud Routing Enabled',
      pauseAi: 'Pause New AI Tasks',
      stopAgentJobs: 'Stop New Agent Jobs',
      uiPreferences: 'Admin Interface Preferences',
      language: 'Admin Display Language',
      currency: 'Currency Format',
      refreshInterval: 'Auto-Refresh Rate',
      saveChanges: 'Save Admin Settings',
    },
    common: {
      save: 'Save Changes',
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      loading: 'Loading...',
      noData: 'No records found matching criteria',
      statusActive: 'Active',
      statusSuspended: 'Suspended',
      statusDisabled: 'Disabled',
      statusOnline: 'Online',
      statusOffline: 'Offline',
      statusDegraded: 'Degraded',
      successToast: 'Operation completed successfully',
      errorToast: 'Operation failed. Please review error details.',
      copied: 'Copied to clipboard',
    },
  },
  ja: {
    badge: {
      adminTitle: 'TRON AI',
      controlCenter: '管理者コントロールセンター',
      fullAccess: 'オーナー（最高権限）',
      managerAccess: '管理者（マネジメント）',
      demoMode: 'デモ環境稼働中',
      liveApi: 'Spring API 接続済',
      demoNote: 'エンタープライズ操作をシミュレーション中。バックエンド連携準備完了。',
      ownerProtected: '保護されたシステムアカウント',
    },
    sidebar: {
      overview: '概要 (Overview)',
      userManagement: 'ユーザー管理',
      quotas: 'AI利用枠・クォータ',
      analytics: 'AIアナリティクス',
      providers: 'AIプロバイダー',
      costs: 'コスト・予算管理',
      security: 'セキュリティセンター',
      auditLogs: '監査ログ',
      announcements: 'アナウンス配信',
      systemHealth: 'システム健全性',
      settings: '管理者設定',
      returnToApp: 'TRON AI アプリに戻る',
      collapse: 'サイドバーを折りたたむ',
      expand: 'サイドバーを展開',
    },
    header: {
      refresh: '更新',
      refreshing: '更新中...',
      notifications: '通知',
      profile: '管理者プロフィール',
      logout: 'ログアウト',
      demoBannerTitle: 'エンタープライズ・サンドボックス環境',
      demoBannerDesc:
        'Spring Boot実エンドポイントと連携しつつ、未実装機能はCursorバックエンド実装用の型定義デモフィクスチャで安全に動作しています。',
    },
    overview: {
      title: '概要 (Overview)',
      subtitle: 'プラットフォームの利用状況、稼働状態、主要メトリクスを一覧表示します。',
      totalUsers: '登録ユーザー総数',
      activeUsers: 'アクティブユーザー',
      aiRequestsToday: '本日のAIリクエスト数',
      estAiCostToday: '本日のAI推定コスト',
      vsLastWeek: '先週比',
      vsAvg: '日次平均比',
      aiRequests7Days: 'AIリクエスト推移（直近7日間）',
      aiFeatureUsageToday: 'AI機能別利用割合（本日）',
      aiProvidersStatus: 'AIプロバイダー稼働状態',
      systemHealth: 'システム健全性',
      allSystemsOperational: '全システム正常稼働中',
      requests: 'リクエスト',
      viewAllProviders: 'プロバイダー管理へ →',
      viewSystemHealth: '健全性詳細へ →',
      uptime: '稼働率',
      avgLatency: '平均レイテンシ',
      successRate: 'リクエスト成功率',
    },
    users: {
      title: 'ユーザー管理',
      subtitle: '登録アカウント、認証プロバイダー、アクセス権限、ステータスを管理します。',
      createUser: '+ ユーザー登録',
      inviteUser: '招待メール送信',
      exportCsv: 'CSVエクスポート',
      searchPlaceholder: '名前、メールアドレス、ユーザーIDで検索...',
      allFilter: 'すべてのユーザー',
      activeFilter: '有効アカウント',
      suspendedFilter: '一時停止中',
      disabledFilter: '無効アカウント',
      googleFilter: 'Googleログイン',
      emailFilter: 'メール・パスワード',
      adminFilter: '管理者のみ',
      columns: {
        user: 'ユーザー / 氏名',
        id: 'ID',
        provider: '認証方式',
        role: 'ロール',
        status: 'ステータス',
        registered: '登録日時',
        lastLogin: '最終ログイン',
        usageToday: '本日AI利用',
        actions: '操作',
      },
      drawer: {
        profileTitle: 'ユーザープロフィール詳細',
        accountDetails: 'アカウント情報',
        googleAuthNote:
          'Google OAuth 経由で認証されています。パスワードはGoogle側で暗号化管理されており、管理者であっても閲覧・直接変更はできません。',
        aiUsageBreakdown: 'AI利用量・トークン消費内訳',
        dailyRequests: '本日リクエスト数',
        monthlyRequests: '当月リクエスト数',
        tokensConsumed: '消費トークン総数',
        estimatedCost: '推定利用料金',
        accountControls: 'アカウント管理操作',
        suspendAccount: 'アカウント一時停止',
        restoreAccount: 'アカウント復旧',
        changeRole: 'ロール権限の変更',
        resetPassword: 'パスワード再設定',
        customQuotas: '個別利用上限の設定',
        deleteAccount: 'アカウント完全削除',
        historyTitle: '管理操作履歴（監査トレース）',
      },
      modal: {
        createUserTitle: '新規ユーザーアカウント作成',
        inviteUserTitle: 'ユーザー招待の送信',
        resetPasswordTitle: 'ローカルパスワードのリセット',
        suspendTitle: 'アカウントの一時停止確認',
        restoreTitle: 'アカウントの復旧確認',
        deleteTitle: 'アカウントの完全削除',
        emailLabel: 'メールアドレス',
        nameLabel: '表示名（氏名）',
        roleLabel: '割り当てロール',
        tempPasswordLabel: '仮パスワード',
        suspendReasonLabel: '停止理由（監査ログに記録されます）',
        deleteConfirmPrompt: 'この操作は取り消せません。関連するすべてのセッションと履歴データが完全に抹消されます。',
        deleteTypeEmailPrompt: '確認のため対象ユーザーのメールアドレスを入力してください：',
      },
    },
    quotas: {
      title: 'AI利用枠・クォータ管理',
      subtitle: '日次リクエスト上限、トークン予算、ユーザー個別の上限制御を設定します。',
      globalLimitsTitle: 'グローバル日次上限（標準デフォルト）',
      globalLimitsDesc: '個別設定がないすべての一般ユーザーに自動適用される基準制限値です。',
      editGlobalLimits: '標準上限値を設定',
      chatLimit: 'AIチャット上限',
      voiceLimit: 'AI音声会話ターン数',
      interviewLimit: 'AI面接練習セッション',
      cvMagicLimit: '履歴書自動生成回数',
      cvAssistLimit: '職歴書AIアシスト回数',
      dailyTokens: '日次トークン上限',
      monthlyTokens: '月間トークン上限',
      monthlySpendCap: '月間支出上限 ($)',
      resetSchedule: 'クォータ自動リセット日時',
      featureTogglesTitle: '機能別マスタースイッチ',
      rolePresetsTitle: 'ロール別基準リミット',
      individualOverridesTitle: 'ユーザー個別クォータ設定',
      individualOverridesDesc: '特定ユーザーに対して標準枠を超えた優遇または制限枠を適用します。',
      addOverride: '+ 個別上限を追加',
      overrideActive: '個別カスタム適用中',
      inheritingGlobal: '全体標準値に準拠',
      resetToDefault: '標準値に戻す',
      resetUsageToday: '本日の消化数をリセット',
    },
    analytics: {
      title: 'AIアナリティクス・利用レポート',
      subtitle: 'プラットフォーム利用動向、トークン消費推移、プロバイダー負荷、エラー率を分析します。',
      timeRange: {
        today: '本日',
        last7d: '直近7日間',
        last30d: '直近30日間',
        custom: '期間指定',
      },
      kpi: {
        totalUsers: '総ユーザー数',
        activeUsers: 'アクティブ数',
        newSignups: '新規登録 (7日)',
        requestsToday: '本日リクエスト',
        requestsMonth: '月間リクエスト',
        tokensConsumed: '総消費トークン',
        estimatedSpend: '推定支出累計',
        failedRequests: 'エラー発生率',
      },
      charts: {
        dailyRequests: '日次AIリクエスト件数推移',
        userGrowth: 'ユーザー推移とアクティブ動向',
        tokenBreakdown: '機能別トークン消費推移',
        featureDistribution: '機能別利用割合シェア',
        providerTraffic: 'AIプロバイダー負荷配分',
        dailyCostTrend: '日次推定AIコスト推移 ($)',
        latencyErrorTrend: '応答レイテンシとエラー率推移',
      },
    },
    providers: {
      title: 'AIプロバイダー管理',
      subtitle: '接続ステータス、モデル優先順位、フェイルオーバー、機能別ルーティングを設定します。',
      activeProviders: '連携AIプロバイダー一覧',
      fallbackOrderTitle: 'グローバル・フェイルオーバー優先順位',
      routingMatrixTitle: '機能別モデルルーティング設定',
      credentialSecure: '認証情報ステータス',
      testPing: '疎通確認 (Ping)',
      latencyMs: '平均応答速度',
      requests24h: '過去24時間リクエスト',
      preferredModel: '優先指定モデル',
      status: '接続ステータス',
    },
    costs: {
      title: 'コスト・予算管理',
      subtitle: 'AI利用料金のリアルタイム推定、月間予算枠、機能別ユニットエコノミクスを監視します。',
      todayCost: '本日の推定コスト',
      monthCost: '当月推定支出累計',
      budgetCap: '月間予算上限枠',
      projectedCost: '月末着地予想',
      budgetUsage: '予算消化率',
      costByProvider: 'AIプロバイダー別支出',
      costByFeature: 'AI機能別支出割合',
      topUsersCost: '利用コスト上位アカウント',
      configureAlerts: '予算超過アラート通知設定',
    },
    security: {
      title: 'セキュリティセンター',
      subtitle: '認証方式の保護、セッション管理、不審なアクセスの検知と対策を実施します。',
      authOverview: '認証基盤ステータス',
      googleOauth: 'Google OAuth 2.0 連携',
      emailAuth: 'メール・パスワード暗号化認証',
      adminMfa: '管理者二要素認証 (TOTP)',
      activeSessions: '稼働中アクティブセッション',
      failedLogins: 'ログイン失敗ログ（直近）',
      revokeAllUserSessions: 'ユーザーセッション無効化',
      emergencyRevoke: '全一般セッション緊急切断',
      securityEvents: 'セキュリティインシデント監査',
      roleMatrix: 'ロール権限一覧マトリクス',
    },
    audit: {
      title: '監査ログ (Audit Logs)',
      subtitle: '管理者による操作履歴、アカウント変更、セキュリティイベントの完全な追跡ログです。',
      filterAction: '操作種別で絞り込み',
      filterAdmin: '実行管理者で絞り込み',
      filterResult: '実行結果で絞り込み',
      exportLogs: '監査ログ出力 (CSV)',
      timestamp: '発生日時 (JST)',
      admin: '実行管理者',
      action: '操作内容',
      target: '対象リソース',
      result: '結果',
      details: '詳細情報',
      drawerTitle: '監査イベント詳細インスペクター',
    },
    announcements: {
      title: 'アナウンス配信管理',
      subtitle: 'システム障害通知、メンテナンス予告、アップデート通知を配信・スケジュール管理します。',
      newAnnouncement: '+ 新規アナウンス作成',
      all: 'すべて',
      published: '配信中',
      scheduled: '予約中',
      drafts: '下書き',
      expired: '配信終了',
      titleField: 'お知らせタイトル',
      messageField: 'メッセージ本文 (Markdown対応)',
      audienceField: '配信対象ユーザー',
      priorityField: '優先度レベル',
      dateRange: '表示期間（開始〜終了）',
      preview: '実画面プレビュー',
      publishNow: '今すぐ配信開始',
      saveDraft: '下書き保存',
    },
    health: {
      title: 'システム健全性 (System Health)',
      subtitle: 'バックエンドAPI、データベース、AIゲートウェイの死活状況とパフォーマンスを監視します。',
      allSystemsOk: '全システム正常稼働中',
      serviceStatus: '主要インフラサービス状態',
      uptimePercentage: '稼働率 (過去30日間)',
      averageLatency: '平均応答レイテンシ',
      errorRate: 'リクエストエラー発生率',
      runHealthProbe: '健全性プローブ実行',
      recentSystemLogs: 'リアルタイム・システムログストリーム',
      componentStatus: 'コンポーネント稼働状態',
    },
    settings: {
      title: '管理者設定',
      subtitle: 'プラットフォーム運用モード（通常・展示会・メンテ）、ルーティング設定、表示設定を変更します。',
      platformMode: 'プラットフォーム運用モード',
      normalMode: '通常モード (Normal)',
      exhibitionMode: '展示会モード (Exhibition)',
      maintenanceMode: '保守モード (Maintenance)',
      routingControls: 'AIルーティング制御',
      localRouting: 'ローカルGPUルーティング',
      cloudRouting: 'クラウドAIルーティング',
      pauseAi: '新規AIタスク一時受付停止',
      stopAgentJobs: '新規エージェント処理停止',
      uiPreferences: '管理者画面表示設定',
      language: '管理コンソール言語',
      currency: '通貨表示形式',
      refreshInterval: 'データ自動更新周期',
      saveChanges: '設定を保存',
    },
    common: {
      save: '保存する',
      cancel: 'キャンセル',
      confirm: '確認・実行',
      delete: '削除する',
      edit: '編集',
      close: '閉じる',
      loading: '読み込み中...',
      noData: '条件に一致するデータが見つかりません',
      statusActive: '有効',
      statusSuspended: '停止中',
      statusDisabled: '無効',
      statusOnline: 'オンライン',
      statusOffline: 'オフライン',
      statusDegraded: '性能低下',
      successToast: '正常に処理が完了しました',
      errorToast: 'エラーが発生しました。詳細を確認してください。',
      copied: 'クリップボードにコピーしました',
    },
  },
};
