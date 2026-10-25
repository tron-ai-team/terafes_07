import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GlassCard } from '../components/common/GlassCard';
import { NeonButton } from '../components/common/NeonButton';
import { careerCenterClient } from '../services/careerCenterClient';
import type { CompanyAnalysis, CvDraft } from '../types/careerCenter';
import { ApiError } from '../services/httpClient';
import {
  Building2,
  Globe,
  RefreshCw,
  Sparkles,
  ArrowRight,
  AlertCircle,
  FileText,
  ExternalLink,
} from 'lucide-react';

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (value == null) return [];
  return [String(value)];
}

export const CompanyAnalysisPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast, uiLanguage, selectedLanguage, setInterviewConfig } = useApp();
  const ja = uiLanguage === 'ja';

  const [companyName, setCompanyName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [recruitmentUrl, setRecruitmentUrl] = useState('');
  const [drafts, setDrafts] = useState<CvDraft[]>([]);
  const [cvDraftId, setCvDraftId] = useState('');
  const [history, setHistory] = useState<CompanyAnalysis[]>([]);
  const [analysis, setAnalysis] = useState<CompanyAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshHistory = async () => {
    try {
      const [list, draftList] = await Promise.all([
        careerCenterClient.listCompanyAnalyses(),
        careerCenterClient.listDrafts(),
      ]);
      setHistory(list);
      setDrafts(draftList);
      if (!cvDraftId && draftList.length > 0) setCvDraftId(draftList[0].id);
    } catch {
      // non-fatal
    }
  };

  useEffect(() => {
    void refreshHistory();
  }, []);

  const handleAnalyze = async () => {
    if (!companyName.trim()) {
      addToast(ja ? '会社名を入力してください' : 'Enter a company name', 'warning');
      return;
    }
    if (!websiteUrl.trim() && !recruitmentUrl.trim()) {
      addToast(ja ? '企業サイトまたは採用URLを入力してください' : 'Enter a website or recruitment URL', 'warning');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await careerCenterClient.analyzeCompany({
        companyName: companyName.trim(),
        websiteUrl: websiteUrl.trim() || undefined,
        recruitmentUrl: recruitmentUrl.trim() || undefined,
        cvDraftId: cvDraftId || undefined,
        language: selectedLanguage || (ja ? 'ja' : 'en'),
      });
      setAnalysis(result);
      await refreshHistory();
      addToast(ja ? '企業分析が完了しました' : 'Company analysis completed', 'success');
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.detail : err?.message || 'Analysis failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleLoad = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const full = await careerCenterClient.getCompanyAnalysis(id);
      setAnalysis(full);
      setCompanyName(full.companyName || '');
      setWebsiteUrl(full.websiteUrl || '');
      setRecruitmentUrl(full.recruitmentUrl || '');
      if (full.cvDraftId) setCvDraftId(full.cvDraftId);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.detail : err?.message || 'Load failed');
    } finally {
      setBusy(false);
    }
  };

  const handleTransfer = async () => {
    if (!analysis?.id) return;
    const targetDraft = cvDraftId || drafts[0]?.id;
    if (!targetDraft) {
      addToast(ja ? '先に CV Builder で下書きを作成してください' : 'Create a CV draft first', 'warning');
      navigate('/career/cv-builder');
      return;
    }
    setBusy(true);
    try {
      const ids = (analysis.suggestions || []).map((s) => s.id).filter(Boolean);
      const result = await careerCenterClient.transferSuggestionsToCv(analysis.id, {
        draftId: targetDraft,
        suggestionIds: ids.length ? ids : undefined,
      });
      addToast(
        ja
          ? `CV提案に転送しました（下書きは未変更・承認待ち ${result.transferred?.length || 0} 件）`
          : `Transferred as PENDING CV suggestions (${result.transferred?.length || 0}). Draft unchanged until accept.`,
        'success'
      );
      navigate('/career/cv-builder');
    } catch (err: any) {
      addToast(err instanceof ApiError ? err.detail : err?.message || 'Transfer failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleStartInterview = () => {
    if (!analysis?.id) return;
    setInterviewConfig((prev) => ({
      ...prev,
      companyName: analysis.companyName || companyName || prev.companyName,
      companyAnalysisId: analysis.id,
      type: 'company-specific' as any,
      jobDescription:
        prev.jobDescription ||
        `Company analysis context for ${analysis.companyName || companyName}`,
    }));
    navigate('/career/interview/setup');
  };

  const strengths = asStringList(analysis?.comparison?.strengths);
  const gaps = asStringList(analysis?.comparison?.gaps);
  const uncertain = asStringList(analysis?.comparison?.uncertain);
  const stated = asStringList(analysis?.requirements?.stated);
  const facts = asStringList(analysis?.overview?.facts);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-2">
            <Building2 className="w-4 h-4" /> Interview Agent
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            {ja ? '企業ウェブサイト分析' : 'Company Website Analysis'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {ja
              ? '公開情報のみを取得し、CVと比較します。架空の企業情報は作りません。'
              : 'Source-backed research only. No invented company facts.'}
          </p>
        </div>
        <NeonButton variant="secondary" onClick={() => void refreshHistory()} icon={<RefreshCw className="w-4 h-4" />}>
          {ja ? '履歴更新' : 'Refresh'}
        </NeonButton>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="p-5 space-y-3 lg:col-span-2">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">{ja ? '会社名' : 'Company name'}</span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Example Corp"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600 inline-flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" /> Website URL
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">{ja ? '採用ページURL' : 'Recruitment URL'}</span>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={recruitmentUrl}
              onChange={(e) => setRecruitmentUrl(e.target.value)}
              placeholder="https://example.com/careers"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600">{ja ? '比較する CV 下書き' : 'CV draft for comparison'}</span>
            <select
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={cvDraftId}
              onChange={(e) => setCvDraftId(e.target.value)}
            >
              <option value="">{ja ? '（なし）' : '(none)'}</option>
              {drafts.map((d) => (
                <option key={d.id} value={d.id}>
                  {(d.versionLabel || d.id.slice(0, 8)) + ' · ' + d.templateCode}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2 pt-2">
            <NeonButton onClick={() => void handleAnalyze()} disabled={busy} icon={<Sparkles className="w-4 h-4" />}>
              {busy ? (ja ? '分析中…' : 'Analyzing…') : ja ? '企業を分析' : 'Analyze company'}
            </NeonButton>
            {analysis?.id && (
              <>
                <NeonButton variant="secondary" onClick={() => void handleTransfer()} disabled={busy} icon={<FileText className="w-4 h-4" />}>
                  {ja ? 'CVへ転送（承認待ち）' : 'Transfer to CV (pending)'}
                </NeonButton>
                <NeonButton variant="secondary" onClick={handleStartInterview} icon={<ArrowRight className="w-4 h-4" />}>
                  {ja ? '企業特化面接へ' : 'Company interview'}
                </NeonButton>
              </>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-4 space-y-2">
          <div className="text-xs font-bold uppercase text-slate-500">{ja ? '保存済み分析' : 'Saved analyses'}</div>
          <div className="space-y-1 max-h-80 overflow-auto">
            {history.length === 0 && <div className="text-xs text-slate-400">No analyses yet</div>}
            {history.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => void handleLoad(h.id)}
                className={`w-full text-left rounded-lg px-3 py-2 text-xs border ${
                  analysis?.id === h.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-slate-800 truncate">{h.companyName || h.id}</div>
                <div className="text-slate-500">{h.status || '—'}</div>
              </button>
            ))}
          </div>
        </GlassCard>
      </div>

      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassCard className="p-5 space-y-2">
            <h2 className="font-bold text-slate-900">{ja ? '概要（事実）' : 'Overview (facts)'}</h2>
            <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
              {facts.length === 0 && <li className="text-slate-400 list-none pl-0">No extracted facts</li>}
              {facts.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </GlassCard>
          <GlassCard className="p-5 space-y-2">
            <h2 className="font-bold text-slate-900">{ja ? '要件' : 'Requirements'}</h2>
            <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
              {stated.length === 0 && <li className="text-slate-400 list-none pl-0">Not stated / empty</li>}
              {stated.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </GlassCard>
          <GlassCard className="p-5 space-y-3 md:col-span-2">
            <h2 className="font-bold text-slate-900">{ja ? 'CV比較' : 'CV comparison'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs font-semibold text-emerald-700 mb-1">Strengths</div>
                <ul className="space-y-1 list-disc pl-4">
                  {strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold text-amber-700 mb-1">Gaps</div>
                <ul className="space-y-1 list-disc pl-4">
                  {gaps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">Uncertain</div>
                <ul className="space-y-1 list-disc pl-4">
                  {uncertain.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-5 space-y-2 md:col-span-2">
            <h2 className="font-bold text-slate-900">{ja ? 'ソース' : 'Sources'}</h2>
            <div className="space-y-2">
              {(analysis.sources || []).length === 0 && (
                <div className="text-sm text-slate-400">No sources returned</div>
              )}
              {(analysis.sources || []).map((s, i) => {
                const href = s.sourceUrl || s.url || '';
                return (
                  <div key={i} className="rounded-xl border border-slate-100 p-3 text-sm">
                    <div className="font-semibold text-slate-800">{s.title || href || 'Source'}</div>
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline break-all"
                      >
                        {href} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {s.excerpt && <p className="text-xs text-slate-500 mt-1 line-clamp-3">{s.excerpt}</p>}
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
