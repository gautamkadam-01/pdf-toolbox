import React, { useState, useEffect, useRef } from 'react';
import { PDF_TOOLS } from '../data/tools';
import { PDFTool } from '../types/tool';
import { DynamicIcon } from './DynamicIcon';
import { Search, X, ArrowRight, CornerDownLeft, Sparkles } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: PDFTool) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTool,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = PDF_TOOLS.filter((t) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.shortDesc.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        onSelectTool(filtered[selectedIndex]);
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex, onSelectTool, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="command-palette-overlay"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pt-20 sm:pt-28 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="command-palette-box"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Search Header */}
        <div className="relative flex items-center px-4 border-b border-slate-200">
          <Search size={18} className="text-red-500 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search all 26 PDF tools..."
            className="w-full py-4 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length > 0 ? (
            filtered.map((tool, idx) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  onSelectTool(tool);
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                  selectedIndex === idx ? 'bg-red-50/80 text-red-950' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                    style={{ backgroundColor: tool.accentColor }}
                  >
                    <DynamicIcon name={tool.iconName} size={16} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900">{tool.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{tool.shortDesc}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {tool.badge && (
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {tool.badge}
                    </span>
                  )}
                  {selectedIndex === idx && (
                    <CornerDownLeft size={14} className="text-red-500" />
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-xs text-slate-400">
              No matching tools found for "{query}"
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>PDF Toolbox Native Engine</span>
        </div>
      </div>
    </div>
  );
};
