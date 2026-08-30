import React from 'react';
import { RotateCw, Trash2, ArrowLeft, ArrowRight, Check, GripVertical } from 'lucide-react';
import { parsePageRangeStrict } from '../lib/pdf/pageRangeParser';

export interface PageItem {
  id: string; // unique stable ID
  pageNumber: number; // 1-indexed original page
  displayIndex: number; // current visual sequence index (1-indexed)
  dataUrl?: string;
  rotation?: number; // 0, 90, 180, 270
  selected?: boolean;
  markedForRemoval?: boolean;
  isLoading?: boolean;
}

interface PdfPagePreviewProps {
  page: PageItem;
  mode?: 'select' | 'reorder' | 'remove' | 'rotate' | 'view';
  onToggleSelect?: (pageNumber: number) => void;
  onMoveLeft?: (index: number) => void;
  onMoveRight?: (index: number) => void;
  onRotate?: (pageNumber: number) => void;
  onRemove?: (pageNumber: number) => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
  totalCount?: number;
  // Drag & drop handlers
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (index: number) => void;
  onDragOverTarget?: (index: number) => void;
  onDropTarget?: (index: number) => void;
  onDragEnd?: () => void;
  // Optional Live Overlays
  watermarkOverlay?: {
    text: string;
    opacity: number;
    angle: number;
    position: 'center' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom-center' | string;
    targetPages?: 'all' | 'first' | 'last' | 'custom';
    pageRangeStr?: string;
    totalCount?: number;
  };
  pageNumberOverlay?: {
    format: string;
    startNumber: number;
    position: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-right' | 'top-center' | 'top-left' | string;
    fontSize?: number;
    totalCount: number;
  };
  signatureOverlay?: {
    dataUrl: string;
    targetPage: 'first' | 'last' | 'all' | 'custom' | number;
    customPages?: string | number;
    totalCount: number;
    position?:
      | 'bottom-right'
      | 'bottom-left'
      | 'bottom-center'
      | 'center'
      | 'top-right'
      | 'top-left'
      | 'top-center'
      | string;
    size?: 'small' | 'medium' | 'large' | number;
  };
  cropMarginOverlay?: number | { top: number; right: number; bottom: number; left: number }; // margin points
}

