import React, { useRef, useEffect } from 'react';
import { CATEGORIES, PDF_TOOLS } from '../data/tools';
import { PDFTool, ToolCategory } from '../types/tool';
import { DynamicIcon } from './DynamicIcon';
import { ArrowRight, Layers, Sliders, FileUp, ShieldCheck, Clock, Sparkles } from 'lucide-react';

interface ToolsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: PDFTool) => void;
  onSelectCategory?: (category: ToolCategory) => void;
}

export const ToolsDropdown: React.FC<ToolsDropdownProps> = ({
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

  // Group tools into 4 editorial columns
  const organizeTools = PDF_TOOLS.filter((t) => t.category === 'organize');
  const editTools = PDF_TOOLS.filter((t) => t.category === 'edit_optimize');
  const convertTools = PDF_TOOLS.filter(
    (t) => t.category === 'convert_to_pdf' || t.category === 'convert_from_pdf'
  );
  const securityTools = PDF_TOOLS.filter((t) => t.category === 'security_forms');

  const columns = [
    {
      title: 'ORGANIZE',
      subtitle: 'Structure & Pages',
      icon: Layers,
      category: 'organize' as ToolCategory,
      tools: organizeTools,
      accent: '#EF4444',
    },
    {
      title: 'EDIT & OPTIMIZE',
      subtitle: 'Layout & Enhancements',
      icon: Sliders,
      category: 'edit_optimize' as ToolCategory,
      tools: editTools,
      accent: '#F59E0B',
    },
    {
      title: 'CONVERT',
      subtitle: 'To & From PDF',
      icon: FileUp,
      category: 'convert_to_pdf' as ToolCategory,
      tools: convertTools,
      accent: '#10B981',
    },
    {
      title: 'SECURITY & FORMS',
      subtitle: 'Sign, Protect & Clean',
      icon: ShieldCheck,
      category: 'security_forms' as ToolCategory,
      tools: securityTools,
      accent: '#8B5CF6',
    },
  ];

  return (
    <div
      ref={dropdownRef}
      onMouseLeave={onClose}
      className="absolute top-full left-0 mt-3 w-[920px] max-w-[95vw] bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left"
    >
      {/* Header Eyebrow */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
            DOCUMENT TOOLBOX CATALOGUE
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-mono font-semibold text-slate-600">
            26 BROWSER-NATIVE UTILITIES
          </span>
        </div>

        <span className="text-xs text-slate-400">
          Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[10px]">⌘K</kbd> to quick search
        </span>
      </div>

      {/* 4-Column Editorial Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {columns.map((col) => {
          const Icon = col.icon;
          return (
            <div key={col.title} className="space-y-3">
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px]"
                    style={{ backgroundColor: col.accent }}
                  >
                    <Icon size={12} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-mono tracking-wider text-slate-900">
                      {col.title}
                    </h4>
                  </div>
                </div>
              </div>

              {/* Tools List */}
              <ul className="space-y-1">
                {col.tools.map((tool) => {
                  const isSoon = tool.status === 'coming-soon';
                  return (
                    <li key={tool.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTool(tool);
                          onClose();
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                            style={{ backgroundColor: tool.accentColor }}
                          />
                          <span className="text-xs font-medium text-slate-700 group-hover:text-slate-950 truncate">
                            {tool.name}
                          </span>
                        </div>

                        {isSoon ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0">
                            Soon
                          </span>
                        ) : tool.badge === 'popular' ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-50 text-red-600 font-bold uppercase shrink-0">
                            Hot
                          </span>
                        ) : tool.badge === 'new' ? (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-600 font-bold uppercase shrink-0">
                            New
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Bottom Footer Action Bar */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/70 -mx-6 -mb-6 p-4 rounded-b-2xl">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-medium text-slate-600">Zero cloud uploads. Pure client-side execution.</span>
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            document.getElementById('tool-directory')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="text-xs font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1 group"
        >
          <span>View complete toolbox directory</span>
          <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
