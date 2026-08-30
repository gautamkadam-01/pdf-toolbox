import React from 'react';
import { Logo } from './Logo';
import { CATEGORIES } from '../data/tools';
import { ToolCategory } from '../types/tool';
import { ShieldCheck, Lock, Cpu, Heart } from 'lucide-react';

interface FooterProps {
  onSelectCategory: (category: ToolCategory) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectCategory }) => {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#050814] text-slate-400 pt-20 pb-12 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-16 border-b border-slate-900">
          {/* Col 1: Brand & Manifesto */}
          <div className="lg:col-span-2 space-y-4">
            <Logo variant="dark" size="lg" />
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              PDF Toolbox is a purpose-built suite of 26 browser-accessible document utilities engineered for fast, private, and precise document workflows with zero cloud telemetry.
            </p>
            <div className="flex items-center gap-4 pt-2 text-xs font-mono text-slate-500">
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck size={14} />
                100% Client-Side
              </span>
              <span className="inline-flex items-center gap-1.5 text-blue-400">
                <Lock size={14} />
                Zero Telemetry
              </span>
            </div>
          </div>

          {/* Col 2: Categories */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-200 mb-4">
              Tool Categories
            </h4>
            <ul className="space-y-2 text-xs font-medium">
              {CATEGORIES.map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat.id);
                      scrollTo('tool-directory');
                    }}
                    className="hover:text-white transition-colors text-left"
                  >
                    {cat.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Key Utilities */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-200 mb-4">
              Key Utilities
            </h4>
            <ul className="space-y-2 text-xs font-medium text-slate-400">
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('organize-section')}
                  className="hover:text-white transition-colors"
                >
                  Merge & Split PDF
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('tool-directory')}
                  className="hover:text-white transition-colors"
                >
                  Stream Compression
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('convert-section')}
                  className="hover:text-white transition-colors"
                >
                  JPG / PNG to PDF
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('edit-section')}
                  className="hover:text-white transition-colors"
                >
                  Digital Signatures
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => scrollTo('security-architecture')}
                  className="hover:text-white transition-colors"
                >
                  AES-256 Encryption
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Platform Engine */}
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-200 mb-4">
              Local Architecture
            </h4>
            <ul className="space-y-2 text-xs font-mono text-slate-500">
              <li>WebAssembly Engine</li>
              <li>PDF-Lib & Canvas DOM</li>
              <li>JSZip Local Bundler</li>
              <li>Native Web Crypto API</li>
              <li>Zero Upload Buffering</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <div>
            © {new Date().getFullYear()} PDF Toolbox. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span>Client-Side Sandbox</span>
            <span>•</span>
            <span>No Cookies Tracked</span>
            <span>•</span>
            <span>Zero Remote Storage</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
