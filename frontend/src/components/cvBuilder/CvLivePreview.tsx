import React, { useRef, useState } from 'react';
import {
  Eye,
  Download,
  Printer,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCheck2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { NeonButton } from '../common/NeonButton';

interface CvLivePreviewProps {
  previewHtmlUrl: string | null;
  isBusy: boolean;
  isExporting: boolean;
  previewError: string | null;
  hasErrors: boolean;
  onRefresh: () => void;
  onExportPdf: () => void;
  ja: boolean;
}

export const CvLivePreview: React.FC<CvLivePreviewProps> = ({
  previewHtmlUrl,
  isBusy,
  isExporting,
  previewError,
  hasErrors,
  onRefresh,
  onExportPdf,
  ja,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 15, 150));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 15, 60));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const handleBrowserPrint = () => {
    // Prefer a dedicated print window so we never fall through to printing the
    // whole CV Builder chrome when the sandboxed iframe cannot print.
    if (previewHtmlUrl) {
      const printWindow = window.open(previewHtmlUrl, '_blank', 'noopener,noreferrer');
      if (printWindow) {
        const triggerPrint = () => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch {
            // User can still print manually from the opened preview tab.
          }
        };
        // Blob HTML may already be loaded; schedule print after paint.
        window.setTimeout(triggerPrint, 400);
        return;
      }
    }
    try {
      iframeRef.current?.contentWindow?.focus();
      iframeRef.current?.contentWindow?.print();
    } catch {
      addToastSafe();
    }
  };

  const addToastSafe = () => {
    // CvLivePreview has no toast channel — surface a lightweight alert.
    window.alert(ja ? 'プレビューの印刷ウィンドウを開けませんでした。' : 'Unable to open the preview print window.');
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Top Preview Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {ja ? 'A4 2ページ リアルタイム プレビュー' : 'A4 2-Page Real-time Preview'}
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                JIS A4 2枚組
              </span>
            </div>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              {ja
                ? 'Spring CvHtmlPdfRenderer 公式レンダラー（PDFと同一HTML）'
                : 'Canonical Spring CvHtmlPdfRenderer layout'}
            </span>
          </div>
        </div>

        {/* Toolbar: Zoom, Print, PDF Download */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 text-slate-600">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 40}
              className="p-1 sm:p-1.5 hover:bg-white rounded-lg transition disabled:opacity-30"
              title={ja ? '縮小' : 'Zoom Out'}
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs font-mono font-semibold hover:bg-white rounded-lg transition"
              title={ja ? '倍率リセット' : 'Reset Zoom'}
            >
              {zoomLevel}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 150}
              className="p-1 sm:p-1.5 hover:bg-white rounded-lg transition disabled:opacity-30"
              title={ja ? '拡大' : 'Zoom In'}
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleBrowserPrint}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{ja ? '印刷' : 'Print'}</span>
          </button>

          <NeonButton
            onClick={onExportPdf}
            isLoading={isExporting}
            disabled={hasErrors}
            icon={<Download className="w-4 h-4" />}
            size="sm"
          >
            {ja ? 'PDF ダウンロード' : 'Download PDF'}
          </NeonButton>
        </div>
      </div>

      {/* Error state if preview failed */}
      {previewError && (
        <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="whitespace-pre-wrap">{previewError}</span>
        </div>
      )}

      {/* Preview Container */}
      <div className="flex-1 rounded-3xl border border-slate-200 bg-slate-100 p-2 sm:p-5 overflow-auto shadow-inner flex justify-center relative min-h-[600px]">
        {/* Busy overlay banner */}
        {isBusy && previewHtmlUrl && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 text-xs font-semibold bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm rounded-xl px-3 py-1.5 text-slate-700 animate-in fade-in">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>{ja ? 'プレビュー更新中…' : 'Updating preview…'}</span>
          </div>
        )}

        {previewHtmlUrl ? (
          <div
            className="transition-transform duration-200 origin-top flex flex-col items-center"
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          >
            <iframe
              ref={iframeRef}
              title="Canonical Japanese 履歴書 Preview"
              src={previewHtmlUrl}
              sandbox="allow-same-origin allow-modals"
              className="w-[850px] h-[1220px] rounded-xl border border-slate-300 shadow-xl bg-white"
            />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
            {isBusy ? (
              <>
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                <div className="text-sm font-bold text-slate-700">
                  {ja ? '公式A4プレビューを生成しています…' : 'Generating Canonical A4 Preview…'}
                </div>
              </>
            ) : (
              <>
                <FileText className="w-12 h-12 text-slate-300" />
                <div className="text-sm font-semibold text-slate-500">
                  {ja ? 'プレビューを読み込めません' : 'Preview not available yet'}
                </div>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  {ja ? '再読み込み' : 'Reload preview'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

