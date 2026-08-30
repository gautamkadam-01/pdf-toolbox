import React from 'react';
import { PDFTool } from '../types/tool';
import { PDF_TOOLS } from '../data/tools';
import {
  ShieldCheck,
  Lock,
  WifiOff,
  Cpu,
  EyeOff,
  KeyRound,
  FileCheck2,
  ArrowRight,
} from 'lucide-react';

interface SecuritySectionProps {
  onSelectTool: (tool: PDFTool) => void;
}

export const SecuritySection: React.FC<SecuritySectionProps> = ({ onSelectTool }) => {
  const pillars = [
    {
      icon: Cpu,
      title: 'In-Browser RAM Execution',
      desc: 'All parsing, rendering, merging, and compression operations run entirely within your local browser process.',
      badge: 'Zero Uploads',
    },
    {
      icon: EyeOff,
      title: 'Zero Telemetry & Cloud Storage',
      desc: 'We never see, transmit, or cache your files. When you close the browser tab, your document memory is instantly purged.',
      badge: '100% Confidential',
    },
    {
      icon: KeyRound,
      title: 'AES-256 Bit Encryption',
      desc: 'Apply standard PDF password protection and user permissions directly on your device with cryptographic certainty.',
      badge: 'Standard Crypto',
    },
    {
      icon: WifiOff,
      title: 'Offline Capable Operation',
      desc: 'Turn off your Wi-Fi or airplane mode — all client-side tools run without requiring an active internet connection.',
      badge: 'Air-Gapped Ready',
    },
  ];

  return (
    <section id="security-architecture" className="py-20 sm:py-28 bg-[#090E1F] text-white border-b border-slate-800 bg-dark-grid relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-950/80 border border-red-800/60 rounded-full text-red-400 text-[11px] font-mono font-bold uppercase tracking-widest mb-3">
            <ShieldCheck size={13} />
            <span>PRIVACY & SECURITY ARCHITECTURE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight uppercase leading-tight">
            YOUR DOCUMENTS.
            <br />
            <span className="text-red-500">YOUR CONTROL.</span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
            Most online PDF tools upload your sensitive tax filings, contracts, and IDs to third-party cloud servers. PDF Toolbox eliminates that risk completely with client-side architecture.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          {pillars.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-6 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shadow-xs">
                      <Icon size={22} />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  <span>VERIFIED LOCAL SANDBOX</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Trigger Banner */}
        <div className="p-6 sm:p-8 bg-slate-900/80 border border-slate-800 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h4 className="text-sm sm:text-base font-bold text-white">
              Ready to protect or sign a confidential document?
            </h4>
            <p className="text-xs text-slate-400">
              Apply password encryption or handwritten signatures in seconds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const tool = PDF_TOOLS.find((t) => t.id === 'protect-pdf');
                if (tool) onSelectTool(tool);
              }}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-colors inline-flex items-center gap-2"
            >
              <span>Protect PDF</span>
              <ArrowRight size={14} />
            </button>

            <button
              type="button"
              onClick={() => {
                const tool = PDF_TOOLS.find((t) => t.id === 'sign-pdf');
                if (tool) onSelectTool(tool);
              }}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-colors"
            >
              <span>Sign PDF</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
