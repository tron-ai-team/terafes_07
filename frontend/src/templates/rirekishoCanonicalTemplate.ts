/**
 * TRON AI — Canonical Japanese 履歴書 (RIREKISHO_JA) Template Engine
 * 
 * Based directly on official design reference: TRON_Rirekisho_Reference_Template.html
 * (measured from x履歴書フォーマット.pdf for exact JIS 2-page A4 print fidelity).
 * 
 * Exact geometry in print points (1pt = 1/72 in, A4 = 595.28 × 841.89 pt).
 * Single canonical HTML/CSS template shared between Live Browser Preview and Chromium PDF.
 */

export interface EducationItem {
  id?: string;
  schoolName?: string;
  department?: string;
  startYear?: number | string;
  startMonth?: number | string;
  endYear?: number | string;
  endMonth?: number | string;
  status?: string; // 'graduated' | 'expected' | 'enrolled' | '見込み' | '在学中' | '卒業'
}

export interface WorkItem {
  id?: string;
  company?: string;
  role?: string;
  startYear?: number | string;
  startMonth?: number | string;
  year?: number | string;
  month?: number | string;
  action?: string; // '入社' | '退社' | '在職中'
}

export interface CertificationItem {
  id?: string;
  name?: string;
  year?: number | string;
  month?: number | string;
}

export interface RirekishoPayload {
  // Personal Info
  nameJa?: string;
  fullName?: string;
  furigana?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  nationality?: string;
  gender?: string;
  postalCode?: string;
  addressText?: string;
  addressFurigana?: string;
  phone?: string;
  mobile?: string;
  email?: string;

  // Vacation / Alternative Contact (Optional)
  holidayFurigana?: string;
  holidayAddress?: string;
  holidayPhone?: string;

  // History & Certifications
  education?: EducationItem[];
  workExperience?: WorkItem[];
  certifications?: CertificationItem[];

  // Page 2 Prose & Supplemental
  selfPr?: string;
  additionalNotes?: string;
  motivationCompany?: string;
  careerGoals?: string;
  personalRequests?: string;
  favoriteSubjects?: string;
  healthStatus?: string;
  extracurricular?: string;
  hobbies?: string;
  sports?: string;

  // Photo
  photoDataUri?: string;
}

export interface RirekishoValidationIssue {
  field: string;
  label: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface RirekishoValidationResult {
  isValid: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  errors: RirekishoValidationIssue[];
  warnings: RirekishoValidationIssue[];
  capacities: {
    educationLines: number;
    maxEducationLines: number;
    workLines: number;
    maxWorkLines: number;
    certLines: number;
    maxCertLines: number;
    selfPrChars: number;
    selfPrSoftLimit: number;
  };
}

export const RIREKISHO_CAPACITIES = {
  MAX_EDU_LINES: 9,
  MAX_WORK_LINES: 2,
  MAX_CERT_LINES: 6,
  SELF_PR_SOFT_CHARS: 330,
  ADDITIONAL_NOTES_SOFT_CHARS: 380,
} as const;

// -------------------------------------------------------------------------
// Date & Japanese Wareki Utilities
// -------------------------------------------------------------------------

export function parseIsoDate(v?: string | null): { y: number; m: number; d: number } | null {
  if (!v) return null;
  const m = String(v).trim().match(/^(\d{4})[-/.消年](\d{1,2})[-/.月](\d{1,2})/);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const x = new Date(Date.UTC(y, mo - 1, d));
  if (x.getUTCFullYear() !== y || x.getUTCMonth() !== mo - 1 || x.getUTCDate() !== d) return null;
  return { y, m: mo, d };
}

export function formatWareki(dateObj: { y: number; m: number; d: number } | null): string {
  if (!dateObj) return '';
  const n = dateObj.y * 10000 + dateObj.m * 100 + dateObj.d;
  let era = '';
  let yr = 0;
  if (n >= 20190501) {
    era = '令和';
    yr = dateObj.y - 2018;
  } else if (n >= 19890108) {
    era = '平成';
    yr = dateObj.y - 1988;
  } else if (n >= 19261225) {
    era = '昭和';
    yr = dateObj.y - 1925;
  } else {
    return `${dateObj.y}年${dateObj.m}月${dateObj.d}日`;
  }
  return `${era}${yr === 1 ? '元' : yr}年${dateObj.m}月${dateObj.d}日`;
}

export function calculateAge(
  dobObj: { y: number; m: number; d: number } | null,
  asOfObj: { y: number; m: number; d: number } | null
): string {
  if (!dobObj || !asOfObj) return '';
  let age = asOfObj.y - dobObj.y;
  if (asOfObj.m * 100 + asOfObj.d < dobObj.m * 100 + dobObj.d) {
    age--;
  }
  return age >= 0 && age < 120 ? String(age) : '';
}

export function formatPostal(raw?: string | null): string {
  if (!raw) return '';
  const digits = String(raw).replace(/[^0-9]/g, '').slice(0, 7);
  if (digits.length === 7) {
    return digits.slice(0, 3) + '-' + digits.slice(3);
  }
  return digits;
}

// -------------------------------------------------------------------------
// Timeline Expansion (Matching Reference Template JS & Spring Boot Renderer)
// -------------------------------------------------------------------------

export interface TimelineLine {
  year: string;
  month: string;
  detail: string;
  kind?: 'marker' | 'tail';
}

export function expandEducationTimeline(items?: EducationItem[] | null): TimelineLine[] {
  const out: Array<{ y: number | ''; m: number | ''; detail: string }> = [];
  const list = Array.isArray(items) ? items : [];

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const school = String(item.schoolName || item.department || '').trim();
    if (!school) continue;

    const startY = item.startYear ? Number(item.startYear) : '';
    const startM = item.startMonth ? Number(item.startMonth) : '';
    const endY = item.endYear ? Number(item.endYear) : '';
    const endM = item.endMonth ? Number(item.endMonth) : '';
    const status = String(item.status || '').toLowerCase();

    if (startY) {
      out.push({ y: startY, m: startM, detail: `${school}　入学` });
    }
    if (endY) {
      let verb = '卒業';
      if (/expected|planned|見込み|見込|予定/.test(status)) {
        verb = '卒業見込み';
      } else if (/studying|enrolled|在学/.test(status)) {
        verb = '在学中';
      } else if (/修了/.test(status)) {
        verb = '修了';
      }
      out.push({ y: endY, m: endM, detail: `${school}　${verb}` });
    }
    if (!startY && !endY) {
      out.push({ y: '', m: '', detail: school + (status ? `　${status}` : '') });
    }
  }

