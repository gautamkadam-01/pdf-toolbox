import React from 'react';
import { ProcessedItem } from '../types/tool';
import { X, Clock, Download, Trash2, FileText, CheckCircle2 } from 'lucide-react';

interface RecentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: ProcessedItem[];
  onClear: () => void;
  onRemoveItem: (id: string) => void;
}

export const RecentDrawer: React.FC<RecentDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onClear,
  onRemoveItem,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="recent-drawer-overlay"
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="recent-drawer-panel"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Documents</h3>
              <p className="text-xs text-slate-500">Processed in this session</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl space-y-2 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <FileText size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {item.fileName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.toolName} • {(item.fileSize / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="text-slate-400 hover:text-red-600 p-1"
                    title="Remove from history"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] font-mono text-slate-400">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <a
                    href={item.downloadUrl}
                    download={item.fileName}
                    className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700"
                  >
                    <Download size={13} />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <Clock size={36} className="mx-auto text-slate-300 stroke-1" />
              <p className="text-xs font-medium">No recent documents processed yet.</p>
              <p className="text-[11px] text-slate-400">
                Choose a tool from the directory to start converting or merging.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-semibold text-red-600 hover:text-red-700"
            >
              Clear Session History
            </button>
            <span className="text-[11px] font-mono text-slate-400">
              {items.length} file{items.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
