import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  GitCompare,
  FileCheck,
  Layers,
  Sparkles,
  Eye,
  Sliders,
  AlertCircle,
  CheckCircle2,
  FileText,
  Download,
  Maximize2,
} from 'lucide-react';
import { PdfComparisonResult } from '../lib/pdf/pdfCompare';

interface PdfCompareViewerProps {
  comparison: PdfComparisonResult;
  onDownloadPdf?: () => void;
  onDownloadReport?: () => void;
}

export const PdfCompareViewer: React.FC<PdfCompareViewerProps> = ({
  comparison,
  onDownloadPdf,
  onDownloadReport,
}) => {
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'overlay' | 'diff'>(comparison.mode || 'side-by-side');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.5);
  const [showTextDrawer, setShowTextDrawer] = useState<boolean>(true);

  const totalPages = comparison.pages.length;
  const currentPage = comparison.pages[activePageIndex] || comparison.pages[0];
  const changedIndices = comparison.changedPageIndices;

  // Change Navigation (Jump between modified/added/removed pages)
  const currentChangeNumber = changedIndices.indexOf(activePageIndex) + 1;
  const totalChanges = changedIndices.length;

  const goToNextChange = () => {
    if (totalChanges === 0) return;
    const nextIdx = changedIndices.find((idx) => idx > activePageIndex);
    if (nextIdx !== undefined) {
      setActivePageIndex(nextIdx);
    } else {
      // Loop around to first change
      setActivePageIndex(changedIndices[0]);
    }
  };

  const goToPrevChange = () => {
    if (totalChanges === 0) return;
    const prevIndices = changedIndices.filter((idx) => idx < activePageIndex);
    if (prevIndices.length > 0) {
      setActivePageIndex(prevIndices[prevIndices.length - 1]);
    } else {
      // Loop around to last change
      setActivePageIndex(changedIndices[changedIndices.length - 1]);
    }
  };

  const getStatusBadge = (status: 'unchanged' | 'modified' | 'added' | 'removed') => {
    switch (status) {
      case 'unchanged':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 size={12} />
            <span>Unchanged</span>
          </span>
        );
      case 'modified':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
            <Sparkles size={12} />
            <span>Modified Content</span>
          </span>
        );
      case 'added':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1">
            <GitCompare size={12} />
            <span>Added Page</span>
          </span>
        );
      case 'removed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
            <AlertCircle size={12} />
            <span>Removed Page</span>
          </span>
        );
    }
  };

  const visual = currentPage?.visualDiff;
  const text = currentPage?.textDiff;

  return (
    <div className="space-y-4 animate-in fade-in">
      {/* 1. Comparison Complete Header & Metrics Grid */}
      <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md">
              <GitCompare size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold tracking-tight text-white">Comparison Complete</h4>
                <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-mono uppercase font-bold rounded-md">
                  {totalChanges === 0 ? 'No Changes Found' : `${totalChanges} Changed Page${totalChanges > 1 ? 's' : ''}`}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {comparison.originalFileName} vs {comparison.updatedFileName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onDownloadPdf && (
              <button
                type="button"
                onClick={onDownloadPdf}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Download size={13} />
                <span>Download Diff PDF</span>
              </button>
            )}
            {onDownloadReport && (
              <button
                type="button"
                onClick={onDownloadReport}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 border border-slate-700"
              >
                <FileText size={13} />
                <span>Audit Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Statistical Metrics Breakdown Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Original</span>
            <span className="text-sm font-bold text-slate-200">{comparison.originalPageCount} pgs</span>
          </div>
          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Updated</span>
            <span className="text-sm font-bold text-slate-200">{comparison.updatedPageCount} pgs</span>
          </div>
          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Modified</span>
            <span className="text-sm font-bold text-amber-400">{comparison.modifiedPageCount}</span>
          </div>
          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Unchanged</span>
            <span className="text-sm font-bold text-emerald-400">{comparison.unchangedPageCount}</span>
          </div>
          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Added</span>
            <span className="text-sm font-bold text-sky-400">{comparison.addedPageCount}</span>
          </div>
          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Removed</span>
            <span className="text-sm font-bold text-rose-400">{comparison.removedPageCount}</span>
          </div>
          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60">
            <span className="text-[10px] font-mono uppercase text-slate-400 block">Text Diffs</span>
            <span className="text-sm font-bold text-indigo-400">
              {comparison.textComparisonEnabled ? comparison.totalTextChanges : 'Off'}
            </span>
          </div>
        </div>

        {comparison.warningNotice && (
          <div className="p-3 bg-amber-950/50 border border-amber-700/50 rounded-xl text-xs text-amber-200 flex items-center gap-2">
            <AlertCircle size={15} className="text-amber-400 shrink-0" />
            <span>{comparison.warningNotice}</span>
          </div>
        )}
      </div>

      {/* 2. Viewer Navigation & Controls Toolbar */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Mode Selector Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('side-by-side')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'side-by-side'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={13} />
            <span>Side-by-Side</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('overlay')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'overlay'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders size={13} />
            <span>Overlay Diff</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('diff')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'diff'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles size={13} />
            <span>High-Contrast Diff</span>
          </button>
        </div>

        {/* Change Navigation & Page Selection */}
        <div className="flex items-center gap-2">
          {totalChanges > 0 && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
              <span className="text-[11px] font-mono text-slate-500 mr-1">
                {currentChangeNumber > 0 ? `Change ${currentChangeNumber} of ${totalChanges}` : 'No change on page'}
              </span>
              <button
                type="button"
                onClick={goToPrevChange}
                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
                title="Previous Change"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={goToNextChange}
                className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors"
                title="Next Change"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* Page Selector */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
            <button
              type="button"
              disabled={activePageIndex === 0}
              onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
              className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent rounded-md transition-colors"
              title="Previous Page"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-xs font-bold text-slate-800 font-mono px-1">
              Page {activePageIndex + 1} of {totalPages}
            </span>
            <button
              type="button"
              disabled={activePageIndex === totalPages - 1}
              onClick={() => setActivePageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
              className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent rounded-md transition-colors"
              title="Next Page"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {currentPage && getStatusBadge(currentPage.status)}
        </div>
      </div>

      {/* Changed Pages Quick Jump Strip */}
      {totalChanges > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-mono text-[10px] uppercase font-bold shrink-0">Diff Pages:</span>
          {comparison.pages.map((p, idx) => {
            if (!p.hasChanges) return null;
            const isCurrent = idx === activePageIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setActivePageIndex(idx)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold font-mono transition-all shrink-0 ${
                  isCurrent
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                }`}
              >
                Page {p.displayPageNum}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Interactive Visual Diff Canvas Stage */}
      <div className="bg-slate-100/90 border border-slate-200 rounded-2xl p-4 overflow-hidden min-h-[420px] flex flex-col justify-center items-center">
        {/* Mode: Side-by-Side Visual Diff */}
        {viewMode === 'side-by-side' && (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column: Original */}
            <div className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Original (Page {activePageIndex + 1})</span>
                {visual?.originalDataUrl ? (
                  <span className="text-[10px] font-mono text-slate-500">Baseline</span>
                ) : (
                  <span className="text-[10px] font-bold text-rose-600">Not in baseline</span>
                )}
              </div>
              <div className="p-3 flex items-center justify-center min-h-[300px] bg-slate-50/50">
                {visual?.originalDataUrl ? (
                  <img
                    src={visual.originalDataUrl}
                    alt={`Original Page ${activePageIndex + 1}`}
                    className="max-h-[500px] w-auto max-w-full object-contain rounded shadow-xs border border-slate-200"
                  />
                ) : (
                  <div className="text-center p-8 text-slate-400 space-y-1">
                    <AlertCircle size={28} className="mx-auto text-slate-300" />
                    <p className="text-xs font-semibold">Page does not exist in original version</p>
                    <p className="text-[11px]">This page was added in the updated document.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Updated */}
            <div className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Updated (Page {activePageIndex + 1})</span>
                {visual?.updatedDataUrl ? (
                  <span className="text-[10px] font-mono text-slate-500">Revised</span>
                ) : (
                  <span className="text-[10px] font-bold text-rose-600">Removed in revision</span>
                )}
              </div>
              <div className="p-3 flex items-center justify-center min-h-[300px] bg-slate-50/50">
                {visual?.updatedDataUrl ? (
                  <img
                    src={visual.updatedDataUrl}
                    alt={`Updated Page ${activePageIndex + 1}`}
                    className="max-h-[500px] w-auto max-w-full object-contain rounded shadow-xs border border-slate-200"
                  />
                ) : (
                  <div className="text-center p-8 text-slate-400 space-y-1">
                    <AlertCircle size={28} className="mx-auto text-slate-300" />
                    <p className="text-xs font-semibold">Page removed in updated version</p>
                    <p className="text-[11px]">This page was deleted in the revised document.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mode: Transparent Overlay Diff */}
        {viewMode === 'overlay' && (
          <div className="w-full flex flex-col items-center space-y-3">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs text-xs">
              <span className="font-semibold text-slate-700">Overlay Blend Mode:</span>
              <span className="text-[11px] text-slate-500 font-mono">Original (Red) + Updated (Cyan/Green)</span>
            </div>

            <div className="relative bg-white border border-slate-200 rounded-xl p-3 shadow-md max-w-full overflow-auto">
              {visual?.overlayDataUrl ? (
                <img
                  src={visual.overlayDataUrl}
                  alt={`Overlay Diff Page ${activePageIndex + 1}`}
                  className="max-h-[520px] w-auto max-w-full object-contain rounded border border-slate-200"
                />
              ) : (
                <div className="text-center p-8 text-slate-400">
                  <p className="text-xs">No overlay data available for this page.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mode: High-Contrast Difference Highlighting */}
        {viewMode === 'diff' && (
          <div className="w-full flex flex-col items-center space-y-3">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs text-xs">
              <Sparkles size={14} className="text-red-600" />
              <span className="font-semibold text-slate-800">
                Altered content highlighted with red difference masks and bounding boxes.
              </span>
            </div>

            <div className="relative bg-white border border-slate-200 rounded-xl p-3 shadow-md max-w-full overflow-auto">
              {visual?.diffDataUrl ? (
                <img
                  src={visual.diffDataUrl}
                  alt={`High-Contrast Diff Page ${activePageIndex + 1}`}
                  className="max-h-[520px] w-auto max-w-full object-contain rounded border border-slate-200"
                />
              ) : (
                <div className="text-center p-8 text-slate-400">
                  <p className="text-xs">No visual difference data available for this page.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Text Content Modifications Inspector (when text changes exist) */}
      {comparison.textComparisonEnabled && text && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div
            onClick={() => setShowTextDrawer(!showTextDrawer)}
            className="px-4 py-3 bg-slate-50 hover:bg-slate-100/80 border-b border-slate-200 flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">
                Text Differences on Page {activePageIndex + 1}
              </span>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-mono rounded-md font-bold">
                {text.addedLines.length + text.removedLines.length + text.modifiedLines.length} line changes
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {showTextDrawer ? 'Collapse' : 'Expand'}
            </span>
          </div>

          {showTextDrawer && (
            <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
              {text.addedLines.length === 0 &&
              text.removedLines.length === 0 &&
              text.modifiedLines.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  No textual differences detected on this page.
                </p>
              ) : (
                <div className="space-y-2 font-mono text-xs">
                  {text.addedLines.map((line, lIdx) => (
                    <div
                      key={`add-${lIdx}`}
                      className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 flex items-start gap-2"
                    >
                      <span className="font-bold text-emerald-600 shrink-0">+ [Added]</span>
                      <span className="break-all">{line}</span>
                    </div>
                  ))}
                  {text.removedLines.map((line, lIdx) => (
                    <div
                      key={`rem-${lIdx}`}
                      className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-start gap-2"
                    >
                      <span className="font-bold text-rose-600 shrink-0">- [Removed]</span>
                      <span className="break-all">{line}</span>
                    </div>
                  ))}
                  {text.modifiedLines.map((mod, lIdx) => (
                    <div
                      key={`mod-${lIdx}`}
                      className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1"
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-rose-600 shrink-0">- Old:</span>
                        <span className="line-through text-rose-800 break-all">{mod.oldLine}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-emerald-600 shrink-0">+ New:</span>
                        <span className="font-semibold text-emerald-900 break-all">{mod.newLine}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
