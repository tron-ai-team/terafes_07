/** Shared option lists for Candidate Profile sections (mission-aligned). */

export type ProfileSectionId =
  | 'personal'
  | 'education'
  | 'experience'
  | 'skills'
  | 'projects'
  | 'certsLangs'
  | 'preferences'
  | 'stories'
  | 'international';

export const PROFILE_SECTIONS: Array<{ id: ProfileSectionId; en: string; ja: string }> = [
  { id: 'personal', en: 'Personal Information', ja: '基本情報' },
  { id: 'education', en: 'Education', ja: '学歴' },
  { id: 'experience', en: 'Work Experience', ja: '職歴' },
  { id: 'skills', en: 'Technical Skills', ja: '技術スキル' },
  { id: 'projects', en: 'Projects & Portfolio', ja: 'プロジェクト' },
  { id: 'certsLangs', en: 'Certifications & Languages', ja: '資格・語学' },
  { id: 'preferences', en: 'Career Preferences', ja: '希望条件' },
  { id: 'stories', en: 'Self PR & Career Stories', ja: '自己PR・ストーリー' },
  { id: 'international', en: 'International Student Info', ja: '留学生情報' },
];

export const SCHOOL_TYPES = [
  'Junior High School',
  'High School',
  'Vocational / Specialized School',
  'University',
  'Graduate School',
  'Language School',
  'Other',
] as const;

export const EDUCATION_STATUSES = [
  'Currently studying',
  'Graduated',
  'Expected graduation',
  'Withdrawn',
  'Other',
] as const;

export const SKILL_CATEGORIES = [
  'Programming Languages',
  'Frameworks & Libraries',
  'Databases',
  'Cloud & DevOps',
  'Tools & Platforms',
  'Soft Skills',
  'Other',
] as const;

/** Optional proficiency — never invent/default to Expert. */
export const SKILL_PROFICIENCIES = ['', 'Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;

export const LANGUAGE_PROFICIENCIES = [
  '',
  'Native',
  'Business',
  'Conversational',
  'Basic',
  'JLPT N1',
  'JLPT N2',
  'JLPT N3',
  'JLPT N4',
  'JLPT N5',
] as const;

export const CERT_STATUSES = ['Obtained', 'Studying', 'Exam scheduled', 'Expired'] as const;

export const EMPLOYMENT_TYPE_OPTIONS = [
  '新卒',
  '既卒',
  '中途',
  '正社員',
  '契約社員',
  '派遣',
  'インターン',
  '専門学校卒',
  '大学卒',
  'アルバイト / Part-time',
  'Freelance',
] as const;

export const JOB_TITLE_OPTIONS = [
  'Frontend Engineer',
  'Backend Engineer',
  'Full Stack Engineer',
  'Mobile Engineer',
  'Infrastructure / SRE',
  'DevOps Engineer',
  'Data Engineer',
  'QA / Test Engineer',
  'Security Engineer',
  'Product Manager',
  'UI/UX Designer',
  'IT Support',
  'Other',
] as const;

export const LOCATION_OPTIONS = [
  '東京都',
  '神奈川県',
  '千葉県',
  '埼玉県',
  '大阪府',
  '京都府',
  '兵庫県',
  '愛知県',
  '福岡県',
  '北海道',
  'リモート / Remote',
  '全国 / Anywhere in Japan',
] as const;

export const WORK_STYLE_OPTIONS = [
  'Office',
  'Hybrid',
  'Remote',
  'Flexible',
] as const;

export const GENDER_OPTIONS = ['', 'Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'] as const;

export const PROJECT_TYPES = [
  '',
  'Personal',
  'Academic',
  'Internship',
  'Open Source',
  'Freelance',
  'Team / Club',
  'Other',
] as const;

export const CAREER_STORY_FIELDS: Array<{
  key: string;
  topLevel?: 'selfPr' | 'careerGoals' | 'motivation';
  en: string;
  ja: string;
  hintEn?: string;
  hintJa?: string;
}> = [
  {
    key: 'selfPr',
    topLevel: 'selfPr',
    en: 'Self PR',
    ja: '自己PR',
  },
  {
    key: 'gakuchika',
    en: 'Gakuchika (student activities)',
    ja: 'ガクチカ',
  },
  {
    key: 'strengths',
    en: 'Strengths',
    ja: '強み',
  },
  {
    key: 'weaknesses',
    en: 'Weaknesses',
    ja: '弱み',
  },
  {
    key: 'careerGoals',
    topLevel: 'careerGoals',
    en: 'Career goals',
    ja: 'キャリア目標',
  },
  {
    key: 'reasonForIt',
    en: 'Why IT / this field',
    ja: 'IT・分野を選んだ理由',
  },
  {
    key: 'learningExperiences',
    en: 'Learning experiences',
    ja: '学習経験',
  },
  {
    key: 'technicalAchievements',
    en: 'Technical achievements',
    ja: '技術的な成果',
  },
  {
    key: 'generalMotivation',
    topLevel: 'motivation',
    en: 'General motivation (master)',
    ja: '志望動機（マスター・汎用）',
    hintEn: 'General master motivation for your career — not company-specific 志望動機.',
    hintJa: 'キャリア全体の汎用マスター志望動機です。特定企業向けの志望動機ではありません。',
  },
  {
    key: 'otherAchievements',
    en: 'Other achievements',
    ja: 'その他の実績',
  },
];

export const MISSING_FIELD_LABELS: Record<string, { en: string; ja: string }> = {
  fullName: { en: 'Full name', ja: '氏名' },
  nameJa: { en: 'Japanese name', ja: '氏名（日本語）' },
  dateOfBirth: { en: 'Date of birth', ja: '生年月日' },
  email: { en: 'Email', ja: 'メール' },
  phone: { en: 'Phone', ja: '電話' },
  addressText: { en: 'Address', ja: '住所' },
  education: { en: 'Education', ja: '学歴' },
  skills: { en: 'Skills', ja: 'スキル' },
  selfPr: { en: 'Self PR', ja: '自己PR' },
  languages: { en: 'Languages', ja: '語学' },
  career: { en: 'Work experience', ja: '職歴' },
  nationality: { en: 'Nationality', ja: '国籍' },
};

export const INPUT_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-slate-50';

export const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[96px]`;