  // Sort chronologically
  out.sort((a, b) => {
    const aVal = (typeof a.y === 'number' ? a.y : 9999) * 12 + (typeof a.m === 'number' ? a.m : 1);
    const bVal = (typeof b.y === 'number' ? b.y : 9999) * 12 + (typeof b.m === 'number' ? b.m : 1);
    return aVal - bVal;
  });

  return out.map((x) => ({
    year: x.y === '' ? '' : String(x.y),
    month: x.m === '' ? '' : String(x.m),
    detail: x.detail,
  }));
}

export function expandWorkTimeline(items?: WorkItem[] | null): TimelineLine[] {
  const out: TimelineLine[] = [];
  const list = Array.isArray(items) ? items : [];

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const name = String(item.company || item.role || '').trim();
    if (!name) continue;
    const y = item.startYear || item.year ? String(item.startYear || item.year) : '';
    const m = item.startMonth || item.month ? String(item.startMonth || item.month) : '';
    const action = item.action ? `　${item.action}` : '';
    out.push({ year: y, month: m, detail: name + action });
  }

  return out;
}

// -------------------------------------------------------------------------
// Validation & Capacity Checking
// -------------------------------------------------------------------------

export function validateRirekishoPayload(payload: Record<string, unknown>): RirekishoValidationResult {
  const errors: RirekishoValidationIssue[] = [];
  const warnings: RirekishoValidationIssue[] = [];

  const eduEvents = expandEducationTimeline(payload.education as EducationItem[]);
  const workEvents = expandWorkTimeline(payload.workExperience as WorkItem[]);
  const certs = Array.isArray(payload.certifications) ? (payload.certifications as CertificationItem[]) : [];
  const selfPr = String(payload.selfPr || '').trim();
  const notes = String(payload.additionalNotes || payload.careerGoals || payload.motivationCompany || '').trim();

  // 1. Capacity Limits (Hard physical limits of the JIS 2-page grid)
  if (eduEvents.length > RIREKISHO_CAPACITIES.MAX_EDU_LINES) {
    errors.push({
      field: 'education',
      label: '学歴',
      message: `学歴の展開行数が上限（${RIREKISHO_CAPACITIES.MAX_EDU_LINES}行）を超えています（現在: ${eduEvents.length}行）。不要な行を整理するか削除してください。`,
      severity: 'error',
    });
  }

  if (workEvents.length > RIREKISHO_CAPACITIES.MAX_WORK_LINES) {
    errors.push({
      field: 'workExperience',
      label: '職歴',
      message: `職歴の件数が上限（${RIREKISHO_CAPACITIES.MAX_WORK_LINES}件）を超えています（現在: ${workEvents.length}件）。日本標準履歴書は職歴枠が2行です。`,
      severity: 'error',
    });
  }

  if (certs.length > RIREKISHO_CAPACITIES.MAX_CERT_LINES) {
    errors.push({
      field: 'certifications',
      label: '免許・資格',
      message: `免許・資格が上限（${RIREKISHO_CAPACITIES.MAX_CERT_LINES}件）を超えています（現在: ${certs.length}件）。主要な資格に絞り込んでください。`,
      severity: 'error',
    });
  }

  // 2. Text Box Overflow Warnings (Soft limits to prevent clipping or font shrinking)
  if (selfPr.length > RIREKISHO_CAPACITIES.SELF_PR_SOFT_CHARS) {
    warnings.push({
      field: 'selfPr',
      label: '自己PR',
      message: `自己PRの文字数（${selfPr.length}文字）が推奨枠（約${RIREKISHO_CAPACITIES.SELF_PR_SOFT_CHARS}文字）を超えています。枠外に溢れるか続き欄に回される可能性があります。`,
      severity: 'warning',
    });
  }

  if (notes.length > RIREKISHO_CAPACITIES.ADDITIONAL_NOTES_SOFT_CHARS) {
    warnings.push({
      field: 'additionalNotes',
      label: '志望動機・特記事項',
      message: `志望動機・特記事項の文字数（${notes.length}文字）が推奨枠（約${RIREKISHO_CAPACITIES.ADDITIONAL_NOTES_SOFT_CHARS}文字）を超えています。`,
      severity: 'warning',
    });
  }

  const name = String(payload.nameJa || payload.fullName || '').trim();
  if (name.length > 20) {
    warnings.push({
      field: 'nameJa',
      label: '氏名',
      message: '氏名が20文字を超えているため、長文フォント（縮小表示）が適用されます。',
      severity: 'warning',
    });
  }

  return {
    isValid: errors.length === 0,
    hasErrors: errors.length > 0,
    hasWarnings: warnings.length > 0,
    errors,
    warnings,
    capacities: {
      educationLines: eduEvents.length,
      maxEducationLines: RIREKISHO_CAPACITIES.MAX_EDU_LINES,
      workLines: workEvents.length,
      maxWorkLines: RIREKISHO_CAPACITIES.MAX_WORK_LINES,
      certLines: certs.length,
      maxCertLines: RIREKISHO_CAPACITIES.MAX_CERT_LINES,
      selfPrChars: selfPr.length,
      selfPrSoftLimit: RIREKISHO_CAPACITIES.SELF_PR_SOFT_CHARS,
    },
  };
}

