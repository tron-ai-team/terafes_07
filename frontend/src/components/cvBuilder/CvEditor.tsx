import React, { useRef, useMemo } from 'react';
import {
  User,
  MapPin,
  GraduationCap,
  Briefcase,
  Award,
  FileText,
  Heart,
  Camera,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Upload,
  Calendar,
} from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { NeonButton } from '../common/NeonButton';
import type {
  EducationItem,
  WorkItem,
  CertificationItem,
  RirekishoValidationResult,
} from '../../templates/rirekishoCanonicalTemplate';
import {
  RIREKISHO_CAPACITIES,
  parseIsoDate,
  formatWareki,
  calculateAge,
  formatPostal,
} from '../../templates/rirekishoCanonicalTemplate';
import type { CvDraft } from '../../types/careerCenter';

interface CvEditorProps {
  payload: Record<string, unknown>;
  draft: CvDraft;
  validation: RirekishoValidationResult;
  photoThumbUrl: string | null;
  isBusy: boolean;
  onFieldChange: (field: string, value: unknown) => void;
  onUploadPhoto: (file: File) => void;
  onUseProfilePhoto: () => void;
  onRemovePhoto: () => void;
  onOpenSingleAi: (fieldKey: string, fieldLabel: string, currentValue: string) => void;
  onSanitizeEducation: () => void;
  ja: boolean;
}

