import React, { useState, useMemo } from 'react';
import { PDFTool, ToolCategory } from '../types/tool';
import { ToolItem } from './ToolItem';
import { DynamicIcon } from './DynamicIcon';
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  Layers,
  FileUp,
  FileDown,
  ShieldCheck,
  Zap,
  ArrowRight,
  Layers as LayersIcon,
  Minimize2,
  PenTool,
  RotateCw,
} from 'lucide-react';

interface ToolDirectoryProps {
  tools: PDFTool[];
  selectedCategory: ToolCategory | 'all';
  onSelectCategory: (category: ToolCategory | 'all') => void;
  onSelectTool: (tool: PDFTool) => void;
  onOpenCommandPalette: () => void;
}

export const ToolDirectory: React.FC<ToolDirectoryProps> = ({
  tools,
  selectedCategory,
  onSelectCategory,
  onSelectTool,
  onOpenCommandPalette,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Category navigation tabs
  const categoryTabs: { id: ToolCategory | 'all'; label: string; count: number }[] = [
    { id: 'all', label: 'All Tools', count: tools.length },
    {
      id: 'organize',
      label: 'Organize',
      count: tools.filter((t) => t.category === 'organize').length,
    },
    {
      id: 'edit_optimize',
      label: 'Edit & Optimize',
      count: tools.filter((t) => t.category === 'edit_optimize').length,
    },
    {
      id: 'convert_to_pdf',
      label: 'Convert To PDF',
      count: tools.filter((t) => t.category === 'convert_to_pdf').length,
    },
    {
      id: 'convert_from_pdf',
      label: 'Convert From PDF',
      count: tools.filter((t) => t.category === 'convert_from_pdf').length,
    },
    {
      id: 'security_forms',
      label: 'Security & Sign',
      count: tools.filter((t) => t.category === 'security_forms').length,
    },
  ];

  // Filter tools based on category and search query
  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const matchesCategory =
        selectedCategory === 'all' || tool.category === selectedCategory;
      const matchesSearch =
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.shortDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.fullDesc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [tools, selectedCategory, searchQuery]);

  // Featured 4 tools for top spotlight
  const featuredTools = useMemo(() => {
    const ids = ['merge-pdf', 'compress-pdf', 'pdf-to-jpg', 'sign-pdf'];
    return ids.map((id) => tools.find((t) => t.id === id)).filter(Boolean) as PDFTool[];
  }, [tools]);

  return (
    <section id="tool-directory" className="py-16 sm:py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ========================================================================= */}
        {/* EDITORIAL TOOLBOX HEADER */}
        {/* ========================================================================= */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200/80 rounded-full text-red-700 text-[11px] font-mono font-bold uppercase tracking-widest mb-3">
            <span>THE TOOLBOX</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight uppercase">
            26 TOOLS. 5 CATEGORIES. ONE WORKSPACE.
          </h2>

          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Browse our complete client-side toolset. All processing happens in local browser memory with zero file uploads.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* 4 FEATURED TOOLS SPOTLIGHT */}
        {/* ========================================================================= */}
        <div className="mb-14">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              FEATURED ESSENTIALS
            </span>
            <span className="text-xs font-mono text-slate-400">
              FAST-TRACK PROCESSING
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredTools.map((tool, idx) => (
              <div
                key={tool.id}
                onClick={() => onSelectTool(tool)}
                className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 hover:border-slate-700 shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: tool.accentColor }}
                    >
                      <DynamicIcon name={tool.iconName} size={20} className="text-white" />
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-400 bg-red-950/60 px-2 py-0.5 rounded border border-red-800/40">
                      FEATURED
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {tool.shortDesc}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300 group-hover:text-white">
                  <span className="font-mono text-[10px] uppercase text-slate-400">
                    Instant Run
                  </span>
                  <div className="flex items-center gap-1">
                    <span>Open Tool</span>
                    <ArrowRight size={13} className="text-red-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEARCH BAR & CATEGORY FILTERS */}
        {/* ========================================================================= */}
        <div className="space-y-4 mb-8">
          {/* Integrated Search & Command Input */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                id="tool-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by tool name, format, or operation (e.g. merge, compress, protect, jpg)..."
                className="w-full pl-10 pr-24 py-3 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300/90 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-500 hover:text-slate-800 shadow-2xs cursor-pointer"
              >
                <span>Command ⌘K</span>
              </button>
            </div>

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Clear Search
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            {categoryTabs.map((tab) => {
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectCategory(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase font-mono tracking-wider whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-slate-800 text-red-400' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 26-TOOL EDITORIAL GRID */}
        {/* ========================================================================= */}
        {filteredTools.length === 0 ? (
          <div className="py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Search size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-900">No matching tools found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              We couldn't find any tool matching "{searchQuery}". Try searching for terms like "merge", "split", "compress", or "sign".
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                onSelectCategory('all');
              }}
              className="mt-4 px-4 py-2 bg-slate-900 text-white text-xs font-bold font-mono uppercase rounded-xl"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTools.map((tool, idx) => (
              <ToolItem
                key={tool.id}
                tool={tool}
                index={idx}
                onSelect={onSelectTool}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