// -------------------------------------------------------------------------
// HTML Template Generator (100% Faithful to Reference Template)
// -------------------------------------------------------------------------

function escapeHtml(s?: string | null): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateCanonicalRirekishoHtml(
  payload: Record<string, unknown>,
  options: {
    photoDataUri?: string | null;
    asOfDate?: string;
    highlightOverflow?: boolean;
    interactiveScript?: boolean;
  } = {}
): string {
  const asOf = options.asOfDate ? parseIsoDate(options.asOfDate) : parseIsoDate(new Date().toISOString().slice(0, 10));
  const dob = parseIsoDate(payload.dateOfBirth as string);
  const asOfJa = formatWareki(asOf);
  const yearToken = asOfJa.match(/^令和(元|\d+)年/);
  const warekiYear = yearToken ? yearToken[1] : '';
  const asOfMonth = asOf?.m ? String(asOf.m) : '';
  const asOfDay = asOf?.d ? String(asOf.d) : '';

  const name = String(payload.nameJa || payload.fullName || '').trim();
  const furigana = String(payload.furigana || '').trim();
  const birthJa = formatWareki(dob);
  const age = calculateAge(dob, asOf);
  const nationality = String(payload.nationality || '').trim();

  // Address
  let postal = formatPostal(payload.postalCode as string);
  let addr = String(payload.addressText || '').trim();
  if (!postal) {
    const m = addr.match(/(?:〒\s*)?(\d{3})[-‐ー\s]?(\d{4})/);
    if (m) postal = m[1] + '-' + m[2];
  }
  addr = addr.replace(/^\s*〒?\s*\d{3}[-‐ー\s]?\d{4}\s*/, '').trim();
  const addressBlock = (postal ? `〒${postal}\n` : '') + addr;
  const addressFurigana = String(payload.addressFurigana || '').trim();

  // Phones & Email
  const phone = String(payload.phone || '').trim();
  const mobile = String(payload.mobile || '').trim();
  const email = String(payload.email || '').trim();

  // Vacation / Holiday Contact
  const holidayFurigana = String(payload.holidayFurigana || '').trim();
  const holidayAddress = String(payload.holidayAddress || '').trim();
  const holidayPhone = String(payload.holidayPhone || '').trim();

  // Education & Work History Grid (Page 1)
  const eduEvents = expandEducationTimeline(payload.education as EducationItem[]);
  const workEvents = expandWorkTimeline(payload.workExperience as WorkItem[]);

  const historyRows: Array<{ year: string; month: string; detail: string; kind?: string }> = [
    { year: '', month: '', detail: '学　歴', kind: 'marker' },
  ];
  for (let i = 0; i < RIREKISHO_CAPACITIES.MAX_EDU_LINES; i++) {
    historyRows.push(eduEvents[i] || { year: '', month: '', detail: '' });
  }
  historyRows.push({ year: '', month: '', detail: '職　歴', kind: 'marker' });
  if (workEvents.length === 0) {
    historyRows.push({ year: '', month: '', detail: 'な　し' });
    historyRows.push({ year: '', month: '', detail: '' });
  } else {
    historyRows.push(workEvents[0] || { year: '', month: '', detail: '' });
    historyRows.push(workEvents[1] || { year: '', month: '', detail: '' });
  }
  historyRows.push({ year: '', month: '', detail: '賞　罰', kind: 'marker' });
  historyRows.push({ year: '', month: '', detail: '以上', kind: 'tail' });

  const historyTableHtml = historyRows
    .map((r) => {
      const cls = r.kind ? ` class="${r.kind}"` : '';
      return `<tr${cls}><td class="y">${escapeHtml(r.year)}</td><td class="m">${escapeHtml(r.month)}</td><td class="detail">${escapeHtml(r.detail)}</td></tr>`;
    })
    .join('');

  // Page 2 Certifications
  const certList = Array.isArray(payload.certifications) ? (payload.certifications as CertificationItem[]) : [];
  const certRowsHtml = Array.from({ length: RIREKISHO_CAPACITIES.MAX_CERT_LINES })
    .map((_, i) => {
      const c = certList[i] || {};
      const y = c.year ? String(c.year) : '';
      const m = c.month ? String(c.month) : '';
      const nameStr = c.name ? String(c.name) : '';
      return `<tr><td class="y">${escapeHtml(y)}</td><td class="m">${escapeHtml(m)}</td><td class="detail">${escapeHtml(nameStr)}</td></tr>`;
    })
    .join('');

  // Page 2 Prose
  const selfPr = String(payload.selfPr || '').trim();
  let continuationText = '';
  let primarySelfPr = selfPr;
  if (selfPr.length > RIREKISHO_CAPACITIES.SELF_PR_SOFT_CHARS) {
    let cut: number = RIREKISHO_CAPACITIES.SELF_PR_SOFT_CHARS;
    const lastNewline = selfPr.lastIndexOf('\n', cut);
    if (lastNewline >= cut / 2) {
      cut = lastNewline;
    } else {
      const lastPeriod = Math.max(selfPr.lastIndexOf('。', cut), selfPr.lastIndexOf('.', cut));
      if (lastPeriod >= cut / 2) cut = lastPeriod + 1;
    }
    primarySelfPr = selfPr.slice(0, cut).trim();
    continuationText = selfPr.slice(cut).trim();
  }

  // Build Page 2 upper continuation / additional notes box
  const userNotes = String(payload.additionalNotes || '').trim();
  const motivation = String(payload.motivationCompany || payload.careerGoals || '').trim();
  const personalHope = String(payload.personalRequests || '').trim();

  const notesParts: string[] = [];
  if (userNotes) {
    notesParts.push(userNotes);
  } else {
    if (motivation) notesParts.push(`【志望動機・目標】\n${motivation}`);
    if (personalHope) notesParts.push(`【本人希望】\n${personalHope}`);
  }
  if (continuationText) {
    notesParts.push(`【自己PR（続き）】\n${continuationText}`);
  }
  const additionalNotesCombined = notesParts.join('\n\n');

  // Supplemental fields
  const favoriteSubjects = String(payload.favoriteSubjects || '').trim();
  const healthStatus = String(payload.healthStatus || '').trim();
  const extracurricular = String(payload.extracurricular || '').trim();
  const hobbies = String(payload.hobbies || '').trim();
  const sports = String(payload.sports || '').trim();

  // Photo
  const photoUri = options.photoDataUri || (typeof payload.photoDataUri === 'string' ? payload.photoDataUri : null);
  const hasPhoto = Boolean(photoUri && photoUri.startsWith('data:image/'));

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TRON AI | 日本標準 履歴書 — JIS規格 2ページ</title>
<style>
  /*
    TRON AI • Canonical Japanese 履歴書 Print & Preview Engine
    Original reference: TRON_Rirekisho_Reference_Template.html (measured from x履歴書フォーマット.pdf)
    Coordinates in print points (1pt = 1/72 in). A4 = 595.28 × 841.89 pt.
  */
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0;
    padding: 16px 0;
    background: #e9ecef;
    color: #111;
    font-family: "Noto Serif CJK JP", "Yu Mincho", "Hiragino Mincho ProN", "MS Mincho", serif;
  }
  .paper {
    width: 595.28pt;
    height: 841.89pt;
    position: relative;
    background: #ffffff;
    margin: 0 auto 18px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.18);
    page-break-after: always;
    break-after: page;
    overflow: hidden;
  }
  .paper:last-child {
    margin-bottom: 0;
    page-break-after: auto;
    break-after: auto;
  }
  .at { position: absolute; }
  .form-frame { border: 1.55pt solid #101010; }
  .thin { border: .48pt solid #111; }
  .cell { position: absolute; display: flex; align-items: center; justify-content: center; padding: 1pt 2pt; }
  .label { font-size: 9.8pt; line-height: 1.4; text-align: center; font-weight: 600; }
  .label-small { font-size: 8pt; line-height: 1.25; font-weight: 600; }
  .line { position: absolute; background: #111; pointer-events: none; }
  .v { width: .48pt; }
  .h { height: .48pt; }
  .dotted-v { background: transparent; border-left: .7pt dotted #444; }
  .dotted-h { background: transparent; border-top: .6pt dashed #444; }
  .value {
    position: absolute;
    font-family: "Noto Sans CJK JP", "Yu Gothic", "Hiragino Sans", "Meiryo", sans-serif;
    font-size: 9pt;
    line-height: 1.35;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    word-break: break-word;
  }
  .compact { font-size: 7.9pt; line-height: 1.3; }
  .muted { font-size: 7pt; color: #555; }
  .small { font-size: 7.7pt; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .field-name {
    font-size: 13.5pt;
    font-weight: 700;
    line-height: 1.18;
  }
  .field-name.long {
    font-size: 10.5pt;
    line-height: 1.2;
  }
  .furi { font-size: 8pt; line-height: 1.15; }
  .title {
    font-size: 19pt;
    letter-spacing: 10pt;
    font-weight: bold;
    font-family: "Noto Serif CJK JP", "Yu Mincho", "Hiragino Mincho ProN", serif;
  }
  .history-table, .license-table {
    position: absolute;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 9.5pt;
  }
  .history-table { left: 51.7pt; top: 381.3pt; width: 494.9pt; }
  .history-table td, .history-table th,
  .license-table td, .license-table th {
    border: .55pt solid #151515;
    padding: 0 3pt;
    height: 24.48pt;
    vertical-align: middle;
  }
  .history-table thead th {
    height: 21.96pt;
    font-weight: 600;
    text-align: center;
    font-size: 9.5pt;
  }
  .history-table td.y, .history-table td.m,
  .license-table td.y, .license-table td.m {
    text-align: center;
    font-size: 8.5pt;
  }
  .history-table td.detail {
    padding-left: 5pt;
    font-family: "Noto Sans CJK JP", "Yu Gothic", sans-serif;
    font-size: 8.6pt;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .history-table .marker td.detail {
    text-align: center;
    font-size: 10pt;
    font-weight: 650;
    letter-spacing: 2pt;
    white-space: normal;
  }
  .history-table .tail td.detail {
    text-align: right;
    padding-right: 11pt;
    font-size: 10pt;
    white-space: normal;
  }
  .license-table { left: 106.5pt; top: 359.4pt; width: 438.1pt; }
  .license-table th {
    height: 24.48pt;
    text-align: center;
    font-size: 9.5pt;
    font-weight: 600;
  }
  .license-table td {
    height: 24.49pt;
    font-size: 8.4pt;
  }
  .license-table td.detail {
    font-family: "Noto Sans CJK JP", "Yu Gothic", sans-serif;
    white-space: nowrap;
    padding-left: 5pt;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .portrait {
    position: absolute;
    left: 449.7pt;
    top: 68.2pt;
    width: 85.05pt;
    height: 113.39pt;
    border: .8pt dashed #444;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9pt;
    text-align: center;
    line-height: 1.45;
    overflow: hidden;
    background: #fff;
  }
  .portrait img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 20%;
  }
  .free-text {
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .border-error {
    outline: 2pt solid #dc2626 !important;
    background-color: rgba(220, 38, 38, 0.08) !important;
  }
  @media print {
    body { padding: 0; margin: 0; background: #ffffff; }
    .paper { margin: 0 !important; box-shadow: none; }
    .paper:last-child { break-after: auto; }
    .border-error { outline: 1.5pt solid #dc2626; }
  }
  @media screen and (max-width: 820px) {
    body { overflow-x: auto; }
    .paper { margin-left: 8px; margin-right: 8px; }
  }
</style>
</head>
<body>

<!-- PAGE 1: 個人情報・学歴・職歴 -->
<section class="paper" id="cv-page-1" aria-label="履歴書 1ページ">
  <div class="at title" style="left:107pt;top:52pt;">履 歴 書</div>
  <div class="at" style="left:264pt;top:59.5pt;font-size:10pt;white-space:nowrap;">令和 ${escapeHtml(warekiYear)} 年　${escapeHtml(asOfMonth)} 月　${escapeHtml(asOfDay)} 日　現在</div>

  <!-- 証明写真 (30 × 40 mm) -->
  <div class="portrait" id="photo-box">
    ${
      hasPhoto
        ? `<img id="cv-photo" src="${photoUri}" alt="本人証明写真" />`
        : `<span id="photo-placeholder">写真貼付<br>縦4cm<br>横3cm</span>`
    }
  </div>

  <!-- 氏名 / ふりがな / 性別 -->
  <div class="at form-frame" style="left:50.05pt;top:80.76pt;width:382.74pt;height:62.65pt;"></div>
  <div class="line v" style="left:113.55pt;top:82.44pt;height:60.17pt;"></div>
  <div class="line v" style="left:385.4pt;top:82.44pt;height:60.17pt;"></div>
  <div class="line dotted-h" style="left:51.72pt;top:94.6pt;width:333.68pt;height:0;"></div>
  <div class="at label" style="left:53pt;top:83pt;width:58pt;height:13pt;">ふりがな</div>
  <div class="at label" style="left:53pt;top:105pt;width:58pt;height:36pt;display:flex;align-items:center;justify-content:center;">氏名</div>
  <div class="value furi" data-field="furigana" style="left:116pt;top:83pt;width:265pt;height:12pt;line-height:1.15;">${escapeHtml(furigana)}</div>
  <div class="value field-name${name.length > 16 ? ' long' : ''}" data-field="displayName" style="left:116pt;top:99pt;width:266pt;max-height:41pt;">${escapeHtml(name)}</div>
  <div class="at center" style="left:388pt;top:82pt;width:42pt;font-size:10pt;line-height:1.52;">※<br>男<br>・<br>女</div>

  <!-- 生年月日 + 国籍 -->
  <div class="at form-frame" style="left:50.05pt;top:142.59pt;width:382.74pt;height:39.72pt;"></div>
  <div class="line v" style="left:113.55pt;top:143.4pt;height:38.05pt;"></div>
  <div class="line v" style="left:291.17pt;top:143.4pt;height:38.05pt;"></div>
  <div class="line v" style="left:328.87pt;top:143.4pt;height:38.05pt;"></div>
  <div class="at label" style="left:51pt;top:144pt;width:62pt;height:36pt;display:flex;align-items:center;justify-content:center;">生 年 月 日</div>
  <div class="value" data-field="birthDateJa" style="left:117pt;top:146pt;width:171pt;height:18pt;white-space:nowrap;">${escapeHtml(birthJa)}</div>
  <div class="at center small" style="left:205pt;top:166pt;width:82pt;">（満 <span data-field="age">${escapeHtml(age)}</span> 歳）</div>
  <div class="at label" style="left:297pt;top:148pt;width:28pt;height:29pt;">国<br>籍</div>
  <div class="value small" data-field="nationality" style="left:331pt;top:153pt;width:98pt;max-height:26pt;">${escapeHtml(nationality)}</div>
  <div class="at" style="left:334pt;top:145pt;font-size:6.4pt;">（留学生のみ記入）</div>

  <!-- 現住所・電話番号 -->
  <div class="at form-frame" style="left:50.05pt;top:181.01pt;width:497.85pt;height:85.25pt;"></div>
  <div class="line v" style="left:113.55pt;top:182.6pt;height:82.77pt;"></div>
  <div class="line v" style="left:431.59pt;top:182.6pt;height:82.77pt;"></div>
  <div class="line dotted-h" style="left:51.72pt;top:199pt;width:380pt;height:0;"></div>
  <div class="at label" style="left:52pt;top:185pt;width:60pt;height:13pt;">ふりがな</div>
  <div class="at label" style="left:52pt;top:204pt;width:60pt;height:60pt;display:flex;align-items:center;justify-content:center;">現 住 所</div>
  <div class="value furi" data-field="addressFurigana" style="left:117pt;top:184pt;width:311pt;height:13pt;">${escapeHtml(addressFurigana)}</div>
  <div class="value" data-field="addressBlock" style="left:117pt;top:202pt;width:309pt;max-height:58pt;line-height:1.5;">${escapeHtml(addressBlock)}</div>
  <div class="at small" style="left:435pt;top:184pt;">電話</div>
  <div class="value" data-field="phone" style="left:435pt;top:207pt;width:108pt;max-height:50pt;">${escapeHtml(phone)}</div>

  <!-- Email / 携帯電話 -->
  <div class="at form-frame" style="left:50.05pt;top:265.36pt;width:497.85pt;height:22.81pt;"></div>
  <div class="line v" style="left:113.55pt;top:266.2pt;height:21.2pt;"></div>
  <div class="line v" style="left:328.87pt;top:266.2pt;height:21.2pt;"></div>
  <div class="line v" style="left:431.59pt;top:266.2pt;height:21.2pt;"></div>
  <div class="at label-small" style="left:52pt;top:273pt;">E-mailアドレス</div>
  <div class="value compact" data-field="email" style="left:116pt;top:270pt;width:209pt;max-height:15pt;">${escapeHtml(email)}</div>
  <div class="at center label-small" style="left:334pt;top:272pt;width:92pt;">携帯電話</div>
  <div class="value compact center" data-field="mobile" style="left:434pt;top:271pt;width:110pt;max-height:15pt;">${escapeHtml(mobile)}</div>

  <!-- 休暇中連絡先 (任意) -->
  <div class="at form-frame" style="left:50.05pt;top:287.33pt;width:497.85pt;height:93.97pt;"></div>
  <div class="line v" style="left:113.55pt;top:288.17pt;height:92.3pt;"></div>
  <div class="line v" style="left:431.59pt;top:288.17pt;height:92.3pt;"></div>
  <div class="line dotted-h" style="left:51.72pt;top:305pt;width:380pt;height:0;"></div>
  <div class="at label" style="left:52pt;top:289pt;width:60pt;height:14pt;">ふりがな</div>
  <div class="at label" style="left:52pt;top:313pt;width:60pt;height:63pt;display:flex;align-items:center;justify-content:center;">休暇中の<br>連絡先</div>
  <div class="at muted" style="left:170pt;top:306pt;width:256pt;white-space:nowrap;">（現住所以外で休暇中に連絡を希望する場合にのみ記入）</div>
  <div class="value furi" data-field="holidayFurigana" style="left:116pt;top:291pt;width:310pt;max-height:12pt;">${escapeHtml(holidayFurigana)}</div>
  <div class="value" data-field="holidayAddress" style="left:116pt;top:325pt;width:308pt;max-height:49pt;">${escapeHtml(holidayAddress)}</div>
  <div class="at small" style="left:434pt;top:291pt;">電話</div>
  <div class="value compact" data-field="holidayPhone" style="left:434pt;top:324pt;width:108pt;max-height:45pt;">${escapeHtml(holidayPhone)}</div>

  <!-- 学歴・職歴テーブル (15行固定) -->
  <table class="history-table" aria-label="学歴・職歴"><colgroup><col style="width:62pt"><col style="width:28pt"><col></colgroup>
    <thead><tr><th>年</th><th>月</th><th>学 歴・職 歴（各別にまとめて書く）</th></tr></thead>
    <tbody id="history-rows">${historyTableHtml}</tbody>
  </table>
</section>

<!-- PAGE 2: 自己PR・免許資格・志望動機・補足項目 -->
<section class="paper" id="cv-page-2" aria-label="履歴書 2ページ">
  <div class="at form-frame" style="left:48.12pt;top:64.68pt;width:498.1pt;height:711.7pt;"></div>
  <div class="line v" style="left:105.86pt;top:66.36pt;height:708.35pt;"></div>
  <div class="line h" style="left:49.8pt;top:212.1pt;width:494.8pt;"></div>
  <div class="line h" style="left:49.8pt;top:359pt;width:494.8pt;"></div>
  <div class="line h" style="left:49.8pt;top:530.35pt;width:494.8pt;"></div>

  <!-- 特記事項・志望動機・本人希望・自己PR続き -->
  <div class="value free-text" data-field="additionalNotes" style="left:111pt;top:70pt;width:426pt;max-height:136pt;">${escapeHtml(additionalNotesCombined)}</div>

  <!-- 自己PR -->
  <div class="at label" style="left:51pt;top:258pt;width:52pt;height:70pt;display:flex;align-items:center;justify-content:center;">自己<br>PR</div>
  <div class="value free-text" data-field="selfPr" style="left:110pt;top:218pt;width:429pt;max-height:134pt;font-size:9.1pt;line-height:1.41;">${escapeHtml(primarySelfPr)}</div>

  <!-- 免許・資格 -->
  <div class="at label" style="left:50pt;top:412pt;width:54pt;height:64pt;display:flex;align-items:center;justify-content:center;">免許<br>・<br>資格</div>
  <table class="license-table" aria-label="免許・資格"><colgroup><col style="width:64.6pt"><col style="width:40pt"><col></colgroup>
    <thead><tr><th>年</th><th>月</th><th>免許・資格（取得順に記入）</th></tr></thead>
    <tbody id="certification-rows">${certRowsHtml}</tbody>
  </table>

  <!-- 下部分割線 -->
  <div class="line v" style="left:298.49pt;top:531.2pt;height:243.5pt;"></div>
  <div class="line v" style="left:355.75pt;top:531.2pt;height:243.5pt;"></div>
  <div class="line h" style="left:49.8pt;top:579.3pt;width:249.5pt;"></div>
  <div class="line h" style="left:49.8pt;top:628.3pt;width:494.8pt;"></div>

  <!-- 下部項目ラベル -->
  <div class="at label" style="left:51pt;top:541pt;width:52pt;height:35pt;">得意<br>科目</div>
  <div class="at label" style="left:51pt;top:587pt;width:52pt;height:38pt;">健康<br>状態</div>
  <div class="at label" style="left:51pt;top:667pt;width:52pt;height:69pt;">課外<br>活動<br>・<br>他</div>
  <div class="at label" style="left:302pt;top:558pt;width:51pt;height:57pt;">趣味<br>・<br>特技</div>
  <div class="at label" style="left:302pt;top:677pt;width:51pt;height:67pt;">愛好する<br>スポーツ</div>

  <!-- 罫線 -->
  <div class="line h" style="left:106.7pt;top:554.83pt;width:191.8pt;"></div>
  <div class="line h" style="left:106.7pt;top:603.79pt;width:191.8pt;"></div>
  <div class="line h" style="left:106.7pt;top:652.78pt;width:191.8pt;"></div>
  <div class="line h" style="left:106.7pt;top:677.26pt;width:191.8pt;"></div>
  <div class="line h" style="left:106.7pt;top:701.74pt;width:191.8pt;"></div>
  <div class="line h" style="left:106.7pt;top:726.22pt;width:191.8pt;"></div>
  <div class="line h" style="left:106.7pt;top:750.7pt;width:191.8pt;"></div>
  <div class="line h" style="left:356.6pt;top:554.83pt;width:187.9pt;"></div>
  <div class="line h" style="left:356.6pt;top:579.31pt;width:187.9pt;"></div>
  <div class="line h" style="left:356.6pt;top:603.79pt;width:187.9pt;"></div>
  <div class="line h" style="left:356.6pt;top:652.78pt;width:187.9pt;"></div>
  <div class="line h" style="left:356.6pt;top:677.26pt;width:187.9pt;"></div>
  <div class="line h" style="left:356.6pt;top:701.74pt;width:187.9pt;"></div>
  <div class="line h" style="left:356.6pt;top:726.22pt;width:187.9pt;"></div>
  <div class="line h" style="left:356.6pt;top:750.7pt;width:187.9pt;"></div>

  <!-- 下部項目値 -->
  <div class="value compact" data-field="favoriteSubjects" style="left:110pt;top:536pt;width:184pt;max-height:39pt;">${escapeHtml(favoriteSubjects)}</div>
  <div class="value compact" data-field="healthStatus" style="left:110pt;top:583pt;width:184pt;max-height:40pt;">${escapeHtml(healthStatus)}</div>
  <div class="value compact" data-field="extracurricular" style="left:110pt;top:633pt;width:184pt;max-height:139pt;">${escapeHtml(extracurricular)}</div>
  <div class="value compact" data-field="hobbies" style="left:360pt;top:535pt;width:180pt;max-height:89pt;">${escapeHtml(hobbies)}</div>
  <div class="value compact" data-field="sports" style="left:360pt;top:633pt;width:180pt;max-height:139pt;">${escapeHtml(sports)}</div>
</section>

${
  options.interactiveScript !== false
    ? `<script>
(function() {
  function checkOverflow() {
    document.querySelectorAll('.border-error').forEach(function(e) { e.classList.remove('border-error'); });
    var warnings = [];
    var nodes = document.querySelectorAll('[data-field], .history-table td, .license-table td');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (!el.textContent || !el.textContent.trim()) continue;
      if (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2) {
        var label = el.dataset.field || el.textContent.slice(0, 22);
        warnings.push('Overflow in ' + label);
        ${options.highlightOverflow !== false ? `el.classList.add('border-error');` : ''}
      }
    }
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'TRON_OVERFLOW_CHECK', warnings: warnings }, '*');
    }
    return warnings;
  }
  window.addEventListener('load', checkOverflow);
  window.checkTronOverflow = checkOverflow;
})();
</script>`
    : ''
}
</body>
</html>`;
}