export const CvEditor: React.FC<CvEditorProps> = ({
  payload,
  draft,
  validation,
  photoThumbUrl,
  isBusy,
  onFieldChange,
  onUploadPhoto,
  onUseProfilePhoto,
  onRemovePhoto,
  onOpenSingleAi,
  onSanitizeEducation,
  ja,
}) => {
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Wareki live preview for Date of Birth
  const dobPreview = useMemo(() => {
    const d = parseIsoDate(payload.dateOfBirth as string);
    if (!d) return '';
    const now = parseIsoDate(new Date().toISOString().slice(0, 10));
    const age = calculateAge(d, now);
    return `${formatWareki(d)}${age ? `（満 ${age} 歳）` : ''}`;
  }, [payload.dateOfBirth]);

  // Education Rows
  const educationList: EducationItem[] = useMemo(() => {
    return Array.isArray(payload.education) ? (payload.education as EducationItem[]) : [];
  }, [payload.education]);

  const updateEducationRow = (index: number, patch: Partial<EducationItem>) => {
    const next = [...educationList];
    next[index] = { ...next[index], ...patch };
    onFieldChange('education', next);
  };

  const addEducationRow = () => {
    const next = [
      ...educationList,
      {
        id: `edu-${Date.now()}`,
        schoolName: '',
        department: '',
        startYear: '',
        startMonth: '',
        endYear: '',
        endMonth: '',
        status: 'graduated',
      },
    ];
    onFieldChange('education', next);
  };

  const removeEducationRow = (index: number) => {
    const next = educationList.filter((_, i) => i !== index);
    onFieldChange('education', next);
  };

  // Work Experience Rows (max 2)
  const workList: WorkItem[] = useMemo(() => {
    return Array.isArray(payload.workExperience) ? (payload.workExperience as WorkItem[]) : [];
  }, [payload.workExperience]);

  const updateWorkRow = (index: number, patch: Partial<WorkItem>) => {
    const next = [...workList];
    next[index] = { ...next[index], ...patch };
    onFieldChange('workExperience', next);
  };

  const addWorkRow = () => {
    const next = [
      ...workList,
      {
        id: `work-${Date.now()}`,
        company: '',
        year: '',
        month: '',
        action: '入社',
      },
    ];
    onFieldChange('workExperience', next);
  };

  const removeWorkRow = (index: number) => {
    const next = workList.filter((_, i) => i !== index);
    onFieldChange('workExperience', next);
  };

  // Certifications Rows (max 6)
  const certList: CertificationItem[] = useMemo(() => {
    return Array.isArray(payload.certifications) ? (payload.certifications as CertificationItem[]) : [];
  }, [payload.certifications]);

  const updateCertRow = (index: number, patch: Partial<CertificationItem>) => {
    const next = [...certList];
    next[index] = { ...next[index], ...patch };
    onFieldChange('certifications', next);
  };

  const addCertRow = () => {
    const next = [
      ...certList,
      {
        id: `cert-${Date.now()}`,
        name: '',
        year: '',
        month: '',
      },
    ];
    onFieldChange('certifications', next);
  };

  const removeCertRow = (index: number) => {
    const next = certList.filter((_, i) => i !== index);
    onFieldChange('certifications', next);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* SECTION 1: 証明写真 (Profile Photo) */}
      <GlassCard className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Camera className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">
            {ja ? '証明写真' : 'Profile Photo'}
          </h2>
          <span className="text-xs text-slate-400">
            {ja ? '（JIS規格: 縦40mm × 横30mm）' : '(JIS Standard: 40 × 30 mm)'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-5 items-start">
          {/* Photo Preview Container */}
          <div className="w-[105px] h-[140px] border-2 border-dashed border-slate-300 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
            {photoThumbUrl ? (
              <img
                src={photoThumbUrl}
                alt={ja ? '証明写真プレビュー' : 'Photo Preview'}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="text-[11px] text-slate-400 text-center px-2 leading-relaxed">
                <Camera className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                {ja ? '証明写真\n縦4cm×横3cm' : 'Photo\n30×40mm'}
              </div>
            )}
          </div>

          <div className="space-y-3 flex-1">
            <p className="text-xs text-slate-600 leading-relaxed">
              {ja
                ? 'JPEGまたはPNG形式（最大2MB）。履歴書の写真枠内にJIS標準の縦横比（4:3）で精密配置されます。3か月以内に撮影された正面・脱帽・胸から上の写真が推奨されます。'
                : 'JPEG or PNG (max 2MB). Placed accurately in the 30 × 40 mm portrait frame. Front-facing, head-and-shoulders photo taken within 3 months recommended.'}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUploadPhoto(file);
                }}
              />
              <NeonButton
                size="sm"
                onClick={() => photoInputRef.current?.click()}
                disabled={isBusy}
                icon={<Upload className="w-3.5 h-3.5" />}
              >
                {ja ? '写真をアップロード' : 'Upload Photo'}
              </NeonButton>
              <button
                type="button"
                onClick={onUseProfilePhoto}
                disabled={isBusy || !draft.photo?.hasProfilePhoto}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition disabled:opacity-40"
              >
                {ja ? '候補者プロフィール写真を使用' : 'Use Profile Photo'}
              </button>
              <button
                type="button"
                onClick={onRemovePhoto}
                disabled={isBusy || !draft.photo?.available}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-40"
              >
                {ja ? '写真を解除' : 'Remove Photo'}
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* SECTION 2: 基本情報 (Personal Information) */}
      <GlassCard className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              {ja ? '基本情報' : 'Personal Information'}
            </h2>
          </div>
          {dobPreview && (
            <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full font-mono">
              {dobPreview}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>{ja ? '氏名（漢字／アルファベット）' : 'Full Name'}</span>
              <span className="text-[10px] text-red-500 font-bold">{ja ? '必須' : 'Required'}</span>
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition shadow-xs"
              placeholder={ja ? '山田　太郎' : 'Taro Yamada'}
              value={String(payload.nameJa ?? payload.fullName ?? '')}
              onChange={(e) => onFieldChange('nameJa', e.target.value)}
            />
          </label>

          {/* Furigana */}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>{ja ? 'ふりがな（ひらがな）' : 'Furigana (Reading)'}</span>
              <span className="text-[10px] text-red-500 font-bold">{ja ? '必須' : 'Required'}</span>
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition shadow-xs"
              placeholder={ja ? 'やまだ　たろう' : 'yamada taro'}
              value={String(payload.furigana ?? '')}
              onChange={(e) => onFieldChange('furigana', e.target.value)}
            />
          </label>

          {/* Date of Birth */}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>{ja ? '生年月日' : 'Date of Birth'}</span>
              <span className="text-[10px] text-red-500 font-bold">{ja ? '必須' : 'Required'}</span>
            </span>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition shadow-xs bg-white"
              value={String(payload.dateOfBirth ?? '')}
              onChange={(e) => onFieldChange('dateOfBirth', e.target.value)}
            />
          </label>

          {/* Gender */}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>{ja ? '性別（任意または選択）' : 'Gender (Optional)'}</span>
              <span className="text-[10px] text-slate-400 font-normal">{ja ? '任意' : 'Optional'}</span>
            </span>
            <select
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition shadow-xs bg-white"
              value={String(payload.gender ?? '')}
              onChange={(e) => onFieldChange('gender', e.target.value)}
            >
              <option value="">{ja ? '未選択 / 記載なし' : 'Unspecified'}</option>
              <option value="男">{ja ? '男' : 'Male'}</option>
              <option value="女">{ja ? '女' : 'Female'}</option>
            </select>
          </label>

          {/* Nationality */}
          <label className="block space-y-1.5 md:col-span-2">
            <span className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>{ja ? '国籍（外国籍の方のみ記入）' : 'Nationality (International candidates)'}</span>
              <span className="text-[10px] text-slate-400 font-normal">{ja ? '該当者のみ' : 'Optional'}</span>
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition shadow-xs"
              placeholder={ja ? '例: スリランカ、ベトナム、ネパール、日本' : 'e.g. Sri Lanka, Vietnam, Japan'}
              value={String(payload.nationality ?? '')}
              onChange={(e) => onFieldChange('nationality', e.target.value)}
            />
          </label>
        </div>
      </GlassCard>

      {/* SECTION 3: 住所・連絡先 (Address & Contact Details) */}
      <GlassCard className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">
            {ja ? '住所・連絡先' : 'Address & Contact Details'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Postal Code */}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">
              {ja ? '郵便番号' : 'Postal Code'}
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition shadow-xs"
              placeholder="160-0022"
              value={String(payload.postalCode ?? '')}
              onChange={(e) => onFieldChange('postalCode', formatPostal(e.target.value))}
            />
          </label>

          {/* Address Furigana */}
          <label className="block space-y-1.5 md:col-span-2">
            <span className="text-xs font-bold text-slate-700">
              {ja ? '現住所 ふりがな' : 'Address Furigana'}
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition shadow-xs"
              placeholder="とうきょうとしんじゅくく..."
              value={String(payload.addressFurigana ?? '')}
              onChange={(e) => onFieldChange('addressFurigana', e.target.value)}
            />
          </label>

          {/* Address Text */}
          <label className="block space-y-1.5 md:col-span-3">
            <span className="text-xs font-bold text-slate-700">
              {ja ? '現住所（都道府県・市区町村・番地・建物名・部屋番号）' : 'Full Address'}
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition shadow-xs"
              placeholder="東京都新宿区新宿1-2-3 ○○レジデンス 101号室"
              value={String(payload.addressText ?? '')}
              onChange={(e) => onFieldChange('addressText', e.target.value)}
            />
          </label>

          {/* Telephone */}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">
              {ja ? '電話番号（固定電話）' : 'Landline Phone'}
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition shadow-xs"
              placeholder="03-0000-0000"
              value={String(payload.phone ?? '')}
              onChange={(e) => onFieldChange('phone', e.target.value)}
            />
          </label>

          {/* Mobile Phone */}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">
              {ja ? '携帯電話番号' : 'Mobile Phone'}
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition shadow-xs"
              placeholder="090-0000-0000"
              value={String(payload.mobile ?? '')}
              onChange={(e) => onFieldChange('mobile', e.target.value)}
            />
          </label>

          {/* Email */}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">
              {ja ? 'E-mailアドレス' : 'Email Address'}
            </span>
            <input
              type="email"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition shadow-xs"
              placeholder="candidate@example.com"
              value={String(payload.email ?? '')}
              onChange={(e) => onFieldChange('email', e.target.value)}
            />
          </label>
        </div>

        {/* Optional Vacation Contact Accordion */}
        <details className="pt-3 border-t border-slate-100 text-xs text-slate-600">
          <summary className="font-bold text-slate-700 hover:text-blue-600 cursor-pointer select-none">
            {ja ? '+ 休暇中の連絡先（現住所以外に連絡を希望する場合のみ記入）' : '+ Alternative / Holiday Contact (Optional)'}
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <label className="block space-y-1 md:col-span-3">
              <span className="text-[11px] font-semibold text-slate-600">
                {ja ? '休暇中ふりがな' : 'Holiday Furigana'}
              </span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                value={String(payload.holidayFurigana ?? '')}
                onChange={(e) => onFieldChange('holidayFurigana', e.target.value)}
              />
            </label>
            <label className="block space-y-1 md:col-span-2">
              <span className="text-[11px] font-semibold text-slate-600">
                {ja ? '休暇中住所' : 'Holiday Address'}
              </span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                value={String(payload.holidayAddress ?? '')}
                onChange={(e) => onFieldChange('holidayAddress', e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-slate-600">
                {ja ? '休暇中電話' : 'Holiday Phone'}
              </span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white"
                value={String(payload.holidayPhone ?? '')}
                onChange={(e) => onFieldChange('holidayPhone', e.target.value)}
              />
            </label>
          </div>
        </details>
      </GlassCard>

      {/* SECTION 4: 学歴 (Education) */}
      <GlassCard className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              {ja ? '学歴' : 'Education History'}
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                validation.capacities.educationLines > RIREKISHO_CAPACITIES.MAX_EDU_LINES
                  ? 'bg-red-100 text-red-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {validation.capacities.educationLines} / {RIREKISHO_CAPACITIES.MAX_EDU_LINES}行
            </span>
          </div>

          <div className="flex items-center gap-2">
            {educationList.length > 2 && (
              <button
                type="button"
                onClick={onSanitizeEducation}
                disabled={isBusy}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
              >
                {ja ? '学歴ノイズ除去' : 'Clean OCR Noise'}
              </button>
            )}
            <NeonButton
              size="sm"
              onClick={addEducationRow}
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              {ja ? '学校を追加' : 'Add School'}
            </NeonButton>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          {ja
            ? '各学校の「入学」と「卒業」がJIS規格の履歴書に自動展開されます（最大9行）。'
            : 'Each school automatically expands into Admission and Graduation rows for JIS A4 printing (max 9 rows).'}
        </p>

        {educationList.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            {ja ? '学歴は登録されていません。「学校を追加」ボタンを押して登録してください。' : 'No education records. Click "Add School" to enter.'}
          </div>
        ) : (
          <div className="space-y-3">
            {educationList.map((edu, idx) => (
              <div
                key={edu.id || idx}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeEducationRow(idx)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition"
                    title={ja ? '削除' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-500"
                      placeholder={ja ? '学校名・学部・学科（例: ○○大学 情報科学部 ソフトウェア工学科）' : 'School / Faculty / Major'}
                      value={String(edu.schoolName ?? '')}
                      onChange={(e) => updateEducationRow(idx, { schoolName: e.target.value })}
                    />
                  </div>
                  <div>
                    <select
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-500"
                      value={String(edu.status ?? 'graduated')}
                      onChange={(e) => updateEducationRow(idx, { status: e.target.value })}
                    >
                      <option value="graduated">{ja ? '卒業' : 'Graduated'}</option>
                      <option value="expected">{ja ? '卒業見込み' : 'Expected'}</option>
                      <option value="enrolled">{ja ? '在学中' : 'Enrolled'}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold">{ja ? '入学年' : 'Start Year'}</span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white text-xs"
                      placeholder="2021"
                      value={edu.startYear ?? ''}
                      onChange={(e) => updateEducationRow(idx, { startYear: e.target.value })}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold">{ja ? '入学月' : 'Start Month'}</span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white text-xs"
                      placeholder="4"
                      value={edu.startMonth ?? ''}
                      onChange={(e) => updateEducationRow(idx, { startMonth: e.target.value })}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold">{ja ? '卒業年' : 'End Year'}</span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white text-xs"
                      placeholder="2025"
                      value={edu.endYear ?? ''}
                      onChange={(e) => updateEducationRow(idx, { endYear: e.target.value })}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold">{ja ? '卒業月' : 'End Month'}</span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white text-xs"
                      placeholder="3"
                      value={edu.endMonth ?? ''}
                      onChange={(e) => updateEducationRow(idx, { endMonth: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* SECTION 5: 職歴 (Work History - max 2 rows) */}
      <GlassCard className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              {ja ? '職歴' : 'Work History'}
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                validation.capacities.workLines > RIREKISHO_CAPACITIES.MAX_WORK_LINES
                  ? 'bg-red-100 text-red-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {validation.capacities.workLines} / {RIREKISHO_CAPACITIES.MAX_WORK_LINES}件
            </span>
          </div>

          <NeonButton
            size="sm"
            onClick={addWorkRow}
            disabled={workList.length >= RIREKISHO_CAPACITIES.MAX_WORK_LINES}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            {ja ? '職歴を追加' : 'Add Experience'}
          </NeonButton>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          {ja
            ? '職歴がない（新卒・未経験）の場合は空欄で構いません。履歴書には自動的に「な　し」と印刷されます（最大2件）。'
            : 'If empty, standard Japanese CV automatically outputs "なし" (None). Maximum 2 entries for JIS form.'}
        </p>

        {workList.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            {ja ? '職歴は現在「なし」として出力されます。' : 'Currently formatted as "なし" (None).'}
          </div>
        ) : (
          <div className="space-y-3">
            {workList.map((work, idx) => (
              <div
                key={work.id || idx}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeWorkRow(idx)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition"
                    title={ja ? '削除' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-500"
                    placeholder={ja ? '会社名（例: ○○株式会社）' : 'Company Name'}
                    value={String(work.company ?? '')}
                    onChange={(e) => updateWorkRow(idx, { company: e.target.value })}
                  />
                  <input
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-500"
                    placeholder={ja ? '区分（例: 入社、退社、在職中、アルバイト）' : 'Action / Status'}
                    value={String(work.action ?? '')}
                    onChange={(e) => updateWorkRow(idx, { action: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-xs text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold">{ja ? '年' : 'Year'}</span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white text-xs"
                      placeholder="2023"
                      value={work.year ?? work.startYear ?? ''}
                      onChange={(e) => updateWorkRow(idx, { year: e.target.value })}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold">{ja ? '月' : 'Month'}</span>
                    <input
                      type="number"
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 bg-white text-xs"
                      placeholder="4"
                      value={work.month ?? work.startMonth ?? ''}
                      onChange={(e) => updateWorkRow(idx, { month: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* SECTION 6: 免許・資格 (Certifications - max 6 rows) */}
      <GlassCard className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              {ja ? '免許・資格' : 'Certifications & Licenses'}
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                validation.capacities.certLines > RIREKISHO_CAPACITIES.MAX_CERT_LINES
                  ? 'bg-red-100 text-red-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {validation.capacities.certLines} / {RIREKISHO_CAPACITIES.MAX_CERT_LINES}件
            </span>
          </div>

          <NeonButton
            size="sm"
            onClick={addCertRow}
            disabled={certList.length >= RIREKISHO_CAPACITIES.MAX_CERT_LINES}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            {ja ? '資格を追加' : 'Add Certification'}
          </NeonButton>
        </div>

        <p className="text-xs text-slate-500">
          {ja
            ? '資格の正式名称と取得年月を記入します（例: 普通自動車第一種運転免許 取得、基本情報技術者試験 合格、JLPT N1。最大6行）。'
            : 'Formal license title, year, and month (max 6 entries).'}
        </p>

        {certList.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            {ja ? '免許・資格は未登録です。' : 'No certifications entered.'}
          </div>
        ) : (
          <div className="space-y-3">
            {certList.map((cert, idx) => (
              <div
                key={cert.id || idx}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeCertRow(idx)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition"
                    title={ja ? '削除' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none focus:border-blue-500"
                      placeholder={ja ? '資格名称（例: 基本情報技術者試験 合格）' : 'Certificate Title'}
                      value={String(cert.name ?? '')}
                      onChange={(e) => updateCertRow(idx, { name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <input
                        type="number"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 bg-white text-xs"
                        placeholder={ja ? '年 (2024)' : 'Year'}
                        value={cert.year ?? ''}
                        onChange={(e) => updateCertRow(idx, { year: e.target.value })}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 bg-white text-xs"
                        placeholder={ja ? '月 (10)' : 'Month'}
                        value={cert.month ?? ''}
                        onChange={(e) => updateCertRow(idx, { month: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* SECTION 7: 自己PR (Self-PR - Page 2) */}
      <GlassCard className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              {ja ? '自己PR（2ページ目）' : 'Self PR (Page 2)'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-mono font-bold ${
                String(payload.selfPr || '').length > RIREKISHO_CAPACITIES.SELF_PR_SOFT_CHARS
                  ? 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded'
                  : 'text-slate-400'
              }`}
            >
              {String(payload.selfPr || '').length} / 約{RIREKISHO_CAPACITIES.SELF_PR_SOFT_CHARS}文字
            </span>
            <button
              type="button"
              onClick={() =>
                onOpenSingleAi(
                  'selfPr',
                  ja ? '自己PR' : 'Self PR',
                  String(payload.selfPr ?? '')
                )
              }
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>{ja ? 'AI添削' : 'AI Polish'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <textarea
            className="w-full rounded-2xl border border-slate-200 p-4 text-sm min-h-[140px] focus:border-blue-500 focus:outline-none leading-relaxed transition shadow-xs"
            placeholder={
              ja
                ? '私の強みは、課題に対して粘り強く原因を究明し、改善を継続できる点です。学生時代にはハッカソンに参加し、チーム開発におけるAPI設計とテスト自動化を担当しました。…'
                : 'Enter your Japanese Self-PR text...'
            }
            value={String(payload.selfPr ?? '')}
            onChange={(e) => onFieldChange('selfPr', e.target.value)}
          />
          <div className="text-[11px] text-slate-400">
            {ja
              ? '※ JIS規格の自己PR枠は約280〜330文字で最適にレイアウトされます。'
              : 'JIS layout prints best between 280 and 330 Japanese characters.'}
          </div>
        </div>
      </GlassCard>

      {/* SECTION 8: 志望動機・本人希望・特記事項 (Motivation & Preferences) */}
      <GlassCard className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              {ja ? '志望動機・特記事項・本人希望記入欄' : 'Motivation & Preferences'}
            </h2>
          </div>

          <button
            type="button"
            onClick={() =>
              onOpenSingleAi(
                'additionalNotes',
                ja ? '志望動機・特記事項' : 'Motivation & Notes',
                String(payload.additionalNotes ?? payload.motivationCompany ?? '')
              )
            }
            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-xl transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>{ja ? 'AI添削' : 'AI Polish'}</span>
          </button>
        </div>

        <div className="space-y-2">
          <textarea
            className="w-full rounded-2xl border border-slate-200 p-4 text-sm min-h-[120px] focus:border-blue-500 focus:outline-none leading-relaxed transition shadow-xs"
            placeholder={
              ja
                ? '貴社の先端技術開発と若手の挑戦を重視するカルチャーに強く惹かれ、志望いたしました。本人希望: 勤務地や職種、通勤時間などの特記事項があれば記載してください。'
                : 'Motivation, career goals, or personal requests...'
            }
            value={String(payload.additionalNotes ?? payload.motivationCompany ?? payload.careerGoals ?? '')}
            onChange={(e) => onFieldChange('additionalNotes', e.target.value)}
          />
          <div className="text-[11px] text-slate-400">
            {ja
              ? '※ 未入力の場合は候補者プロフィールの志望動機・希望条件が自動適用されます。'
              : 'If left empty, candidate profile career goals and motivation will be reflected.'}
          </div>
        </div>
      </GlassCard>

      {/* SECTION 9: 補足情報 (Supplemental Fields) */}
      <GlassCard className="p-5 sm:p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            {ja ? '補足欄（得意科目・健康状態・趣味・特技・スポーツ）' : 'Supplemental Fields'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {ja
              ? 'JIS規格2ページ目下部の追加項目です。人柄や関心を伝えるために活用できます。'
              : 'JIS 2nd page supplemental details.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Favorite Subjects */}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">
              {ja ? '得意科目' : 'Favorite Subjects'}
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition shadow-xs"
              placeholder={ja ? '情報科学、データベース設計、アルゴリズム' : 'Computer Science, Math'}
              value={String(payload.favoriteSubjects ?? '')}
              onChange={(e) => onFieldChange('favoriteSubjects', e.target.value)}
            />
          </label>

          {/* Health Status */}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">
              {ja ? '健康状態' : 'Health Status'}
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition shadow-xs"
              placeholder={ja ? '極めて良好（または特記事項）' : 'Excellent (or leave blank)'}
              value={String(payload.healthStatus ?? '')}
              onChange={(e) => onFieldChange('healthStatus', e.target.value)}
            />
          </label>

          {/* Hobbies & Special Skills */}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">
              {ja ? '趣味・特技' : 'Hobbies & Special Skills'}
            </span>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs min-h-[70px] focus:border-blue-500 focus:outline-none"
              placeholder={ja ? '技術書読書、自作キーボード製作、オープンソース活動' : 'Technical reading, building keyboards'}
              value={String(payload.hobbies ?? '')}
              onChange={(e) => onFieldChange('hobbies', e.target.value)}
            />
          </label>

          {/* Sports */}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">
              {ja ? '愛好するスポーツ' : 'Sports'}
            </span>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs min-h-[70px] focus:border-blue-500 focus:outline-none"
              placeholder={ja ? '水泳（週2回）、フットサル' : 'Swimming, futsal'}
              value={String(payload.sports ?? '')}
              onChange={(e) => onFieldChange('sports', e.target.value)}
            />
          </label>

          {/* Extracurricular Activities */}
          <label className="block space-y-1.5 md:col-span-2">
            <span className="text-xs font-bold text-slate-700">
              {ja ? '課外活動・他' : 'Extracurricular Activities'}
            </span>
            <textarea
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs min-h-[70px] focus:border-blue-500 focus:outline-none"
              placeholder={ja ? '学生ハッカソン出場、留学生交流サークル運営' : 'Student hackathons, volunteer work'}
              value={String(payload.extracurricular ?? '')}
              onChange={(e) => onFieldChange('extracurricular', e.target.value)}
            />
          </label>
        </div>
      </GlassCard>
    </div>
  );
};

