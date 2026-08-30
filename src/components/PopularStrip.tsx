import React from 'react';
import { PDFTool } from '../types/tool';
import { DynamicIcon } from './DynamicIcon';
import { Star, ArrowRight } from 'lucide-react';

interface PopularStripProps {
  tools: PDFTool[];
  onSelectTool: (tool: PDFTool) => void;
}

export const PopularStrip: React.FC<PopularStripProps> = ({ tools, onSelectTool }) => {
  const hotTools = tools.filter((t) => t.badge === 'popular').slice(0, 4);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-700/60">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <Star size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">
                Most Popular Workflows
              </h3>
              <p className="text-xs text-slate-400">
                Frequently used tools with instant client-side execution.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            ZERO UPLOADS • 100% PRIVATE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {hotTools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onSelectTool(tool)}
              className="flex items-center gap-3 p-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 hover:border-slate-500 rounded-xl transition-all text-left group"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs group-hover:scale-105 transition-transform"
                style={{ backgroundColor: tool.accentColor }}
              >
                <DynamicIcon name={tool.iconName} size={18} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white group-hover:text-red-400 transition-colors truncate">
                  {tool.name}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {tool.shortDesc}
                </div>
              </div>
              <ArrowRight size={14} className="text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
