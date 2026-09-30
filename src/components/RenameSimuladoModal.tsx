import React, { useState, useEffect, useRef } from 'react';
import { Edit3, X, Check } from 'lucide-react';
import { AppTheme } from '../types';

interface RenameSimuladoModalProps {
  isOpen: boolean;
  currentTitle: string;
  onClose: () => void;
  onRename: (newTitle: string) => void;
  theme?: AppTheme;
}

export const RenameSimuladoModal: React.FC<RenameSimuladoModalProps> = ({
  isOpen,
  currentTitle,
  onClose,
  onRename,
  theme = 'clean',
}) => {
  const isNotebook = theme === 'notebook';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`border-2 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scaleUp transition-colors ${
          isNotebook
            ? 'bg-[#fdfbf7] border-[#ded7c6] text-[#1c2b45]'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between border-b ${
            isNotebook
              ? 'bg-[#1c2b45] text-white border-[#1c2b45]'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Edit3 className="w-5 h-5 text-amber-300" />
            <h2 className="font-sans font-bold text-lg text-amber-50">
              Renomear Cartão-Resposta
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div>
            <label
              className={`block text-xs font-mono-code font-semibold uppercase tracking-wider mb-1.5 ${
                isNotebook ? 'text-[#1c2b45]' : 'text-slate-700'
              }`}
            >
              Novo Nome do Cartão-Resposta
            </label>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Digite o novo nome do cartão-resposta"
              className={`w-full px-3.5 py-2.5 border rounded-lg text-sm font-sans font-bold focus:outline-none focus:ring-2 transition ${
                isNotebook
                  ? 'bg-white border-[#ded7c6] text-[#1c2b45] focus:ring-[#1c2b45]'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:ring-slate-900 focus:bg-white'
              }`}
            />
          </div>

          <div
            className={`pt-2 flex items-center justify-end gap-2.5 border-t ${
              isNotebook ? 'border-[#dedad0]' : 'border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-mono-code font-semibold rounded-lg transition cursor-pointer border ${
                isNotebook
                  ? 'text-[#6b6255] hover:text-[#1c2b45] hover:bg-[#f0eee6] border-transparent'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className={`flex items-center gap-1.5 px-5 py-2.5 disabled:opacity-50 text-white text-xs font-mono-code font-semibold rounded-lg shadow-md transition cursor-pointer ${
                isNotebook
                  ? 'bg-[#1c2b45] hover:bg-[#132038]'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
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
