/**
 * Normalize common unambiguous date inputs to ISO YYYY-MM-DD.
 * Returns null for empty input; throws Error for invalid/ambiguous values.
 */
export function normalizeProfileDate(input: string | null | undefined): string | null {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  const slash = /^(\d{4})[/.](\d{1,2})[/.](\d{1,2})$/;
  const jp = /^(\d{4})年(\d{1,2})月(\d{1,2})日$/;

  let m = iso.exec(raw) || slash.exec(raw) || jp.exec(raw);
  if (!m) {
    throw new Error('Please enter a valid date of birth. Expected format: YYYY-MM-DD');
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    throw new Error('Please enter a valid date of birth. Expected format: YYYY-MM-DD');
  }
  if (dt.getTime() > Date.now()) {
    throw new Error('Date of birth cannot be in the future.');
  }
  return `${y.toString().padStart(4, '0')}-${mo.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
}

export function toSkills(raw: unknown): Array<{ id?: string; name: string; category?: string; proficiency?: string; experienceMonths?: number | null }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') {
        return { name: item, category: 'Other', proficiency: '', experienceMonths: null };
      }
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        const name = String(o.name || o.skill || '').trim();
        if (!name) return null;
        return {
          id: o.id ? String(o.id) : undefined,
          name,
          category: String(o.category || 'Other'),
          proficiency: String(o.proficiency || ''),
          experienceMonths: typeof o.experienceMonths === 'number' ? o.experienceMonths : null,
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{ id?: string; name: string; category?: string; proficiency?: string; experienceMonths?: number | null }>;
}

export function toLanguages(raw: unknown): Array<{
  id?: string;
  language: string;
  proficiency?: string;
  certification?: string;
  score?: string;
  dateObtained?: string;
  verified?: boolean;
}> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') {
        return { language: item, proficiency: '', verified: false };
      }
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        const language = String(o.language || o.name || '').trim();
        if (!language) return null;
        return {
          id: o.id ? String(o.id) : undefined,
          language,
          proficiency: String(o.proficiency || ''),
          certification: String(o.certification || ''),
          score: String(o.score || ''),
          dateObtained: String(o.dateObtained || ''),
          verified: Boolean(o.verified),
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{
    id?: string;
    language: string;
    proficiency?: string;
    certification?: string;
    score?: string;
    dateObtained?: string;
    verified?: boolean;
  }>;
}
