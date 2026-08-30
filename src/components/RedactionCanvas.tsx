import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Trash2, EyeOff, Layers, AlertCircle } from 'lucide-react';
import { pdfjsLib } from '../lib/pdf/pdfjsSetup';
import { sanitizePdfBuffer } from '../lib/pdf/pdfLoader';
import { RedactionRegion } from '../lib/pdf/redact';

interface RedactionCanvasProps {
  file: File;
  redactions: RedactionRegion[];
  onAddRedaction: (region: RedactionRegion) => void;
  onRemoveRedaction: (id: string) => void;
  onClearAllRedactions: () => void;
  color: string;
  onChangeColor: (c: string) => void;
}

export const RedactionCanvas: React.FC<RedactionCanvasProps> = ({
  file,
  redactions,
  onAddRedaction,
  onRemoveRedaction,
  onClearAllRedactions,
  color,
  onChangeColor,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingPage, setIsLoadingPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageDimensions, setPageDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 600, height: 800 });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Load PDF Document when file changes
  useEffect(() => {
    let isCancelled = false;

    async function loadDoc() {
      setIsLoadingPage(true);
      setError(null);
      setPdfDoc(null);

      try {
        const rawBuffer = await file.arrayBuffer();
        const sanitizedBuffer = sanitizePdfBuffer(rawBuffer);

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(sanitizedBuffer),
          useSystemFonts: true,
          disableFontFace: false,
          stopAtErrors: false,
          verbosity: 0,
        });

        const doc = await loadingTask.promise;

        if (isCancelled) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(1);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to load PDF in Redaction Canvas:', err);
          setError(
            err?.message || 'Could not load PDF document for visual redaction preview.'
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPage(false);
        }
      }
    }

    loadDoc();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        renderTaskRef.current = null;
      }
    };
  }, [file]);

  // Render current page onto canvas
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    // Cancel any active rendering task before starting a new one
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // ignore
      }
      renderTaskRef.current = null;
    }

    setIsLoadingPage(true);
    setError(null);

    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const unscaledViewport = page.getViewport({ scale: 1.0 });

      // Determine container width for responsive scaling
      const containerWidth = containerRef.current?.clientWidth
        ? Math.max(280, containerRef.current.clientWidth - 40)
        : 650;
      const targetWidth = Math.min(containerWidth, 750);
      const displayScale = Math.max(0.2, targetWidth / unscaledViewport.width);

      const displayWidth = Math.floor(unscaledViewport.width * displayScale);
      const displayHeight = Math.floor(unscaledViewport.height * displayScale);

      // Render at high resolution (crisp text & graphics)
      const pixelRatio = window.devicePixelRatio || 1.5;
      const renderScale = displayScale * Math.max(1.5, Math.min(2.5, pixelRatio));
      const viewport = page.getViewport({ scale: renderScale });

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      setPageDimensions({
        width: displayWidth,
        height: displayHeight,
      });

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderTask = page.render({
        canvasContext: ctx,
        viewport,
      });

      renderTaskRef.current = renderTask;

      await renderTask.promise;
      renderTaskRef.current = null;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('Page rendering error in RedactionCanvas:', err);
        setError('Failed to render current page preview.');
      }
    } finally {
      setIsLoadingPage(false);
    }
  }, [pdfDoc, currentPage]);

  useEffect(() => {
    if (pdfDoc) {
      renderCurrentPage();
    }
  }, [pdfDoc, currentPage, renderCurrentPage]);

  // Pointer event handlers for drawing redactions
  const getOverlayCoords = (e: React.PointerEvent) => {
    const overlay = overlayRef.current;
    if (!overlay) return { x: 0, y: 0, width: 1, height: 1 };
    const rect = overlay.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, e.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, e.clientY - rect.top)),
      width: rect.width,
      height: rect.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isLoadingPage) return;
    const { x, y } = getOverlayCoords(e);
    setIsDrawing(true);
    setDrawStart({ x, y });
    setCurrentBox({ x, y, w: 0, h: 0 });
    try {
      overlayRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !drawStart) return;
    const { x, y } = getOverlayCoords(e);
    const boxX = Math.min(drawStart.x, x);
    const boxY = Math.min(drawStart.y, y);
    const boxW = Math.abs(x - drawStart.x);
    const boxH = Math.abs(y - drawStart.y);
    setCurrentBox({ x: boxX, y: boxY, w: boxW, h: boxH });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing || !drawStart || !currentBox) {
      setIsDrawing(false);
      setDrawStart(null);
      setCurrentBox(null);
      return;
    }

    try {
      overlayRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    setIsDrawing(false);
    setDrawStart(null);

    const overlay = overlayRef.current;
    if (overlay && currentBox.w > 4 && currentBox.h > 4) {
      const rect = overlay.getBoundingClientRect();
      const xRel = currentBox.x / rect.width;
      const yRel = currentBox.y / rect.height;
      const widthRel = currentBox.w / rect.width;
      const heightRel = currentBox.h / rect.height;

      const newRegion: RedactionRegion = {
        id: `redact-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        pageNumber: currentPage,
        xRel: Math.max(0, Math.min(1, xRel)),
        yRel: Math.max(0, Math.min(1, yRel)),
        widthRel: Math.max(0.01, Math.min(1 - xRel, widthRel)),
        heightRel: Math.max(0.01, Math.min(1 - yRel, heightRel)),
        color,
      };

      onAddRedaction(newRegion);
    }

    setCurrentBox(null);
  };

  const pageRedactions = redactions.filter((r) => r.pageNumber === currentPage);

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        {/* Page Nav */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1 || isLoadingPage}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 bg-white hover:bg-slate-100 disabled:opacity-30 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="text-xs font-mono font-bold text-slate-700 px-2.5 py-1 bg-white border border-slate-200 rounded-lg">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage >= totalPages || isLoadingPage}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 bg-white hover:bg-slate-100 disabled:opacity-30 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Color / Style Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span>Redaction Color:</span>
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
              {[
                { label: 'Blackout', val: '#000000', bg: 'bg-black' },
                { label: 'Dark Charcoal', val: '#1e293b', bg: 'bg-slate-800' },
                { label: 'Whiteout', val: '#ffffff', bg: 'bg-white border border-slate-300' },
              ].map((c) => (
                <button
                  key={c.val}
                  type="button"
                  onClick={() => onChangeColor(c.val)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                    color === c.val
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${c.bg}`} />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {redactions.length > 0 && (
            <button
              type="button"
              onClick={onClearAllRedactions}
              className="px-2.5 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg transition-colors font-medium flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Clear All ({redactions.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Instructions Banner */}
      <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center gap-2.5 text-xs text-purple-900">
        <EyeOff size={16} className="text-purple-600 shrink-0" />
        <span>
          <strong>Click and drag</strong> anywhere across the page below to create a permanent redaction box. The underlying text and graphics will be completely eradicated from the exported PDF.
        </span>
      </div>

      {/* Error Message if page rendering failed */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-800">
          <AlertCircle size={15} className="text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Interactive Page Canvas Container */}
      <div
        ref={containerRef}
        className="flex justify-center items-center p-4 bg-slate-100/90 rounded-2xl border border-slate-200 overflow-x-auto min-h-[400px]"
      >
        <div
          style={{
            width: `${pageDimensions.width}px`,
            height: `${pageDimensions.height}px`,
          }}
          className="relative shadow-xl rounded-lg overflow-hidden bg-white select-none shrink-0 transition-all"
        >
          <canvas
            ref={canvasRef}
            className="block"
            style={{
              width: `${pageDimensions.width}px`,
              height: `${pageDimensions.height}px`,
            }}
          />

          {/* Interactive Drawing & Selection Overlay */}
          <div
            ref={overlayRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="absolute inset-0 cursor-crosshair touch-none"
            style={{ pointerEvents: isLoadingPage ? 'none' : 'auto' }}
          >
            {/* Existing Redaction Rectangles on this Page */}
            {pageRedactions.map((r, idx) => (
              <div
                key={r.id}
                style={{
                  position: 'absolute',
                  left: `${r.xRel * 100}%`,
                  top: `${r.yRel * 100}%`,
                  width: `${r.widthRel * 100}%`,
                  height: `${r.heightRel * 100}%`,
                  backgroundColor: r.color || color || '#000000',
                  opacity: 0.9,
                }}
                className="group border-2 border-red-500/90 rounded-xs flex items-center justify-center transition-all shadow-xs"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveRedaction(r.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-md transition-opacity transform hover:scale-110 cursor-pointer"
                  title="Remove this redaction box"
                  aria-label="Remove redaction box"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {/* Currently Dragging Marquee Box */}
            {isDrawing && currentBox && (
              <div
                style={{
                  position: 'absolute',
                  left: `${currentBox.x}px`,
                  top: `${currentBox.y}px`,
                  width: `${currentBox.w}px`,
                  height: `${currentBox.h}px`,
                  backgroundColor: color,
                  opacity: 0.75,
                }}
                className="border-2 border-dashed border-red-500 pointer-events-none"
              />
            )}
          </div>

          {isLoadingPage && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex items-center justify-center">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white px-4 py-2 rounded-xl shadow-md border border-slate-200">
                <Layers size={16} className="animate-spin text-purple-600" />
                <span>Loading Page {currentPage}...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Redactions Summary List */}
      {redactions.length > 0 && (
        <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between text-xs font-bold font-mono text-slate-700 uppercase">
            <span>Marked Redaction Areas ({redactions.length})</span>
            <span className="text-purple-600">{pageRedactions.length} on current page</span>
          </div>

          <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
            {redactions.map((r, idx) => (
              <div
                key={r.id}
                className={`flex items-center justify-between p-2 rounded-lg text-xs border transition-colors ${
                  r.pageNumber === currentPage
                    ? 'bg-purple-50/80 border-purple-200 text-purple-950 font-medium'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-mono text-[10px] font-bold flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <span>Page {r.pageNumber}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({Math.round(r.widthRel * 100)}% × {Math.round(r.heightRel * 100)}%)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {r.pageNumber !== currentPage && (
                    <button
                      type="button"
                      onClick={() => setCurrentPage(r.pageNumber)}
                      className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 rounded cursor-pointer"
                    >
                      Jump to page
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveRedaction(r.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                    title="Remove redaction"
                    aria-label={`Remove redaction #${idx + 1}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

