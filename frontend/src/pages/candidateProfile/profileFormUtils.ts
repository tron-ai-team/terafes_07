import type {
  CandidateProfile,
  CandidateProfileRequest,
  CareerEntry,
  CareerPreferences,
  CareerStories,
  CertificationEntry,
  EducationEntry,
  InternationalInfo,
  LanguageEntry,
  ProjectEntry,
  SkillEntry,
} from '../../types/careerCenter';
import { normalizeProfileDate, toLanguages, toSkills } from '../../utils/profileDateUtils';
import { MISSING_FIELD_LABELS } from './profileConstants';

export function newLocalId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isHttpUrl(value: string | undefined | null): boolean {
  const v = (value || '').trim();
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function ensureEducationIds(rows: EducationEntry[] | undefined): EducationEntry[] {
  return (rows || []).map((row) => ({
    ...row,
    id: row.id || newLocalId('edu'),
    schoolName: row.schoolName || row.school || '',
    school: row.school || row.schoolName || '',
  }));
}

export function ensureCareerIds(rows: CareerEntry[] | undefined): CareerEntry[] {
  return (rows || []).map((row) => ({
    ...row,
    id: row.id || newLocalId('career'),
    company: row.company || row.organization || '',
    organization: row.organization || row.company || '',
    jobTitle: row.jobTitle || row.role || '',
    role: row.role || row.jobTitle || '',
    technologies: Array.isArray(row.technologies) ? row.technologies : [],
  }));
}

export function ensureProjectIds(rows: ProjectEntry[] | undefined): ProjectEntry[] {
  return (rows || []).map((row) => ({
    ...row,
    id: row.id || newLocalId('proj'),
    name: row.name || '',
    technologies: Array.isArray(row.technologies) ? row.technologies : [],
  }));
}

export function ensureCertIds(rows: CertificationEntry[] | undefined): CertificationEntry[] {
  return (rows || []).map((row) => ({
    ...row,
    id: row.id || newLocalId('cert'),
    name: row.name || '',
  }));
}

export function emptyEducation(): EducationEntry {
  return {
    id: newLocalId('edu'),
    schoolName: '',
    schoolNameJa: '',
    country: '',
    schoolType: 'University',
    department: '',
    course: '',
    startYear: null,
    startMonth: null,
    endYear: null,
    endMonth: null,
    status: 'Currently studying',
  };
}

export function emptyCareer(): CareerEntry {
  return {
    id: newLocalId('career'),
    company: '',
    organization: '',
    jobTitle: '',
    role: '',
    employmentType: '',
    startDate: '',
    endDate: '',
    currentlyEmployed: false,
    responsibilities: '',
    achievements: '',
    technologies: [],
  };
}

export function emptyProject(): ProjectEntry {
  return {
    id: newLocalId('proj'),
    name: '',
    description: '',
    projectType: 'Personal',
    role: '',
    technologies: [],
    startDate: '',
    endDate: '',
    githubUrl: '',
    liveDemoUrl: '',
    keyFeatures: '',
    technicalChallenges: '',
    solutions: '',
    achievements: '',
  };
}

export function emptyCertification(): CertificationEntry {
  return {
    id: newLocalId('cert'),
    name: '',
    issuingOrganization: '',
    dateObtained: '',
    expirationDate: '',
    status: 'Obtained',
    credentialUrl: '',
  };
}

export function emptySkill(category = 'Other'): SkillEntry {
  return {
    id: newLocalId('skill'),
    name: '',
    category,
    proficiency: '',
    experienceMonths: null,
  };
}

export function emptyLanguage(): LanguageEntry {
  return {
    id: newLocalId('lang'),
    language: '',
    proficiency: '',
    certification: '',
    score: '',
    dateObtained: '',
    verified: false,
  };
}

export function emptyPreferences(): CareerPreferences {
  return {
    desiredJobTitles: [],
    preferredIndustries: [],
    preferredPrefectures: [],
    preferredLocations: [],
    preferredEmploymentTypes: [],
    expectedGraduationYear: '',
    schoolCategory: '',
    desiredStartDate: '',
    desiredSalary: '',
    preferredTechnologies: [],
    preferredCompanyEnvironment: [],
    willingnessToRelocate: false,
    workStylePreference: '',
  };
}

export function emptyStories(): CareerStories {
  return {
    selfPr: '',
    gakuchika: '',
    strengths: '',
    weaknesses: '',
    careerGoals: '',
    reasonForIt: '',
    learningExperiences: '',
    technicalAchievements: '',
    generalMotivation: '',
    otherAchievements: '',
  };
}

export function emptyInternational(): InternationalInfo {
  return {
    currentCountry: '',
    nationality: '',
    residenceStatus: '',
    residenceExpiration: '',
    workEligibility: '',
    japaneseProficiency: '',
    otherLanguages: '',
  };
}

/** Normalize API profile into editable form state. */
export function profileToForm(data: CandidateProfile): CandidateProfile {
  const skills = toSkills(data.skills);
  const languages = toLanguages(data.languages);
  const stories: CareerStories = {
    ...emptyStories(),
    ...(data.careerStories || {}),
    selfPr: String(data.careerStories?.selfPr ?? data.selfPr ?? ''),
    careerGoals: String(data.careerStories?.careerGoals ?? data.careerGoals ?? ''),
    generalMotivation: String(data.careerStories?.generalMotivation ?? data.motivation ?? ''),
  };
  const prefs: CareerPreferences = {
    ...emptyPreferences(),
    ...(data.preferences || {}),
    desiredJobTitles: asStringArray(data.preferences?.desiredJobTitles),
    preferredLocations: asStringArray(
      data.preferences?.preferredLocations ?? data.preferences?.preferredPrefectures
    ),
    preferredEmploymentTypes: asStringArray(data.preferences?.preferredEmploymentTypes),
    preferredIndustries: asStringArray(data.preferences?.preferredIndustries),
    preferredTechnologies: asStringArray(data.preferences?.preferredTechnologies),
  };

  return {
    ...data,
    fullName: data.fullName || '',
    nameJa: data.nameJa || '',
    furigana: data.furigana || '',
    dateOfBirth: data.dateOfBirth || '',
    nationality: data.nationality || '',
    gender: data.gender || '',
    email: data.email || '',
    phone: data.phone || '',
    postalCode: data.postalCode || '',
    prefecture: data.prefecture || '',
    city: data.city || '',
    streetAddress: data.streetAddress || '',
    building: data.building || '',
    addressText: data.addressText || '',
    education: ensureEducationIds(data.education),
    educationLegacyText: data.educationLegacyText || '',
    educationSuggestions: ensureEducationIds(data.educationSuggestions),
    career: ensureCareerIds(data.career),
    noWorkExperience: Boolean(data.noWorkExperience),
    skills: skills.map((s) => ({ ...s, id: s.id || newLocalId('skill') })),
    languages: languages.map((l) => ({ ...l, id: l.id || newLocalId('lang') })),
    projects: ensureProjectIds(data.projects),
    certifications: ensureCertIds(data.certifications),
    selfPr: stories.selfPr || '',
    careerGoals: stories.careerGoals || '',
    motivation: stories.generalMotivation || '',
    careerStories: stories,
    international: { ...emptyInternational(), ...(data.international || {}) },
    preferences: prefs,
    confirmedFields: data.confirmedFields || [],
    missingFields: data.missingFields || [],
    completenessScore: data.completenessScore ?? 0,
  };
}

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => String(v).trim()).filter(Boolean);
}

