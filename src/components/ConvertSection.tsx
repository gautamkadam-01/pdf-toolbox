import React, { useState } from 'react';
import { PDFTool } from '../types/tool';
import { PDF_TOOLS } from '../data/tools';
import {
  FileUp,
  FileDown,
  Image,
  FileText,
  Code,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Layers,
} from 'lucide-react';

interface ConvertSectionProps {
  onSelectTool: (tool: PDFTool) => void;
}

export const ConvertSection: React.FC<ConvertSectionProps> = ({ onSelectTool }) => {
  const [activeTab, setActiveTab] = useState<'to_pdf' | 'from_pdf'>('to_pdf');

  const toPdfTools = [
    { id: 'jpg-to-pdf', name: 'JPG to PDF', format: 'JPG / JPEG', badge: 'Popular', icon: Image },
    { id: 'png-to-pdf', name: 'PNG to PDF', format: 'PNG (Lossless)', badge: 'Sharp', icon: Image },
    { id: 'word-to-pdf', name: 'Word to PDF', format: 'DOCX / DOC', badge: 'Soon', icon: FileText },
    { id: 'powerpoint-to-pdf', name: 'PowerPoint to PDF', format: 'PPTX / PPT', badge: 'Soon', icon: FileText },
    { id: 'excel-to-pdf', name: 'Excel to PDF', format: 'XLSX / CSV', badge: 'Soon', icon: FileText },
    { id: 'html-to-pdf', name: 'HTML to PDF', format: 'Web Page / Code', badge: 'Soon', icon: Code },
    { id: 'text-to-pdf', name: 'Text to PDF', format: 'Raw TXT', badge: 'Live', icon: FileText },
  ];

  const fromPdfTools = [
    { id: 'pdf-to-jpg', name: 'PDF to JPG', format: 'Compressed Raster', badge: 'Popular', icon: Image },
    { id: 'pdf-to-png', name: 'PDF to PNG', format: 'High-Res Lossless', badge: 'Popular', icon: Image },
    { id: 'pdf-to-word', name: 'PDF to Word', format: 'Editable DOCX', badge: 'Soon', icon: FileText },
    { id: 'pdf-to-text', name: 'PDF to Text', format: 'Extracted Plaintext', badge: 'Live', icon: FileText },
  ];

  const currentList = activeTab === 'to_pdf' ? toPdfTools : fromPdfTools;

  return (
    <section id="convert-section" className="py-20 sm:py-28 bg-[#0A1128] text-white border-b border-slate-800 bg-dark-grid relative overflow-hidden">
      {/* Glow Backdrops */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-950/80 border border-red-800/60 rounded-full text-red-400 text-[11px] font-mono font-bold uppercase tracking-widest mb-3">
            <span>CONVERT MATRIX</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight uppercase leading-tight">
            CONVERT WITHOUT THE CLUTTER.
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
            Transform images, scans, documents, and raw text into clean standardized PDFs — and extract PDF pages back into images and text with zero loss in resolution.
          </p>
        </div>

        {/* Tab Switcher: To PDF vs From PDF */}
        <div className="flex items-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => setActiveTab('to_pdf')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'to_pdf'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <FileUp size={15} />
            <span>Convert to PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('from_pdf')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'from_pdf'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <FileDown size={15} />
            <span>Convert from PDF</span>
          </button>
        </div>

        {/* Conversion Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentList.map((item) => {
            const tool = PDF_TOOLS.find((t) => t.id === item.id);
            const Icon = item.icon;
            const isSoon = item.badge === 'Soon';

            return (
              <div
                key={item.id}
                onClick={() => tool && onSelectTool(tool)}
                className="p-5 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-600 rounded-2xl transition-all duration-200 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-red-600 text-slate-300 group-hover:text-white flex items-center justify-center transition-colors shadow-xs">
                      <Icon size={20} />
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                        item.badge === 'Popular'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : item.badge === 'Soon'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                    {item.name}
                  </h3>

                  <p className="text-xs text-slate-400 font-mono mt-1">
                    {item.format}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 group-hover:text-white">
                  <span className="text-[11px] font-mono">
                    {isSoon ? 'Roadmap' : 'Launch Converter'}
                  </span>
                  <ArrowRight size={14} className="text-slate-500 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Points Strip */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>Lossless RGB / CMYK conversion engines</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>High-DPI rendering for sharp vector prints</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>Unlimited batch conversions without wait queues</span>
          </div>
        </div>
      </div>
    </section>
  );
};
