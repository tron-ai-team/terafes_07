import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/common/GlassCard';
import { ScoreGauge } from '../components/common/ScoreGauge';
import { NeonButton } from '../components/common/NeonButton';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Home,
  Download,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  MessageSquare,
  Send,
  RefreshCw,
} from 'lucide-react';

export const FeedbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { lastAnalysis, interviewConfig, uiLanguage, addToast, setInterviewConfig } = useApp();

  const [showFullTranscript, setShowFullTranscript] = useState(false);

  // Question retry state
  const [retryModalOpen, setRetryModalOpen] = useState(false);
  const [retryQuestion, setRetryQuestion] = useState('');
  const [prevAnswer, setPrevAnswer] = useState('');
  const [retryAnswer, setRetryAnswer] = useState('');
  const [retryEvaluation, setRetryEvaluation] = useState<string | null>(null);
  const [isEvaluatingRetry, setIsEvaluatingRetry] = useState(false);

  // Analysis from AppContext
  const analysis = lastAnalysis || {
    interviewId: 'tron-inv-none',
    companyName: interviewConfig.companyName || 'LINEヤフー株式会社 (LY Corporation)',
    jobPosition: interviewConfig.jobPosition || 'Software Engineer (Backend)',
    interviewType: 'Technical Interview',
    difficulty: 'Intermediate',
    overallScore: 0,
    communicationScore: 0,
    japaneseScore: 0,
    technicalScore: 0,
    confidenceScore: 0,
    radarData: [],
    strongPoints: [],
    weakPoints: [],
    aiOverallFeedback:
      '面接セッションがまだ完了していません。面接ルームから質問への回答を完了すると、リアルAIによる日本語講評がここに表示されます。',
    starSuggestion: {
      situation: '',
      task: '',
      action: '',
      result: '',
    },
    durationMinutes: 1,
    completionDate: new Date().toLocaleDateString('ja-JP'),
    transcript: [],
  };

  const hasNumericScores = analysis.overallScore > 0;
  const hasRadarData =
    Array.isArray(analysis.radarData) &&
    analysis.radarData.length > 0 &&
    analysis.radarData.some((r) => r.score > 0);

  const handleExport = () => {
    addToast('Interview Performance Report prepared for download.', 'success');
  };

  const handleOpenRetry = (questionText: string, previousAnswerText: string = '') => {
    setRetryQuestion(questionText);
    setPrevAnswer(previousAnswerText);
    setRetryAnswer('');
    setRetryEvaluation(null);
    setRetryModalOpen(true);
  };

  const handleEvaluateRetry = () => {
    if (!retryAnswer.trim()) {
      addToast('Please enter your improved response before evaluating.', 'warning');
      return;
    }
    setIsEvaluatingRetry(false);
    setRetryEvaluation(null);
    addToast(
      uiLanguage === 'ja'
        ? '再評価APIは未提供です。改善回答は面接ルームで実セッションとして再試行してください。'
        : 'Retry evaluation API is unavailable. Re-try your improved answer in a real interview room session.',
      'warning'
    );
  };

  const handleLaunchRoomForQuestion = () => {
    setInterviewConfig((prev) => ({
      ...prev,
      jobDescription: `${prev.jobDescription || ''} [Focus Question: ${retryQuestion}]`,
    }));
    setRetryModalOpen(false);
    navigate('/career/interview/room');
  };

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6 select-none py-2">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
              EVALUATION COMPLETED
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Session ID: {analysis.interviewId}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            {uiLanguage === 'ja' ? '面接評価レポート・AI分析結果' : 'Interview Evaluation & Results'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {analysis.companyName} • {analysis.jobPosition} • {analysis.completionDate}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <NeonButton
            variant="secondary"
            size="sm"
            onClick={handleExport}
            icon={<Download className="w-4 h-4" />}
          >
            Export Report
          </NeonButton>
          <NeonButton
            size="sm"
            onClick={() => navigate('/career/interview/setup')}
            icon={<RotateCcw className="w-4 h-4" />}
          >
            {uiLanguage === 'ja' ? 'もう一度練習する' : 'Practice Again'}
          </NeonButton>
        </div>
      </div>

      {/* Ethical Practice Disclaimer Banner */}
      <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-3 shadow-2xs">
        <div className="p-1.5 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div className="flex-1 leading-relaxed">
          <span className="font-bold">
            {uiLanguage === 'ja' ? '【面接スキル練習に関する免責事項】' : '[Ethical Practice Disclaimer]'}
          </span>{' '}
          <span className="text-amber-800">
            {uiLanguage === 'ja'
              ? '本シミュレーションのスコアおよびAI講評は面接対話スキルの習得と改善を支援するための自己学習用評価であり、実際の企業採用選考の合否を予測または保証するものではありません。'
              : 'Practice scores and AI feedback are strictly for interview skill preparation and self-learning, and do not predict or guarantee actual employer hiring decisions.'}
          </span>
        </div>
      </div>

      {/* Primary Score / Qualitative Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Overall Score / Qualitative Status Card */}
        <GlassCard className="p-6 md:col-span-1 flex flex-col items-center justify-center text-center">
          {hasNumericScores ? (
            <>
              <ScoreGauge
                score={analysis.overallScore}
                size={140}
                label={uiLanguage === 'ja' ? '総合適性スコア' : 'Overall Score'}
              />
              <div className="mt-3 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                {analysis.overallScore >= 80 ? 'EXCELLENT PRACTICE SCORE (優秀な練習到達度)' : 'SOLID PRACTICE PROGRESS (着実な進捗)'}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center py-2">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500/10 via-cyan-500/10 to-indigo-500/10 border-2 border-blue-400 flex items-center justify-center shadow-lg shadow-blue-500/10 mb-3">
                <Sparkles className="w-10 h-10 text-blue-500" />
              </div>
              <div className="font-extrabold text-sm text-slate-800">
                {uiLanguage === 'ja' ? '定性AI評価完了' : 'Qualitative Evaluation'}
              </div>
              <div className="mt-2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                PROSE REVIEW (詳細講評)
              </div>
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                qwen3:8b による日本語定性評価
              </p>
            </div>
          )}
        </GlassCard>

        {/* Sub-scores or Qualitative Dimensions in 3 cards */}
        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlassCard className="p-5 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {uiLanguage === 'ja' ? '日本語伝達力' : 'Japanese Fluency'}
              </div>
              <div className="text-2xl font-black text-slate-800 mt-2 font-display">
                {hasNumericScores ? (
                  <>
                    {analysis.japaneseScore}
                    <span className="text-sm font-semibold text-blue-500">/100</span>
                  </>
                ) : (
                  <span className="text-blue-600 text-lg">AI評価済</span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              ビジネス敬語、発音明瞭度、結論ファーストの構成力。
            </p>
          </GlassCard>

          <GlassCard className="p-5 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {uiLanguage === 'ja' ? '技術的論理性' : 'Technical Competency'}
              </div>
              <div className="text-2xl font-black text-slate-800 mt-2 font-display">
                {hasNumericScores ? (
                  <>
                    {analysis.technicalScore}
                    <span className="text-sm font-semibold text-cyan-500">/100</span>
                  </>
                ) : (
                  <span className="text-cyan-600 text-lg">AI評価済</span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              アーキテクチャ選定根拠、高並行処理、障害切り分け能力。
            </p>
          </GlassCard>

          <GlassCard className="p-5 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {uiLanguage === 'ja' ? 'STAR法構成力' : 'STAR Method Execution'}
              </div>
              <div className="text-2xl font-black text-slate-800 mt-2 font-display">
                {hasNumericScores ? (
                  <>
                    {analysis.communicationScore}
                    <span className="text-sm font-semibold text-indigo-500">/100</span>
                  </>
                ) : (
                  <span className="text-indigo-600 text-lg">AI評価済</span>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              状況・課題・具体的行動・定量的成果の整合性。
            </p>
          </GlassCard>
        </div>
      </div>

      {/* Radar Chart & AI Overall Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart or Evaluation Summary */}
        <GlassCard className="p-6 flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm text-slate-800">
              {uiLanguage === 'ja' ? '評価項目レーダーチャート' : 'Competency Radar Breakdown'}
            </h3>
            <span className="text-[11px] text-slate-400">
              {hasRadarData ? 'Target vs Benchmark' : 'Qualitative Mode'}
            </span>
          </div>

          {hasRadarData ? (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={analysis.radarData}>
                  <PolarGrid stroke="rgba(0, 140, 255, 0.15)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#475569', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#cbd5e1" />
                  <Radar
                    name="Candidate Score"
                    dataKey="score"
                    stroke="#008CFF"
                    fill="#008CFF"
                    fillOpacity={0.4}
                  />
                  <Radar
                    name="Market Benchmark"
                    dataKey="benchmark"
                    stroke="#94a3b8"
                    fill="#94a3b8"
                    fillOpacity={0.15}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="w-full my-auto py-8 text-center px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 mx-auto flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-xs text-slate-800">
                {uiLanguage === 'ja' ? '定性分析重視モード' : 'Qualitative Analysis Active'}
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm mx-auto">
                {uiLanguage === 'ja'
                  ? '現在のAIモデル（qwen3:8b）は、架空の数値ではなく実際の面接回答に対する詳細な日本語講評文を生成しています。右の講評をご覧ください。'
                  : 'The AI model provides real detailed qualitative feedback without generating artificial numeric scores.'}
              </p>
            </div>
          )}

          <div className="w-full pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Model: qwen3:8b (Ollama)</span>
            <span>Duration: {analysis.durationMinutes} min</span>
          </div>
        </GlassCard>

        {/* AI Overall Feedback */}
        <GlassCard className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-500" />
              <h3 className="font-bold text-sm text-slate-800">
                {uiLanguage === 'ja' ? 'TRON AI 面接官からの講評' : 'Interviewer AI Assessment'}
              </h3>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed bg-blue-50/50 p-4 rounded-2xl border border-blue-100 whitespace-pre-wrap">
              {analysis.aiOverallFeedback}
            </p>
          </div>

          {/* STAR Suggestion Box if available */}
          {analysis.starSuggestion?.situation ? (
            <div className="mt-4 p-4 rounded-2xl bg-cyan-50/40 border border-cyan-100 space-y-2 text-xs">
              <div className="font-bold text-cyan-900 flex items-center gap-1.5">
                <span>⭐</span>
                <span>STAR Framework Recommendation (STAR回答最適化例):</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div>
                  <span className="font-bold text-blue-700">S (状況): </span>
                  <span>{analysis.starSuggestion.situation}</span>
                </div>
                <div>
                  <span className="font-bold text-blue-700">T (課題): </span>
                  <span>{analysis.starSuggestion.task}</span>
                </div>
                <div>
                  <span className="font-bold text-cyan-700">A (行動): </span>
                  <span>{analysis.starSuggestion.action}</span>
                </div>
                <div>
                  <span className="font-bold text-emerald-700">R (結果): </span>
                  <span>{analysis.starSuggestion.result}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500">
              {uiLanguage === 'ja'
                ? '面接回答の要点と改善点は上記の講評に統合されて記載されています。'
                : 'STAR structure improvements and feedback points are detailed in the prose above.'}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Transcript with Question Retry Actions */}
      {analysis.transcript && analysis.transcript.length > 0 && (
        <GlassCard className="p-4">
          <button
            type="button"
            onClick={() => setShowFullTranscript(!showFullTranscript)}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-700"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <span>
                {uiLanguage === 'ja' ? '面接全対話ログ & 質問別再練習' : 'Complete Transcript & Question Retry Drills'} ({analysis.transcript.length} turns)
              </span>
            </div>
            {showFullTranscript ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showFullTranscript && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 text-xs max-h-96 overflow-y-auto">
              {analysis.transcript.map((t, idx) => {
                const isInterviewer = t.sender !== 'user';
                const nextTurn = analysis.transcript[idx + 1];
                const candResponse = !isInterviewer ? '' : (nextTurn && nextTurn.sender === 'user' ? nextTurn.text : '');

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-2xl transition-all ${
                      t.sender === 'user'
                        ? 'bg-blue-50 text-blue-950 ml-6 border border-blue-100'
                        : 'bg-slate-50 text-slate-800 mr-6 border border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-[10px] uppercase text-slate-400 mb-1">
                      <span>{t.sender === 'user' ? 'Candidate (あなた)' : 'Interviewer (面接官)'}</span>
                      {isInterviewer && (
                        <button
                          type="button"
                          onClick={() => handleOpenRetry(t.text, candResponse)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold text-[10px] transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{uiLanguage === 'ja' ? 'この質問を再練習' : 'Retry Question'}</span>
                        </button>
                      )}
                    </div>
                    <p className="leading-relaxed">{t.text}</p>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      )}

      {/* Question Retry Modal */}
      {retryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl border border-blue-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    {uiLanguage === 'ja' ? '質問ピンポイント再練習' : 'Targeted Question Retry Drill'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    STARフレームワーク（結論→理由→実績）を意識して回答をブラッシュアップします
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRetryModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Question Display */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {uiLanguage === 'ja' ? '面接官からの質問' : 'Interviewer Question'}
              </div>
              <p className="text-xs font-semibold text-slate-800 leading-relaxed">{retryQuestion}</p>
            </div>

            {/* Previous answer if available */}
            {prevAnswer && (
              <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs">
                <span className="font-bold text-blue-800 block mb-1">
                  {uiLanguage === 'ja' ? '前回の回答メモ:' : 'Your previous response:'}
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">{prevAnswer}</p>
              </div>
            )}

            {/* Revised Answer Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700">
                {uiLanguage === 'ja' ? '改善した回答を入力 (STAR構成)' : 'Enter Your Improved Response (STAR Format)'}
              </label>
              <textarea
                rows={4}
                value={retryAnswer}
                onChange={(e) => setRetryAnswer(e.target.value)}
                placeholder="結論ファーストで、状況(S)・課題(T)・具体的な行動(A)・定量的成果(R)を盛り込んで回答してください..."
                className="w-full rounded-2xl bg-white border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              />
            </div>

            {/* AI Evaluation Result */}
            {retryEvaluation && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>AI Coaching Feedback</span>
                </div>
                <p className="text-[11px] leading-relaxed">{retryEvaluation}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleLaunchRoomForQuestion}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                {uiLanguage === 'ja' ? '面接ルームで音声練習する →' : 'Practice in Voice Room →'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRetryModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
                <NeonButton
                  size="sm"
                  onClick={handleEvaluateRetry}
                  disabled={isEvaluatingRetry || !retryAnswer.trim()}
                  icon={isEvaluatingRetry ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                >
                  {isEvaluatingRetry ? 'Evaluating...' : 'Quick AI Review'}
                </NeonButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => navigate('/career/interview')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>{uiLanguage === 'ja' ? '面接ダッシュボードへ戻る' : 'Return to Interview Dashboard'}</span>
        </button>

        <NeonButton
          size="md"
          onClick={() => navigate('/career/interview/setup')}
          icon={<RotateCcw className="w-4 h-4" />}
        >
          {uiLanguage === 'ja' ? '次の面接をカスタマイズ' : 'Configure Next Interview'}
        </NeonButton>
      </div>
    </div>
  );
};
