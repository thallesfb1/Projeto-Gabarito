import React, { useState, useEffect, useRef } from 'react';
import { Edit3, X, Check } from 'lucide-react';

interface RenameSimuladoModalProps {
  isOpen: boolean;
  currentTitle: string;
  onClose: () => void;
  onRename: (newTitle: string) => void;
}

export const RenameSimuladoModal: React.FC<RenameSimuladoModalProps> = ({
  isOpen,
  currentTitle,
  onClose,
  onRename,
}) => {
  const [title, setTitle] = useState(currentTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, currentTitle]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim();
    if (finalTitle) {
      onRename(finalTitle);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#1c2b45]/60 backdrop-blur-xs animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#fdfbf7] dark:bg-[#22242a] border-2 border-[#1c2b45] dark:border-[#3b3e48] rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="bg-[#1c2b45] dark:bg-[#18191d] text-white px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between border-b dark:border-[#3b3e48]">
          <div className="flex items-center gap-2.5">
            <Edit3 className="w-5 h-5 text-amber-300 dark:text-zinc-300" />
            <h2 className="font-sans font-bold text-lg text-amber-50 dark:text-zinc-100">
              Renomear Cartão-Resposta
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-300 hover:text-white hover:bg-white/10 transition"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-xs font-mono-code font-semibold text-[#1c2b45] dark:text-zinc-300 uppercase tracking-wider mb-1.5">
              Novo Nome do Cartão-Resposta
            </label>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Digite o novo nome do cartão-resposta"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-[#18191d] border border-[#1c2b45] dark:border-[#3b3e48] rounded-lg text-sm text-[#1c2b45] dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#1c2b45] dark:focus:ring-zinc-400 font-sans font-bold text-base"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#dedad0] dark:border-[#3b3e48]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono-code font-semibold text-[#5b6478] dark:text-zinc-400 hover:text-[#1c2b45] dark:hover:text-zinc-200 hover:bg-[#f0eee6] dark:hover:bg-[#2c2f38] rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-[#1c2b45] dark:bg-[#3b3e48] hover:bg-[#132038] dark:hover:bg-[#464956] disabled:opacity-50 text-white text-xs font-mono-code font-semibold rounded-lg shadow-md transition cursor-pointer border dark:border-zinc-500"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Nome</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
