import React from 'react';
import {
  CheckCircle,
  XCircle,
  HelpCircle,
  Bookmark,
  Upload,
  RotateCcw,
  Unlock,
  AlertTriangle,
  Scale,
} from 'lucide-react';
import { ExamType, FilterMode, AppTheme } from '../types';
import { getPerformanceInfo } from '../utils/parser';

interface ScorePanelProps {
  total: number;
  hits: number;
  misses: number;
  blanks: number;
  flaggedCount: number;
  keyCount?: number;
  withoutKeyCount?: number;
  filterMode: FilterMode;
  onFilterChange: (mode: FilterMode) => void;
  onExitCorrection: () => void;
  onDownloadReport: () => void;
  isLocked?: boolean;
  isResultOutdated?: boolean;
  onUnlockRequest?: () => void;
  onRunCorrection?: () => void;
  examType?: ExamType;
  netScore?: number;
  theme?: AppTheme;
}

export const ScorePanel: React.FC<ScorePanelProps> = ({
  total,
  hits,
  misses,
  blanks,
  flaggedCount,
  keyCount = total,
  withoutKeyCount = 0,
  filterMode,
  onFilterChange,
  onExitCorrection,
  onDownloadReport,
  isLocked = false,
  isResultOutdated = false,
  onUnlockRequest,
  onRunCorrection,
  examType = 'multiple_choice',
  netScore,
  theme = 'clean',
}) => {
  const isNotebook = theme === 'notebook';
  const isDark = theme === 'dark';
  const isTF = examType === 'true_false';
  const evaluatedTotal = keyCount > 0 ? keyCount : total;
  const pctNum = evaluatedTotal > 0 ? (hits / evaluatedTotal) * 100 : 0;
  const percentage = pctNum.toFixed(1);
  const isPartialKey = keyCount < total;

  // Cebraspe net score
  const computedNet = netScore !== undefined ? netScore : hits - misses;

  // Performance classification via centralized helper
  const perf = getPerformanceInfo(hits, evaluatedTotal, examType, computedNet);
  const badge = {
    label: perf.label,
    color: isDark ? perf.badgeClassDark : isNotebook ? perf.badgeClassNotebook : perf.badgeClass,
  };

  return (
    <div className={`rounded-2xl p-4 sm:p-5 mb-5 shadow-xs space-y-4 border transition-colors ${
      isNotebook ? 'bg-[#fcfaf4] border-[#ded7c6]' : isDark ? 'bg-[#22242a] border-[#3b3e48] text-zinc-100' : 'bg-white border-slate-200'
    }`}>
      {/* Cebraspe V/F Prominent Completion Status Banner with Harmonized Colors */}
      {isTF && (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs transition-colors ${
          perf.tier === 'low'
            ? isDark
              ? 'bg-rose-950/25 border-rose-500/30 text-rose-200'
              : 'bg-red-50/95 border-red-300 text-red-950'
            : perf.tier === 'medium'
            ? isDark
              ? 'bg-amber-950/30 border-amber-600/40 text-amber-200'
              : 'bg-amber-50/95 border-amber-300 text-amber-950'
            : isDark
            ? 'bg-emerald-950/30 border-emerald-600/40 text-emerald-200'
            : 'bg-emerald-50/95 border-emerald-300 text-emerald-950'
        }`}>
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2 rounded-xl shrink-0 ${
              perf.tier === 'low'
                ? isDark ? 'bg-rose-900/40 text-rose-300 border border-rose-500/40' : 'bg-red-100 text-red-700 border border-red-200'
                : perf.tier === 'medium'
                ? isDark ? 'bg-amber-900/40 text-amber-300 border border-amber-500/40' : 'bg-amber-100 text-amber-800 border border-amber-200'
                : isDark ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/40' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}>
              {perf.tier === 'low' ? (
                <XCircle className="w-5 h-5" />
              ) : perf.tier === 'medium' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[11px] font-mono-code font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                  perf.tier === 'low'
                    ? isDark ? 'bg-rose-900/40 text-rose-200 border-rose-500/40' : 'bg-red-200/90 text-red-900 border-red-300'
                    : perf.tier === 'medium'
                    ? isDark ? 'bg-amber-900/40 text-amber-200 border-amber-500/40' : 'bg-amber-200/90 text-amber-950 border-amber-300'
                    : isDark ? 'bg-emerald-900/40 text-emerald-200 border-emerald-500/40' : 'bg-emerald-200/90 text-emerald-950 border-emerald-300'
                }`}>
                  {perf.statusLabel} · {perf.tier === 'low' ? 'Abaixo da Média' : perf.tier === 'medium' ? 'Desempenho Regular' : 'Alto Desempenho'}
                </span>
                <span className="font-mono-code text-xs font-semibold">
                  Nota Líquida: <b>{computedNet > 0 ? `+${computedNet}` : computedNet} pts</b> ({hits} acertos, {misses} erros)
                </span>
              </div>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {perf.tier === 'low'
                  ? `Atenção: no método Cebraspe (uma errada anula uma certa), sua pontuação líquida está ${computedNet <= 0 ? 'zerada ou negativa' : 'baixa'}. Recomendamos revisar os ${misses} erros cometidos.`
                  : perf.tier === 'medium'
                  ? `Desempenho regular: você obteve ${percentage}% de acertos brutos, mas os ${misses} erros descontaram ${misses} pontos da sua nota líquida final. Revise os itens errados e as questões com dúvida.`
                  : `Excelente aproveitamento no formato Cebraspe! Alta proporção de acertos e baixa penalidade por erros.`}
              </p>
            </div>
          </div>

          {/* Quick Filter Pill for Flagged / Review Items */}
          {flaggedCount > 0 && (
            <button
              type="button"
              onClick={() => onFilterChange('flagged')}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                filterMode === 'flagged'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : isDark
                  ? 'bg-[#2a2c34] hover:bg-[#343740] text-amber-300 border-amber-500/40 shadow-2xs'
                  : 'bg-white/90 hover:bg-white text-amber-950 border-amber-300 hover:border-amber-400 shadow-2xs'
              }`}
              title="Filtrar questões marcadas para revisão"
            >
              <Bookmark className="w-3.5 h-3.5 fill-current text-amber-400" />
              <span>{flaggedCount} {flaggedCount === 1 ? 'item a revisar' : 'itens a revisar'}</span>
            </button>
          )}
        </div>
      )}

      {/* Banner if answers were modified after unlocking */}
      {isResultOutdated && (
        <div className={`p-3 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          isDark ? 'bg-amber-950/30 border-amber-600/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-950'
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs font-semibold">
              Respostas alteradas — corrija novamente para recalcular o resultado exato.
            </span>
          </div>
          {onRunCorrection && (
            <button
              type="button"
              onClick={onRunCorrection}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg shadow-2xs transition shrink-0 cursor-pointer ${
                isDark ? 'theme-solid hover:bg-white text-zinc-900 font-bold' : 'theme-solid text-white hover:bg-slate-800'
              }`}
            >
              Recalcular Agora
            </button>
          )}
        </div>
      )}

      {/* Partial key notice */}
      {isPartialKey && !isResultOutdated && (
        <div className={`p-2.5 border rounded-xl text-xs flex items-center justify-between gap-2 flex-wrap ${
          isDark
            ? 'bg-amber-950/25 border-amber-600/30 text-amber-200'
            : 'bg-amber-50/70 border-amber-200 text-amber-950'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-[10px] px-1.5 py-0.5 rounded uppercase font-mono-code ${
              isDark ? 'bg-amber-900/50 text-amber-200 border border-amber-600/40' : 'bg-amber-200 text-amber-900'
            }`}>
              Gabarito Parcial
            </span>
            <span>
              <b>{keyCount} de {total} questões</b> possuem gabarito cadastrado. As {withoutKeyCount} sem gabarito não contam como erro.
            </span>
          </div>
          <span className={`font-mono-code text-[11px] ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
            Base: {keyCount} {keyCount === 1 ? 'questão' : 'questões'}
          </span>
        </div>
      )}

      {/* Executive Summary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {/* Metric 1: Aproveitamento */}
        <div className={`col-span-2 sm:col-span-1 rounded-xl p-3 flex flex-col justify-between border transition-colors ${
          isTF
            ? perf.tier === 'low'
              ? isDark ? 'bg-rose-950/25 border-rose-500/30' : 'bg-red-50/60 border-red-200'
              : perf.tier === 'medium'
              ? isDark ? 'bg-amber-950/25 border-amber-500/30' : 'bg-amber-50/60 border-amber-200'
              : isDark ? 'bg-emerald-950/25 border-emerald-500/30' : 'bg-emerald-50/60 border-emerald-200'
            : isDark
            ? 'bg-[#18191d] border-[#3b3e48]'
            : isNotebook
            ? 'bg-white border-[#ded7c6]'
            : 'bg-slate-50 border-slate-200/80'
        }`}>
          <span className={`text-[11px] font-medium uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Aproveitamento
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-2xl sm:text-3xl font-bold font-mono-code tabular-nums ${
              isTF
                ? perf.tier === 'low'
                  ? isDark ? 'text-rose-200' : 'text-red-950'
                  : perf.tier === 'medium'
                  ? isDark ? 'text-amber-200' : 'text-amber-950'
                  : isDark ? 'text-emerald-200' : 'text-emerald-950'
                : isDark ? 'text-zinc-100' : 'text-slate-900'
            }`}>
              {percentage}%
            </span>
          </div>
          <span className={`mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded border inline-block w-fit ${badge.color}`}>
            {badge.label}
          </span>
        </div>

        {/* Metric 2: Acertos */}
        <div className={`rounded-xl p-3 flex flex-col justify-between border ${
          isDark
            ? 'bg-emerald-950/25 border-emerald-500/30'
            : isNotebook
            ? 'bg-[#f0f6f1] border-[#cbe1d0]'
            : 'bg-emerald-50/60 border-emerald-200'
        }`}>
          <span className={`text-[11px] font-medium uppercase tracking-wider flex items-center gap-1 ${
            isDark ? 'text-emerald-400' : isNotebook ? 'text-[#245638]' : 'text-emerald-800'
          }`}>
            <CheckCircle className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : isNotebook ? 'text-[#387652]' : 'text-emerald-600'}`} />
            <span>Acertos</span>
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`text-2xl sm:text-3xl font-bold font-mono-code tabular-nums ${
              isDark ? 'text-emerald-200' : isNotebook ? 'text-[#163824]' : 'text-emerald-950'
            }`}>
              {hits}
            </span>
            <span className={`text-xs font-mono-code ${isDark ? 'text-emerald-400' : isNotebook ? 'text-[#306644]' : 'text-emerald-700'}`}>
              /{isPartialKey ? keyCount : total}
            </span>
          </div>
          <span className={`text-[10px] font-mono-code ${isDark ? 'text-emerald-400/80' : isNotebook ? 'text-[#306644]/90' : 'text-emerald-700/80'}`}>
            {total > 0 ? ((hits / total) * 100).toFixed(0) : 0}% da prova
          </span>
        </div>

        {/* Metric 3: Erros */}
        <div className={`rounded-xl p-3 flex flex-col justify-between border ${
          isDark
            ? 'bg-rose-950/25 border-rose-500/30'
            : isNotebook
            ? 'bg-[#faf1ed] border-[#ecd2cc]'
            : 'bg-red-50/60 border-red-200'
        }`}>
          <span className={`text-[11px] font-medium uppercase tracking-wider flex items-center gap-1 ${
            isDark ? 'text-rose-300' : isNotebook ? 'text-[#862d26]' : 'text-red-800'
          }`}>
            <XCircle className={`w-3.5 h-3.5 ${isDark ? 'text-rose-300' : isNotebook ? 'text-[#b54a42]' : 'text-red-600'}`} />
            <span>Erros</span>
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`text-2xl sm:text-3xl font-bold font-mono-code tabular-nums ${
              isDark ? 'text-rose-200' : isNotebook ? 'text-[#581611]' : 'text-red-950'
            }`}>
              {misses}
            </span>
            <span className={`text-xs font-mono-code ${isDark ? 'text-rose-300' : isNotebook ? 'text-[#862d26]' : 'text-red-700'}`}>
              /{isPartialKey ? keyCount : total}
            </span>
          </div>
          <span className={`text-[10px] font-mono-code ${isDark ? 'text-rose-300/80' : isNotebook ? 'text-[#862d26]/90' : 'text-red-700/80'}`}>
            {isTF ? `-${misses} pts na líquida` : `${total > 0 ? ((misses / total) * 100).toFixed(0) : 0}% da prova`}
          </span>
        </div>

        {/* Metric 4: Em Branco */}
        <div className={`rounded-xl p-3 flex flex-col justify-between border ${
          isDark ? 'bg-[#18191d] border-[#3b3e48]' : 'bg-slate-50 border-slate-200/80'
        }`}>
          <span className={`text-[11px] font-medium uppercase tracking-wider flex items-center gap-1 ${
            isDark ? 'text-zinc-400' : 'text-slate-600'
          }`}>
            <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
            <span>Em Branco</span>
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`text-2xl sm:text-3xl font-bold font-mono-code tabular-nums ${
              isDark ? 'text-zinc-100' : 'text-slate-900'
            }`}>
              {blanks}
            </span>
            <span className={`text-xs font-mono-code ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>/{total}</span>
          </div>
          <span className={`text-[10px] font-mono-code ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            {isTF ? '0 pt (sem penalidade)' : 'Sem penalidade'}
          </span>
        </div>

        {/* Metric 5: Pontuação Cebraspe (ou Revisões) */}
        {isTF ? (
          <div className={`col-span-2 sm:col-span-4 lg:col-span-1 rounded-xl p-3 flex flex-col justify-between border transition-all ${
            perf.tier === 'low'
              ? isDark ? 'bg-rose-950/25 border-rose-500/30 text-rose-200' : 'bg-red-50/90 border-red-300 text-red-950 ring-1 ring-red-400/20'
              : perf.tier === 'medium'
              ? isDark ? 'bg-amber-950/25 border-amber-500/30 text-amber-200' : 'bg-amber-50/90 border-amber-300 text-amber-950 ring-1 ring-amber-400/20'
              : isDark ? 'bg-emerald-950/25 border-emerald-500/30 text-emerald-200' : 'bg-emerald-50/90 border-emerald-300 text-emerald-950 ring-1 ring-emerald-400/20'
          }`}>
            <span className={`text-[11px] font-medium uppercase tracking-wider flex items-center gap-1 ${
              perf.tier === 'low'
                ? isDark ? 'text-rose-300' : 'text-red-900'
                : perf.tier === 'medium'
                ? isDark ? 'text-amber-300' : 'text-amber-900'
                : isDark ? 'text-emerald-300' : 'text-emerald-900'
            }`}>
              <Scale className="w-3.5 h-3.5" />
              <span>Líquida Cebraspe</span>
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={`text-2xl sm:text-3xl font-bold font-mono-code tabular-nums ${
                perf.tier === 'low'
                  ? isDark ? 'text-rose-300' : 'text-red-700'
                  : perf.tier === 'medium'
                  ? isDark ? 'text-amber-300' : 'text-amber-800'
                  : isDark ? 'text-emerald-300' : 'text-emerald-700'
              }`}>
                {computedNet > 0 ? `+${computedNet}` : computedNet}
              </span>
              <span className="text-xs font-mono-code opacity-80">pts</span>
            </div>
            <span className="text-[10px] font-mono-code opacity-80">
              {hits} acertos - {misses} erros
            </span>
          </div>
        ) : (
          <div className={`col-span-2 sm:col-span-4 lg:col-span-1 rounded-xl p-3 flex flex-col justify-between border ${
            isDark ? 'bg-[#18191d] border-[#3b3e48]' : 'bg-slate-50 border-slate-200/80'
          }`}>
            <span className={`text-[11px] font-medium uppercase tracking-wider flex items-center gap-1 ${
              isDark ? 'text-zinc-400' : 'text-slate-600'
            }`}>
              <Bookmark className="w-3.5 h-3.5 text-amber-500" />
              <span>Dúvidas Marcadas</span>
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={`text-2xl sm:text-3xl font-bold font-mono-code tabular-nums ${
                isDark ? 'text-zinc-100' : 'text-slate-900'
              }`}>
                {flaggedCount}
              </span>
              <span className={`text-xs font-mono-code ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>itens</span>
            </div>
            <span className={`text-[10px] font-mono-code ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              Sinalizadas com bandeira
            </span>
          </div>
        )}
      </div>

      {/* Filter Tabs & Primary Actions Strip */}
      <div className={`pt-2 border-t flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
        isNotebook ? 'border-[#ded7c6]' : isDark ? 'border-[#3b3e48]' : 'border-slate-200'
      }`}>
        {/* Clean Segmented Filter Controls */}
        <div className={`flex items-center gap-1 p-1 rounded-xl flex-wrap ${
          isNotebook
            ? 'bg-[#ede7d8] border border-[#ded7c6]'
            : isDark
            ? 'bg-[#18191d] border border-[#3b3e48]'
            : 'bg-slate-100'
        }`}>
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              filterMode === 'all'
                ? isDark
                  ? 'bg-[#2a2c34] text-zinc-100 shadow-2xs font-semibold'
                  : 'bg-white text-slate-900 shadow-2xs font-semibold'
                : isDark
                ? 'text-zinc-400 hover:text-zinc-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({total})
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('errors')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              filterMode === 'errors'
                ? isNotebook
                  ? 'bg-[#b54a42] text-white shadow-2xs font-semibold'
                  : isDark
                  ? 'bg-[#e05d68] text-white shadow-2xs font-semibold'
                  : 'bg-red-600 text-white shadow-2xs font-semibold'
                : isNotebook
                ? 'text-[#862d26] hover:bg-[#faf1ed]'
                : isDark
                ? 'text-rose-300 hover:bg-rose-950/30'
                : 'text-red-700 hover:bg-red-50'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Erros ({misses})</span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange('correct')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              filterMode === 'correct'
                ? isNotebook
                  ? 'bg-[#387652] text-white shadow-2xs font-semibold'
                  : 'bg-emerald-700 text-white shadow-2xs font-semibold'
                : isNotebook
                ? 'text-[#245638] hover:bg-[#edf5ee]'
                : isDark
                ? 'text-emerald-400 hover:bg-emerald-950/40'
                : 'text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Acertos ({hits})</span>
          </button>

          {blanks > 0 && (
            <button
              type="button"
              onClick={() => onFilterChange('blank')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                filterMode === 'blank'
                  ? isDark
                    ? 'bg-[#3b3e48] text-zinc-100 shadow-2xs font-semibold'
                    : 'bg-slate-800 text-white shadow-2xs font-semibold'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Em branco ({blanks})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onFilterChange('flagged')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
              filterMode === 'flagged'
                ? 'bg-amber-600 text-white shadow-2xs font-semibold'
                : isDark
                ? 'text-amber-400 hover:bg-amber-950/40'
                : 'text-amber-800 hover:bg-amber-50'
            }`}
            title="Filtrar questões marcadas para revisão"
          >
            <Bookmark className={`w-3.5 h-3.5 ${filterMode === 'flagged' ? 'fill-current' : ''}`} />
            <span>Revisão ({flaggedCount})</span>
          </button>
        </div>

        {/* Action buttons on the right */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onDownloadReport}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition shadow-2xs cursor-pointer ${
              isDark
                ? 'theme-solid hover:bg-white text-zinc-950 font-bold'
                : 'theme-solid text-white hover:bg-slate-800'
            }`}
            title="Baixar espelho de respostas e relatório (.txt)"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Salvar Espelho (.txt)</span>
          </button>

          {isLocked && onUnlockRequest ? (
            <button
              id="btn-score-unlock"
              type="button"
              onClick={onUnlockRequest}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition shadow-2xs cursor-pointer ${
                isDark
                  ? 'border-amber-500/40 bg-amber-950/30 text-amber-200 hover:bg-amber-900/40'
                  : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
              }`}
              title="Desbloquear cartão para alterar respostas"
            >
              <Unlock className="w-3.5 h-3.5 text-amber-400" />
              <span>Desbloquear Respostas</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onExitCorrection}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                isDark
                  ? 'border-[#3b3e48] bg-[#2a2c34] text-zinc-200 hover:bg-[#343740]'
                  : 'border-slate-300 text-slate-800 hover:bg-slate-100'
              }`}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-400' : 'text-slate-600'}`} />
              <span>Editar Respostas</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
