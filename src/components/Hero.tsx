import React, { useState } from 'react';
import { PDFTool } from '../types/tool';
import { PDF_TOOLS } from '../data/tools';
import { DynamicIcon } from './DynamicIcon';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  Layers,
  Scissors,
  Minimize2,
  FileUp,
  Sliders,
  PenTool,
  RotateCw,
  Stamp,
  FileCheck,
} from 'lucide-react';

interface HeroProps {
  onSelectTool: (tool: PDFTool) => void;
  onOpenCommandPalette: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onSelectTool, onOpenCommandPalette }) => {
  const [activeRibbonTool, setActiveRibbonTool] = useState<string>('merge-pdf');

  const ribbonItems = [
    {
      id: 'merge-pdf',
      label: 'MERGE',
      sublabel: 'Combine pages',
      icon: Layers,
      accent: '#EF4444',
      tool: PDF_TOOLS.find((t) => t.id === 'merge-pdf'),
    },
    {
      id: 'split-pdf',
      label: 'SPLIT',
      sublabel: 'Extract ranges',
      icon: Scissors,
      accent: '#F43F5E',
      tool: PDF_TOOLS.find((t) => t.id === 'split-pdf'),
    },
    {
      id: 'compress-pdf',
      label: 'COMPRESS',
      sublabel: 'Reduce size',
      icon: Minimize2,
      accent: '#F59E0B',
      tool: PDF_TOOLS.find((t) => t.id === 'compress-pdf'),
    },
    {
      id: 'jpg-to-pdf',
      label: 'CONVERT',
      sublabel: 'Images & text',
      icon: FileUp,
      accent: '#10B981',
      tool: PDF_TOOLS.find((t) => t.id === 'jpg-to-pdf'),
    },
    {
      id: 'rotate-pdf',
      label: 'EDIT',
      sublabel: 'Rotate & stamp',
      icon: Sliders,
      accent: '#3B82F6',
      tool: PDF_TOOLS.find((t) => t.id === 'rotate-pdf'),
    },
    {
      id: 'sign-pdf',
      label: 'SIGN',
      sublabel: 'Digital seal',
      icon: PenTool,
      accent: '#9333EA',
      tool: PDF_TOOLS.find((t) => t.id === 'sign-pdf'),
    },
  ];

  const handleToolClick = (tool?: PDFTool) => {
    if (tool) onSelectTool(tool);
  };

  return (
    <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 overflow-hidden bg-[#FBF9F5] border-b border-slate-200/80 bg-paper-grid">
      {/* Editorial Watermark Header Numbering */}
      <div className="absolute top-16 right-12 text-[140px] font-black text-slate-900/[0.025] select-none pointer-events-none hidden lg:block font-mono">
        PDF/26
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Small Uppercase Tracking Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full text-[11px] font-mono font-semibold uppercase tracking-widest mb-6 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
            <span>THE COMPLETE PDF TOOLKIT</span>
          </div>

          {/* Large Editorial Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-950 tracking-tight leading-[1.05] uppercase">
            EVERY PDF TASK.
            <br />
            <span className="text-red-600">ONE POWERFUL</span> TOOLBOX.
          </h1>

          {/* Supporting Copy */}
          <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto font-medium">
            Convert, edit, organize and secure your documents from one focused workspace. 100% client-side precision with zero cloud uploads.
          </p>

          {/* Primary & Secondary Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              id="hero-explore-tools-btn"
              onClick={() => {
                document.getElementById('tool-directory')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-7 py-3.5 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-md inline-flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>Explore All 26 Tools</span>
              <ArrowRight size={15} className="text-red-400 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              id="hero-try-tool-btn"
              onClick={() => {
                const defaultTool = PDF_TOOLS.find((t) => t.id === 'merge-pdf');
                if (defaultTool) onSelectTool(defaultTool);
              }}
              className="w-full sm:w-auto px-7 py-3.5 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300/90 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-2xs inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Try Merge PDF</span>
            </button>
          </div>

          {/* Technical Specs Bar */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[11px] font-mono text-slate-500 uppercase tracking-wider">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              100% Browser Local Execution
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap size={14} className="text-amber-600" />
              Zero Telemetry / No Uploads
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock size={14} className="text-blue-600" />
              Lossless Output Quality
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* INTERACTIVE DOCUMENT PROCESSING VISUALIZATION STAGE */}
        {/* ========================================================================= */}
        <div className="mt-14 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-300/90 shadow-xl overflow-hidden relative">
            {/* Top Workspace Bar */}
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 text-slate-400 font-semibold tracking-wider uppercase text-[10px]">
                  DOCUMENT_ENGINE_LOCAL.STAGE
                </span>
              </div>
              <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400 text-[10px]">
                  SANDBOX_ACTIVE
                </span>
                <span>IN-MEMORY RAM</span>
              </div>
            </div>

            {/* Document Stage Visual Canvas */}
            <div className="p-6 sm:p-10 bg-slate-50/70 relative min-h-[260px] sm:min-h-[300px] flex items-center justify-center overflow-hidden">
              {/* Technical Registration Grid & Crosshairs */}
              <div className="absolute inset-0 bg-paper-grid opacity-60 pointer-events-none" />
              <div className="absolute top-3 left-3 text-[9px] font-mono text-slate-400 select-none">
                + [X: 000, Y: 000]
              </div>
              <div className="absolute top-3 right-3 text-[9px] font-mono text-slate-400 select-none">
                PAGE 01 / ISO-216 (A4)
              </div>
              <div className="absolute bottom-3 left-3 text-[9px] font-mono text-slate-400 select-none">
                ENCODING: PDF-1.7
              </div>
              <div className="absolute bottom-3 right-3 text-[9px] font-mono text-slate-400 select-none">
                CLIENT: BUFFER_READY
              </div>

              {/* Dynamic Interactive Document Motif */}
              <div className="relative z-10 w-full max-w-xl flex items-center justify-center">
                {/* 1. Merge State */}
                {activeRibbonTool === 'merge-pdf' && (
                  <div className="flex items-center gap-3 sm:gap-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-24 sm:w-32 h-32 sm:h-44 bg-white rounded-lg border-2 border-slate-300 shadow-md p-3 flex flex-col justify-between transform -rotate-3 transition-transform hover:rotate-0">
                      <div className="space-y-1.5">
                        <div className="w-6 h-1.5 bg-red-500 rounded" />
                        <div className="w-full h-1 bg-slate-200 rounded" />
                        <div className="w-4/5 h-1 bg-slate-200 rounded" />
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 text-right">01.pdf</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md animate-pulse-subtle">
                        <Layers size={18} />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-red-600 mt-1 uppercase">MERGE</span>
                    </div>

                    <div className="w-24 sm:w-32 h-32 sm:h-44 bg-white rounded-lg border-2 border-slate-300 shadow-md p-3 flex flex-col justify-between transform rotate-3 transition-transform hover:rotate-0">
                      <div className="space-y-1.5">
                        <div className="w-6 h-1.5 bg-blue-500 rounded" />
                        <div className="w-full h-1 bg-slate-200 rounded" />
                        <div className="w-3/4 h-1 bg-slate-200 rounded" />
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 text-right">02.pdf</span>
                    </div>
                  </div>
                )}

                {/* 2. Split State */}
                {activeRibbonTool === 'split-pdf' && (
                  <div className="flex items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-28 sm:w-36 h-36 sm:h-48 bg-white rounded-lg border-2 border-dashed border-rose-400 shadow-md p-3 flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-[10px] font-bold text-slate-800">Master.pdf</span>
                        <Scissors size={14} className="text-rose-500 animate-bounce" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="w-full h-1.5 bg-rose-200 rounded" />
                        <div className="w-4/5 h-1.5 bg-slate-200 rounded" />
                        <div className="w-full h-1.5 bg-rose-200 rounded" />
                      </div>
                      <span className="text-[9px] font-mono text-rose-600 font-bold">EXTRACT PAGES [1, 3]</span>
                    </div>
                  </div>
                )}

                {/* 3. Compress State */}
                {activeRibbonTool === 'compress-pdf' && (
                  <div className="flex items-center gap-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-28 sm:w-36 h-36 sm:h-48 bg-white rounded-lg border-2 border-amber-400 shadow-md p-3 flex flex-col justify-between text-center">
                      <span className="text-[10px] font-mono text-slate-400">ORIGINAL: 18.4 MB</span>
                      <div className="my-auto">
                        <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                          <Minimize2 size={20} />
                        </div>
                        <span className="text-xs font-bold text-slate-800 mt-2 block">Stream Optimizer</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 py-1 rounded">
                        OUTPUT: 2.1 MB (-88%)
                      </span>
                    </div>
                  </div>
                )}

                {/* 4. Convert State */}
                {activeRibbonTool === 'jpg-to-pdf' && (
                  <div className="flex items-center gap-4 sm:gap-6 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-24 sm:w-32 h-28 sm:h-36 bg-emerald-50 rounded-lg border-2 border-emerald-400 shadow-sm p-3 flex flex-col justify-between text-center">
                      <span className="text-[10px] font-mono text-emerald-700 font-bold">IMG_0921.JPG</span>
                      <FileUp size={24} className="mx-auto text-emerald-600" />
                      <span className="text-[9px] text-emerald-600">300 DPI RASTER</span>
                    </div>
                    <ArrowRight size={20} className="text-slate-400" />
                    <div className="w-24 sm:w-32 h-32 sm:h-44 bg-white rounded-lg border-2 border-slate-900 shadow-md p-3 flex flex-col justify-between">
                      <div className="w-6 h-2 bg-red-600 rounded" />
                      <span className="text-[10px] font-bold text-slate-900">Document.pdf</span>
                      <span className="text-[9px] font-mono text-slate-400">VECTOR EMBED</span>
                    </div>
                  </div>
                )}

                {/* 5. Edit / Rotate State */}
                {activeRibbonTool === 'rotate-pdf' && (
                  <div className="flex items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-32 sm:w-44 h-28 sm:h-36 bg-white rounded-lg border-2 border-blue-500 shadow-lg p-3 flex flex-col justify-between relative group">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-800">ORIENTATION FIX</span>
                        <RotateCw size={14} className="text-blue-600 animate-spin" />
                      </div>
                      <div className="text-center py-2">
                        <span className="text-xs font-mono font-bold text-blue-600 px-2 py-0.5 bg-blue-50 rounded">
                          ROTATED +90° CW
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 text-right">LANDSCAPE → PORTRAIT</span>
                    </div>
                  </div>
                )}

                {/* 6. Sign State */}
                {activeRibbonTool === 'sign-pdf' && (
                  <div className="flex items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-36 sm:w-52 h-36 sm:h-48 bg-white rounded-lg border-2 border-purple-500 shadow-lg p-4 flex flex-col justify-between relative">
                      <div className="w-8 h-1.5 bg-purple-600 rounded" />
                      <div className="space-y-1">
                        <div className="w-full h-1 bg-slate-200 rounded" />
                        <div className="w-4/5 h-1 bg-slate-200 rounded" />
                      </div>
                      <div className="pt-2 border-t border-slate-200">
                        <div className="font-serif italic text-sm text-purple-900 font-bold border-b border-purple-400 pb-0.5">
                          J. Doe Signature
                        </div>
                        <span className="text-[8px] font-mono text-purple-600 uppercase mt-0.5 block">
                          VERIFIED CLIENT STAMP
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* COMPACT HERO TOOL RIBBON (Interactive Selector) */}
            {/* ========================================================================= */}
            <div className="bg-slate-900 border-t border-slate-800 p-2 sm:p-3">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {ribbonItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeRibbonTool === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setActiveRibbonTool(item.id)}
                      onClick={() => handleToolClick(item.tool)}
                      className={`p-2 sm:p-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer border ${
                        isActive
                          ? 'bg-slate-800 border-red-500/80 shadow-xs'
                          : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: item.accent }}
                        >
                          <Icon size={12} />
                        </div>
                        <span className="text-xs font-bold text-white tracking-wider font-mono">
                          {item.label}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 truncate hidden sm:block">
                        {item.sublabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
