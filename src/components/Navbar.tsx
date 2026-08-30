import React, { useState, useEffect, useRef } from 'react';
import { Logo } from './Logo';
import { ToolsDropdown } from './ToolsDropdown';
import { PDFTool, ToolCategory } from '../types/tool';
import { PDF_TOOLS } from '../data/tools';
import { DynamicIcon } from './DynamicIcon';
import {
  Search,
  Clock,
  ShieldCheck,
  Menu,
  X,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Layers,
  Sliders,
  FileUp,
} from 'lucide-react';

interface NavbarProps {
  onSelectTool: (tool: PDFTool) => void;
  onOpenCommandPalette: () => void;
  onOpenRecentDrawer: () => void;
  recentCount: number;
  onSelectCategory: (category: ToolCategory) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSelectTool,
  onOpenCommandPalette,
  onOpenRecentDrawer,
  recentCount,
  onSelectCategory,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMobileSection, setExpandedMobileSection] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      id="main-header"
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-200 ${
        isScrolled
          ? 'bg-[#FBF9F5]/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs'
          : 'bg-[#FBF9F5]/85 backdrop-blur-xs border-b border-slate-200/60'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo & Primary Editorial Navigation */}
          <div className="flex items-center gap-8 lg:gap-10 shrink-0 h-full">
            <a
              href="#"
              id="brand-home-link"
              className="flex items-center h-full py-0 my-0 group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 rounded-lg"
              aria-label="PDF Toolbox Home"
            >
              <Logo size="navbar" />
            </a>

            {/* Desktop Editorial Navigation (Tools, Workspace, Resources) */}
            <nav
              ref={navRef}
              className="hidden md:flex items-center gap-1.5"
              aria-label="Primary Navigation"
            >
              {/* Tools Mega Menu Trigger */}
              <div className="relative" onMouseLeave={() => setToolsDropdownOpen(false)}>
                <button
                  type="button"
                  id="nav-tools-menu-btn"
                  onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
                  onMouseEnter={() => setToolsDropdownOpen(true)}
                  className={`px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                    toolsDropdownOpen
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200/60'
                  }`}
                  aria-expanded={toolsDropdownOpen}
                >
                  <span>Tools</span>
                  <ChevronDown
                    size={13}
                    className={`transition-transform duration-200 ${
                      toolsDropdownOpen ? 'rotate-180 text-red-400' : 'text-slate-400'
                    }`}
                  />
                </button>

                <ToolsDropdown
                  isOpen={toolsDropdownOpen}
                  onClose={() => setToolsDropdownOpen(false)}
                  onSelectTool={onSelectTool}
                  onSelectCategory={onSelectCategory}
                />
              </div>

              {/* Workspace Link */}
              <button
                type="button"
                id="nav-workspace-link"
                onClick={() => scrollToSection('tool-directory')}
                className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-950 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              >
                Workspace
              </button>

              {/* Resources Link */}
              <button
                type="button"
                id="nav-resources-link"
                onClick={() => scrollToSection('security-architecture')}
                className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-950 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
              >
                Resources
              </button>
            </nav>
          </div>

          {/* Right Action Utility Bar */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            {/* Search Command Trigger (⌘K) */}
            <button
              type="button"
              id="global-search-btn"
              onClick={onOpenCommandPalette}
              className="flex items-center justify-between gap-2.5 px-3 sm:px-3.5 py-1.5 sm:py-2 w-28 sm:w-48 md:w-56 lg:w-64 xl:w-72 bg-white hover:bg-slate-50 border border-slate-300/90 hover:border-slate-400/90 text-slate-500 hover:text-slate-800 rounded-lg sm:rounded-xl text-xs font-normal transition-all shadow-2xs group cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500"
              title="Search all 26 PDF tools (Ctrl+K or ⌘K)"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search size={14} className="text-slate-400 group-hover:text-red-500 transition-colors shrink-0" />
                <span className="hidden sm:inline text-slate-500 group-hover:text-slate-700 truncate">Search tools...</span>
                <span className="sm:hidden text-slate-500">Search</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-200 rounded text-slate-500 font-semibold shrink-0">
                ⌘K
              </kbd>
            </button>

            {/* Recents Session Drawer Button */}
            <button
              type="button"
              id="recent-files-btn"
              onClick={onOpenRecentDrawer}
              className="relative p-2 text-slate-700 hover:text-slate-950 hover:bg-white/80 rounded-lg transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
              title="View Recent Session Files"
              aria-label="Recent session files"
            >
              <Clock size={17} />
              {recentCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* Primary Action Button: Open Toolbox */}
            <button
              type="button"
              id="nav-get-started-btn"
              onClick={() => scrollToSection('tool-directory')}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer group"
            >
              <span>Open Toolbox</span>
              <ArrowRight size={13} className="text-red-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Mobile Hamburger toggle */}
            <button
              type="button"
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-700 hover:text-slate-900 hover:bg-white rounded-lg md:hidden border border-slate-200"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Editorial Navigation Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 py-4 px-3 space-y-3 bg-[#FBF9F5]/98 backdrop-blur-md rounded-b-2xl shadow-xl max-h-[85vh] overflow-y-auto">
            {/* Quick Search */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenCommandPalette();
              }}
              className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl flex items-center justify-between shadow-2xs"
            >
              <div className="flex items-center gap-2.5">
                <Search size={15} className="text-red-500" />
                <span>Search 26 Tools</span>
              </div>
              <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                ⌘K
              </span>
            </button>

            {/* Direct Navigation Links */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => scrollToSection('tool-directory')}
                className="py-2 px-3 text-left text-xs font-bold font-mono uppercase bg-white border border-slate-200 rounded-xl text-slate-800"
              >
                Workspace
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('security-architecture')}
                className="py-2 px-3 text-left text-xs font-bold font-mono uppercase bg-white border border-slate-200 rounded-xl text-slate-800"
              >
                Resources & Trust
              </button>
            </div>

            {/* Categorized Tools Accordion */}
            <div className="pt-2">
              <div className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase mb-2 px-1">
                ALL TOOLS BY CATEGORY
              </div>
              {[
                {
                  id: 'organize',
                  name: 'Organize & Manage',
                  tools: PDF_TOOLS.filter((t) => t.category === 'organize'),
                },
                {
                  id: 'edit',
                  name: 'Edit & Optimize',
                  tools: PDF_TOOLS.filter((t) => t.category === 'edit_optimize'),
                },
                {
                  id: 'convert',
                  name: 'Convert PDF',
                  tools: PDF_TOOLS.filter(
                    (t) => t.category === 'convert_to_pdf' || t.category === 'convert_from_pdf'
                  ),
                },
                {
                  id: 'security',
                  name: 'Security & Signatures',
                  tools: PDF_TOOLS.filter((t) => t.category === 'security_forms'),
                },
              ].map((section) => {
                const isExpanded = expandedMobileSection === section.id;
                return (
                  <div key={section.id} className="border border-slate-200/80 bg-white rounded-xl mb-2 overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedMobileSection(isExpanded ? null : section.id)
                      }
                      className={`w-full text-left px-3.5 py-2.5 text-xs font-bold flex items-center justify-between transition-colors ${
                        isExpanded ? 'bg-slate-900 text-white' : 'text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <span>{section.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                          isExpanded ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {section.tools.length}
                        </span>
                        <ChevronDown
                          size={14}
                          className={`transition-transform ${isExpanded ? 'rotate-180 text-red-400' : 'text-slate-400'}`}
                        />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-2 space-y-1 bg-white border-t border-slate-100">
                        {section.tools.map((tool) => (
                          <button
                            key={tool.id}
                            type="button"
                            onClick={() => {
                              setMobileMenuOpen(false);
                              onSelectTool(tool);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs text-slate-700"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: tool.accentColor }}
                              />
                              <span className="font-medium truncate">{tool.name}</span>
                            </div>
                            {tool.status === 'coming-soon' ? (
                              <span className="text-[9px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                                Soon
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Mobile Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => scrollToSection('tool-directory')}
                className="w-full py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <span>Launch PDF Workspace</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
