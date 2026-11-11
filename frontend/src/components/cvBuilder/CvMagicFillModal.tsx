import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  AlertCircle,
  Building2,
  CheckCircle2,
  Info,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Loader2,
  Zap,
} from 'lucide-react';
import { NeonButton } from '../common/NeonButton';
import type { CvSuggestion } from '../../types/careerCenter';
import { careerCenterClient } from '../../services/careerCenterClient';

interface CvMagicFillModalProps {
  isOpen: boolean;
  isGenerating: boolean;
  isDeciding: boolean;
  suggestions: CvSuggestion[];
  warnings: string[];
  companyContext: string;
  onCompanyContextChange: (val: string) => void;
  onGenerate: () => Promise<void>;
  onAcceptOne: (suggestion: CvSuggestion) => Promise<void>;
  onRejectOne: (suggestion: CvSuggestion) => Promise<void>;
  onAcceptAll: () => Promise<void>;
  onClose: () => void;
  ja: boolean;
}

const FIELD_LABELS: Record<string, { ja: string; en: string }> = {
  selfPr: { ja: '自己PR', en: 'Self PR' },
  additionalNotes: { ja: '志望動機・特記事項', en: 'Motivation & Notes' },
  motivationCompany: { ja: '志望動機（会社別）', en: 'Company Motivation' },
  careerGoals: { ja: 'キャリア目標', en: 'Career Goals' },
  favoriteSubjects: { ja: '得意科目', en: 'Favorite Subjects' },
  hobbies: { ja: '趣味・特技', en: 'Hobbies & Skills' },
  sports: { ja: '愛好するスポーツ', en: 'Sports' },
  extracurricular: { ja: '課外活動', en: 'Extracurricular Activities' },
  careerSummary: { ja: '職務要約', en: 'Career Summary' },
  fullName: { ja: '氏名', en: 'Full Name' },
  email: { ja: 'E-mail', en: 'Email' },
  phone: { ja: '電話番号', en: 'Phone' },
};

