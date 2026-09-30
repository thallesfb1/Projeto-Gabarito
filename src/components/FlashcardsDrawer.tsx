import React, { useState } from 'react';
import { X, RefreshCcw, Sparkles, Brain, Check, ChevronRight } from 'lucide-react';
import { Flashcard, AppTheme } from '../types';

interface FlashcardsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  flashcards: Flashcard[];
  isGenerating: boolean;
  theme?: AppTheme;
}

export const FlashcardsDrawer: React.FC<FlashcardsDrawerProps> = ({
  isOpen,
  onClose,
  flashcards,
  isGenerating,
  theme = 'clean',
}) => {
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  const toggleFlip = (id: string) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isNotebook = theme === 'notebook';
  const isDark = false; // Add dark mode logic if needed in the future

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[400px] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } ${
          isNotebook ? 'bg-[#f4efe3] text-[#1c2b45]' : 'bg-slate-50 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          isNotebook ? 'border-[#dedad0] bg-[#eae6dc]' : 'border-slate-200 bg-white'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${
              isNotebook ? 'bg-[#387652]/10 text-[#387652]' : 'bg-indigo-50 text-indigo-600'
            }`}>
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Revisão Inteligente</h2>
              <p className="text-[10px] opacity-70 font-mono-code uppercase tracking-wider">
                Baseado nos seus erros
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition ${
              isNotebook ? 'hover:bg-[#dedad0]' : 'hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {isGenerating ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <Sparkles className={`w-10 h-10 animate-pulse ${
                isNotebook ? 'text-[#387652]' : 'text-indigo-500'
              }`} />
              <div>
                <h3 className="font-bold text-sm mb-1">Analisando pontos fracos...</h3>
                <p className="text-xs opacity-70 max-w-[250px]">
                  A IA está criando flashcards cirúrgicos com base nas questões que você errou neste simulado.
                </p>
              </div>
            </div>
          ) : flashcards.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isNotebook ? 'bg-[#387652]/10 text-[#387652]' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm mb-1">Nenhum flashcard necessário</h3>
                <p className="text-xs opacity-70 max-w-[250px]">
                  Você não teve erros suficientes, ou a prova não continha informações de matéria/assunto suficientes para a revisão.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-xs opacity-80 text-center px-4">
                Estes flashcards atacam diretamente os conceitos que você precisa reforçar. Clique neles para virar.
              </p>
              
              <div className="space-y-4">
                {flashcards.map((fc) => {
                  const flipped = flippedCards.has(fc.id);
                  return (
                    <div 
                      key={fc.id}
                      className="relative w-full h-[220px] perspective-1000 group cursor-pointer"
                      onClick={() => toggleFlip(fc.id)}
                    >
                      <div className={`w-full h-full duration-500 preserve-3d relative rounded-2xl shadow-sm border ${
                        flipped ? 'rotate-y-180' : ''
                      } ${
                        isNotebook 
                          ? 'border-[#dedad0] shadow-[#dedad0]/50' 
                          : 'border-slate-200 shadow-slate-200'
                      }`}>
                        
                        {/* Front */}
                        <div className={`absolute inset-0 backface-hidden w-full h-full rounded-2xl p-5 flex flex-col items-center justify-center text-center ${
                          isNotebook ? 'bg-white text-[#1c2b45]' : 'bg-white text-slate-800'
                        }`}>
                          <span className={`absolute top-4 left-4 text-[10px] uppercase font-mono-code font-bold px-2 py-1 rounded-md ${
                            isNotebook ? 'bg-[#f4efe3] text-[#5b6478]' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {fc.topic || 'Conceito'}
                          </span>
                          <div className="mt-4 flex-1 flex items-center justify-center">
                            <p className="font-semibold text-sm leading-relaxed">{fc.front}</p>
                          </div>
                          <div className="mt-2 text-[10px] font-mono-code text-slate-400 flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
                            <RefreshCcw className="w-3 h-3" /> Clique para virar
                          </div>
                        </div>

                        {/* Back */}
                        <div className={`absolute inset-0 backface-hidden rotate-y-180 w-full h-full rounded-2xl p-5 flex flex-col items-center justify-center text-center ${
                          isNotebook 
                            ? 'bg-[#387652] text-white border-[#2c5c3e]' 
                            : 'bg-indigo-600 text-white border-indigo-700'
                        }`}>
                          <span className="absolute top-4 left-4 text-[10px] uppercase font-mono-code font-bold px-2 py-1 rounded-md bg-white/20 text-white">
                            Resposta
                          </span>
                          <div className="mt-4 flex-1 flex items-center justify-center overflow-y-auto">
                            <p className="font-medium text-sm leading-relaxed">{fc.back}</p>
                          </div>
                          <div className="mt-2 text-[10px] font-mono-code text-white/60 flex items-center gap-1">
                            <RefreshCcw className="w-3 h-3" /> Virar novamente
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
