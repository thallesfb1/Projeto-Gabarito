import { ModalLayer } from './ModalLayer';
import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
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
}) => {
  const [busy, setBusy] = useState(false);
  if (!isOpen) return null;

  return (
    <ModalLayer label="Confirmar ação" onClose={() => { if (!busy) onCancel(); }}
      id="confirm-dialog-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={e => {
        if (!busy && e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        id="confirm-dialog-modal"
        aria-labelledby="confirm-dialog-title"
        className="bg-[#fcfbf9] dark:bg-[#22242a] border-2 border-[#1c2b45] dark:border-[#3b3e48] rounded-xl shadow-2xl max-w-md w-full overflow-hidden"
      >
        <div className="bg-[#1c2b45] dark:bg-[#18191d] text-white px-4 sm:px-5 py-3 flex items-center justify-between border-b dark:border-[#3b3e48]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-300 dark:text-amber-400" />
            <h3 id="confirm-dialog-title" className="font-sans font-bold text-base">
              {title}
            </h3>
          </div>
          <button
            id="confirm-dialog-close-btn"
            disabled={busy}
            type="button"
            onClick={onCancel}
            className="p-1 rounded text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <p className="text-sm text-[#1c2b45] dark:text-zinc-200 leading-relaxed">
            {description}
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              id="confirm-dialog-cancel-btn"
              disabled={busy}
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold rounded border border-[#dedad0] dark:border-[#3b3e48] bg-white dark:bg-[#2c2f38] text-[#5b6478] dark:text-zinc-300 hover:text-[#1c2b45] dark:hover:text-white hover:bg-[#f0eee6] dark:hover:bg-[#3b3e48] transition cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              id="confirm-dialog-confirm-btn"
              type="button"
              disabled={busy}
              onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}
              className={`px-4 py-2 text-xs font-semibold rounded text-white transition shadow-sm cursor-pointer ${
                isDestructive
                  ? 'bg-[#a63b2c] dark:bg-[#993425] hover:bg-[#852a1e] dark:hover:bg-[#852a1e]'
                  : 'bg-[#1c2b45] dark:bg-[#3b3e48] hover:bg-[#132038] dark:hover:bg-[#464956] border dark:border-zinc-500'
              }`}
            >
              {busy ? 'Aguarde…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </ModalLayer>
  );
};
