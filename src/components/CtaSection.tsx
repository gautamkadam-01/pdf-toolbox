import React from 'react';
import { ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface CtaSectionProps {
  onExplore: () => void;
}

export const CtaSection: React.FC<CtaSectionProps> = ({ onExplore }) => {
  return (
    <section id="cta-section" className="py-20 sm:py-28 bg-[#0A1128] border-b border-slate-800 relative overflow-hidden text-white">
      {/* Dynamic Glow */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-950/80 border border-red-800/60 rounded-full text-red-400 text-[11px] font-mono font-bold uppercase tracking-widest mb-6">
          <Zap size={13} />
          <span>ZERO REGISTRATION REQUIRED</span>
        </div>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight uppercase leading-tight">
          YOUR NEXT PDF
          <br />
          <span className="text-red-500">STARTS HERE.</span>
        </h2>

        <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-xl mx-auto leading-relaxed">
          Open any of the 26 document tools right in your browser. Fast, local, and completely free.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            type="button"
            onClick={onExplore}
            className="w-full sm:w-auto px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider shadow-lg hover:shadow-red-600/30 transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Launch Document Toolbox</span>
            <ArrowRight size={15} />
          </button>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            100% Client-Side
          </span>
          <span>•</span>
          <span>Zero Server Uploads</span>
          <span>•</span>
          <span>Free Forever</span>
        </div>
      </div>
    </section>
  );
};
