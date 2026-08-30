import React from 'react';
import { PDFTool } from '../types/tool';
import { DynamicIcon } from './DynamicIcon';
import {
  ArrowRight,
  Sparkles,
  Layers,
  Scissors,
  Minimize2,
  Lock,
  Unlock,
  RotateCw,
  Stamp,
  FileUp,
  FileDown,
  PenTool,
  Hash,
  Crop,
  Maximize2,
  Trash2,
  ListOrdered,
  FileCheck,
} from 'lucide-react';

interface ToolItemProps {
  tool: PDFTool;
  index: number;
  onSelect: (tool: PDFTool) => void;
}

export const ToolItem: React.FC<ToolItemProps> = ({ tool, index, onSelect }) => {
  const isComingSoon = tool.status === 'coming-soon';
  const isBeta = tool.status === 'beta';

  // Format index as 2-digit number (01, 02, etc.)
  const formattedIndex = String(index + 1).padStart(2, '0');

  // Custom visual micro-interaction rendering per tool type
  const renderActionMicroAnimation = () => {
    switch (tool.id) {
      case 'merge-pdf':
        return (
          <div className="flex items-center gap-1 group-hover:gap-0.5 transition-all">
            <span className="w-2 h-3 rounded-[1px] bg-red-400 group-hover:translate-x-0.5 transition-transform" />
            <span className="w-2 h-3 rounded-[1px] bg-red-600 group-hover:-translate-x-0.5 transition-transform" />
          </div>
        );
      case 'split-pdf':
        return (
          <div className="flex items-center gap-1 group-hover:gap-2 transition-all">
            <span className="w-2 h-3 rounded-[1px] bg-rose-400 group-hover:-translate-x-1 transition-transform" />
            <Scissors size={10} className="text-rose-600" />
            <span className="w-2 h-3 rounded-[1px] bg-rose-400 group-hover:translate-x-1 transition-transform" />
          </div>
        );
      case 'compress-pdf':
        return (
          <div className="w-5 h-5 rounded border border-amber-400 flex items-center justify-center group-hover:scale-90 transition-transform">
            <Minimize2 size={10} className="text-amber-600" />
          </div>
        );
      case 'rotate-pdf':
        return (
          <RotateCw
            size={14}
            className="text-blue-500 group-hover:rotate-90 transition-transform duration-300"
          />
        );
      case 'sign-pdf':
        return (
          <PenTool
            size={14}
            className="text-purple-500 group-hover:-rotate-12 group-hover:scale-110 transition-transform"
          />
        );
      case 'protect-pdf':
        return (
          <Lock
            size={14}
            className="text-indigo-500 group-hover:scale-115 transition-transform"
          />
        );
      case 'unlock-pdf':
        return (
          <Unlock
            size={14}
            className="text-teal-500 group-hover:-translate-y-0.5 transition-transform"
          />
        );
      case 'watermark-pdf':
        return (
          <Stamp
            size={14}
            className="text-sky-500 group-hover:rotate-12 transition-transform"
          />
        );
      case 'page-numbers':
        return (
          <Hash
            size={14}
            className="text-emerald-500 group-hover:scale-110 transition-transform"
          />
        );
      default:
        return (
          <ArrowRight
            size={14}
            className="text-slate-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all"
          />
        );
    }
  };

  return (
    <div
      id={`tool-card-${tool.id}`}
      onClick={() => onSelect(tool)}
      className="relative bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 hover:border-slate-400/90 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group cursor-pointer text-left"
    >
      {/* Top Card Row: Index Number, Icon, Badges */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            {/* Tool Icon with Custom Color */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs group-hover:scale-105 group-hover:shadow-sm transition-all"
              style={{ backgroundColor: tool.accentColor }}
            >
              <DynamicIcon name={tool.iconName} size={18} className="text-white" />
            </div>

            {/* Technical Index Identifier */}
            <div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 block">
                TOOL #{formattedIndex}
              </span>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-red-600 transition-colors tracking-tight">
                {tool.name}
              </h3>
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0">
            {isComingSoon ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 font-medium">
                Soon
              </span>
            ) : isBeta ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 font-medium">
                Beta
              </span>
            ) : tool.badge === 'popular' ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200/80 font-bold uppercase">
                Hot
              </span>
            ) : tool.badge === 'new' ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-bold uppercase">
                New
              </span>
            ) : (
              <span className="text-[10px] font-mono px-1.5 py-0.5 text-slate-400 group-hover:text-slate-600">
                Ready
              </span>
            )}
          </div>
        </div>

        {/* Short Editorial Description */}
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mt-1">
          {tool.shortDesc}
        </p>
      </div>

      {/* Card Footer: Micro-Interaction + Category Tag */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-wider truncate max-w-[130px]">
          {tool.category.replace(/_/g, ' ')}
        </span>

        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 group-hover:text-red-600 transition-colors">
          <span className="text-[11px] font-mono hidden sm:inline">
            {isComingSoon ? 'Preview' : 'Open'}
          </span>
          <div className="w-5 h-5 flex items-center justify-center">
            {renderActionMicroAnimation()}
          </div>
        </div>
      </div>
    </div>
  );
};