export const CvMagicFillModal: React.FC<CvMagicFillModalProps> = ({
  isOpen,
  isGenerating,
  isDeciding,
  suggestions,
  warnings,
  companyContext,
  onCompanyContextChange,
  onGenerate,
  onAcceptOne,
  onRejectOne,
  onAcceptAll,
  onClose,
  ja,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-7 space-y-6 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-slate-900">
                  {ja ? 'TRON AI Magic Fill' : 'TRON AI Magic Fill'}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 flex items-center gap-1 border border-indigo-200">
                  <Zap className="w-3 h-3 text-indigo-600" />
                  Cloud SMART
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {ja
                  ? '日本標準の履歴書に合わせた表現校正・自己PRの魅力強化・志望動機の最適化'
                  : 'Polished Japanese expressions, compelling self-PR, and contextual motivation'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating || isDeciding}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Safety & Human Approval Notice */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 flex items-start gap-3 shrink-0">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold text-slate-800">
              {ja
                ? '安心のヒューマン・イン・ザ・ループ設計（自動上書きは行われません）'
                : 'Safe Human-in-the-Loop AI (No Automatic Overwrites)'}
            </div>
            <p className="text-slate-500 leading-relaxed">
              {ja
                ? 'AIは学歴・資格・職歴・経歴年数を捏造しません。提案された文章を確認し、納得した項目のみ「適用」ボタンを押してください。'
                : 'AI will never fabricate qualifications, degrees, dates, or employers. Review proposed text and apply only what you approve.'}
            </p>
          </div>
        </div>

        {/* Context Configuration Controls */}
        <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100 p-4 space-y-3 shrink-0">
          <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-indigo-600" />
            {ja ? '応募先企業のコンテキスト（任意）' : 'Target Company Context (Optional)'}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder={
                ja
                  ? '例: 株式会社○○、LINEヤフー、サイバーエージェント'
                  : 'e.g. Sony, CyberAgent, SoftBank'
              }
              value={companyContext}
              onChange={(e) => onCompanyContextChange(e.target.value)}
              disabled={isGenerating || isDeciding}
              className="flex-1 rounded-xl border border-indigo-200 px-3.5 py-2 text-xs bg-white focus:outline-none focus:border-indigo-500 shadow-sm"
            />
            <NeonButton
              size="sm"
              isLoading={isGenerating}
              disabled={isDeciding}
              onClick={() => void onGenerate()}
              icon={<Sparkles className="w-4 h-4" />}
            >
              {suggestions.length > 0
                ? ja
                  ? '提案を再生成'
                  : 'Regenerate Suggestions'
                : ja
                  ? 'AI提案を生成'
                  : 'Generate Suggestions'}
            </NeonButton>
          </div>
        </div>

        {/* Warnings Banner */}
        {warnings.length > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-1 shrink-0">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <Info className="w-4 h-4 text-amber-600" />
              {ja ? '注意・未入力項目:' : 'Advisory / Missing Profile Items:'}
            </div>
            <ul className="list-disc pl-5 space-y-0.5 text-amber-800">
              {warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions List / Empty / Loading State */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[220px]">
          {isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center py-12 space-y-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center animate-bounce">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-800">
                {ja ? 'AIが履歴書を最適化しています…' : 'Generating Intelligent CV Suggestions…'}
              </div>
              <p className="text-xs text-slate-500 max-w-sm">
                {ja
                  ? '候補者プロフィールとJIS規格の表現基準を照合し、最適な提案を作成中…'
                  : 'Matching candidate background with canonical Japanese CV standards via Cloud AI…'}
              </p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12 space-y-3 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-700">
                {ja ? '保留中の提案はありません' : 'No Pending Suggestions'}
              </div>
              <p className="text-xs text-slate-500 max-w-md">
                {ja
                  ? '上の「AI提案を生成」ボタンを押すと、自己PRや志望動機の添削提案を取得できます。'
                  : 'Click "Generate Suggestions" above to receive targeted AI rewrites for your self-PR and motivation.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm py-1 z-10">
                <div className="text-xs font-bold text-slate-700">
                  {ja ? `未適用の提案 (${suggestions.length}件)` : `Pending Suggestions (${suggestions.length})`}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isDeciding || isGenerating}
                    onClick={() => void onAcceptAll()}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {ja ? 'すべての提案を適用' : 'Accept All'}
                  </button>
                </div>
              </div>

              {suggestions.map((s, idx) => {
                const sid = careerCenterClient.suggestionId(s);
                const fieldLabel = FIELD_LABELS[s.fieldKey]?.[ja ? 'ja' : 'en'] || s.fieldKey;

                return (
                  <div
                    key={sid || idx}
                    className="rounded-2xl bg-white border border-slate-200 p-4 space-y-3 shadow-sm hover:border-blue-300 transition"
                  >
                    {/* Suggestion Card Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                          {fieldLabel}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            s.category === 'PROFILE_FACT'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {s.category || 'AI_REWRITE'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">#{idx + 1}</span>
                    </div>

                    {/* Diff View: Original vs Proposed */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Original */}
                      <div className="space-y-1 rounded-xl bg-slate-50 border border-slate-200 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {ja ? '現在のテキスト' : 'Current Draft Text'}
                        </div>
                        <p className="text-slate-600 whitespace-pre-wrap leading-relaxed min-h-[40px]">
                          {s.originalText ? s.originalText : <span className="italic text-slate-400">{ja ? '（未入力）' : '(Empty)'}</span>}
                        </p>
                      </div>

                      {/* Proposed */}
                      <div className="space-y-1 rounded-xl bg-emerald-50/60 border border-emerald-200 p-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {ja ? 'AI改善提案' : 'AI Improved Text'}
                        </div>
                        <p className="text-slate-900 font-medium whitespace-pre-wrap leading-relaxed min-h-[40px]">
                          {s.proposedText || '—'}
                        </p>
                      </div>
                    </div>

                    {/* Explanation */}
                    {s.reason && (
                      <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{s.reason}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        disabled={isDeciding}
                        onClick={() => void onRejectOne(s)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                        {ja ? '却下' : 'Reject'}
                      </button>
                      <button
                        type="button"
                        disabled={isDeciding}
                        onClick={() => void onAcceptOne(s)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {ja ? 'この提案を適用' : 'Accept & Apply'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
          <span className="text-xs text-slate-400">
            {ja ? '変更内容は即座にプレビューへ反映されます' : 'Accepted changes update the live preview immediately'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
          >
            {ja ? '閉じる' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

