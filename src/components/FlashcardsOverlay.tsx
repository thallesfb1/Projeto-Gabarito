import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCcw, Sparkles, Brain, Check, ChevronRight } from 'lucide-react';
import { Flashcard, AppTheme } from '../types';

interface FlashcardsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  flashcards: Flashcard[];
  isGenerating: boolean;
  theme?: AppTheme;
  hasStatements?: boolean;
}

export const FlashcardsOverlay: React.FC<FlashcardsOverlayProps> = ({
  isOpen,
  onClose,
  flashcards,
  isGenerating,
  theme = 'clean',
  hasStatements = true,
}) => {
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [animateIn, setAnimateIn] = useState(false);
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0);
  const [swipeAnim, setSwipeAnim] = useState('');
  const touchStartX = useRef<number>(0);

  useEffect(() => {
    if (isOpen && !isGenerating && flashcards.length > 0) {
      setAnimateIn(true);
      setMobileActiveIndex(0);
    } else {
      setAnimateIn(false);
      setFlippedCards(new Set());
      setSwipeAnim('');
    }
  }, [isOpen, isGenerating, flashcards.length]);

  if (!isOpen) return null;

  const isNotebook = theme === 'notebook';

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const toggleFlip = (id: string) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX.current;
    
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) {
        setSwipeAnim('animate-swipe-right');
      } else {
        setSwipeAnim('animate-swipe-left');
      }
      
      setTimeout(() => {
        setMobileActiveIndex((prev) => (prev + 1) % flashcards.length);
        setSwipeAnim('');
        // Optional: unflip the new active card
        setFlippedCards(new Set());
      }, 300);
    }
  };

  const renderCard = (fc: Flashcard, idx: number, isMobileCard = false, mobileLayer = 0) => {
    const flipped = flippedCards.has(fc.id);
    const delay = isMobileCard ? 0 : idx * 100;
    
    // Dynamic classes based on whether it's mobile or desktop
    let cardClasses = `relative shrink-0 perspective-1000 group cursor-pointer transition-all duration-700 opacity-0 ${animateIn ? 'animate-deal-card' : ''}`;
    
    if (isMobileCard) {
       // Mobile sizing: takes almost full width, positioned absolute for stacking
       cardClasses = `absolute top-0 left-0 right-0 bottom-0 m-auto w-[85vw] max-w-[320px] h-[60vh] max-h-[420px] perspective-1000 cursor-pointer transition-all duration-300`;
       
       if (mobileLayer === 0) {
         // Top active card
         cardClasses += ` z-10 ${swipeAnim} ${animateIn && !swipeAnim ? 'opacity-100' : ''}`;
       } else {
         // Card underneath (next in queue)
         cardClasses += ` z-0 scale-95 translate-y-4 opacity-50`;
       }
    } else {
       // Desktop sizing
       cardClasses += ` w-[200px] md:w-[220px] lg:w-[260px] h-[280px] md:h-[300px] lg:h-[340px]`;
    }

    return (
      <div 
        key={`${fc.id}-${isMobileCard ? 'mobile' : 'desktop'}-${mobileLayer}`}
        className={cardClasses}
        style={{ animationFillMode: 'forwards', animationDelay: `${delay}ms` }}
        onClick={() => toggleFlip(fc.id)}
        onTouchStart={isMobileCard && mobileLayer === 0 ? handleTouchStart : undefined}
        onTouchEnd={isMobileCard && mobileLayer === 0 ? handleTouchEnd : undefined}
      >
        <div className={`w-full h-full duration-500 preserve-3d relative rounded-2xl sm:rounded-3xl shadow-2xl ${
          flipped ? 'rotate-y-180' : (isMobileCard ? '' : 'hover:-translate-y-2')
        }`}>
          
          {/* Front: The Question */}
          <div className={`absolute inset-0 backface-hidden w-full h-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between border-2 overflow-hidden ${
            isNotebook 
              ? 'bg-[#fcfbf9] text-[#1c2b45] border-[#dedad0] shadow-[inset_0_0_40px_rgba(0,0,0,0.03)]' 
              : 'bg-white text-slate-800 border-transparent shadow-[0_10px_40px_rgba(0,0,0,0.1)]'
          }`}>
            
            {isNotebook && (
              <>
                <div className="absolute top-0 left-0 w-full h-1.5 sm:h-2 bg-gradient-to-r from-[#e6721d] to-[#6e2802]" />
                <div className="absolute left-2 sm:left-3 top-0 bottom-0 flex flex-col justify-between py-6 sm:py-8 opacity-20">
                   <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-slate-800 shadow-inner"></div>
                   <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-slate-800 shadow-inner"></div>
                   <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-slate-800 shadow-inner"></div>
                </div>
              </>
            )}
            {!isNotebook && (
              <div className="absolute top-0 left-0 w-full h-1.5 sm:h-2 bg-gradient-to-r from-sky-400 to-blue-600" />
            )}

            <div className="relative z-10 flex flex-col h-full pl-4 sm:pl-5">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[8px] sm:text-[10px] uppercase font-bold px-2 py-1 rounded-md inline-block ${
                  isNotebook ? 'bg-[#e6721d]/10 text-[#e6721d] font-mono-code border border-[#e6721d]/20' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  {fc.topic || 'Conceito'}
                </span>
                <span className="text-slate-300 font-black text-lg sm:text-xl italic opacity-50 leading-none">0{idx + 1}</span>
              </div>
              
              <div className="flex-1 flex items-center justify-center my-2 overflow-y-auto no-scrollbar pointer-events-none">
                <p className={`font-medium text-xs sm:text-sm text-center leading-snug ${
                  isNotebook ? 'font-serif text-slate-800' : 'text-slate-700'
                }`}>
                  {fc.front}
                </p>
              </div>
              
              <div className="text-center mt-auto pt-2 sm:pt-3 border-t border-slate-100 flex justify-between items-center">
                <div className={`inline-flex items-center gap-1.5 sm:gap-2 text-[10px] font-semibold px-3 py-1.5 rounded-full transition-all ${
                  isNotebook ? 'bg-[#e6721d]/5 text-[#e6721d]' : 'bg-slate-50 text-slate-500'
                }`}>
                  <RefreshCcw className="w-3 h-3" /> Virar
                </div>
                {isMobileCard && mobileLayer === 0 && (
                  <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400 flex items-center animate-pulse">
                    Deslize <ChevronRight className="w-3 h-3 ml-1" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Back: The Answer */}
          <div className={`absolute inset-0 backface-hidden rotate-y-180 w-full h-full rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col justify-between border-2 ${
            isNotebook 
              ? 'bg-gradient-to-br from-[#ad4705] to-[#6e2802] text-[#f4efe3] border-[#6e2802] shadow-[inset_0_0_50px_rgba(0,0,0,0.3)]' 
              : 'bg-gradient-to-br from-blue-600 to-sky-700 text-white border-transparent'
          }`}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-[8px] sm:text-[10px] uppercase font-bold px-2 py-1 rounded-md inline-block bg-white/20 text-white backdrop-blur-sm">
                Resposta & Dica
              </span>
              <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-white/50" />
            </div>
            
            <div className="flex-1 flex items-center justify-center my-2 overflow-y-auto no-scrollbar pointer-events-none">
              <p className={`font-medium text-xs sm:text-sm text-center leading-snug drop-shadow-sm ${
                isNotebook ? 'font-serif' : ''
              }`}>
                {fc.back}
              </p>
            </div>
            
            <div className="text-center mt-auto pt-2 sm:pt-3 border-t border-white/10 flex justify-between items-center">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 text-[10px] font-semibold px-3 py-1.5 rounded-full text-white/80 bg-white/10">
                <RefreshCcw className="w-3 h-3" /> Voltar
              </div>
              {isMobileCard && mobileLayer === 0 && (
                <div className="text-[9px] uppercase tracking-wider font-bold text-white/50 flex items-center animate-pulse">
                  Deslize <ChevronRight className="w-3 h-3 ml-1" />
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div onClick={handleBackgroundClick} className="fixed inset-0 z-[100] flex flex-col p-4 sm:p-8 backdrop-blur-xl bg-slate-900/70 overflow-hidden transition-all duration-500">
      
      {/* Top Bar / Close Button */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50 pointer-events-none">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl backdrop-blur-md shadow-lg pointer-events-auto ${
            isNotebook ? 'bg-[#f4efe3]/90 text-[#e6721d]' : 'bg-white/90 text-indigo-600'
          }`}>
            <Brain className="w-6 h-6" />
          </div>
          <div className="text-white pointer-events-auto">
            <h2 className="font-bold text-lg drop-shadow-md">Estudo Ativo</h2>
            <p className="text-xs font-medium opacity-80">Cartas baseadas nos seus erros</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition backdrop-blur-md shadow-lg pointer-events-auto"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content (Perfectly Centered) */}
      <div onClick={handleBackgroundClick} className="w-full h-full flex flex-col items-center justify-center pt-8">
        
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
            {!hasStatements ? (
              <>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl ${
                  isNotebook ? 'bg-[#f4efe3] text-[#e6721d]' : 'bg-white text-indigo-600'
                }`}>
                  <Brain className="w-10 h-10" />
                </div>
                <h3 className="font-bold text-2xl text-white drop-shadow-md">Prova Manual</h3>
                <p className="text-sm text-white/90 max-w-sm font-medium">
                  Para criar flashcards dos seus erros com Inteligência Artificial, adicione o caderno de questões (PDF) desta prova.
                </p>
                <button
                  onClick={onClose}
                  className={`mt-4 px-6 py-3 rounded-xl font-bold text-sm shadow-xl transition transform hover:scale-105 ${
                    isNotebook ? 'bg-[#e6721d] text-white hover:bg-[#cd5c08]' : 'bg-indigo-600 text-white hover:bg-indigo-500'
                  }`}
                >
                  Entendi
                </button>
              </>
            ) : (
              <>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl ${
                  isNotebook ? 'bg-[#f4efe3] text-[#e6721d]' : 'bg-white text-emerald-600'
                }`}>
                  <Check className="w-10 h-10" />
                </div>
                <h3 className="font-bold text-2xl text-white drop-shadow-md">Nenhum Flashcard!</h3>
                <p className="text-sm text-white/80 max-w-sm">
                  Infelizmente não foi possível gerar os flashcards.
                </p>
                <button
                  onClick={() => {
                    const event = new CustomEvent('retry-flashcards');
                    window.dispatchEvent(event);
                  }}
                  className={`mt-4 px-6 py-3 rounded-xl font-bold text-sm shadow-xl transition transform hover:scale-105 ${
                    isNotebook ? 'bg-[#e6721d] text-white hover:bg-[#cd5c08] shadow-sm' : 'bg-indigo-600 text-white hover:bg-indigo-500'
                  }`}
                >
                  Tentar Novamente
                </button>
              </>
            )}
          </div>
        ) : (
          <div onClick={handleBackgroundClick} className="w-full max-w-[900px] mx-auto flex items-center justify-center h-full">
            
            {/* Desktop View: Grid (hidden on mobile) */}
            <div onClick={handleBackgroundClick} className="hidden md:flex w-full h-full flex-wrap justify-center items-center content-center gap-4 lg:gap-6 mx-auto">
              {flashcards.map((fc, idx) => renderCard(fc, idx, false))}
            </div>

            {/* Mobile View: Swipeable Deck (hidden on desktop) */}
            <div onClick={handleBackgroundClick} className="flex md:hidden relative w-full h-[60vh] items-center justify-center perspective-1000">
              {flashcards.length > 1 && renderCard(flashcards[(mobileActiveIndex + 1) % flashcards.length], (mobileActiveIndex + 1) % flashcards.length, true, 1)}
              {renderCard(flashcards[mobileActiveIndex], mobileActiveIndex, true, 0)}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
