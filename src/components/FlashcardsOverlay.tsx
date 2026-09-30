import React, { useState, useEffect } from 'react';
import { X, RefreshCcw, Sparkles, Brain, Check } from 'lucide-react';
import { Flashcard, AppTheme } from '../types';

interface FlashcardsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  flashcards: Flashcard[];
  isGenerating: boolean;
  theme?: AppTheme;
}

export const FlashcardsOverlay: React.FC<FlashcardsOverlayProps> = ({
  isOpen,
  onClose,
  flashcards,
  isGenerating,
  theme = 'clean',
}) => {
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen && !isGenerating && flashcards.length > 0) {
      setAnimateIn(true);
    } else {
      setAnimateIn(false);
      setFlippedCards(new Set());
    }
  }, [isOpen, isGenerating, flashcards.length]);

  if (!isOpen) return null;

  const isNotebook = theme === 'notebook';

  const toggleFlip = (id: string) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-8 backdrop-blur-xl bg-slate-900/70 overflow-hidden transition-all duration-500">
      
      {/* Top Bar / Close Button */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl backdrop-blur-md shadow-lg ${
            isNotebook ? 'bg-[#f4efe3]/90 text-[#387652]' : 'bg-white/90 text-indigo-600'
          }`}>
            <Brain className="w-6 h-6" />
          </div>
          <div className="text-white">
            <h2 className="font-bold text-lg drop-shadow-md">Estudo Ativo</h2>
            <p className="text-xs font-medium opacity-80">Cartas baseadas nos seus erros</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition backdrop-blur-md shadow-lg"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="w-full h-full flex flex-col items-center justify-center pt-16 pb-4 overflow-hidden">
        
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center text-center space-y-6 animate-pulse">
            <div className="relative">
              <Sparkles className="w-16 h-16 text-emerald-400 absolute -top-4 -right-4 animate-ping opacity-50" />
              <Brain className="w-20 h-20 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
            </div>
            <h3 className="font-bold text-2xl text-white drop-shadow-md">Criando Suas Cartas...</h3>
            <p className="text-sm text-white/80 max-w-sm">
              A Inteligência Artificial está analisando as questões que você errou para criar flashcards super focados.
            </p>
          </div>
        ) : flashcards.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl ${
              isNotebook ? 'bg-[#f4efe3] text-[#387652]' : 'bg-white text-emerald-600'
            }`}>
              <Check className="w-10 h-10" />
            </div>
            <h3 className="font-bold text-2xl text-white drop-shadow-md">Nenhum Flashcard!</h3>
            <p className="text-sm text-white/80 max-w-sm">
              Infelizmente não foi possível gerar os flashcards. Pode ser um erro na API ou faltaram dados de texto nas questões.
            </p>
            <button
              onClick={() => {
                const event = new CustomEvent('retry-flashcards');
                window.dispatchEvent(event);
              }}
              className={`mt-4 px-6 py-3 rounded-xl font-bold text-sm shadow-xl transition transform hover:scale-105 ${
                isNotebook ? 'bg-[#387652] text-white hover:bg-[#2c5c3e]' : 'bg-indigo-600 text-white hover:bg-indigo-500'
              }`}
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <div className="w-full h-full flex flex-wrap justify-center items-center content-center gap-4 sm:gap-6 px-4 py-8 max-w-5xl mx-auto">
            {flashcards.map((fc, idx) => {
              const flipped = flippedCards.has(fc.id);
              const delay = idx * 100;
              
              return (
                <div 
                  key={fc.id}
                  className={`relative shrink-0 w-[42vw] sm:w-[200px] md:w-[220px] lg:w-[260px] h-[30vh] sm:h-[280px] md:h-[300px] lg:h-[340px] perspective-1000 group cursor-pointer transition-all duration-700 opacity-0 translate-x-full ${
                    animateIn ? 'animate-deal-card' : ''
                  }`}
                  style={{ animationFillMode: 'forwards', animationDelay: `${delay}ms` }}
                  onClick={() => toggleFlip(fc.id)}
                >
                  <div className={`w-full h-full duration-500 preserve-3d relative rounded-3xl shadow-2xl ${
                    flipped ? 'rotate-y-180' : 'hover:-translate-y-2'
                  }`}>
                    
                    {/* Front: The Question (Stylized Card Cover) */}
                    <div className={`absolute inset-0 backface-hidden w-full h-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between border-2 overflow-hidden ${
                      isNotebook 
                        ? 'bg-[#fcfbf9] text-[#1c2b45] border-[#dedad0] shadow-[inset_0_0_40px_rgba(0,0,0,0.03)]' 
                        : 'bg-white text-slate-800 border-transparent shadow-[0_10px_40px_rgba(0,0,0,0.1)]'
                    }`}>
                      
                      {/* Notebook Binder Holes / Clean Gradient */}
                      {isNotebook && (
                        <div className="absolute left-2 sm:left-3 top-0 bottom-0 flex flex-col justify-between py-6 sm:py-8 opacity-20">
                           <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-slate-800 shadow-inner"></div>
                           <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-slate-800 shadow-inner"></div>
                           <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-slate-800 shadow-inner"></div>
                        </div>
                      )}
                      {!isNotebook && (
                        <div className="absolute top-0 left-0 w-full h-1.5 sm:h-2 bg-gradient-to-r from-indigo-500 to-purple-500" />
                      )}

                      <div className="relative z-10 flex flex-col h-full pl-4 sm:pl-5">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[8px] sm:text-[10px] uppercase font-bold px-2 py-1 rounded-md inline-block ${
                            isNotebook ? 'bg-[#387652]/10 text-[#387652] font-mono-code border border-[#387652]/20' : 'bg-indigo-50 text-indigo-600'
                          }`}>
                            {fc.topic || 'Conceito'}
                          </span>
                          <span className="text-slate-300 font-black text-lg sm:text-xl italic opacity-50 leading-none">0{idx + 1}</span>
                        </div>
                        
                        <div className="flex-1 flex items-center justify-center my-2 overflow-y-auto no-scrollbar">
                          <p className={`font-medium text-xs sm:text-sm text-center leading-snug ${
                            isNotebook ? 'font-serif text-slate-800' : 'text-slate-700'
                          }`}>
                            {fc.front}
                          </p>
                        </div>
                        
                        <div className="text-center mt-auto pt-2 sm:pt-3 border-t border-slate-100">
                          <div className={`inline-flex items-center gap-1.5 sm:gap-2 text-[10px] font-semibold px-3 py-1.5 rounded-full transition-all ${
                            isNotebook ? 'bg-[#387652]/5 text-[#387652]' : 'bg-slate-50 text-slate-500 group-hover:text-indigo-600 group-hover:bg-indigo-50'
                          }`}>
                            <RefreshCcw className="w-3 h-3" /> Virar
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Back: The Answer */}
                    <div className={`absolute inset-0 backface-hidden rotate-y-180 w-full h-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between border-2 ${
                      isNotebook 
                        ? 'bg-[#2c5c3e] text-[#f4efe3] border-[#1e402b] shadow-[inset_0_0_50px_rgba(0,0,0,0.3)]' 
                        : 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-transparent'
                    }`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[8px] sm:text-[10px] uppercase font-bold px-2 py-1 rounded-md inline-block bg-white/20 text-white backdrop-blur-sm">
                          Resposta & Dica
                        </span>
                        <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white/50" />
                      </div>
                      
                      <div className="flex-1 flex items-center justify-center my-2 overflow-y-auto no-scrollbar">
                        <p className={`font-medium text-xs sm:text-sm text-center leading-snug drop-shadow-sm ${
                          isNotebook ? 'font-serif' : ''
                        }`}>
                          {fc.back}
                        </p>
                      </div>
                      
                      <div className="text-center mt-auto pt-2 sm:pt-3 border-t border-white/10">
                        <div className="inline-flex items-center gap-1.5 sm:gap-2 text-[10px] font-semibold px-3 py-1.5 rounded-full text-white/80 bg-white/10 hover:bg-white/20 transition">
                          <RefreshCcw className="w-3 h-3" /> Voltar
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
