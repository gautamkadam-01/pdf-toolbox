import React, { useRef, useEffect } from 'react';
import { PDFTool, ToolCategory, CategoryInfo } from '../types/tool';
import { PDF_TOOLS, CATEGORIES } from '../data/tools';
import { DynamicIcon } from './DynamicIcon';
import { ArrowRight, ChevronRight } from 'lucide-react';

interface CategoryNavDropdownProps {
  categoryId: ToolCategory | 'convert_all';
  categoryTitle: string;
  categoryDesc?: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: PDFTool) => void;
  onSelectCategory: (category: ToolCategory) => void;
}

export const CategoryNavDropdown: React.FC<CategoryNavDropdownProps> = ({
  categoryId,
  categoryTitle,
  categoryDesc,
  isOpen,
  onClose,
  onSelectTool,
  onSelectCategory,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter tools based on category
  const tools = categoryId === 'convert_all'
    ? PDF_TOOLS.filter((t) => t.category === 'convert_to_pdf' || t.category === 'convert_from_pdf')
    : PDF_TOOLS.filter((t) => t.category === categoryId);

  const matchedCatInfo: CategoryInfo | undefined = categoryId === 'convert_all'
    ? {
        id: 'convert_to_pdf',
        title: 'Convert PDF',
        description: 'Convert images, documents, scans, and text to and from PDF.',
        iconName: 'FileUp',
        color: 'from-emerald-500 to-teal-600',
      }
    : CATEGORIES.find((c) => c.id === categoryId);

  return (
    <div
      ref={dropdownRef}
      onMouseLeave={onClose}
      className="absolute top-full left-0 mt-1.5 w-[360px] sm:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-3 px-3 z-50 animate-in fade-in slide-in-from-top-1.5 duration-150 backdrop-blur-md"
    >
      {/* Category Header */}
      <div className="px-3 py-2 border-b border-slate-100 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900">
              {matchedCatInfo?.title || categoryTitle}
            </h4>
          </div>
          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
            {tools.length} Tools
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-1 leading-snug">
          {categoryDesc || matchedCatInfo?.description}
        </p>
      </div>

      {/* Tools List */}
      <div className="max-h-[360px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
        {tools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => {
              onSelectTool(tool);
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 transition-all flex items-center justify-between group border border-transparent hover:border-slate-200/60"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
                style={{ backgroundColor: tool.accentColor }}
              >
                <DynamicIcon name={tool.iconName} size={15} className="text-white" />
              </div>
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-red-600 transition-colors truncate">
                    {tool.name}
                  </span>
                  {tool.badge === 'popular' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-50 text-red-600 font-bold uppercase">
                      Hot
                    </span>
                  )}
                  {tool.badge === 'pro' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-50 text-purple-600 font-bold uppercase">
                      Pro
                    </span>
                  )}
                  {tool.badge === 'new' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-600 font-bold uppercase">
                      New
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 truncate mt-0.5">
                  {tool.shortDesc}
                </p>
              </div>
            </div>

            <ChevronRight
              size={14}
              className="text-slate-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all shrink-0"
            />
          </button>
        ))}
      </div>

      {/* Footer Category Explorer Link */}
      <div className="mt-2 pt-2 border-t border-slate-100 px-2">
        <button
          type="button"
          onClick={() => {
            const targetCat = categoryId === 'convert_all' ? 'convert_to_pdf' : categoryId;
            onSelectCategory(targetCat);
            onClose();
            document.getElementById('tool-directory')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="w-full py-1.5 px-3 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-1.5 group"
        >
          <span>View all in directory</span>
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};
