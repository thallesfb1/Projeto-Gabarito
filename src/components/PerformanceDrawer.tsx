import React, { useEffect } from 'react';
import {
  X,
  TrendingUp,
  Download,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Bookmark,
  Scale,
  Calendar,
  Layers,
  Award,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { AppTheme, ExamType } from '../types';
import { ChartSessionPoint } from '../utils/sessionManager';
import { PerformanceOverview } from './PerformanceOverview';

interface PerformanceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChartSessionPoint[];
  simuladoTitle: string;
  hits: number;
  misses: number;
  blanks: number;
  total: number;
  keyCount?: number;
  withoutKeyCount?: number;
  flaggedCount?: number;
  netScore?: number;
  examType?: ExamType;
  theme?: AppTheme;
  onDownloadReport?: () => void;
}

export const PerformanceDrawer: React.FC<PerformanceDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  simuladoTitle,
  hits,
  misses,
  blanks,
  total,
  keyCount = total,
  withoutKeyCount = 0,
  flaggedCount = 0,
  netScore,
  examType = 'multiple_choice',
  theme = 'clean',
  onDownloadReport,
}) => {
  const isNotebook = theme === 'notebook';
  const isTF = examType === 'true_false';

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const evaluatedTotal = keyCount > 0 ? keyCount : total;
  const pctNum = evaluatedTotal > 0 ? (hits / evaluatedTotal) * 100 : 0;
  const percentage = pctNum.toFixed(1);
  const currentRatio = misses > 0 ? (hits / misses).toFixed(2) : hits > 0 ? `${hits}.0` : '0.0';
  const computedNet = netScore !== undefined ? netScore : hits - misses;

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
        aria-label="Fechar painel de gráficos"
      />

      {/* Slide-over Drawer Container */}
      <div
        className={`relative z-50 w-full sm:w-[580px] md:w-[680px] lg:w-[760px] h-full flex flex-col shadow-2xl overflow-hidden transition-all duration-300 border-l ${
          isNotebook
            ? 'bg-[#fdfbf7] text-[#1c2b45] border-[#ded7c6]'
            : 'bg-white text-slate-900 border-slate-200'
        }`}
      >
        {/* Drawer Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between shrink-0 select-none ${
            isNotebook ? 'bg-[#f7f2e5] border-[#ded7c6]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                isNotebook ? 'bg-[#ede6d5] text-[#1c2b45]' : 'bg-emerald-600 text-white'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold font-serif-title truncate">
                  Gráficos de Desempenho & Evolução
                </h3>
                <span
                  className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full border ${
                    isNotebook
                      ? 'bg-[#eef6f0] text-[#1e4e30] border-[#c2ddc6]'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  Últimas 5 Sessões
                </span>
              </div>
              <p
                className={`text-xs truncate font-mono-code mt-0.5 ${
                  isNotebook ? 'text-[#7d7465]' : 'text-slate-500'
                }`}
                title={simuladoTitle}
              >
                Cartão-resposta: <span className="font-semibold text-current">{simuladoTitle}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl transition cursor-pointer flex items-center gap-1 text-xs font-mono-code ${
                isNotebook
                  ? 'hover:bg-[#eae3d2] text-[#6b6255]'
                  : 'hover:bg-slate-200 text-slate-500'
              }`}
              title="Fechar painel (Esc)"
            >
              <span className="hidden sm:inline text-[11px] opacity-70">Esc</span>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Current Exam Highlight Banner */}
          <div
            className={`rounded-2xl p-4 border transition-colors ${
              isNotebook
                ? 'bg-[#fcfaf4] border-[#ded7c6]'
                : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-3 border-b pb-2 border-current/10">
              <span
                className={`text-xs font-mono-code uppercase tracking-wider font-semibold ${
                  isNotebook ? 'text-[#7d7465]' : 'text-slate-300'
                }`}
              >
                Resultado Deste Simulado
              </span>
              <span
                className={`text-xs font-mono-code px-2 py-0.5 rounded-full ${
                  isNotebook
                    ? 'bg-[#eef6f0] text-[#1e4e30] border border-[#c2ddc6] font-bold'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                }`}
              >
                {percentage}% de Aproveitamento
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                className={`p-2.5 rounded-xl border ${
                  isNotebook
                    ? 'bg-[#edf5ee] border-[#c2ddc6]'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] font-medium opacity-80">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Acertos</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1 font-mono-code">
                  <span className="text-xl sm:text-2xl font-bold text-emerald-500">{hits}</span>
                  <span className="text-xs opacity-70">/{evaluatedTotal}</span>
                </div>
              </div>

              <div
                className={`p-2.5 rounded-xl border ${
                  isNotebook
                    ? 'bg-[#faf0ee] border-[#eed1cb]'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] font-medium opacity-80">
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                  <span>Erros</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1 font-mono-code">
                  <span className="text-xl sm:text-2xl font-bold text-red-400">{misses}</span>
                  <span className="text-xs opacity-70">/{evaluatedTotal}</span>
                </div>
              </div>

              <div
                className={`p-2.5 rounded-xl border ${
                  isNotebook
                    ? 'bg-[#f8f5ec] border-[#dfd7c5]'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] font-medium opacity-80">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                  <span>Razão Acerto/Erro</span>
                </div>
                <div className="mt-1 flex items-baseline gap-1 font-mono-code">
                  <span className="text-xl sm:text-2xl font-bold text-blue-400">{currentRatio}x</span>
                  <span className="text-[10px] opacity-70">acertos p/ erro</span>
                </div>
              </div>

              <div
                className={`p-2.5 rounded-xl border ${
                  isNotebook
                    ? 'bg-[#fcf6e8] border-[#ebd7b0]'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px] font-medium opacity-80">
                  {isTF ? (
                    <>
                      <Scale className="w-3.5 h-3.5 text-amber-400" />
                      <span>Líquida Cebraspe</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                      <span>Dúvidas Marcadas</span>
                    </>
                  )}
                </div>
                <div className="mt-1 flex items-baseline gap-1 font-mono-code">
                  <span className="text-xl sm:text-2xl font-bold text-amber-400">
                    {isTF ? (computedNet > 0 ? `+${computedNet}` : computedNet) : flaggedCount}
                  </span>
                  <span className="text-xs opacity-70">{isTF ? 'pts' : 'itens'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recharts Performance Curve (Line Chart) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs uppercase font-mono-code font-bold tracking-wider text-slate-500">
                Gráfico de Evolução Contínua
              </h4>
              <span className="text-[11px] font-mono-code text-slate-500">
                Alterne entre % taxas e razão de acertos
              </span>
            </div>

            <PerformanceOverview
              sessions={sessions}
              theme={theme}
              currentHits={hits}
              currentMisses={misses}
              currentTotal={total}
            />
          </div>

          {/* Detailed Historical Sessions Breakdown */}
          {sessions.length > 0 && (
            <div
              className={`rounded-xl p-4 border space-y-3 ${
                isNotebook ? 'bg-[#f8f5ec] border-[#dfd7c5]' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-600" />
                  <h4 className="text-xs sm:text-sm font-bold tracking-tight">
                    Detalhamento das Últimas {sessions.length} Sessões
                  </h4>
                </div>
                <span className="text-[10px] font-mono-code text-slate-500">
                  Ordem cronológica
                </span>
              </div>

              <div className="divide-y divide-current/10">
                {sessions.map((s, idx) => (
                  <div
                    key={s.id || idx}
                    className={`py-2.5 flex items-center justify-between gap-3 text-xs font-mono-code ${
                      s.isCurrent ? 'font-semibold' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          s.isCurrent
                            ? isNotebook
                              ? 'bg-[#1c2b45] text-white'
                              : 'bg-emerald-600 text-white'
                            : isNotebook
                            ? 'bg-[#ede6d5] text-[#1c2b45]'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {s.shortName || `S${idx + 1}`}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate max-w-[180px] sm:max-w-[280px]" title={s.title}>
                            {s.title}
                          </p>
                          {s.isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Atual
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500">{s.date}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right">
                      <div>
                        <span className="font-bold text-emerald-600">{s.hitRatio}%</span>
                        <span className="text-[10px] text-slate-400 ml-1">({s.hits} acertos)</span>
                      </div>
                      <div className="hidden sm:block">
                        <span className="text-slate-500 text-[11px] font-mono-code">
                          {s.ratio}x razão
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pedagogical Insights Card */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
              isNotebook ? 'bg-[#fdfaf4] border-[#ded7c6]' : 'bg-emerald-50/60 border-emerald-200'
            }`}
          >
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-emerald-900 block">
                Dica Estratégica de Preparação
              </span>
              <p className="text-slate-700 leading-relaxed">
                {pctNum >= 80 ? (
                  <>
                    Seu aproveitamento de <b>{percentage}%</b> demonstra excelente maturidade no conteúdo. Mantenha a consistência e revise as questões erradas para blindar os pontos cegos.
                  </>
                ) : pctNum >= 60 ? (
                  <>
                    Com <b>{percentage}%</b> de acertos, você está na faixa de consolidação. Analise as questões sinalizadas como dúvida e erros para subir à faixa de 80%+.
                  </>
                ) : (
                  <>
                    Aproveitamento de <b>{percentage}%</b>. Identifique se os erros ocorreram por falta de domínio da matéria ou pegadinhas no enunciado antes de avançar.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div
          className={`p-4 border-t flex items-center justify-between gap-3 shrink-0 ${
            isNotebook ? 'bg-[#f7f2e5] border-[#ded7c6]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {onDownloadReport ? (
            <button
              type="button"
              onClick={onDownloadReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Salvar Espelho (.txt)</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
              isNotebook
                ? 'bg-[#1c2b45] text-white hover:bg-[#2c3d5a]'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            Voltar ao Cartão-Resposta
          </button>
        </div>
      </div>
    </div>
  );
};
