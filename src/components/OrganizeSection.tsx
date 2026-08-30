import React, { useState } from 'react';
import { PDFTool } from '../types/tool';
import { PDF_TOOLS } from '../data/tools';
import {
  Layers,
  Scissors,
  ListOrdered,
  Trash2,
  FileMinus,
  ArrowRight,
  GripVertical,
  CheckCircle2,
} from 'lucide-react';

interface OrganizeSectionProps {
  onSelectTool: (tool: PDFTool) => void;
}

export const OrganizeSection: React.FC<OrganizeSectionProps> = ({ onSelectTool }) => {
  const [pages, setPages] = useState<number[]>([1, 2, 3, 4]);

  const swapPages = (i: number, j: number) => {
    const updated = [...pages];
    const temp = updated[i];
    updated[i] = updated[j];
    updated[j] = temp;
    setPages(updated);
  };

  const removePage = (num: number) => {
    if (pages.length > 2) {
      setPages(pages.filter((p) => p !== num));
    }
  };

  const resetPages = () => {
    setPages([1, 2, 3, 4]);
  };

  const organizeTools = [
    {
      id: 'merge-pdf',
      title: 'Merge PDF',
      desc: 'Combine multiple PDF files or spreadsheets into a unified document in your custom order.',
      icon: Layers,
      accent: '#EF4444',
    },
    {
      id: 'split-pdf',
      title: 'Split PDF',
      desc: 'Separate chapters, extract specific ranges, or split into single individual page files.',
      icon: Scissors,
      accent: '#F43F5E',
    },
    {
      id: 'organize-pdf',
      title: 'Rearrange & Reorder',
      desc: 'Visually drag and drop thumbnails to re-sequence document flow instantly.',
      icon: ListOrdered,
      accent: '#3B82F6',
    },
    {
      id: 'remove-pages',
      title: 'Delete Unwanted Pages',
      desc: 'Remove blank scan pages, covers, or confidential appendices with one click.',
      icon: Trash2,
      accent: '#64748B',
    },
  ];

  return (
    <section id="organize-section" className="py-20 sm:py-28 bg-white border-b border-slate-200 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200 rounded-full text-red-700 text-[11px] font-mono font-bold uppercase tracking-widest mb-3">
            <span>DOCUMENT ARCHITECTURE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-950 tracking-tight uppercase leading-tight">
            ORGANIZE & MANAGE PAGES.
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
            Combine distinct PDFs, carve out specific page ranges, rearrange document flow, or eliminate unnecessary sheets with zero latency.
          </p>
        </div>

        {/* Interactive Page Organizer Visual Mockup */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl mb-12 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-800 gap-4 mb-6">
            <div>
              <span className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
                INTERACTIVE PAGE SEQUENCE SIMULATOR
              </span>
              <p className="text-xs text-slate-400 mt-1">
                Try swapping or deleting page cards below to see client-side reordering in real-time:
              </p>
            </div>

            <button
              type="button"
              onClick={resetPages}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition-colors"
            >
              Reset Sequence
            </button>
          </div>

          {/* Interactive Page Thumbnails Sequence */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
            {pages.map((pageNum, idx) => (
              <div
                key={pageNum}
                className="bg-slate-800/90 border-2 border-slate-700 hover:border-red-500 rounded-2xl p-4 flex flex-col justify-between transition-all group relative"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-700/80">
                  <span className="text-xs font-mono font-bold text-slate-300">
                    Pos: {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePage(pageNum)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    title="Remove page"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Page Blueprint Graphic */}
                <div className="my-4 bg-slate-900 rounded-lg p-3 border border-slate-700/60 flex flex-col justify-between min-h-[90px]">
                  <div className="space-y-1">
                    <div className="w-8 h-1 bg-red-500 rounded" />
                    <div className="w-full h-1 bg-slate-700 rounded" />
                    <div className="w-4/5 h-1 bg-slate-700 rounded" />
                  </div>
                  <div className="text-center font-mono text-xs font-black text-slate-400">
                    PAGE {String(pageNum).padStart(2, '0')}
                  </div>
                </div>

                {/* Swap controls */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-700/80 text-[11px] font-mono">
                  {idx > 0 ? (
                    <button
                      type="button"
                      onClick={() => swapPages(idx, idx - 1)}
                      className="text-slate-400 hover:text-white"
                    >
                      ← Left
                    </button>
                  ) : <span className="text-slate-600">Start</span>}

                  {idx < pages.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => swapPages(idx, idx + 1)}
                      className="text-slate-400 hover:text-white"
                    >
                      Right →
                    </button>
                  ) : <span className="text-slate-600">End</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>CURRENT COMPILED STREAM: [{pages.map((p) => `P${p}`).join(' → ')}]</span>
            <span className="text-emerald-400">STATUS: NON-DESTRUCTIVE RE-INDEX</span>
          </div>
        </div>

        {/* 4 Tool Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {organizeTools.map((toolInfo) => {
            const tool = PDF_TOOLS.find((t) => t.id === toolInfo.id);
            const Icon = toolInfo.icon;

            return (
              <div
                key={toolInfo.id}
                onClick={() => tool && onSelectTool(tool)}
                className="bg-slate-50 hover:bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-slate-400 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 shadow-xs group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: toolInfo.accent }}
                  >
                    <Icon size={18} />
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                    {toolInfo.title}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {toolInfo.desc}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-slate-700 group-hover:text-red-600">
                  <span className="font-mono text-[11px]">Launch Tool</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
