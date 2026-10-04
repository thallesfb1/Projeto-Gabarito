import { ModalLayer } from './ModalLayer';
import React, { useEffect } from 'react';
import { MessageSquare, ExternalLink, CheckCircle2, Sparkles, X, ArrowRight, Award } from 'lucide-react';
import { AppTheme } from '../types';

interface CompletionFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  simuladoTitle: string;
  totalQuestions: number;
  hits: number;
  misses: number;
  keyCount?: number;
  withoutKeyCount?: number;
  feedbackUrl?: string;
  theme?: AppTheme;
}

export const CompletionFeedbackModal: React.FC<CompletionFeedbackModalProps> = ({
  isOpen,
  onClose,
  simuladoTitle,
  totalQuestions,
  hits,
  misses,
  keyCount,
  withoutKeyCount = 0,
  feedbackUrl = 'https://forms.gle/hjRkzSo75nfRcqPd8',
  theme = 'clean',
}) => {
  const isNotebook = theme === 'notebook';
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const evaluatedTotal = keyCount !== undefined && keyCount > 0 ? keyCount : totalQuestions;
  const percentage = evaluatedTotal > 0 ? Math.round((hits / evaluatedTotal) * 100) : 0;
  const isPartialKey = keyCount !== undefined && keyCount < totalQuestions;

  const handleFeedbackClick = () => {
    window.open(feedbackUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <ModalLayer label="Resultado da correção" onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/55 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-popup-title"
      onClick={onClose}
    >
      <div
        className="bg-[#fcfbf9] dark:bg-[#22242a] border-2 border-[#1c2b45] dark:border-[#3b3e48] text-slate-800 dark:text-zinc-100 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scaleUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className="theme-solid dark:bg-[#18191d] text-white px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between relative overflow-hidden border-b dark:border-[#3b3e48]">
          <div className="flex items-center gap-2.5 z-10">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-mono-code uppercase tracking-wider text-amber-300 font-bold block">
                Simulado Concluído
              </span>
              <h2 id="feedback-popup-title" className="text-base font-bold text-white leading-tight">
                100% das Questões Preenchidas!
              </h2>
            </div>
          </div>

          <button
            id="btn-close-feedback-popup"
            type="button"
            onClick={onClose}
            className="text-gray-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer z-10 shrink-0"
            title="Fechar e ver resultado"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Quick Exam Performance Summary Card */}
          <div className="bg-[#f7f5ed] dark:bg-[#18191d] border border-[#dedad0] dark:border-[#3b3e48] rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1 min-w-0">
              <div className="text-xs text-[#5b6478] dark:text-zinc-400 font-mono-code truncate max-w-full">
                {simuladoTitle || 'Simulado Atual'}
              </div>
              <div className="text-sm font-bold text-[#1c2b45] dark:text-zinc-100 flex items-center gap-1.5 flex-wrap">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${isNotebook ? 'text-[#387652]' : 'text-emerald-500'}`} />
                <span>
                  {hits === 1 ? '1 acerto' : `${hits} acertos`} de {isPartialKey ? `${keyCount} com gabarito` : `${totalQuestions} questões`}
                </span>
              </div>
              <div className="text-xs text-[#5b6478] dark:text-zinc-400">
                {misses === 1 ? '1 erro identificado' : `${misses} erros identificados`}
                {isPartialKey && withoutKeyCount > 0 && ` · ${withoutKeyCount} sem gabarito`}
              </div>
            </div>

            {/* Score pill */}
            <div className="text-left sm:text-right shrink-0 bg-white dark:bg-[#2c2f38] border border-[#dedad0] dark:border-[#3b3e48] rounded-xl p-2.5 shadow-2xs self-start sm:self-auto">
              <div className="text-xl font-mono-code font-bold text-[#1c2b45] dark:text-zinc-100 leading-none">
                {percentage}%
              </div>
              <div className="text-[10px] font-mono-code text-[#5b6478] dark:text-zinc-400 mt-0.5">
                {isPartialKey ? 'Das com gabarito' : 'Aproveitamento'}
              </div>
            </div>
          </div>

          {/* Feedback Invitation Message */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-amber-500">
              <MessageSquare className="w-4 h-4 shrink-0" />
              <h3 className="font-bold text-sm text-[#1c2b45] dark:text-zinc-100">
                Ajude a aprimorar o Próximo Acerto
              </h3>
            </div>
            <p className="text-xs text-[#5b6478] dark:text-zinc-300 leading-relaxed">
              Você acabou de finalizar seu simulado completo! Como foi sua experiência preenchendo e corrigindo?
              Seu feedback leva <b>menos de 1 minuto</b> e é indispensável para continuarmos melhorando a ferramenta.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            {/* Primary Action Button */}
            <button
              id="btn-popup-give-feedback"
              type="button"
              onClick={handleFeedbackClick}
              className="w-full py-3 px-4 theme-solid font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm cursor-pointer group"
            >
              <MessageSquare className="w-4 h-4 text-slate-950" />
              <span>Dar Feedback Rápido</span>
              <ExternalLink className="w-4 h-4 text-slate-950/80 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Secondary Action Button */}
            <button
              id="btn-popup-dismiss-feedback"
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-white dark:bg-[#2c2f38] hover:bg-[#f0eee6] dark:hover:bg-[#3b3e48] text-[#1c2b45] dark:text-zinc-200 border border-[#dedad0] dark:border-[#3b3e48] font-semibold rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Ver meu desempenho completo e cartão-resposta</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#5b6478] dark:text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="bg-[#f0eee6] dark:bg-[#18191d] border-t border-[#dedad0] dark:border-[#3b3e48] px-6 py-2.5 text-center text-[11px] text-[#5b6478] dark:text-zinc-400">
          <span>Você também pode acessar o botão de feedback a qualquer momento no menu superior.</span>
        </div>
      </div>
    </ModalLayer>
  );
};
