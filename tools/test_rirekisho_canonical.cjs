/**
 * TRON AI — Canonical Japanese 履歴書 Unit & Capacity Test
 */

const assert = require('assert');

// Ported core functions to test logic in isolation
function parseIsoDate(v) {
  if (!v) return null;
  const m = String(v).trim().match(/^(\d{4})[-/.消年](\d{1,2})[-/.月](\d{1,2})/);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const x = new Date(Date.UTC(y, mo - 1, d));
  if (x.getUTCFullYear() !== y || x.getUTCMonth() !== mo - 1 || x.getUTCDate() !== d) return null;
  return { y, m: mo, d };
}

function formatWareki(dateObj) {
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

function calculateAge(dobObj, asOfObj) {
  if (!dobObj || !asOfObj) return '';
  let age = asOfObj.y - dobObj.y;
  if (asOfObj.m * 100 + asOfObj.d < dobObj.m * 100 + dobObj.d) {
    age--;
  }
  return age >= 0 && age < 120 ? String(age) : '';
}

function expandEducationTimeline(items) {
  const out = [];
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
    if (startY) out.push({ y: startY, m: startM, detail: `${school}　入学` });
    if (endY) {
      let verb = '卒業';
      if (/expected|planned|見込み|見込|予定/.test(status)) verb = '卒業見込み';
      else if (/studying|enrolled|在学/.test(status)) verb = '在学中';
      else if (/修了/.test(status)) verb = '修了';
      out.push({ y: endY, m: endM, detail: `${school}　${verb}` });
    }
    if (!startY && !endY) out.push({ y: '', m: '', detail: school + (status ? `　${status}` : '') });
  }
  out.sort((a, b) => {
    const aVal = (typeof a.y === 'number' ? a.y : 9999) * 12 + (typeof a.m === 'number' ? a.m : 1);
    const bVal = (typeof b.y === 'number' ? b.y : 9999) * 12 + (typeof b.m === 'number' ? b.m : 1);
    return aVal - bVal;
  });
  return out.map(x => ({
    year: x.y === '' ? '' : String(x.y),
    month: x.m === '' ? '' : String(x.m),
    detail: x.detail
  }));
}

function validateRirekisho(payload) {
  const errors = [];
  const warnings = [];
  const edu = expandEducationTimeline(payload.education);
  const work = Array.isArray(payload.workExperience) ? payload.workExperience : [];
  const certs = Array.isArray(payload.certifications) ? payload.certifications : [];
  const selfPr = String(payload.selfPr || '').trim();

  if (edu.length > 9) {
    errors.push(`Education has ${edu.length} lines; max is 9.`);
  }
  if (work.length > 2) {
    errors.push(`Work has ${work.length} entries; max is 2.`);
  }
  if (certs.length > 6) {
    errors.push(`Certifications has ${certs.length} entries; max is 6.`);
  }
  if (selfPr.length > 330) {
    warnings.push(`Self PR (${selfPr.length} chars) exceeds soft limit of 330.`);
  }
  return { isValid: errors.length === 0, errors, warnings, eduLines: edu.length, workLines: work.length, certLines: certs.length };
}

// 1. Wareki Conversion Tests
assert.strictEqual(formatWareki(parseIsoDate('2001-04-15')), '平成13年4月15日');
assert.strictEqual(formatWareki(parseIsoDate('2019-05-01')), '令和元年5月1日');
assert.strictEqual(formatWareki(parseIsoDate('2026-11-11')), '令和8年11月11日');
assert.strictEqual(formatWareki(parseIsoDate('1985-12-01')), '昭和60年12月1日');
console.log('✓ Wareki conversion tests passed.');

// 2. Age Calculation Tests
const asOf = parseIsoDate('2026-11-11');
assert.strictEqual(calculateAge(parseIsoDate('2001-04-15'), asOf), '25');
assert.strictEqual(calculateAge(parseIsoDate('2001-12-01'), asOf), '24'); // birthday not reached yet
console.log('✓ Age calculation tests passed.');

// 3. Education Timeline Expansion Tests
const testEdu = [
  { schoolName: '東京工業大学', startYear: 2020, startMonth: 4, endYear: 2024, endMonth: 3, status: 'graduated' },
  { schoolName: '開成高等学校', startYear: 2017, startMonth: 4, endYear: 2020, endMonth: 3, status: 'graduated' }
];
const timeline = expandEducationTimeline(testEdu);
assert.strictEqual(timeline.length, 4);
assert.strictEqual(timeline[0].detail, '開成高等学校　入学');
assert.strictEqual(timeline[0].year, '2017');
assert.strictEqual(timeline[1].detail, '開成高等学校　卒業');
assert.strictEqual(timeline[1].year, '2020');
assert.strictEqual(timeline[2].detail, '東京工業大学　入学');
assert.strictEqual(timeline[2].year, '2020');
assert.strictEqual(timeline[3].detail, '東京工業大学　卒業');
assert.strictEqual(timeline[3].year, '2024');
console.log('✓ Education timeline chronological expansion tests passed.');

// 4. Capacity & Overflow Detection Tests
const validPayload = {
  education: testEdu,
  workExperience: [{ company: 'ABC', year: 2024, month: 4, action: '入社' }],
  certifications: [{ name: '基本情報', year: 2023, month: 10 }],
  selfPr: '自己PRのテスト文です。'
};
const validResult = validateRirekisho(validPayload);
assert.strictEqual(validResult.isValid, true);
assert.strictEqual(validResult.errors.length, 0);
console.log('✓ Valid payload passes capacity check.');

const overflowingPayload = {
  education: [
    ...testEdu,
    { schoolName: '高校2', startYear: 2014, startMonth: 4, endYear: 2017, endMonth: 3, status: 'graduated' },
    { schoolName: '大学院', startYear: 2024, startMonth: 4, endYear: 2026, endMonth: 3, status: 'expected' },
    { schoolName: '中学', startYear: 2011, startMonth: 4, endYear: 2014, endMonth: 3, status: 'graduated' }
  ], // 10 lines!
  workExperience: [
    { company: 'A', year: 2021, month: 1 },
    { company: 'B', year: 2022, month: 1 },
    { company: 'C', year: 2023, month: 1 } // 3 entries!
  ],
  certifications: [
    { name: '1', year: 2020 }, { name: '2', year: 2021 }, { name: '3', year: 2022 },
    { name: '4', year: 2023 }, { name: '5', year: 2024 }, { name: '6', year: 2025 },
    { name: '7', year: 2026 } // 7 entries!
  ],
  selfPr: 'あ'.repeat(400) // 400 chars!
};
const overflowResult = validateRirekisho(overflowingPayload);
assert.strictEqual(overflowResult.isValid, false);
assert.strictEqual(overflowResult.errors.length, 3);
assert.strictEqual(overflowResult.warnings.length, 1);
assert.ok(overflowResult.errors[0].includes('Education has 10 lines'));
assert.ok(overflowResult.errors[1].includes('Work has 3 entries'));
assert.ok(overflowResult.errors[2].includes('Certifications has 7 entries'));
assert.ok(overflowResult.warnings[0].includes('400 chars'));
console.log('✓ Overflow detection correctly flags education > 9, work > 2, certs > 6, selfPr > 330.');

console.log('\nALL 4 CANONICAL UNIT TESTS PASSED SUCCESSFULLY!');
