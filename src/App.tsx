import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { PopularStrip } from './components/PopularStrip';
import { ToolDirectory } from './components/ToolDirectory';
import { ConvertSection } from './components/ConvertSection';
import { EditSection } from './components/EditSection';
import { OrganizeSection } from './components/OrganizeSection';
import { SecuritySection } from './components/SecuritySection';
import { WorkflowSection } from './components/WorkflowSection';
import { ProductValue } from './components/ProductValue';
import { CtaSection } from './components/CtaSection';
import { Footer } from './components/Footer';
import { WorkspaceModal } from './components/WorkspaceModal';
import { CommandPalette } from './components/CommandPalette';
import { RecentDrawer } from './components/RecentDrawer';
import { PDF_TOOLS } from './data/tools';
import { PDFTool, ToolCategory, ProcessedItem } from './types/tool';

export const App: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<PDFTool | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | 'all'>('all');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [recentDrawerOpen, setRecentDrawerOpen] = useState(false);
  const [processedItems, setProcessedItems] = useState<ProcessedItem[]>([]);

  // Keyboard shortcut for Cmd+K / Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSaveProcessed = (item: ProcessedItem) => {
    setProcessedItems((prev) => [item, ...prev]);
  };

  const handleClearHistory = () => {
    setProcessedItems([]);
  };

  const handleRemoveHistoryItem = (id: string) => {
    setProcessedItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-slate-900 selection:bg-red-500 selection:text-white">
      {/* Top Fixed Header with Brand Logo */}
      <Navbar
        onSelectTool={setSelectedTool}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenRecentDrawer={() => setRecentDrawerOpen(true)}
        recentCount={processedItems.length}
        onSelectCategory={setSelectedCategory}
      />

      {/* Main Workspace Body */}
      <main className="flex-1">
        {/* 1. Hero Section with Interactive Document Studio */}
        <Hero
          onSelectTool={setSelectedTool}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />

        {/* 2. Most Popular Workflows Fast Strip */}
        <PopularStrip
          tools={PDF_TOOLS}
          onSelectTool={setSelectedTool}
        />

        {/* 3. Comprehensive 26-Tool Directory */}
        <ToolDirectory
          tools={PDF_TOOLS}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onSelectTool={setSelectedTool}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />

        {/* 4. Convert Without The Clutter Showcase */}
        <ConvertSection onSelectTool={setSelectedTool} />

        {/* 5. Precision Document Editor Showcase */}
        <EditSection onSelectTool={setSelectedTool} />

        {/* 6. Organize & Manage Page Flow Showcase */}
        <OrganizeSection onSelectTool={setSelectedTool} />

        {/* 7. Privacy & Security Architecture Showcase */}
        <SecuritySection onSelectTool={setSelectedTool} />

        {/* 8. 4-Step How It Works Timeline */}
        <WorkflowSection />

        {/* 9. Product Architecture & Value Matrix */}
        <ProductValue />

        {/* 10. Call to Action Section */}
        <CtaSection
          onExplore={() => {
            setSelectedCategory('all');
            document.getElementById('tool-directory')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      </main>

      {/* Footer */}
      <Footer onSelectCategory={setSelectedCategory} />

      {/* Interactive Tool Modal */}
      <WorkspaceModal
        tool={selectedTool}
        onClose={() => setSelectedTool(null)}
        onSaveProcessed={handleSaveProcessed}
      />

      {/* Search Command Palette (⌘K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectTool={setSelectedTool}
      />

      {/* Recent History Drawer */}
      <RecentDrawer
        isOpen={recentDrawerOpen}
        onClose={() => setRecentDrawerOpen(false)}
        items={processedItems}
        onClear={handleClearHistory}
        onRemoveItem={handleRemoveHistoryItem}
      />
    </div>
  );
};

export default App;
