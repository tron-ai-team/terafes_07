import React, { useState } from 'react';
import { Sparkles, Check, X, Info } from 'lucide-react';
import { NeonButton } from '../common/NeonButton';
import type { CvSuggestion } from '../../types/careerCenter';

interface CvSingleFieldAiModalProps {
  isOpen: boolean;
  fieldKey: string;
  fieldLabel: string;
  currentValue: string;
  isBusy: boolean;
  onClose: () => void;
  onApply: (suggestion: CvSuggestion) => void;
  onReject: (suggestion: CvSuggestion) => void;
  onRequestAssist: (fieldKey: string, instruction: string) => Promise<CvSuggestion | null>;
  ja: boolean;
}

export const CvSingleFieldAiModal: React.FC<CvSingleFieldAiModalProps> = ({
  isOpen,
  fieldKey,
  fieldLabel,
  currentValue,
  isBusy,
  onClose,
  onApply,
  onReject,
  onRequestAssist,
  ja,
}) => {
  const [instruction, setInstruction] = useState('');
  const [suggestion, setSuggestion] = useState<CvSuggestion | null>(null);

  if (!isOpen) return null;

  const handleRequest = async () => {
    const s = await onRequestAssist(fieldKey, instruction);
    if (s) {
      setSuggestion(s);
    }
  };

  const handleAccept = () => {
    if (suggestion) {
      onApply(suggestion);
      setSuggestion(null);
      setInstruction('');
      onClose();
    }
  };

  const handleReject = () => {
    if (suggestion) {
      onReject(suggestion);
    }
    setSuggestion(null);
    setInstruction('');
    onClose();
  };

  const handleClose = () => {
    if (suggestion) {
      onReject(suggestion);
    }
    setSuggestion(null);
    setInstruction('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{fieldLabel}のAI添削</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                  Cloud SMART
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                {ja
                  ? '指定した指示に基づいて、日本のビジネス慣習に沿った洗練された表現を提案します'
                  : 'Tailor expressions to Japanese business standards with custom prompts'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isBusy}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">
            {ja ? 'AIへの指示・希望するニュアンス（任意）' : 'Instruction or Desired Tone (Optional)'}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={
                ja
                  ? '例: 丁寧に、エンジニア視点で、協調性を強調して'
                  : 'e.g. Polite, highlight technical leadership, concise'
              }
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              disabled={isBusy}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
            />
            <NeonButton
              size="sm"
              isLoading={isBusy}
              onClick={() => void handleRequest()}
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              {ja ? '添削を生成' : 'Generate'}
            </NeonButton>
          </div>
        </div>

        {suggestion ? (
          <div className="space-y-3 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs animate-in fade-in">
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase text-slate-400">{ja ? '現在の入力' : 'Current'}</div>
              <p className="text-slate-600 whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto">
                {currentValue || <span className="italic text-slate-400">{ja ? '（未入力）' : '(Empty)'}</span>}
              </p>
            </div>

            <div className="space-y-1 pt-2 border-t border-slate-200">
              <div className="text-[10px] font-bold uppercase text-emerald-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> {ja ? 'AI改善提案' : 'AI Suggestion'}
              </div>
              <p className="text-slate-900 font-medium whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                {suggestion.proposedText}
              </p>
            </div>

            {suggestion.reason && (
              <div className="text-[11px] text-slate-500 bg-white rounded-lg p-2 border border-slate-100 flex items-start gap-1.5">
                <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                <span>{suggestion.reason}</span>
              </div>
            )}

            <div className="flex justify-end items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleReject}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
              >
                {ja ? '却下' : 'Reject'}
              </button>
              <NeonButton size="sm" onClick={handleAccept} icon={<Check className="w-3.5 h-3.5" />}>
                {ja ? '反映する' : 'Accept & Apply'}
              </NeonButton>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
            {ja
              ? '「添削を生成」を押すと、現在の文章をより魅力的な表現に書き換えた提案を表示します。'
              : 'Click "Generate" above to receive an improved rewrite.'}
          </div>
        )}
      </div>
    </div>
  );
};
