import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { AppTheme } from '../types';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  theme?: AppTheme;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isDestructive = true,
  onConfirm,
  onCancel,
  theme = 'clean',
}) => {
  if (!isOpen) return null;
  const isNotebook = theme === 'notebook';

  return (
    <div
      id="confirm-dialog-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        id="confirm-dialog-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className={`border-2 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scaleUp transition-colors ${
          isNotebook
            ? 'bg-[#fcfbf9] border-[#ded7c6] text-[#1c2b45]'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div
          className={`px-4 sm:px-5 py-3.5 flex items-center justify-between border-b ${
            isNotebook
              ? 'bg-[#1c2b45] text-white border-[#1c2b45]'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-300" />
            <h3 id="confirm-dialog-title" className="font-sans font-bold text-base">
              {title}
            </h3>
          </div>
          <button
            id="confirm-dialog-close-btn"
            type="button"
            onClick={onCancel}
            className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <p className={`text-sm leading-relaxed ${isNotebook ? 'text-[#2e3a4e]' : 'text-slate-700'}`}>
            {description}
          </p>

          <div
            className={`flex items-center justify-end gap-3 pt-2 border-t ${
              isNotebook ? 'border-[#dedad0]' : 'border-slate-200'
            }`}
          >
            <button
              id="confirm-dialog-cancel-btn"
              type="button"
              onClick={onCancel}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition cursor-pointer border ${
                isNotebook
                  ? 'border-[#dedad0] bg-white text-[#5b6478] hover:text-[#1c2b45] hover:bg-[#f0eee6]'
                  : 'border-slate-300 bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {cancelLabel}
            </button>
            <button
              id="confirm-dialog-confirm-btn"
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition shadow-sm cursor-pointer ${
                isDestructive
                  ? 'bg-red-600 hover:bg-red-700'
                  : isNotebook
                  ? 'bg-[#1c2b45] hover:bg-[#132038]'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