export const PdfPagePreview: React.FC<PdfPagePreviewProps> = ({
  page,
  mode = 'view',
  onToggleSelect,
  onMoveLeft,
  onMoveRight,
  onRotate,
  canMoveLeft = false,
  canMoveRight = false,
  totalCount = 1,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOverTarget,
  onDropTarget,
  onDragEnd,
  watermarkOverlay,
  pageNumberOverlay,
  signatureOverlay,
  cropMarginOverlay,
}) => {
  const isRemoved = page.markedForRemoval;
  const isSelected = page.selected;
  const currentIndex = page.displayIndex - 1;

  const normalizedCropMargins = typeof cropMarginOverlay === 'number'
    ? { top: cropMarginOverlay, right: cropMarginOverlay, bottom: cropMarginOverlay, left: cropMarginOverlay }
    : cropMarginOverlay;

  const hasCrop = normalizedCropMargins && (
    (normalizedCropMargins.top || 0) > 0 ||
    (normalizedCropMargins.right || 0) > 0 ||
    (normalizedCropMargins.bottom || 0) > 0 ||
    (normalizedCropMargins.left || 0) > 0
  );

  // Determine if watermark applies to this page
  let showWatermarkOnThisPage = false;
  if (watermarkOverlay?.text) {
    if (!watermarkOverlay.targetPages || watermarkOverlay.targetPages === 'all') {
      showWatermarkOnThisPage = true;
    } else if (watermarkOverlay.targetPages === 'first' && page.displayIndex === 1) {
      showWatermarkOnThisPage = true;
    } else if (
      watermarkOverlay.targetPages === 'last' &&
      page.displayIndex === (watermarkOverlay.totalCount || totalCount)
    ) {
      showWatermarkOnThisPage = true;
    } else if (watermarkOverlay.targetPages === 'custom') {
      const parsed = parsePageRangeStrict(
        watermarkOverlay.pageRangeStr || '',
        watermarkOverlay.totalCount || totalCount
      );
      if (
        parsed.valid &&
        (parsed.indices.includes(page.displayIndex - 1) || parsed.indices.includes(page.pageNumber - 1))
      ) {
        showWatermarkOnThisPage = true;
      }
    }
  }

  // Determine if signature applies to this page
  let showSignatureOnThisPage = false;
  if (signatureOverlay?.dataUrl) {
    if (signatureOverlay.targetPage === 'all') {
      showSignatureOnThisPage = true;
    } else if (signatureOverlay.targetPage === 'first' && page.displayIndex === 1) {
      showSignatureOnThisPage = true;
    } else if (
      signatureOverlay.targetPage === 'last' &&
      page.displayIndex === (signatureOverlay.totalCount || totalCount)
    ) {
      showSignatureOnThisPage = true;
    } else if (typeof signatureOverlay.targetPage === 'number') {
      showSignatureOnThisPage = page.displayIndex === signatureOverlay.targetPage;
    } else if (signatureOverlay.targetPage === 'custom' || signatureOverlay.customPages) {
      const customStr = String(signatureOverlay.customPages || '').trim();
      if (customStr) {
        const parsed = parsePageRangeStrict(
          customStr,
          signatureOverlay.totalCount || totalCount
        );
        if (
          parsed.valid &&
          (parsed.indices.includes(page.displayIndex - 1) || parsed.indices.includes(page.pageNumber - 1))
        ) {
          showSignatureOnThisPage = true;
        }
      }
    }
  }

  return (
    <div
      draggable={mode === 'reorder'}
      onDragStart={(e) => {
        if (mode === 'reorder') {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(currentIndex));
          onDragStart?.(currentIndex);
        }
      }}
      onDragOver={(e) => {
        if (mode === 'reorder') {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          onDragOverTarget?.(currentIndex);
        }
      }}
      onDrop={(e) => {
        if (mode === 'reorder') {
          e.preventDefault();
          onDropTarget?.(currentIndex);
        }
      }}
      onDragEnd={() => {
        if (mode === 'reorder') {
          onDragEnd?.();
        }
      }}
      className={`group relative flex flex-col items-center p-3 rounded-2xl border transition-all duration-200 select-none ${
        mode === 'reorder' ? 'cursor-grab active:cursor-grabbing' : ''
      } ${
        isDragging
          ? 'opacity-40 scale-95 border-dashed border-red-500 bg-red-50/40'
          : isDragOver
          ? 'border-red-500 ring-2 ring-red-500/40 bg-red-50/30 scale-102 shadow-lg z-10'
          : isRemoved
          ? 'bg-rose-50/80 border-rose-300 opacity-60'
          : isSelected
          ? 'bg-red-50/60 border-red-500 ring-2 ring-red-500/20 shadow-md'
          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
      }`}
      onClick={() => {
        if (mode === 'select' || mode === 'remove') {
          onToggleSelect?.(page.pageNumber);
        }
      }}
      role={mode === 'select' || mode === 'remove' ? 'button' : undefined}
      tabIndex={mode === 'select' || mode === 'remove' ? 0 : undefined}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && (mode === 'select' || mode === 'remove')) {
          e.preventDefault();
          onToggleSelect?.(page.pageNumber);
        } else if (mode === 'reorder') {
          if (e.key === 'ArrowLeft' && canMoveLeft) {
            e.preventDefault();
            onMoveLeft?.(currentIndex);
          } else if (e.key === 'ArrowRight' && canMoveRight) {
            e.preventDefault();
            onMoveRight?.(currentIndex);
          }
        }
      }}
      aria-label={`Page ${page.pageNumber}`}
    >
      {/* Thumbnail Canvas Frame */}
      <div className="relative w-full aspect-3/4 max-h-44 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200/80 shadow-2xs">
        {page.isLoading || !page.dataUrl ? (
          <div className="flex flex-col items-center justify-center p-4 text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-slate-300 border-t-red-500 rounded-full animate-spin" />
            <span className="text-[10px] font-mono">Loading p.{page.pageNumber}...</span>
          </div>
        ) : (
          <img
            src={page.dataUrl}
            alt={`Page ${page.pageNumber} thumbnail`}
            className="w-full h-full object-contain transition-transform duration-200 pointer-events-none"
            style={{
              transform: page.rotation ? `rotate(${page.rotation}deg)` : undefined,
            }}
          />
        )}

        {/* Live Watermark Overlay Simulation */}
        {showWatermarkOnThisPage && watermarkOverlay?.text && (
          <div
            className={`absolute inset-0 pointer-events-none flex overflow-hidden p-3 ${
              watermarkOverlay.position === 'top' || watermarkOverlay.position === 'top-center'
                ? 'items-start justify-center pt-2'
                : watermarkOverlay.position === 'top-left'
                ? 'items-start justify-start pt-2 pl-2'
                : watermarkOverlay.position === 'top-right'
                ? 'items-start justify-end pt-2 pr-2'
                : watermarkOverlay.position === 'bottom' || watermarkOverlay.position === 'bottom-center'
                ? 'items-end justify-center pb-2'
                : watermarkOverlay.position === 'bottom-left'
                ? 'items-end justify-start pb-2 pl-2'
                : watermarkOverlay.position === 'bottom-right'
                ? 'items-end justify-end pb-2 pr-2'
                : 'items-center justify-center'
            }`}
          >
            <span
              className="font-bold font-sans text-red-600 truncate max-w-[90%] text-center uppercase tracking-wider text-xs shadow-2xs"
              style={{
                opacity: Math.max(0.15, watermarkOverlay.opacity),
                transform: `rotate(${watermarkOverlay.angle}deg)`,
              }}
            >
              {watermarkOverlay.text}
            </span>
          </div>
        )}

        {/* Live Page Number Overlay Simulation */}
        {pageNumberOverlay && (
          <div
            className={`absolute inset-0 pointer-events-none flex p-2 z-10 ${
              pageNumberOverlay.position === 'top-center'
                ? 'items-start justify-center pt-1.5'
                : pageNumberOverlay.position === 'top-left'
                ? 'items-start justify-start pt-1.5 pl-2'
                : pageNumberOverlay.position === 'top-right'
                ? 'items-start justify-end pt-1.5 pr-2'
                : pageNumberOverlay.position === 'bottom-left'
                ? 'items-end justify-start pb-1.5 pl-2'
                : pageNumberOverlay.position === 'bottom-right'
                ? 'items-end justify-end pb-1.5 pr-2'
                : 'items-end justify-center pb-1.5'
            }`}
          >
            <span className="font-mono font-medium text-slate-800 bg-white/95 border border-slate-300 shadow-2xs px-1.5 py-0.5 rounded text-[9px] truncate max-w-[85%]">
              {(pageNumberOverlay.format || 'Page {n} of {total}')
                .replace(/\{n\}|\{page\}/gi, String((pageNumberOverlay.startNumber || 1) + (page.displayIndex - 1)))
                .replace(/\{total\}|\{count\}/gi, String(pageNumberOverlay.totalCount || totalCount))}
            </span>
          </div>
        )}

        {/* Live Signature Overlay Simulation */}
        {showSignatureOnThisPage && signatureOverlay?.dataUrl && (
          <div
            className={`absolute inset-0 pointer-events-none p-2 flex ${
              signatureOverlay.position === 'top-left'
                ? 'items-start justify-start pt-2 pl-2'
                : signatureOverlay.position === 'top-center'
                ? 'items-start justify-center pt-2'
                : signatureOverlay.position === 'top-right'
                ? 'items-start justify-end pt-2 pr-2'
                : signatureOverlay.position === 'center'
                ? 'items-center justify-center'
                : signatureOverlay.position === 'bottom-left'
                ? 'items-end justify-start pb-2 pl-2'
                : signatureOverlay.position === 'bottom-center'
                ? 'items-end justify-center pb-2'
                : 'items-end justify-end pb-2 pr-2'
            }`}
          >
            <div
              className={`bg-white/90 border border-blue-400 rounded p-1 shadow-xs flex items-center justify-center ${
                signatureOverlay.size === 'small'
                  ? 'max-w-[32%] max-h-[22%]'
                  : signatureOverlay.size === 'large'
                  ? 'max-w-[58%] max-h-[38%]'
                  : 'max-w-[45%] max-h-[30%]'
              }`}
            >
              <img
                src={signatureOverlay.dataUrl}
                alt="Signature stamp preview"
                className="max-h-6 object-contain"
              />
            </div>
          </div>
        )}

        {/* Crop Margin Boundary Guide */}
        {hasCrop && normalizedCropMargins ? (
          <div
            className="absolute pointer-events-none border-2 border-dashed border-red-500/80 bg-red-500/10 rounded"
            style={{
              top: `${Math.min(30, ((normalizedCropMargins.top || 0) / 72) * 16)}px`,
              right: `${Math.min(30, ((normalizedCropMargins.right || 0) / 72) * 16)}px`,
              bottom: `${Math.min(30, ((normalizedCropMargins.bottom || 0) / 72) * 16)}px`,
              left: `${Math.min(30, ((normalizedCropMargins.left || 0) / 72) * 16)}px`,
            }}
          >
            <span className="absolute top-0.5 left-1 text-[8px] font-mono text-red-700 font-bold bg-white/90 px-1 rounded shadow-xs">
              Crop zone
            </span>
          </div>
        ) : null}

        {/* Drag Handle Indicator Overlay */}
        {mode === 'reorder' && (
          <div className="absolute top-1.5 left-1.5 p-1 bg-black/50 hover:bg-black/70 text-white rounded backdrop-blur-2xs opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical size={12} />
          </div>
        )}

        {/* Removed Overlay Badge */}
        {isRemoved && (
          <div className="absolute inset-0 bg-rose-900/60 backdrop-blur-2xs flex flex-col items-center justify-center text-white p-2 text-center">
            <Trash2 size={20} className="text-rose-200 mb-1" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
              Removed
            </span>
          </div>
        )}

        {/* Selection Checkmark Badge */}
        {mode === 'select' && (
          <div
            className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-black/30 text-white opacity-0 group-hover:opacity-100 hover:bg-black/50'
            }`}
          >
            {isSelected && <Check size={13} strokeWidth={3} />}
          </div>
        )}

        {/* Rotation indicator badge */}
        {page.rotation ? (
          <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/70 text-white text-[9px] font-mono rounded backdrop-blur-2xs">
            +{page.rotation}°
          </div>
        ) : null}
      </div>

      {/* Page Info & Controls Footer */}
      <div className="w-full mt-2.5 flex items-center justify-between gap-1 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-bold font-mono text-[11px] text-slate-800">
            P.{page.displayIndex ?? page.pageNumber}
          </span>
          {page.displayIndex !== page.pageNumber && (
            <span className="text-[9px] font-mono text-slate-400">
              (orig. {page.pageNumber})
            </span>
          )}
        </div>

        {/* Reorder Navigation buttons */}
        {mode === 'reorder' && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!canMoveLeft}
              onClick={(e) => {
                e.stopPropagation();
                onMoveLeft?.(currentIndex);
              }}
              className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 text-slate-700 transition-colors"
              title="Move left (or use Left Arrow)"
              aria-label={`Move page ${page.pageNumber} left`}
            >
              <ArrowLeft size={12} />
            </button>
            <button
              type="button"
              disabled={!canMoveRight}
              onClick={(e) => {
                e.stopPropagation();
                onMoveRight?.(currentIndex);
              }}
              className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 text-slate-700 transition-colors"
              title="Move right (or use Right Arrow)"
              aria-label={`Move page ${page.pageNumber} right`}
            >
              <ArrowRight size={12} />
            </button>
          </div>
        )}

        {/* Rotate Button */}
        {mode === 'rotate' && onRotate && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRotate(page.pageNumber);
            }}
            className="p-1 rounded bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-700 transition-colors flex items-center gap-1 text-[10px] font-mono font-medium"
            title="Rotate +90°"
            aria-label={`Rotate page ${page.pageNumber} 90 degrees`}
          >
            <RotateCw size={12} />
            <span>+90°</span>
          </button>
        )}

        {/* Remove Toggle Button */}
        {mode === 'remove' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(page.pageNumber);
            }}
            className={`p-1 rounded transition-colors text-[10px] font-mono font-bold ${
              isRemoved
                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600'
            }`}
            title={isRemoved ? 'Restore page' : 'Remove page'}
            aria-label={isRemoved ? `Restore page ${page.pageNumber}` : `Remove page ${page.pageNumber}`}
          >
            {isRemoved ? 'Restore' : <Trash2 size={12} />}
          </button>
        )}
      </div>
    </div>
  );
};


