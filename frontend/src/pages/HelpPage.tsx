import React, { useState } from 'react';
import { GlassCard } from '../components/common/GlassCard';
import { HelpCircle, ChevronDown, ChevronUp, Mic, Sparkles, FileText, Compass } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';

export const HelpPage: React.FC = () => {
  const { uiLanguage } = useApp();
  const ja = uiLanguage === 'ja';

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      qEn: 'Does TRON AI require microphone access?',
      qJa: 'TRON AIの利用にマイクへのアクセス権限は必須ですか？',
      aEn: 'Microphone access enables real-time spoken interview practice and Voice Mode. However, if a microphone is unavailable or permissions are denied, you can always use manual keyboard text input.',
      aJa: 'AI音声モードや模擬面接でリアルタイム対話を行うにはマイク権限が必要ですが、マイクが利用できない場合でもテキスト入力による回答が可能です。',
      icon: <Mic className="w-4 h-4 text-cyan-500 shrink-0" />,
    },
    {
      qEn: 'Which Japanese levels are supported?',
      qJa: '対応している日本語レベルと敬語の難易度はどのくらいですか？',
      aEn: 'The system adapts questions and keigo complexity according to difficulty levels (Beginner, Intermediate, Advanced) aligned with JLPT N3 to N1 workplace communication competencies.',
      aJa: '初級・中級・上級の3段階から選択でき、JLPT N3〜N1相当のビジネス日本語・丁寧語・尊敬語・謙譲語の面接練習に対応しています。',
      icon: <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />,
    },
    {
      qEn: 'How does CV and Candidate Profile integration work?',
      qJa: '履歴書やプロフィール情報はどのように面接練習と連携しますか？',
      aEn: 'You can create standard Japanese JIS 履歴書 or English résumés in the AI CV Builder. Your saved Candidate Profile skills and career background can then inform your interview preparation.',
      aJa: 'AI履歴書ビルダーで日本標準のJIS規格履歴書や英語レジュメを作成・管理できます。候補者プロフィールに入力した希望職種や実務経歴を面接練習の設定と連携できます。',
      icon: <FileText className="w-4 h-4 text-indigo-500 shrink-0" />,
    },
    {
      qEn: 'How are practice evaluations and feedback generated?',
      qJa: '面接のフィードバックや練習評価はどのように生成されますか？',
      aEn: 'AI evaluates your actual spoken or written answers across Japanese fluency, logic, and structured communication. Feedback is focused on helping you improve your confidence and self-learning.',
      aJa: '面接セッション終了後、実際の回答内容に基づき、日本語伝達力、論理的構成力（STAR形式など）、自己PRの説得力に関する詳細なAI講評が提供されます。',
      icon: <Compass className="w-4 h-4 text-emerald-500 shrink-0" />,
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 select-none py-2 pb-24 md:pb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
          {ja ? 'ヘルプ & ドキュメント' : 'Help & Documentation'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {ja
            ? 'よくある質問、マイク設定、面接練習と履歴書ビルダーの利用ガイドです。'
            : 'Frequently asked questions, microphone tips, and guidance for your practice sessions.'}
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <GlassCard key={idx} className="p-4 sm:p-5 transition-all">
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                className="w-full flex items-center justify-between text-left gap-3 focus:outline-hidden cursor-pointer"
                aria-expanded={isOpen}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    {faq.icon}
                  </div>
                  <h2 className="font-bold text-sm text-slate-800 leading-snug">
                    {ja ? faq.qJa : faq.qEn}
                  </h2>
                </div>
                <div className="text-slate-400 p-1 shrink-0">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isOpen && (
                <div className="mt-3 pt-3 border-t border-slate-100 pl-11 text-xs text-slate-600 leading-relaxed animate-in fade-in duration-200">
                  <p>{ja ? faq.aJa : faq.aEn}</p>
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>

      {/* Helpful Quick Links Card */}
      <GlassCard className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            {ja ? 'お困りの機能へ移動' : 'Jump to Core Feature'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {ja
              ? 'AI音声、面接練習、履歴書ビルダーを直接起動できます。'
              : 'Directly launch AI Voice, Interview Practice, or CV Builder.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Link
            to="/voice"
            className="px-3.5 py-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200 text-xs font-semibold hover:bg-cyan-100 transition"
          >
            {ja ? 'AI音声' : 'Voice Mode'}
          </Link>
          <Link
            to="/career/interview"
            className="px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition"
          >
            {ja ? '面接練習' : 'Interview Practice'}
          </Link>
          <Link
            to="/career/cv-builder"
            className="px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold hover:bg-indigo-100 transition"
          >
            {ja ? '履歴書ビルダー' : 'CV Builder'}
          </Link>
        </div>
      </GlassCard>
    </div>
  );
};

export default HelpPage;