export function reorderList<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= list.length || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function toggleMulti(list: string[] | undefined, value: string): string[] {
  const cur = list || [];
  return cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
}

export function localizeMissingFields(fields: string[] | undefined, ja: boolean): string[] {
  return (fields || []).map((key) => {
    const label = MISSING_FIELD_LABELS[key];
    if (!label) return key;
    return ja ? label.ja : label.en;
  });
}

export function validateProjectUrls(projects: ProjectEntry[]): string | null {
  for (const p of projects) {
    if (!isHttpUrl(p.githubUrl)) {
      return `Invalid GitHub URL for project "${p.name || 'Untitled'}". Use http(s)://…`;
    }
    if (!isHttpUrl(p.liveDemoUrl)) {
      return `Invalid live demo URL for project "${p.name || 'Untitled'}". Use http(s)://…`;
    }
  }
  return null;
}

export function validateCertUrls(certs: CertificationEntry[]): string | null {
  for (const c of certs) {
    if (!isHttpUrl(c.credentialUrl)) {
      return `Invalid credential URL for "${c.name || 'Untitled'}". Use http(s)://…`;
    }
  }
  return null;
}

export function buildProfileRequest(
  form: CandidateProfile,
  options: { confirmEducationMigration?: boolean }
): { request: CandidateProfileRequest; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  let dateOfBirth: string | null = null;
  try {
    dateOfBirth = normalizeProfileDate(form.dateOfBirth);
  } catch (err: unknown) {
    fieldErrors.dateOfBirth = err instanceof Error ? err.message : 'Invalid date of birth';
  }

  const urlErr = validateProjectUrls(form.projects || []) || validateCertUrls(form.certifications || []);
  if (urlErr) {
    fieldErrors.urls = urlErr;
  }

  const skills = toSkills(form.skills).filter((s) => s.name.trim());
  const languages = toLanguages(form.languages).filter((l) => l.language.trim());

  const stories: CareerStories = {
    ...(form.careerStories || {}),
    selfPr: form.selfPr || form.careerStories?.selfPr || '',
    careerGoals: form.careerGoals || form.careerStories?.careerGoals || '',
    generalMotivation: form.motivation || form.careerStories?.generalMotivation || '',
  };

  const education = (form.education || []).map((e, i) => ({
    ...e,
    id: e.id || newLocalId('edu'),
    schoolName: e.schoolName || e.school || '',
    school: e.schoolName || e.school || '',
    sortOrder: i,
  }));

  const career = form.noWorkExperience
    ? []
    : (form.career || []).map((c, i) => ({
        ...c,
        id: c.id || newLocalId('career'),
        company: c.company || c.organization || '',
        organization: c.organization || c.company || '',
        jobTitle: c.jobTitle || c.role || '',
        role: c.role || c.jobTitle || '',
        sortOrder: i,
      }));

  const request: CandidateProfileRequest = {
    fullName: form.fullName || '',
    nameJa: form.nameJa || '',
    furigana: form.furigana || '',
    dateOfBirth,
    nationality: form.nationality || '',
    gender: form.gender || '',
    addressText: form.addressText || '',
    postalCode: form.postalCode || '',
    prefecture: form.prefecture || '',
    city: form.city || '',
    streetAddress: form.streetAddress || '',
    building: form.building || '',
    email: form.email || '',
    phone: form.phone || '',
    education,
    educationLegacyText: form.educationLegacyText || '',
    confirmEducationMigration: options.confirmEducationMigration || undefined,
    career,
    noWorkExperience: Boolean(form.noWorkExperience),
    skills,
    languages,
    projects: (form.projects || []).filter((p) => (p.name || '').trim()),
    certifications: (form.certifications || []).filter((c) => (c.name || '').trim()),
    selfPr: stories.selfPr || '',
    careerGoals: stories.careerGoals || '',
    motivation: stories.generalMotivation || '',
    careerStories: stories,
    international: form.international || {},
    preferences: form.preferences || {},
    confirmedFields: form.confirmedFields || [],
    allowOverwriteConfirmed: true,
  };

  return { request, fieldErrors };
}

export function snapshotKey(form: CandidateProfile): string {
  const {
    completenessScore: _c,
    missingFields: _m,
    completenessBreakdown: _b,
    updatedAt: _u,
    photoObjectKey: _p,
    educationSuggestions: _s,
    educationMigrationStatus: _ms,
    id: _id,
    ...editable
  } = form;
  return JSON.stringify(editable);
}
