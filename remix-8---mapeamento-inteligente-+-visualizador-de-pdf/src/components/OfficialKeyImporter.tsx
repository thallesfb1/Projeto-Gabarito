import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowLeft,
  Check,
  RotateCcw,
  BookOpen,
  Layers,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AnswerOption, ExamType, AppTheme } from '../types';
import { VALID_LETTERS_MC, VALID_LETTERS_TF } from '../utils/parser';
import {
  OfficialKeyParseResult,
  KeyConflict,
  parseOfficialKey,
  generateSamplePairsText,
  generateSampleTableText,
  generateSampleSequenceText,
} from '../utils/officialKeyParser';
import { ConfirmDialog } from './ConfirmDialog';

interface OfficialKeyImporterProps {
  totalQuestions: number;
  currentKeyAnswers: (AnswerOption | null)[];
  onConfirmKey: (newKey: (AnswerOption | null)[], isExample?: boolean) => void;
  onCancel?: () => void;
  isDrawerMode?: boolean;
  examType?: ExamType;
  theme?: AppTheme;
}

export const OfficialKeyImporter: React.FC<OfficialKeyImporterProps> = ({
  totalQuestions,
  currentKeyAnswers,
  onConfirmKey,
  onCancel,
  isDrawerMode = false,
  examType = 'multiple_choice',
  theme = 'clean',
}) => {
  const isDark = theme === 'dark';
  const isNotebook = theme === 'notebook';

  // Step 1: Input text; Step 2: Interactive Preview & Review Grid
  const [step, setStep] = useState<1 | 2>(1);
  const [pastedText, setPastedText] = useState('');
  const [sampleText, setSampleText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIncompleteConfirmModal, setShowIncompleteConfirmModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const availableOptions: AnswerOption[] = examType === 'true_false' ? VALID_LETTERS_TF : VALID_LETTERS_MC;

  // Focus textarea when in Step 1
  useEffect(() => {
    if (step === 1) {
      textareaRef.current?.focus();
    }
  }, [step]);

  // Parse result & preview state
  const [parseResult, setParseResult] = useState<OfficialKeyParseResult | null>(null);
  const [previewAnswers, setPreviewAnswers] = useState<(AnswerOption | null)[]>([]);
  const [editedQuestions, setEditedQuestions] = useState<Set<number>>(new Set());
  const [activeConflicts, setActiveConflicts] = useState<KeyConflict[]>([]);
  const [showMissingList, setShowMissingList] = useState(false);
  const [showWarningsList, setShowWarningsList] = useState(true);

  // Existing key fill count (to evaluate replacement notice)
  const currentKeyFilledCount = useMemo(
    () => currentKeyAnswers.filter(Boolean).length,
    [currentKeyAnswers]
  );

  // Step 1 handler: Run parser and enter review mode
  const handleProcessText = () => {
    setErrorMessage(null);
    const trimmed = pastedText.trim();
    if (!trimmed) {
      setErrorMessage('Cole o texto do gabarito oficial antes de processar.');
      return;
    }

    const result = parseOfficialKey(trimmed, totalQuestions, examType);

    if (result.detectedCount === 0 && result.conflicts.length === 0) {
      setErrorMessage(
        examType === 'true_false'
          ? 'Não foi possível identificar nenhuma resposta válida (V/F ou C/E) no texto fornecido. Verifique o formato ou use um dos exemplos de teste.'
          : 'Não foi possível identificar nenhuma resposta válida (A a E) no texto fornecido. Verifique o formato ou use um dos exemplos de teste.'
      );
      return;
    }

    setParseResult(result);
    setPreviewAnswers([...result.answers]);
    setActiveConflicts([...result.conflicts]);
    setEditedQuestions(new Set());
    setStep(2);
  };

  // Pre-fill sample shortcut buttons
  const handleLoadSample = (type: 'pairs' | 'table' | 'sequence') => {
    setErrorMessage(null);
    let sample = '';
    if (type === 'pairs') {
      sample = generateSamplePairsText(totalQuestions, examType);
    } else if (type === 'table') {
      sample = generateSampleTableText(totalQuestions, examType);
    } else {
      sample = generateSampleSequenceText(totalQuestions, examType);
    }
    setPastedText(sample); setSampleText(sample);
  };

  // Interactive review: Select answer on preview grid
  const handleSelectOptionInReview = (qIdx: number, letter: AnswerOption) => {
    const qNum = qIdx + 1;
    const nextAnswers = [...previewAnswers];
    const currentVal = nextAnswers[qIdx];
    const newVal = currentVal === letter ? null : letter;
    nextAnswers[qIdx] = newVal;
    setPreviewAnswers(nextAnswers);

    // Track as edited
    setEditedQuestions(prev => {
      const next = new Set(prev);
      next.add(qNum);
      return next;
    });

    // If question was in conflict, resolve it
    setActiveConflicts(prev => prev.filter(c => c.questionNumber !== qNum));
  };

  // Interactive review: Clear question answer
  const handleClearOptionInReview = (qIdx: number) => {
    const qNum = qIdx + 1;
    const nextAnswers = [...previewAnswers];
    nextAnswers[qIdx] = null;
    setPreviewAnswers(nextAnswers);

    setEditedQuestions(prev => {
      const next = new Set(prev);
      next.add(qNum);
      return next;
    });

    // Also resolve conflict if cleared
    setActiveConflicts(prev => prev.filter(c => c.questionNumber !== qNum));
  };

  // Step 2 handler: Final confirmation (Full Key)
  const handleConfirmFull = () => {
    if (activeConflicts.length > 0 || isSubmitting) {
      return;
    }
    // Main confirmation strictly requires 100% questions filled
    if (previewFilledCount < totalQuestions) {
      setShowIncompleteConfirmModal(true);
      return;
    }
    setIsSubmitting(true);
    try {
      onConfirmKey(previewAnswers, sampleText !== null && pastedText === sampleText && editedQuestions.size === 0);
      // Clean up internal state to prevent accidental duplicate actions
      setPastedText('');
      setParseResult(null);
      setPreviewAnswers([]);
      setActiveConflicts([]);
      setEditedQuestions(new Set());
      setStep(1);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for confirmed partial save (Explicit secondary action)
  const handleConfirmIncomplete = () => {
    if (activeConflicts.length > 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      setShowIncompleteConfirmModal(false);
      onConfirmKey(previewAnswers, sampleText !== null && pastedText === sampleText && editedQuestions.size === 0);
      // Clean up internal state
      setPastedText('');
      setParseResult(null);
      setPreviewAnswers([]);
      setActiveConflicts([]);
      setEditedQuestions(new Set());
      setStep(1);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate dynamic metrics in Step 2
  const previewFilledCount = previewAnswers.filter(Boolean).length;
  const currentMissingNumbers = useMemo(() => {
    const missing: number[] = [];
    for (let i = 0; i < totalQuestions; i++) {
      if (previewAnswers[i] === null) {
        missing.push(i + 1);
      }
    }
    return missing;
  }, [previewAnswers, totalQuestions]);

  const hasBlockingConflicts = activeConflicts.length > 0;
  const isFullKeyComplete = previewFilledCount === totalQuestions;

  // =========================================================================
  // ETAPA 1: ENTRADA E PROCESSAMENTO
  // =========================================================================
  if (step === 1) {
    return (
      <div className="space-y-4 text-xs sm:text-sm">
        {/* Info Header Box */}
        <div className={`p-3.5 rounded-xl leading-relaxed border transition-colors ${
          isDark
            ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
            : isNotebook
            ? 'bg-[#fefce8] border-[#fef08a] text-[#854d0e]'
            : 'bg-amber-50 border-amber-200 text-amber-950'
        }`}>
          <div className={`font-semibold flex items-center gap-1.5 text-xs sm:text-sm mb-1 ${
            isDark ? 'text-amber-300' : isNotebook ? 'text-[#713f12]' : 'text-amber-900'
          }`}>
            <BookOpen className="w-4 h-4 text-amber-500" />
            <span>
              {examType === 'true_false'
                ? 'Importação Inteligente de Gabarito Oficial V/F (Cebraspe / Certo ou Errado)'
                : 'Importação Inteligente do Gabarito Oficial da Banca'}
            </span>
          </div>
          <p className="text-xs leading-relaxed">
            {examType === 'true_false' ? (
              <>
                Cole as respostas copiadas de editais, sites ou provas Cespe/Cebraspe. O motor detecta automaticamente{' '}
                <b>Itens Numerados (ex: 1V, 2V, 3F, 4V ou 01-V)</b>,{' '}
                <b>Tabelas em Blocos (Linha de Números + Linha de V/F ou C/E)</b> e{' '}
                <b>Sequências Contínuas (ex: VVFVF...)</b>, aceitando tanto <b>V/F</b> quanto <b>C/E</b>.
              </>
            ) : (
              <>
                Cole as respostas copiadas de PDFs, sites de concursos ou editais. O motor detecta automaticamente{' '}
                <b>Pares Questão-Resposta (ex: 01-A)</b>, <b>Tabelas em Blocos (Linha de Números + Linha de Letras)</b> e{' '}
                <b>Sequências Contínuas (ex: ABCDE...)</b>, ignorando cabeçalhos institucionais.
              </>
            )}
          </p>
        </div>

        {/* Formats and Shortcuts */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <label htmlFor="official-key-input" className={`font-semibold text-xs flex items-center gap-1.5 ${
            isDark ? 'text-zinc-200' : isNotebook ? 'text-[#1c2b45]' : 'text-slate-800'
          }`}>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {examType === 'true_false'
                ? 'Cole o gabarito oficial V/F (ex: 1V, 2V, 3F, 4V...):'
                : 'Cole o gabarito oficial divulgado pela banca:'}
            </span>
          </label>

          {sampleText !== null && <p className="text-xs text-[var(--brand)]">Exemplo fictício de {totalQuestions} questões, vinculado ao teste de respostas com cerca de 70% de acertos.</p>}
          {/* Test Examples Shortcut Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] font-mono-code mr-1 ${isDark ? 'text-zinc-400' : 'text-[#5b6478]'}`}>Exemplos:</span>
            <button
              type="button"
              onClick={() => handleLoadSample('pairs')}
              className={`px-2 py-0.5 text-[11px] font-mono-code rounded transition cursor-pointer border ${
                isDark
                  ? 'bg-[#2a2c34] border-[#3b3e48] text-zinc-300 hover:border-amber-500 hover:text-amber-300'
                  : isNotebook
                  ? 'bg-white border-[#dedad0] text-[#1c2b45] hover:border-[#854d0e] hover:text-[#854d0e]'
                  : 'bg-white border-slate-300 text-slate-700 hover:border-slate-800 hover:text-slate-900'
              }`}
              title={
                examType === 'true_false'
                  ? 'Preencher com exemplo numerado VOF: 1V, 2V, 3F, 4V...'
                  : 'Preencher com exemplo de pares numerados: 01-A 02-B...'
              }
            >
              {examType === 'true_false' ? 'Numerado (1V 2V 3F)' : 'Pares (01-A)'}
            </button>
            <button
              type="button"
              onClick={() => handleLoadSample('table')}
              className={`px-2 py-0.5 text-[11px] font-mono-code rounded transition cursor-pointer border ${
                isDark
                  ? 'bg-[#2a2c34] border-[#3b3e48] text-zinc-300 hover:border-amber-500 hover:text-amber-300'
                  : isNotebook
                  ? 'bg-white border-[#dedad0] text-[#1c2b45] hover:border-[#854d0e] hover:text-[#854d0e]'
                  : 'bg-white border-slate-300 text-slate-700 hover:border-slate-800 hover:text-slate-900'
              }`}
              title="Preencher com exemplo de tabela em blocos"
            >
              Tabela
            </button>
            <button
              type="button"
              onClick={() => handleLoadSample('sequence')}
              className={`px-2 py-0.5 text-[11px] font-mono-code rounded transition cursor-pointer border ${
                isDark
                  ? 'bg-[#2a2c34] border-[#3b3e48] text-zinc-300 hover:border-amber-500 hover:text-amber-300'
                  : isNotebook
                  ? 'bg-white border-[#dedad0] text-[#1c2b45] hover:border-[#854d0e] hover:text-[#854d0e]'
                  : 'bg-white border-slate-300 text-slate-700 hover:border-slate-800 hover:text-slate-900'
              }`}
              title={
                examType === 'true_false'
                  ? 'Preencher com sequência V/F: VVFVF...'
                  : 'Preencher com sequência contínua: ABCDE...'
              }
            >
              Sequência {examType === 'true_false' ? '(V/F)' : ''}
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            id="official-key-input"
            rows={isDrawerMode ? 4 : 6}
            value={pastedText}
            onChange={e => {
              setPastedText(e.target.value); setSampleText(null);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder={
              examType === 'true_false'
                ? 'Cole aqui o gabarito oficial em formato V/F (ex: 1V, 2V, 3F, 4V... ou VVFVFFV... ou 1 C, 2 E...)'
                : 'Cole aqui o gabarito oficial (ex: 01-A 02-B... ou ABCDE...)'
            }
            className={`w-full p-3 font-mono-code text-xs rounded-xl outline-none transition leading-relaxed border-2 ${
              isDark
                ? 'bg-[#18191d] border-[#3b3e48] text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40'
                : isNotebook
                ? 'bg-white border-[#dedad0] text-[#1c2b45] focus:border-[#854d0e] focus:ring-1 focus:ring-[#854d0e]'
                : 'bg-white border-slate-300 text-slate-900 focus:border-slate-800 focus:ring-1 focus:ring-slate-800'
            }`}
          />
          {pastedText.length > 0 && (
            <button
              type="button"
              onClick={() => setPastedText('')}
              className={`absolute top-2.5 right-2.5 p-1 rounded transition cursor-pointer ${
                isDark
                  ? 'text-zinc-400 hover:text-rose-400 hover:bg-[#2a2c34]'
                  : 'text-[#5b6478] hover:text-[#a63b2c] hover:bg-gray-100'
              }`}
              title="Limpar texto colado"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-xl flex items-start gap-2.5 text-xs text-red-900 dark:text-red-200 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Action Button: Step 1 -> Step 2 */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className={`text-xs font-mono-code ${isDark ? 'text-zinc-400' : 'text-[#5b6478]'}`}>
            Limite desta prova: <b className={isDark ? 'text-zinc-200' : 'text-slate-900'}>{totalQuestions} questões</b>
          </div>

          <button
            id="btn-process-official-key"
            type="button"
            onClick={handleProcessText}
            className={`px-5 py-2.5 font-semibold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer ${
              isDark
                ? 'theme-solid hover:bg-amber-500 text-white hover:shadow-lg'
                : isNotebook
                ? 'theme-solid hover:bg-[#713f12] text-white hover:shadow-lg'
                : 'theme-solid hover:bg-slate-800 text-white hover:shadow-lg'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>Processar e Conferir Gabarito</span>
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // ETAPA 2: GRADE DE CONFERÊNCIA & EDIÇÃO INTERATIVA
  // =========================================================================
  return (
    <div className="space-y-4 text-xs sm:text-sm overflow-x-hidden animate-fadeIn">
      {/* Top Bar: Format Badge & Navigation */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b ${
        isDark ? 'border-[#3b3e48]' : 'border-[#dedad0]'
      }`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-mono-code font-semibold ${isDark ? 'text-zinc-400' : 'text-[#5b6478]'}`}>
            Formato detectado:
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono-code font-bold text-white shadow-2xs ${
            isDark ? 'theme-solid' : isNotebook ? 'theme-solid' : 'theme-solid'
          }`}>
            <Layers className="w-3.5 h-3.5" />
            <span>{parseResult?.formatLabel || 'Reconhecido'}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setStep(1)}
          className={`inline-flex items-center gap-1.5 text-xs font-mono-code font-semibold transition self-start sm:self-auto cursor-pointer ${
            isDark ? 'text-zinc-400 hover:text-white' : isNotebook ? 'text-[#5b6478] hover:text-[#1c2b45]' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar / Editar Texto</span>
        </button>
      </div>

      {/* Notice: Unsaved Preview Notice */}
      <div className={`p-3 rounded-xl flex items-start gap-2.5 text-xs border ${
        isDark
          ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
          : isNotebook
          ? 'bg-amber-50 border-amber-200 text-amber-950'
          : 'bg-amber-50 border-amber-200 text-amber-950'
      }`}>
        <HelpCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Aviso sobre o Salvamento: </span>
          As respostas exibidas abaixo estão <b>apenas em pré-visualização para conferência</b> e ainda não foram salvas na prova.
          Você pode corrigir qualquer alternativa diretamente na grade antes de confirmar.
        </div>
      </div>

      {/* Notice: Substitution of existing key */}
      {currentKeyFilledCount > 0 && (
        <div className={`p-3 rounded-xl flex items-start gap-2.5 text-xs border ${
          isDark
            ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
            : 'bg-amber-50/70 border-amber-200/80 text-amber-950'
        }`}>
          <RotateCcw className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold">Aviso de Substituição: </span>
            Esta prova já possui um gabarito cadastrado com <b>{currentKeyFilledCount} questões</b>. Ao confirmar, ele será substituído por este novo gabarito revisado.
          </div>
        </div>
      )}

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Metric 1: Reconhecidas no Texto */}
        <div className={`p-3 rounded-xl border shadow-2xs flex flex-col justify-between transition-colors ${
          isDark
            ? 'bg-[#22242a] border-[#3b3e48]'
            : isNotebook
            ? 'bg-[#fdfbf7] border-[#ded7c6]'
            : 'bg-white border-slate-200'
        }`}>
          <div className={`text-[11px] font-mono-code uppercase tracking-wider font-bold ${
            isDark ? 'text-zinc-400' : 'text-[#5b6478]'
          }`}>
            Reconhecidas no Texto
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-xl font-bold font-mono-code ${isDark ? 'text-zinc-100' : 'text-[#1c2b45]'}`}>
              {parseResult?.detectedCount || 0}
            </span>
            <span className={`text-xs font-mono-code ${isDark ? 'text-zinc-400' : 'text-[#5b6478]'}`}>
              de {totalQuestions} questões
            </span>
          </div>
          <div className={`text-[11px] mt-1 ${isDark ? 'text-zinc-400' : 'text-[#5b6478]'}`}>
            {editedQuestions.size > 0 ? `(${editedQuestions.size === 1 ? '1 questão ajustada' : `${editedQuestions.size} questões ajustadas`} na conferência)` : 'Extração estrita do texto colado'}
          </div>
        </div>

        {/* Metric 2: Questões Ausentes */}
        <div className={`p-3 rounded-xl border shadow-2xs flex flex-col justify-between transition-colors ${
          isDark
            ? 'bg-[#22242a] border-[#3b3e48]'
            : isNotebook
            ? 'bg-[#fdfbf7] border-[#ded7c6]'
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-mono-code uppercase tracking-wider font-bold ${
              isDark ? 'text-zinc-400' : 'text-[#5b6478]'
            }`}>
              Questões Ausentes
            </span>
            {currentMissingNumbers.length > 0 && (
              <button
                type="button"
                onClick={() => setShowMissingList(prev => !prev)}
                className={`text-[10px] font-mono-code hover:underline cursor-pointer ${
                  isDark ? 'text-zinc-400 hover:text-zinc-100' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {showMissingList ? 'Ocultar lista' : 'Ver lista'}
              </button>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-xl font-bold font-mono-code ${
              currentMissingNumbers.length > 0
                ? isDark ? 'text-amber-400' : 'text-amber-700'
                : isDark ? 'text-emerald-400' : 'text-emerald-700'
            }`}>
              {currentMissingNumbers.length}
            </span>
            <span className={`text-xs font-mono-code ${isDark ? 'text-zinc-400' : 'text-[#5b6478]'}`}>
              {currentMissingNumbers.length === 1 ? 'questão ausente' : 'questões ausentes'}
            </span>
          </div>
          <div className={`text-[11px] mt-1 ${isDark ? 'text-zinc-400' : 'text-[#5b6478]'}`}>
            {currentMissingNumbers.length === 0 ? 'Todas as questões foram encontradas' : 'Ficarão em branco se não preenchidas'}
          </div>
        </div>

        {/* Metric 3: Conflitos & Alertas */}
        <div className={`p-3 rounded-xl border shadow-2xs flex flex-col justify-between transition-colors ${
          hasBlockingConflicts
            ? isDark ? 'bg-red-950/40 border-red-800' : 'bg-red-50/70 border-red-300'
            : isDark ? 'bg-[#22242a] border-[#3b3e48]' : isNotebook ? 'bg-[#fdfbf7] border-[#ded7c6]' : 'bg-white border-slate-200'
        }`}>
          <div className="text-[11px] font-mono-code uppercase tracking-wider font-bold flex items-center justify-between">
            <span className={hasBlockingConflicts ? isDark ? 'text-red-300' : 'text-red-900' : isDark ? 'text-zinc-400' : 'text-[#5b6478]'}>
              Conflitos & Alertas
            </span>
            {hasBlockingConflicts && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white animate-pulse">
                Bloqueante
              </span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-xl font-bold font-mono-code ${
              hasBlockingConflicts
                ? isDark ? 'text-red-400' : 'text-red-700'
                : isDark ? 'text-zinc-100' : 'text-[#1c2b45]'
            }`}>
              {activeConflicts.length}
            </span>
            <span className={`text-xs font-mono-code ${isDark ? 'text-zinc-400' : 'text-[#5b6478]'}`}>
              {activeConflicts.length === 1 ? '1 conflito' : `${activeConflicts.length} conflitos`} · {(parseResult?.warnings.length || 0) === 1 ? '1 aviso' : `${parseResult?.warnings.length || 0} avisos`}
            </span>
          </div>
          <div className="text-[11px] mt-1">
            {hasBlockingConflicts ? (
              <span className={`font-semibold ${isDark ? 'text-red-300' : 'text-red-800'}`}>Exige resolução antes de salvar</span>
            ) : (
              <span className={isDark ? 'text-emerald-400' : 'text-emerald-800'}>Nenhum conflito pendente</span>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Missing Numbers List */}
      {showMissingList && currentMissingNumbers.length > 0 && (
        <div className={`p-3 rounded-xl text-xs space-y-1.5 border animate-fadeIn ${
          isDark ? 'bg-[#22242a] border-[#3b3e48]' : 'bg-white border-[#dedad0]'
        }`}>
          <div className={`font-semibold flex items-center justify-between ${isDark ? 'text-zinc-100' : 'text-[#1c2b45]'}`}>
            <span>Numeração das questões ausentes ({currentMissingNumbers.length}):</span>
            <button
              type="button"
              onClick={() => setShowMissingList(false)}
              className={isDark ? 'text-zinc-400 hover:text-white' : 'text-[#5b6478] hover:text-[#1c2b45]'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className={`font-mono-code text-xs leading-relaxed max-h-24 overflow-y-auto break-words p-2 rounded border ${
            isDark ? 'bg-[#18191d] border-[#3b3e48] text-zinc-300' : 'bg-[#fbfaf6] border-[#e8e5dc] text-[#5b6478]'
          }`}>
            {currentMissingNumbers.map(n => String(n).padStart(2, '0')).join(', ')}
          </div>
        </div>
      )}

      {/* Warnings and Conflicts Display */}
      {(hasBlockingConflicts || (parseResult?.warnings && parseResult.warnings.length > 0)) && (
        <div className="space-y-2">
          {/* Blocking conflicts alert */}
          {hasBlockingConflicts && (
            <div className={`p-3.5 border-2 rounded-xl text-xs space-y-2 animate-fadeIn ${
              isDark ? 'bg-red-950/40 border-red-700/80 text-red-200' : 'bg-red-50 border-red-400 text-red-950'
            }`}>
              <div className={`font-bold flex items-center gap-1.5 text-sm ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span>Alternativas Conflitantes Detectadas ({activeConflicts.length})</span>
              </div>
              <p className="leading-relaxed">
                A mesma questão apareceu mais de uma vez no texto colado com respostas diferentes. O sistema não adivinha opções.
                <b> Selecione a alternativa correta na grade abaixo para liberar a confirmação.</b>
              </p>
              <div className="space-y-1 pt-1 font-mono-code">
                {activeConflicts.map(c => (
                  <div key={c.questionNumber} className={`flex items-center gap-2 p-1.5 rounded border ${
                    isDark ? 'bg-[#18191d] border-red-900/60 text-red-300' : 'bg-white/80 border-red-200 text-red-900'
                  }`}>
                    <span className="font-bold">Questão {String(c.questionNumber).padStart(2, '0')}:</span>
                    <span>Opções divergentes encontradas: [{c.conflictingLetters.join(', ')}]</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Non-blocking warnings */}
          {parseResult?.warnings && parseResult.warnings.length > 0 && showWarningsList && (
            <div className={`p-3 rounded-xl text-xs space-y-1.5 border ${
              isDark ? 'bg-[#2a2c34] border-[#3b3e48] text-zinc-300' : 'bg-[#fdfaf3] border-[#e8dec8] text-[#715424]'
            }`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Avisos de Auditoria ({parseResult.warnings.length}):</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowWarningsList(false)}
                  className={`text-[10px] hover:underline ${isDark ? 'text-zinc-400' : 'text-[#715424]'}`}
                >
                  Ocultar
                </button>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                {parseResult.warnings.map((w, idx) => (
                  <li key={idx}>{w.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Interactive Responsive Question Grid */}
      <div className="space-y-2 pt-2">
        <div className={`flex items-center justify-between text-xs font-mono-code px-1 ${
          isDark ? 'text-zinc-400' : 'text-[#5b6478]'
        }`}>
          <span className={`font-semibold uppercase tracking-wider ${isDark ? 'text-zinc-200' : 'text-[#1c2b45]'}`}>
            Grade de Conferência · {totalQuestions} questões
          </span>
          <span className="text-[11px] hidden sm:inline">
            Clique em uma letra para alterar ou resolver conflitos
          </span>
        </div>

        {/* Responsive Grid */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[46vh] overflow-y-auto p-2 overflow-x-hidden border rounded-xl w-full ${
          isDark ? 'bg-[#18191d] border-[#3b3e48]' : isNotebook ? 'bg-[#fdfbf7] border-[#dedad0]' : 'bg-slate-50/80 border-slate-200'
        }`}>
          {Array.from({ length: totalQuestions }).map((_, idx) => {
            const qNum = idx + 1;
            const currentAnswer = previewAnswers[idx];
            const isEdited = editedQuestions.has(qNum);
            const isConflict = activeConflicts.some(c => c.questionNumber === qNum);
            const isAbsent = currentAnswer === null && !isConflict;

            let cardClasses = isDark
              ? 'border-[#3b3e48] bg-[#22242a]'
              : isNotebook
              ? 'border-[#dedad0] bg-white'
              : 'border-slate-200 bg-white';

            if (isConflict) {
              cardClasses = isDark
                ? 'border-red-700/80 bg-red-950/40 shadow-xs ring-1 ring-red-600/50'
                : 'border-red-400 bg-red-50/60 shadow-xs ring-1 ring-red-400/50';
            } else if (isEdited) {
              cardClasses = isDark
                ? 'border-amber-700/60 bg-amber-950/30'
                : 'border-amber-300 bg-amber-50/40';
            } else if (isAbsent) {
              cardClasses = isDark
                ? 'border-dashed border-[#3b3e48] bg-[#1d1f25]'
                : isNotebook
                ? 'border-dashed border-[#dedad0] bg-[#faf8f4]'
                : 'border-dashed border-slate-300 bg-slate-50';
            }

            return (
              <div
                key={qNum}
                className={`p-2.5 rounded-lg border transition flex flex-col justify-between gap-2 min-w-0 ${cardClasses}`}
              >
                {/* Upper line: Question Number, current choice, and status tag */}
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 shrink-0 min-w-0">
                    <span className={`font-mono-code font-bold text-xs ${isDark ? 'text-zinc-100' : 'text-[#1c2b45]'}`}>
                      Questão {String(qNum).padStart(2, '0')}
                    </span>
                    <span
                      className={`font-mono-code font-bold text-xs px-1.5 py-0.5 rounded ${
                        currentAnswer
                          ? isDark
                            ? 'theme-solid text-zinc-950'
                            : 'theme-solid text-white'
                          : isConflict
                          ? 'bg-red-600 text-white'
                          : isDark
                          ? 'bg-zinc-800 text-zinc-400'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {currentAnswer ? `[${currentAnswer}]` : '[-]'}
                    </span>
                  </div>

                  {/* Status tag */}
                  <div className="shrink-0 text-right">
                    {isConflict ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200 rounded">
                        ⚠️ Conflito
                      </span>
                    ) : isEdited ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 rounded">
                        Editada
                      </span>
                    ) : isAbsent ? (
                      <span className="px-1.5 py-0.5 text-[10px] text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400 rounded">
                        Ausente
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 rounded">
                        Reconhecida
                      </span>
                    )}
                  </div>
                </div>

                {/* Lower line: tactile buttons (A-E or V/F) + Compact Clear button */}
                <div className={`flex items-center justify-between gap-1 pt-1.5 border-t min-w-0 ${
                  isDark ? 'border-[#3b3e48]' : 'border-[#dedad0]/60'
                }`}>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {availableOptions.map(letter => {
                      const isSelected = currentAnswer === letter;
                      return (
                        <button
                          key={letter}
                          type="button"
                          onClick={() => handleSelectOptionInReview(idx, letter)}
                          className={`w-[26px] h-[26px] sm:w-7 sm:h-7 rounded-full text-xs font-mono-code font-bold flex items-center justify-center transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? isDark
                                ? 'theme-solid text-white shadow-xs scale-105 ring-2 ring-amber-500/40 hover:scale-115 hover:bg-amber-500'
                                : isNotebook
                                ? 'theme-solid text-white shadow-xs scale-105 ring-2 ring-[#854d0e]/30 hover:scale-115 hover:bg-[#713f12]'
                                : 'theme-solid text-white shadow-xs scale-105 ring-2 ring-slate-900/30 hover:scale-115 hover:bg-slate-800'
                              : isDark
                              ? 'border border-[#3b3e48] text-zinc-300 hover:bg-amber-600 hover:text-white hover:border-amber-600 hover:scale-115 hover:ring-2 hover:ring-amber-500/40'
                              : isNotebook
                              ? 'border border-[#dedad0] text-[#1c2b45] hover:bg-[#854d0e] hover:text-white hover:border-[#854d0e] hover:scale-115 hover:ring-2 hover:ring-[#854d0e]/30'
                              : 'border border-slate-300 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 hover:scale-115 hover:ring-2 hover:ring-slate-900/30'
                          }`}
                          title={`Marcar alternativa ${letter} para a questão ${qNum}`}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>

                  {/* Compact Accessible Clear button */}
                  {currentAnswer !== null && (
                    <button
                      type="button"
                      onClick={() => handleClearOptionInReview(idx)}
                      className={`text-[11px] font-mono-code px-1.5 py-0.5 rounded transition flex items-center gap-0.5 shrink-0 cursor-pointer border ${
                        isDark
                          ? 'text-zinc-400 hover:text-rose-300 hover:bg-rose-950/40 border-transparent hover:border-rose-900/60'
                          : 'text-[#5b6478] hover:text-[#a63b2c] hover:bg-red-50 border-transparent hover:border-red-200'
                      }`}
                      title={`Limpar alternativa da questão ${qNum}`}
                      aria-label={`Limpar alternativa da questão ${qNum}`}
                    >
                      <X className="w-3 h-3 text-red-500" />
                      <span className="text-[10px]">Limpar</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Action Buttons */}
      <div className={`pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
        isDark ? 'border-[#3b3e48]' : 'border-[#dedad0]'
      }`}>
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`w-full sm:w-auto px-4 py-2 border font-semibold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
            isDark
              ? 'border-[#3b3e48] bg-[#2a2c34] hover:bg-[#343740] text-zinc-200'
              : isNotebook
              ? 'border-[#dedad0] bg-white hover:bg-[#f0eee6] text-[#1c2b45]'
              : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar / Editar Texto</span>
        </button>

        <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
          {/* Secondary action: Save partial key if not 100% complete and has at least 1 answer */}
          {!isFullKeyComplete && !hasBlockingConflicts && previewFilledCount > 0 && (
            <button
              id="btn-confirm-partial-key"
              type="button"
              onClick={() => setShowIncompleteConfirmModal(true)}
              className={`text-xs font-mono-code underline underline-offset-2 transition py-1 px-2 cursor-pointer text-center ${
                isDark ? 'text-amber-400 hover:text-amber-300' : isNotebook ? 'text-[#854d0e] hover:text-[#713f12]' : 'text-amber-800 hover:text-amber-950'
              }`}
              title="Salvar apenas as questões reconhecidas até o momento"
            >
              Salvar gabarito parcial ({previewFilledCount} de {totalQuestions})
            </button>
          )}

          {hasBlockingConflicts ? (
            <span className={`text-xs font-semibold text-center sm:text-right ${isDark ? 'text-red-400' : 'text-red-700'}`}>
              Resolva {activeConflicts.length === 1 ? 'o conflito detectado' : `os ${activeConflicts.length} conflitos detectados`} na grade para confirmar
            </span>
          ) : !isFullKeyComplete ? (
            <span className={`text-xs font-medium text-center sm:text-right ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
              Faltam {currentMissingNumbers.length === 1 ? '1 questão' : `${currentMissingNumbers.length} questões`} para completar (preencha na grade)
            </span>
          ) : null}

          {/* Main confirmation button: strictly requires 100% (e.g. 70 de 70) and 0 conflicts */}
          <button
            id="btn-confirm-official-key"
            type="button"
            disabled={!isFullKeyComplete || hasBlockingConflicts || isSubmitting}
            onClick={handleConfirmFull}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
              isFullKeyComplete && !hasBlockingConflicts && !isSubmitting
                ? isDark
                  ? 'theme-solid hover:bg-amber-500 text-white hover:shadow-lg active:scale-98'
                  : isNotebook
                  ? 'theme-solid hover:bg-[#713f12] text-white hover:shadow-lg active:scale-98'
                  : 'theme-solid hover:bg-slate-800 text-white hover:shadow-lg active:scale-98'
                : isDark
                ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed shadow-none'
                : 'bg-stone-200 text-stone-500 border border-stone-300 cursor-not-allowed shadow-none'
            }`}
            title={
              hasBlockingConflicts
                ? `Existem ${activeConflicts.length} conflito(s) a resolver antes de confirmar`
                : !isFullKeyComplete
                ? `Faltam ${currentMissingNumbers.length} questão(ões) para completar o gabarito oficial nesta prova`
                : 'Confirmar e salvar o gabarito oficial completo nesta prova'
            }
          >
            <Check className="w-4 h-4 text-amber-200" />
            <span>Confirmar Gabarito Oficial ({previewFilledCount} de {totalQuestions})</span>
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Incomplete Key Save */}
      <ConfirmDialog
        isOpen={showIncompleteConfirmModal}
        title="Salvar Gabarito Incompleto?"
        description={`Você está salvando um gabarito com apenas ${previewFilledCount} de ${totalQuestions} questões preenchidas. As ${currentMissingNumbers.length} questões ausentes ficarão em branco no gabarito oficial.${currentKeyFilledCount > 0 ? ` O gabarito anterior continha ${currentKeyFilledCount} respostas e será substituído.` : ''} Deseja confirmar mesmo assim?`}
        confirmLabel="Sim, Salvar Gabarito Parcial"
        cancelLabel="Voltar e Preencher na Grade"
        isDestructive={false}
        onConfirm={handleConfirmIncomplete}
        onCancel={() => setShowIncompleteConfirmModal(false)}
      />
    </div>
  );
};
