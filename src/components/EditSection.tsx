import React, { useState } from 'react';
import { PDFTool } from '../types/tool';
import { PDF_TOOLS } from '../data/tools';
import {
  Stamp,
  Hash,
  RotateCw,
  Crop,
  PenTool,
  FileSignature,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface EditSectionProps {
  onSelectTool: (tool: PDFTool) => void;
}

export const EditSection: React.FC<EditSectionProps> = ({ onSelectTool }) => {
  const [activeFeature, setActiveFeature] = useState<string>('watermark');

  const editFeatures = [
    {
      id: 'watermark-pdf',
      key: 'watermark',
      title: 'Watermark PDF',
      desc: 'Add custom security stamps, confidentiality notices, or logos across pages.',
      icon: Stamp,
      accent: '#0284C7',
    },
    {
      id: 'page-numbers',
      key: 'pagination',
      title: 'Page Numbers',
      desc: 'Insert Bates numbers, bottom pagination, or custom prefix/suffix indicators.',
      icon: Hash,
      accent: '#059669',
    },
    {
      id: 'rotate-pdf',
      key: 'rotate',
      title: 'Rotate Pages',
      desc: 'Correct orientation of landscape scans or individual misaligned pages.',
      icon: RotateCw,
      accent: '#2563EB',
    },
    {
      id: 'crop-pdf',
      key: 'crop',
      title: 'Crop & Trim Margins',
      desc: 'Trim unwanted white space, margins, or bleeds for optimal reading.',
      icon: Crop,
      accent: '#D97706',
    },
    {
      id: 'sign-pdf',
      key: 'sign',
      title: 'Sign & Seal',
      desc: 'Draw your handwritten signature and stamp it securely onto any page.',
      icon: PenTool,
      accent: '#7C3AED',
    },
    {
      id: 'edit-metadata',
      key: 'metadata',
      title: 'Document Metadata',
      desc: 'Edit title, author, subject, and searchable keywords embedded in the PDF.',
      icon: FileSignature,
      accent: '#DC2626',
    },
  ];

  return (
    <section id="edit-section" className="py-20 sm:py-28 bg-[#F5F3ED] border-b border-slate-200 bg-paper-grid relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100/80 border border-amber-300/80 rounded-full text-amber-900 text-[11px] font-mono font-bold uppercase tracking-widest mb-3">
            <span>PRECISION EDITOR</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight uppercase leading-tight">
            EDIT YOUR DOCUMENT.
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            Refine your pages, add confidentiality watermarks, apply Bates pagination, and stamp handwritten digital signatures without altering formatting.
          </p>
        </div>

        {/* Editor Showcase & Interactive Mockup Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Feature Selector Tabs */}
          <div className="lg:col-span-5 space-y-3">
            {editFeatures.map((feat) => {
              const Icon = feat.icon;
              const isSelected = activeFeature === feat.key;
              const tool = PDF_TOOLS.find((t) => t.id === feat.id);

              return (
                <div
                  key={feat.id}
                  onMouseEnter={() => setActiveFeature(feat.key)}
                  onClick={() => tool && onSelectTool(tool)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between group ${
                    isSelected
                      ? 'bg-white border-slate-400 shadow-md translate-x-1'
                      : 'bg-white/60 hover:bg-white border-slate-200/80'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: feat.accent }}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                        {feat.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {feat.desc}
                      </p>
                    </div>
                  </div>

                  <ArrowRight
                    size={16}
                    className={`mt-1 transition-transform ${
                      isSelected ? 'text-red-600 translate-x-0.5' : 'text-slate-300 group-hover:text-slate-600'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Right Live Interactive Document Preview Mockup */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl p-6 sm:p-10 border-2 border-slate-300 shadow-xl relative overflow-hidden">
              {/* Document Header Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 text-xs font-mono text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span>ANNUAL_REPORT_2026.PDF</span>
                </div>
                <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-700">
                  PAGE 04 OF 12
                </span>
              </div>

              {/* Center Document Sheet */}
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-8 min-h-[340px] relative flex flex-col justify-between shadow-xs overflow-hidden">
                {/* Visual Content Placeholders */}
                <div className="space-y-3">
                  <div className="w-1/3 h-4 bg-slate-900 rounded" />
                  <div className="w-full h-2 bg-slate-300 rounded" />
                  <div className="w-5/6 h-2 bg-slate-300 rounded" />
                  <div className="w-4/5 h-2 bg-slate-300 rounded" />
                </div>

                <div className="grid grid-cols-2 gap-4 my-6">
                  <div className="h-16 bg-slate-200/80 rounded-lg border border-slate-300 flex items-center justify-center text-[10px] font-mono text-slate-400">
                    FIGURE 4.1: DATA MATRIX
                  </div>
                  <div className="h-16 bg-slate-200/80 rounded-lg border border-slate-300 flex items-center justify-center text-[10px] font-mono text-slate-400">
                    FIGURE 4.2: AUDIT TRAIL
                  </div>
                </div>

                {/* Overlaid Dynamic Feature Demonstration */}
                {activeFeature === 'watermark' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in fade-in zoom-in-95 duration-200">
                    <span className="text-3xl sm:text-4xl font-black font-mono text-red-600/30 -rotate-30 uppercase tracking-widest border-4 border-red-600/30 px-6 py-2 rounded-xl select-none">
                      CONFIDENTIAL
                    </span>
                  </div>
                )}

                {activeFeature === 'pagination' && (
                  <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs font-mono text-slate-700 animate-in fade-in duration-150">
                    <span>DOCUMENT REF: #SEC-99201</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                      Page 4 of 12
                    </span>
                  </div>
                )}

                {activeFeature === 'rotate' && (
                  <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow-md animate-bounce">
                    <RotateCw size={13} />
                    <span>+90° APPLIED</span>
                  </div>
                )}

                {activeFeature === 'crop' && (
                  <div className="absolute inset-4 border-2 border-dashed border-amber-500 rounded-lg pointer-events-none flex items-center justify-center animate-in zoom-in-95 duration-150">
                    <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                      CROP BOUNDS: 12mm BLEED
                    </span>
                  </div>
                )}

                {activeFeature === 'sign' && (
                  <div className="absolute bottom-6 right-6 bg-purple-50 border border-purple-300 rounded-xl p-3 shadow-md animate-in slide-in-from-bottom-2 duration-150">
                    <span className="text-[9px] font-mono text-purple-700 font-bold block mb-1">
                      DIGITAL SIGNATURE SEAL
                    </span>
                    <div className="font-serif italic text-base text-purple-900 font-bold">
                      Jane Doe
                    </div>
                  </div>
                )}

                {activeFeature === 'metadata' && (
                  <div className="absolute bottom-6 left-6 bg-slate-900 text-white rounded-xl p-3 shadow-md text-xs font-mono space-y-1 animate-in slide-in-from-left-2 duration-150">
                    <div>TITLE: Annual Audit Report</div>
                    <div>AUTHOR: Enterprise Legal</div>
                  </div>
                )}
              </div>

              {/* Bottom Specs Action */}
              <div className="mt-6 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-500">
                  Vector fidelity maintained • 0% compression artifacts
                </span>

                <button
                  type="button"
                  onClick={() => {
                    const tool = PDF_TOOLS.find((t) => t.id === 'watermark-pdf');
                    if (tool) onSelectTool(tool);
                  }}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider inline-flex items-center gap-2"
                >
                  <span>Open Editor</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
