import React from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Bookmark,
  BookOpen,
  FileText,
  Sparkles,
  ChevronRight,
  RotateCcw,
  Download,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { AnswerOption, AppTheme, ExamType, FilterMode, SimuladoData } from '../types';

interface ExamLateralPanelProps {
  simulado: SimuladoData;
  userAnswers: (AnswerOption | null)[];
  keyAnswers: (AnswerOption | null)[];
  flaggedQuestions: number[];
  isCorrected: boolean;
  isLocked?: boolean;
  filterMode: FilterMode;
  onFilterChange: (mode: FilterMode) => void;
  activeQuestionIndex: number | null;
  onSelectQuestion: (index: number) => void;
  onRunCorrection: () => void;
  onExitCorrection: () => void;
  onOpenKeyDrawer: () => void;
  onOpenPdfImport: () => void;
  onOpenQuestionDetail?: (index: number) => void;
  onDownloadReport?: () => void;
  theme?: AppTheme;
}

export const ExamLateralPanel: React.FC<ExamLateralPanelProps> = ({
  simulado,
  userAnswers,
  keyAnswers,
  flaggedQuestions,
  isCorrected,
  isLocked = false,
  filterMode,
  onFilterChange,
  activeQuestionIndex,
  onSelectQuestion,
  onRunCorrection,
  onExitCorrection,
  onOpenKeyDrawer,
  onOpenPdfImport,
  onOpenQuestionDetail,
  onDownloadReport,
  theme = 'clean',
}) => {
  const isNotebook = theme === 'notebook';
  const total = simulado.totalQuestions || 70;

  // Compute live stats
  let filledCount = 0;
  let keyCount = 0;
  let hits = 0;
  let misses = 0;
  let blanks = 0;

  for (let i = 0; i < total; i++) {
    const user = userAnswers[i];
    const key = keyAnswers[i];
    if (user !== null && user !== undefined) filledCount++;
    if (key !== null && key !== undefined) keyCount++;

    if (isCorrected) {
      if (key !== null && key !== undefined) {
        if (user === key) hits++;
        else if (user === null || user === undefined) blanks++;
        else misses++;
      } else {
        if (user === null || user === undefined) blanks++;
      }
    }
  }

  const percentage = Math.round((filledCount / total) * 100) || 0;
  const isKeyComplete = keyCount >= total;
  const hasKey = keyCount > 0;
  const hasPdf = Boolean(simulado.pdfFileName || (simulado.questions && simulado.questions.length > 0));
  const questionsCount = simulado.questions?.length || 0;

  return (
    <aside
      className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-4 text-xs transition-colors shadow-2xs select-none ${
        isNotebook
          ? 'bg-[#fcfaf4] border-[#ded7c6] text-[#1c2b45]'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      {/* 1. Header Overview */}
      <div className="border-b pb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] font-mono-code uppercase tracking-wider text-slate-500 font-semibold block">
            Painel da Prova
          </span>
          <h3 className="font-bold text-sm truncate" title={simulado.title}>
            {simulado.title}
          </h3>
        </div>
        <span
          className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full border ${
            isCorrected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          {isCorrected ? 'Corrigida' : 'Em Resolução'}
        </span>
      </div>

      {/* 2. Progress / Performance Card */}
      {!isCorrected ? (
        <div
          className={`p-3.5 rounded-xl border space-y-2.5 ${
            isNotebook ? 'bg-white border-[#ded7c6]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 text-xs">Progresso do Cartão</span>
            <span className="font-mono-code font-bold text-xs text-slate-900">{percentage}%</span>
          </div>

          <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isNotebook ? 'bg-[#1c2b45]' : 'bg-slate-900'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono-code pt-0.5">
            <span>{filledCount} de {total} marcadas</span>
            <span>{total - filledCount} em branco</span>
          </div>

          {flaggedQuestions.length > 0 && (
            <button
              type="button"
              onClick={() => onFilterChange(filterMode === 'flagged' ? 'all' : 'flagged')}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] transition cursor-pointer ${
                filterMode === 'flagged'
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold'
                  : 'bg-amber-50/70 hover:bg-amber-100/80 border-amber-200 text-amber-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                <span>{flaggedQuestions.length} para revisão</span>
              </span>
              <span className="text-[10px] underline">
                {filterMode === 'flagged' ? 'Ver todas' : 'Filtrar'}
              </span>
            </button>
          )}
        </div>
      ) : (
        <div
          className={`p-3.5 rounded-xl border space-y-2.5 ${
            isNotebook ? 'bg-white border-[#ded7c6]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <span className="font-semibold text-slate-700 text-xs block">Resultado da Avaliação</span>
          <div className="grid grid-cols-3 gap-2 text-center font-mono-code">
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] text-emerald-700 block font-semibold">Acertos</span>
              <span className="text-base font-bold text-emerald-800">{hits}</span>
            </div>
            <div className="p-2 rounded-lg bg-red-50 border border-red-200">
              <span className="text-[10px] text-red-700 block font-semibold">Erros</span>
              <span className="text-base font-bold text-red-800">{misses}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-600 block font-semibold">Branco</span>
              <span className="text-base font-bold text-slate-800">{blanks}</span>
            </div>
          </div>
          {onDownloadReport && (
            <button
              type="button"
              onClick={onDownloadReport}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium text-[11px] transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Baixar Relatório em TXT</span>
            </button>
          )}
        </div>
      )}

      {/* 3. Official Banca Key Status Card */}
      <div
        className={`p-3 rounded-xl border space-y-2 ${
          isNotebook ? 'bg-white border-[#ded7c6]' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-semibold text-xs text-slate-800">Gabarito da Banca</span>
          </div>
          <span
            className={`text-[10px] font-mono-code font-bold px-1.5 py-0.2 rounded-full ${
              isKeyComplete
                ? 'bg-emerald-100 text-emerald-800'
                : hasKey
                ? 'bg-amber-100 text-amber-900'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {keyCount}/{total}
          </span>
        </div>

        <p className="text-[11px] text-slate-500 leading-snug">
          {isKeyComplete
            ? '✓ Gabarito 100% cadastrado. Comentários precisos ativos nas questões.'
            : hasKey
            ? `${keyCount} respostas cadastradas. Complete o gabarito oficial para 100% de precisão.`
            : 'Nenhum gabarito oficial cadastrado para esta prova.'}
        </p>

        <button
          type="button"
          onClick={onOpenKeyDrawer}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300/80 transition cursor-pointer"
        >
          <span>{hasKey ? 'Ver / Ajustar Gabarito da Banca' : '+ Anexar Gabarito da Banca'}</span>
        </button>
      </div>

      {/* 4. PDF Exam Booklet & AI Questions */}
      <div
        className={`p-3 rounded-xl border space-y-2 ${
          isNotebook ? 'bg-white border-[#ded7c6]' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-semibold text-xs text-slate-800">Caderno de Prova (PDF)</span>
          </div>
          {hasPdf && (
            <span className="text-[10px] font-mono-code font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-900">
              {questionsCount} Q
            </span>
          )}
        </div>

        {hasPdf ? (
          <>
            <p className="text-[11px] text-slate-500 leading-snug truncate" title={simulado.pdfFileName || 'PDF Vinculado'}>
              {simulado.pdfFileName || `${questionsCount} questões indexadas`}
            </p>
            <button
              type="button"
              onClick={() => onOpenQuestionDetail?.(activeQuestionIndex !== null ? activeQuestionIndex : 0)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 transition cursor-pointer"
            >
              <span>Abrir Leitor de Questões</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <p className="text-[11px] text-slate-500 leading-snug">
              Importe o PDF do caderno para ler enunciados e comentários da banca.
            </p>
            <button
              type="button"
              onClick={onOpenPdfImport}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Importar Caderno em PDF</span>
            </button>
          </>
        )}
      </div>

      {/* 5. Fast Question Navigator Grid (Interactive Map of All Questions) */}
      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-700 text-xs">Índice Rápido</span>
          <span className="text-[10px] text-slate-400 font-mono-code">Clique para ir à questão</span>
        </div>

        <div className="max-h-48 overflow-y-auto pr-1">
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5">
            {Array.from({ length: total }, (_, i) => {
              const qNum = i + 1;
              const userAns = userAnswers[i];
              const keyAns = keyAnswers[i];
              const isFlagged = flaggedQuestions.includes(i);
              const isActive = activeQuestionIndex === i;

              let btnStyle = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200';

              if (isCorrected && keyAns !== null && keyAns !== undefined) {
                if (userAns === keyAns) {
                  btnStyle = 'bg-emerald-600 text-white border-emerald-600 font-bold';
                } else if (userAns !== null && userAns !== undefined) {
                  btnStyle = 'bg-red-600 text-white border-red-600 font-bold';
                } else {
                  btnStyle = 'bg-slate-200 text-slate-600 border-slate-300';
                }
              } else if (userAns !== null && userAns !== undefined) {
                btnStyle = isNotebook
                  ? 'bg-[#1c2b45] text-white border-[#1c2b45] font-bold'
                  : 'bg-slate-900 text-white border-slate-900 font-bold';
              }

              if (isActive) {
                btnStyle += ' ring-2 ring-blue-500 ring-offset-1';
              }

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onSelectQuestion(i);
                    // Also scroll into view
                    const el = document.getElementById(`question-row-${i}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  onDoubleClick={() => onOpenQuestionDetail?.(i)}
                  className={`h-7 rounded-md border text-[11px] font-mono-code flex items-center justify-center relative transition cursor-pointer ${btnStyle}`}
                  title={`Questão ${qNum}${userAns ? `: marcada ${userAns}` : ': em branco'}${
                    isFlagged ? ' (Dúvida)' : ''
                  }`}
                >
                  <span>{qNum}</span>
                  {isFlagged && (
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 6. Primary Action CTA Button */}
      <div className="border-t pt-3">
        {isCorrected ? (
          <button
            type="button"
            onClick={onExitCorrection}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 transition shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>Voltar ao Modo de Preenchimento</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onRunCorrection}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition shadow-sm cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Corrigir Cartão-Resposta</span>
          </button>
        )}
      </div>
    </aside>
  );
};
