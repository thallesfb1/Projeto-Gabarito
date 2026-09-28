import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Bookmark, Columns3, LayoutGrid, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { AnswerOption, ExamType, FilterMode, AppTheme } from '../types';
import { VALID_LETTERS_MC, VALID_LETTERS_TF } from '../utils/parser';

interface QuestionGridProps {
  total: number;
  userAnswers: (AnswerOption | null)[];
  keyAnswers: (AnswerOption | null)[];
  flaggedQuestions: number[];
  isCorrected: boolean;
  isLocked?: boolean;
  filterMode: FilterMode;
  activeQuestionIndex: number | null;
  onSetActiveQuestion: (idx: number | null) => void;
  onSelectAnswer: (questionIdx: number, letter: AnswerOption) => void;
  onToggleFlag: (questionIdx: number) => void;
  onResetFilter?: (mode: FilterMode) => void;
  examType?: ExamType;
  theme?: AppTheme;
}

export const QuestionGrid: React.FC<QuestionGridProps> = ({
  total,
  userAnswers,
  keyAnswers,
  flaggedQuestions,
  isCorrected,
  isLocked = false,
  filterMode,
  activeQuestionIndex,
  onSetActiveQuestion,
  onSelectAnswer,
  onToggleFlag,
  onResetFilter,
  examType = 'multiple_choice',
  theme = 'clean',
}) => {
  const isNotebook = theme === 'notebook';
  const isDark = theme === 'dark';
  const containerRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const isTF = examType === 'true_false';
  const availableLetters: AnswerOption[] = isTF ? VALID_LETTERS_TF : VALID_LETTERS_MC;

  // Layout mode: 'optical' (aligned columns like official exam sheet) or 'cards' (spacious cards with large touch targets)
  const [layoutMode, setLayoutMode] = useState<'optical' | 'cards'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gabarito_question_layout_mode');
      if (saved === 'optical' || saved === 'cards') return saved;
    }
    return 'optical';
  });

  const handleSetLayoutMode = (mode: 'optical' | 'cards') => {
    setLayoutMode(mode);
    try {
      localStorage.setItem('gabarito_question_layout_mode', mode);
    } catch {
      // ignore storage quota errors
    }
  };

  // User-selectable Column Count (1, 2, 3 for A-E and 1, 2, 3, 4 for V/F)
  const storageColsKey = isTF ? 'gabarito_preferred_cols_tf' : 'gabarito_preferred_cols_mc';
  const [selectedColumns, setSelectedColumns] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageColsKey);
      if (saved) return saved;
    }
    return 'auto';
  });

  const handleSetColumns = (val: string) => {
    setSelectedColumns(val);
    try {
      localStorage.setItem(storageColsKey, val);
    } catch {
      // ignore
    }
  };

  // Measure actual container width to dynamically adapt column count and row layout
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      if (el) {
        setContainerWidth(Math.floor(el.getBoundingClientRect().width));
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        if (w > 0) setContainerWidth(w);
      }
    });

    resizeObserver.observe(el);
    window.addEventListener('resize', updateWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Auto-scroll to active question if triggered via keyboard or external selection
  useEffect(() => {
    if (activeQuestionIndex !== null && rowRefs.current[activeQuestionIndex]) {
      rowRefs.current[activeQuestionIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeQuestionIndex]);

  // Fallback width for initial mount
  const effectiveWidth =
    containerWidth > 0
      ? containerWidth
      : typeof window !== 'undefined'
      ? Math.max(280, Math.min(window.innerWidth - 64, 1100))
      : 800;

  // Filter questions according to active filterMode
  const matchingIndices: number[] = [];
  for (let i = 0; i < total; i++) {
    if (filterMode === 'all') {
      matchingIndices.push(i);
    } else if (filterMode === 'flagged') {
      if (flaggedQuestions.includes(i)) matchingIndices.push(i);
    } else if (isCorrected) {
      const key = keyAnswers[i];
      if (key === null || key === undefined) continue;
      const user = userAnswers[i];
      const isRight = user === key;
      const isBlank = user === null || user === undefined;
      const isWrong = !isBlank && user !== key;

      if (filterMode === 'errors' && isWrong) matchingIndices.push(i);
      else if (filterMode === 'correct' && isRight) matchingIndices.push(i);
      else if (filterMode === 'blank' && isBlank) matchingIndices.push(i);
    }
  }

  // If filter matches nothing, show clear helpful state
  if (filterMode !== 'all' && matchingIndices.length === 0) {
    return (
      <div className={`rounded-xl p-6 sm:p-8 text-center border my-4 font-mono-code shadow-xs ${
        isDark ? 'bg-[#22242a] border-[#3b3e48] text-zinc-100' : 'bg-white/95 border-[#dedad0]'
      }`}>
        {filterMode === 'flagged' && (
          <div className="space-y-2.5 max-w-md mx-auto">
            <Bookmark className={`w-8 h-8 mx-auto ${isDark ? 'text-amber-400' : 'text-amber-600/80'}`} />
            <p className={`font-bold text-sm ${isDark ? 'text-slate-100' : 'text-[#1c2b45]'}`}>Nenhuma questão marcada para revisão.</p>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-[#5b6478]'}`}>
              {isCorrected
                ? 'Nenhuma questão foi marcada com a bandeira de dúvida neste simulado.'
                : isTF
                ? 'Você pode sinalizar dúvidas clicando no ícone de bandeira ao lado de cada questão ou usando a tecla R.'
                : 'Você pode sinalizar dúvidas clicando no ícone de bandeira ao lado de cada questão ou usando as teclas F ou R.'}
            </p>
            {onResetFilter && (
              <button
                type="button"
                onClick={() => onResetFilter('all')}
                className={`mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  isDark ? 'bg-sky-600 text-white hover:bg-sky-500' : 'bg-[#1c2b45] text-white hover:bg-[#132038]'
                }`}
              >
                <span>Ver todas as questões</span>
              </button>
            )}
          </div>
        )}
        {filterMode === 'errors' && (
          <div className="space-y-2 max-w-md mx-auto">
            <p className={`font-bold text-sm ${isDark ? 'text-emerald-400' : 'text-[#2f6846]'}`}>🎉 Parabéns! Nenhum erro encontrado.</p>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-[#5b6478]'}`}>Todas as questões com gabarito oficial avaliadas foram respondidas corretamente.</p>
            {onResetFilter && (
              <button
                type="button"
                onClick={() => onResetFilter('all')}
                className={`mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  isDark ? 'bg-sky-600 text-white hover:bg-sky-500' : 'bg-[#1c2b45] text-white hover:bg-[#132038]'
                }`}
              >
                <span>Ver todas as questões</span>
              </button>
            )}
          </div>
        )}
        {filterMode === 'correct' && (
          <div className="space-y-2 max-w-md mx-auto">
            <p className={`font-bold text-sm ${isDark ? 'text-zinc-300' : 'text-[#5b6478]'}`}>Nenhum acerto registrado com o gabarito oficial.</p>
            {onResetFilter && (
              <button
                type="button"
                onClick={() => onResetFilter('all')}
                className={`mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  isDark ? 'bg-zinc-200 text-zinc-900 hover:bg-white' : 'bg-[#1c2b45] text-white hover:bg-[#132038]'
                }`}
              >
                <span>Ver todas as questões</span>
              </button>
            )}
          </div>
        )}
        {filterMode === 'blank' && (
          <div className="space-y-2 max-w-md mx-auto">
            <p className={`font-bold text-sm ${isDark ? 'text-zinc-300' : 'text-[#5b6478]'}`}>Nenhuma questão avaliada deixada em branco.</p>
            {onResetFilter && (
              <button
                type="button"
                onClick={() => onResetFilter('all')}
                className={`mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  isDark ? 'bg-zinc-200 text-zinc-900 hover:bg-white' : 'bg-[#1c2b45] text-white hover:bg-[#132038]'
                }`}
              >
                <span>Ver todas as questões</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Calculate Column Count
  const maxAllowedCols = isTF ? 4 : 3;
  let numColumns = 1;
  if (selectedColumns === 'auto') {
    if (isTF) {
      if (effectiveWidth >= 960 && matchingIndices.length > 28) {
        numColumns = 4;
      } else if (effectiveWidth >= 720 && matchingIndices.length > 20) {
        numColumns = 3;
      } else if (effectiveWidth >= 480 && matchingIndices.length > 10) {
        numColumns = 2;
      } else {
        numColumns = 1;
      }
    } else {
      if (effectiveWidth >= 960 && matchingIndices.length > 24) {
        numColumns = 3;
      } else if (effectiveWidth >= 620 && matchingIndices.length > 12) {
        numColumns = 2;
      } else {
        numColumns = 1;
      }
    }
  } else {
    const parsed = parseInt(selectedColumns, 10) || 1;
    numColumns = Math.min(maxAllowedCols, Math.max(1, parsed));
  }

  // Column options array for the selector
  const columnOptions = isTF
    ? [
        { value: 'auto', label: 'Auto', title: 'Automático conforme largura da tela' },
        { value: '1', label: '1', title: '1 coluna' },
        { value: '2', label: '2', title: '2 colunas' },
        { value: '3', label: '3', title: '3 colunas' },
        { value: '4', label: '4', title: '4 colunas (otimizado para V/F)' },
      ]
    : [
        { value: 'auto', label: 'Auto', title: 'Automático conforme largura da tela' },
        { value: '1', label: '1', title: '1 coluna' },
        { value: '2', label: '2', title: '2 colunas' },
        { value: '3', label: '3', title: '3 colunas (otimizado A–E)' },
      ];

  const isCardMode = layoutMode === 'cards';

  // Split matching questions into balanced columns
  const activeColsCount = Math.min(
    numColumns,
    Math.max(1, Math.ceil(matchingIndices.length / (isTF ? 5 : 4)))
  );
  const columns: number[][] = [];
  const perCol = Math.ceil(matchingIndices.length / activeColsCount);
  for (let c = 0; c < activeColsCount; c++) {
    const start = c * perCol;
    const end = Math.min(start + perCol, matchingIndices.length);
    if (start < end) {
      columns.push(matchingIndices.slice(start, end));
    }
  }

  // Bubble renderer with uniform grid alignment (5 columns for A-E, 2 columns for V/F)
  const renderBubbles = (
    idx: number,
    qNum: string,
    userAns: AnswerOption | null,
    keyAns: AnswerOption | null,
    hasKey: boolean,
    bubbleClass: string
  ) => {
    return (
      <div
        className={`w-full grid ${
          isTF
            ? numColumns >= 3
              ? 'grid-cols-2 max-w-[96px] gap-2'
              : 'grid-cols-2 max-w-[130px] gap-3'
            : numColumns >= 3
            ? 'grid-cols-5 max-w-[160px] gap-1 sm:gap-1.5'
            : 'grid-cols-5 max-w-[210px] gap-1.5 sm:gap-2'
        } justify-items-center`}
      >
        {availableLetters.map(letter => {
          const isSelected = userAns === letter;
          const isOfficialKey = keyAns === letter;

          let bubbleStyle = isLocked
            ? isNotebook
              ? 'bg-[#fffefb] text-[#2b3952] border-[#ded7c6] opacity-90 cursor-not-allowed'
              : isDark
              ? 'bg-[#22242a] text-zinc-300 border-[#3b3e48] opacity-80 cursor-not-allowed'
              : 'bg-white text-slate-800 border-slate-300 opacity-90 cursor-not-allowed'
            : isNotebook
            ? 'bg-[#fffefb] text-[#2b3952] border-[#ded7c6] hover:bg-[#1c2b45] hover:text-[#fdfcf7] hover:border-[#1c2b45] hover:scale-105 active:scale-95 cursor-pointer'
            : isDark
            ? 'bg-[#22242a] text-zinc-200 border-[#3b3e48] hover:bg-zinc-200 hover:text-zinc-900 hover:border-zinc-200 hover:scale-105 active:scale-95 cursor-pointer'
            : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-900 hover:text-white hover:border-slate-900 hover:scale-105 active:scale-95 cursor-pointer';

          if (isCorrected) {
            if (!hasKey) {
              if (isSelected) {
                bubbleStyle = isLocked
                  ? isNotebook
                    ? 'bg-[#1c2b45] text-[#fdfcf7] border-[#1c2b45] cursor-not-allowed'
                    : isDark
                    ? 'bg-[#2a2c34] text-zinc-100 border-[#444854] cursor-not-allowed'
                    : 'bg-slate-800 text-white border-slate-800 cursor-not-allowed'
                  : isNotebook
                  ? 'bg-[#1c2b45] text-[#fdfcf7] border-[#1c2b45] hover:bg-[#2b3c59] hover:scale-105 cursor-pointer'
                  : isDark
                  ? 'bg-zinc-200 text-zinc-900 border-zinc-200 hover:bg-white hover:scale-105 cursor-pointer font-bold'
                  : 'bg-slate-800 text-white border-slate-800 hover:bg-slate-900 hover:scale-105 cursor-pointer';
              } else {
                bubbleStyle = isLocked
                  ? isNotebook
                    ? 'bg-[#fffefb]/60 text-[#a39a88] border-[#ded7c6] cursor-not-allowed'
                    : isDark
                    ? 'bg-[#18191d]/70 text-zinc-500 border-[#3b3e48] cursor-not-allowed'
                    : 'bg-white/60 text-slate-400 border-slate-200 cursor-not-allowed'
                  : isNotebook
                  ? 'bg-[#fffefb]/60 text-[#827867] border-[#ded7c6] hover:text-[#1c2b45] hover:border-[#a89d89] hover:scale-105 cursor-pointer'
                  : isDark
                  ? 'bg-[#18191d]/70 text-zinc-400 border-[#3b3e48] hover:text-zinc-100 hover:border-zinc-500 hover:scale-105 cursor-pointer'
                  : 'bg-white/60 text-slate-400 border-slate-200 hover:text-slate-800 hover:border-slate-400 hover:scale-105 cursor-pointer';
              }
            } else if (isSelected) {
              if (letter === keyAns) {
                // Correct answer chosen (Acerto)
                bubbleStyle = isLocked
                  ? isNotebook
                    ? 'bg-[#2f7446] text-[#fbfbf5] border-[#255d38] shadow-xs cursor-not-allowed'
                    : isDark
                    ? 'bg-emerald-600/90 text-white border-emerald-500 shadow-xs cursor-not-allowed'
                    : 'bg-emerald-600 text-white border-emerald-600 shadow-xs cursor-not-allowed'
                  : isNotebook
                  ? 'bg-[#2f7446] text-[#fbfbf5] border-[#255d38] shadow-xs hover:bg-[#265e38] hover:scale-105 cursor-pointer'
                  : isDark
                  ? 'bg-emerald-600/90 text-white border-emerald-500 shadow-xs hover:bg-emerald-500 hover:scale-105 cursor-pointer'
                  : 'bg-emerald-600 text-white border-emerald-600 shadow-xs hover:bg-emerald-700 hover:scale-105 cursor-pointer';
              } else {
                // Wrong answer chosen (Erro) - soft coral rose for dark mode
                bubbleStyle = isLocked
                  ? isNotebook
                    ? 'bg-[#b8473e] text-[#fdfcf7] border-[#9c3a32] shadow-xs cursor-not-allowed'
                    : isDark
                    ? 'bg-rose-600/90 text-white border-rose-500 shadow-xs cursor-not-allowed'
                    : 'bg-red-600 text-white border-red-600 shadow-xs cursor-not-allowed'
                  : isNotebook
                  ? 'bg-[#b8473e] text-[#fdfcf7] border-[#9c3a32] shadow-xs hover:bg-[#9e3b33] hover:scale-105 cursor-pointer'
                  : isDark
                  ? 'bg-rose-600/90 text-white border-rose-500 shadow-xs hover:bg-rose-500 hover:scale-105 cursor-pointer'
                  : 'bg-red-600 text-white border-red-600 shadow-xs hover:bg-red-700 hover:scale-105 cursor-pointer';
              }
            } else if (isOfficialKey && (!isSelected || userAns !== letter)) {
              // This was the correct official answer that the user missed or left blank
              bubbleStyle = isLocked
                ? isNotebook
                  ? 'bg-[#eef6f0] text-[#1e4e30] border-2 border-[#2f7446] font-bold shadow-xs cursor-not-allowed'
                  : isDark
                  ? 'bg-emerald-950/60 text-emerald-300 border-2 border-emerald-400 font-bold shadow-xs cursor-not-allowed'
                  : 'bg-emerald-50 text-emerald-800 border-2 border-emerald-600 font-bold shadow-xs cursor-not-allowed'
                : isNotebook
                ? 'bg-[#eef6f0] text-[#1e4e30] border-2 border-[#2f7446] font-bold shadow-xs hover:bg-[#e2efe4] hover:scale-105 cursor-pointer'
                : isDark
                ? 'bg-emerald-950/60 text-emerald-300 border-2 border-emerald-400 font-bold shadow-xs hover:bg-emerald-900/80 hover:scale-105 cursor-pointer'
                : 'bg-emerald-50 text-emerald-800 border-2 border-emerald-600 font-bold shadow-xs hover:bg-emerald-100 hover:scale-105 cursor-pointer';
            } else {
              bubbleStyle = isLocked
                ? isNotebook
                  ? 'bg-[#fffefb]/60 text-[#a39a88] border-[#ded7c6] cursor-not-allowed'
                  : isDark
                  ? 'bg-[#18191d]/70 text-zinc-500 border-[#3b3e48] cursor-not-allowed'
                  : 'bg-white/60 text-slate-300 border-slate-200 cursor-not-allowed'
                : isNotebook
                ? 'bg-[#fffefb]/60 text-[#827867] border-[#ded7c6] hover:text-[#1c2b45] hover:border-[#a89d89] hover:scale-105 cursor-pointer'
                : isDark
                ? 'bg-[#18191d]/70 text-zinc-400 border-[#3b3e48] hover:text-zinc-100 hover:border-zinc-500 hover:scale-105 cursor-pointer'
                : 'bg-white/60 text-slate-400 border-slate-200 hover:text-slate-800 hover:border-slate-400 hover:scale-105 cursor-pointer';
            }
          } else if (isSelected) {
            bubbleStyle = isNotebook
              ? 'bg-[#1c2b45] text-[#fdfcf7] border-[#1c2b45] shadow-xs hover:bg-[#2b3c59] hover:scale-105 cursor-pointer'
              : isDark
              ? 'bg-zinc-200 text-zinc-900 border-zinc-200 shadow-xs hover:bg-white hover:scale-105 cursor-pointer font-bold'
              : 'bg-slate-900 text-white border-slate-900 shadow-xs hover:bg-slate-800 hover:scale-105 cursor-pointer';
          }

          return (
            <button
              id={`bubble-q${idx + 1}-${letter}`}
              key={letter}
              type="button"
              disabled={isLocked}
              onClick={e => {
                e.stopPropagation();
                if (!isLocked) onSelectAnswer(idx, letter);
              }}
              className={`${bubbleClass} rounded-full border-[1.5px] flex items-center justify-center font-mono-code font-bold select-none transition-all duration-150 shrink-0 ${bubbleStyle}`}
              title={
                isLocked
                  ? `Questão ${qNum}: Modo de conferência travado`
                  : `Questão ${qNum}: alternativa ${letter}`
              }
              aria-label={`Questão ${qNum}, alternativa ${letter}`}
            >
              {letter}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="w-full min-w-0 space-y-3">
      {/* Top Layout Mode Switcher, Columns Selector & Stats Info */}
      <div className={`flex items-center justify-between gap-2.5 flex-wrap text-xs font-mono-code pb-2 border-b ${
        isNotebook ? 'border-[#ded7c6]' : isDark ? 'border-[#3b3e48]' : 'border-slate-200'
      }`}>
        <div className={`flex items-center gap-2 shrink-0 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          <span className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
            {matchingIndices.length} {matchingIndices.length === 1 ? 'questão exibida' : 'questões exibidas'}
          </span>
          {filterMode !== 'all' && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
              isDark
                ? 'text-amber-300 bg-amber-950/50 border-amber-800/60'
                : 'text-amber-800 bg-amber-50 border-amber-200'
            }`}>
              Filtro ativo
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Column Count Selector (1, 2, 3 for A-E and 1, 2, 3, 4 for V/F) */}
          <div className={`flex items-center p-0.5 rounded-lg border text-xs ${
            isDark
              ? 'bg-[#18191d] border-[#3b3e48]'
              : 'bg-slate-100 border-slate-200'
          }`}>
            <span className={`text-[11px] px-1.5 font-medium hidden xs:inline ${
              isDark ? 'text-zinc-400' : 'text-slate-500'
            }`}>Colunas:</span>
            {columnOptions.map(opt => {
              const isActive = selectedColumns === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSetColumns(opt.value)}
                  className={`px-2 py-0.5 text-xs rounded transition-all cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-zinc-200 text-zinc-900 font-bold shadow-2xs'
                        : 'bg-slate-900 text-white font-bold shadow-2xs'
                      : isDark
                      ? 'text-zinc-400 hover:text-zinc-200 hover:bg-[#2a2c34]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                  title={opt.title}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* View Layout Toggle: Folha Óptica vs Cartões Espaçosos */}
          <div className={`flex items-center p-0.5 rounded-lg border ${
            isDark
              ? 'bg-[#18191d] border-[#3b3e48]'
              : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              id="btn-layout-optical"
              type="button"
              onClick={() => handleSetLayoutMode('optical')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer ${
                layoutMode === 'optical'
                  ? isDark
                    ? 'bg-[#2a2c34] text-zinc-100 font-semibold shadow-2xs'
                    : 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Visualização em colunas alinhadas com guia óptica"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Folha Óptica</span>
              <span className="sm:hidden">Folha</span>
            </button>
            <button
              id="btn-layout-cards"
              type="button"
              onClick={() => handleSetLayoutMode('cards')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-all cursor-pointer ${
                layoutMode === 'cards'
                  ? isDark
                    ? 'bg-[#2a2c34] text-zinc-100 font-semibold shadow-2xs'
                    : 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Visualização em cartões espaçosos com toque ampliado"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cartões</span>
              <span className="sm:hidden">Cartões</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Columns with anti-squeeze minimum width protection */}
      <div className="w-full min-w-0 overflow-x-auto pb-1">
        <div
          className="w-full"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns.length}, minmax(${
              isTF ? (numColumns >= 4 ? '185px' : '220px') : (numColumns >= 3 ? '245px' : '280px')
            }, 1fr))`,
            gap: '0.875rem',
          }}
        >
          {columns.map((colQuestions, colIdx) => {
            if (colQuestions.length === 0) return null;
            const firstQ = colQuestions[0] + 1;
            const lastQ = colQuestions[colQuestions.length - 1] + 1;

            return (
              <div
                key={colIdx}
                className={`w-full min-w-0 rounded-xl p-2.5 border shadow-2xs flex flex-col ${
                  isNotebook ? 'bg-[#fcfaf4] border-[#ded7c6]' : isDark ? 'bg-[#22242a] border-[#3b3e48]' : 'bg-white border-slate-200'
                }`}
              >
                {/* Column Header */}
                <div className={`flex items-center justify-between pb-1.5 mb-1.5 border-b text-[11px] font-mono-code ${
                  isNotebook ? 'border-[#ded7c6] text-[#6b6255]' : isDark ? 'border-[#3b3e48] text-zinc-400' : 'border-slate-200 text-slate-500'
                }`}>
                  <span className={`font-semibold truncate pr-1 ${
                    isNotebook ? 'text-[#1c2b45]' : isDark ? 'text-zinc-100' : 'text-slate-900'
                  }`}>
                    {firstQ === lastQ
                      ? `Questão ${String(firstQ).padStart(2, '0')}`
                      : `Questões ${String(firstQ).padStart(2, '0')} a ${String(lastQ).padStart(2, '0')}`}
                  </span>
                  <span className={`text-[10px] shrink-0 ${
                    isNotebook ? 'text-[#877e6e]' : isDark ? 'text-zinc-400' : 'text-slate-400'
                  }`}>
                    {colQuestions.length} {colQuestions.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>

                {/* Sub-Header Guide: Only shown in Optical Mode so alternatives align directly beneath letters */}
                {!isCardMode && (
                  <div className={`grid grid-cols-[38px_1fr_64px] items-center gap-1 px-1.5 py-1 mb-1 text-[10px] font-mono-code font-bold uppercase tracking-wider rounded-lg border select-none ${
                    isNotebook
                      ? 'text-[#6b6255] bg-[#f6f2e8] border-[#ded7c6]'
                      : isDark
                      ? 'text-zinc-300 bg-[#18191d] border-[#3b3e48]'
                      : 'text-slate-500 bg-slate-50 border-slate-200'
                  }`}>
                    <span className="text-left pl-0.5 w-[38px] shrink-0">Nº</span>
                    <div
                      className={`w-full ${
                        isTF
                          ? numColumns >= 3
                            ? 'max-w-[96px] grid-cols-2 gap-2'
                            : 'max-w-[130px] grid-cols-2 gap-3'
                          : numColumns >= 3
                          ? 'max-w-[160px] grid-cols-5 gap-1 sm:gap-1.5'
                          : 'max-w-[210px] grid-cols-5 gap-1.5 sm:gap-2'
                      } mx-auto grid text-center px-0.5 ${isDark ? 'text-zinc-200' : 'text-slate-900'}`}
                    >
                      {availableLetters.map(letter => (
                        <span key={letter}>{letter}</span>
                      ))}
                    </div>
                    <span className="text-right pr-0.5 w-[64px] shrink-0">Status</span>
                  </div>
                )}

                {/* Questions List */}
                <div className="space-y-1 flex-1">
                  {colQuestions.map(idx => {
                    const qNum = String(idx + 1).padStart(2, '0');
                    const userAns = userAnswers[idx];
                    const keyAns = keyAnswers[idx];
                    const hasKey = keyAns !== null && keyAns !== undefined;
                    const isFlagged = flaggedQuestions.includes(idx);
                    const isActive = activeQuestionIndex === idx;

                    let rowBgClass = isNotebook
                      ? 'hover:bg-[#f6efe1] hover:shadow-2xs border border-transparent'
                      : isDark
                      ? 'hover:bg-[#2a2c34] hover:shadow-2xs border border-transparent'
                      : 'hover:bg-[#edf2f7] hover:shadow-2xs border border-transparent';
                    let statusText: string | null = null;
                    let statusColorClass = '';
                    let statusTitle = '';

                    if (isCorrected) {
                      if (!hasKey) {
                        rowBgClass = isNotebook
                          ? 'bg-[#f7f4ea] border border-[#dfd7c5] hover:bg-[#f1ecd9]'
                          : isDark
                          ? 'bg-[#18191d]/60 border border-[#3b3e48] hover:bg-[#22242a]'
                          : 'bg-slate-50 border border-slate-200 hover:bg-slate-100';
                        statusText = 'Sem gab';
                        statusColorClass = isNotebook ? 'text-[#8c8270] font-medium' : isDark ? 'text-zinc-400 font-medium' : 'text-slate-400 font-medium';
                        statusTitle = 'Questão sem gabarito oficial cadastrado (não avaliada)';
                      } else if (userAns === null) {
                        rowBgClass = isNotebook
                          ? 'bg-[#f8f5ec] border border-dashed border-[#dfd7c5] hover:bg-[#f2ece0]'
                          : isDark
                          ? 'bg-[#18191d]/60 border border-dashed border-[#3b3e48] hover:bg-[#22242a]'
                          : 'bg-slate-50 border border-dashed border-slate-200 hover:bg-slate-100';
                        statusText = isTF ? '0 pt' : 'Branco';
                        statusColorClass = isNotebook ? 'text-[#7d7465] font-semibold' : isDark ? 'text-zinc-400 font-semibold' : 'text-slate-500 font-semibold';
                        statusTitle = `Questão deixada em branco (0 pt). Gabarito oficial: ${keyAns}`;
                      } else if (userAns === keyAns) {
                        // Acerto
                        rowBgClass = isNotebook
                          ? 'bg-[#edf5ee]/85 border border-[#c2ddc6] hover:bg-[#e3f0e5]'
                          : isDark
                          ? 'bg-emerald-950/30 border border-emerald-700/35 hover:bg-emerald-950/50'
                          : 'bg-emerald-50/70 border border-emerald-200 hover:bg-emerald-100/70';
                        statusText = isTF ? (isFlagged ? '⚠️ +1' : 'Certa (+1)') : 'Certa';
                        statusColorClass = isNotebook ? 'text-[#1e4e30] font-bold' : isDark ? 'text-emerald-400 font-bold' : 'text-emerald-700 font-bold';
                        statusTitle = 'Resposta correta! (+1 ponto na líquida)';
                      } else {
                        // Erro (No Cebraspe, desconta 1 ponto!) - Soft coral rose
                        rowBgClass = isNotebook
                          ? 'bg-[#faf0ee]/90 border border-[#eed1cb] hover:bg-[#f6e4e1]'
                          : isDark
                          ? 'bg-rose-950/30 border border-rose-700/35 hover:bg-rose-950/50'
                          : 'bg-red-50/80 border border-red-200 hover:bg-red-100/70';
                        statusText = isTF ? (isFlagged ? '⚠️ -1 pt' : '-1 pt') : `Gab: ${keyAns}`;
                        statusColorClass = isNotebook ? 'text-[#8a332c] font-bold' : isDark ? 'text-rose-300 font-bold' : 'text-red-700 font-bold';
                        statusTitle = `Resposta errada. Sua resposta: ${userAns} | Gabarito oficial: ${keyAns}${isTF ? ' (-1 ponto na nota líquida Cebraspe)' : ''}`;
                      }

                      // Visual highlight for questions flagged for review
                      if (isFlagged) {
                        rowBgClass += ' border-l-4 !border-l-amber-500 ring-1 ring-amber-400/30';
                      }
                    } else if (isActive) {
                      rowBgClass = isNotebook
                        ? 'bg-[#faf3df] ring-2 ring-amber-800/30 border-transparent rounded-lg'
                        : isDark
                        ? 'bg-[#2a2c34] ring-2 ring-zinc-400/40 border-transparent rounded-lg'
                        : 'bg-slate-100 ring-2 ring-slate-900/30 border-transparent rounded-lg';
                    }

                    const flagButton = (
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={e => {
                          e.stopPropagation();
                          if (!isLocked) onToggleFlag(idx);
                        }}
                        className={`p-0.5 sm:p-1 rounded transition shrink-0 ${
                          isLocked
                            ? 'cursor-not-allowed opacity-60 text-[#a0a6b5]'
                            : isFlagged
                            ? 'text-amber-500 hover:text-amber-400 cursor-pointer'
                            : isDark
                            ? 'text-zinc-500 hover:text-zinc-300 cursor-pointer'
                            : 'text-[#dedad0] hover:text-[#5b6478] cursor-pointer'
                        }`}
                        title={
                          isLocked
                            ? 'Modo de conferência travado'
                            : isFlagged
                            ? 'Remover marcação de dúvida'
                            : 'Marcar para revisar/dúvida'
                        }
                        aria-label={`Marcar questão ${qNum} para revisão`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isFlagged ? 'fill-current' : ''}`} />
                      </button>
                    );

                    // If not corrected but flagged, show a gentle indicator in the status zone
                    if (!statusText && isFlagged) {
                      statusText = 'Rev';
                      statusColorClass = isDark ? 'text-amber-400 font-semibold' : 'text-amber-700 font-semibold';
                      statusTitle = 'Marcada para revisão';
                    }

                    return (
                      <div
                        key={idx}
                        ref={el => {
                          rowRefs.current[idx] = el;
                        }}
                        onClick={() => onSetActiveQuestion(idx)}
                        className={`group rounded transition-all duration-150 cursor-pointer min-w-0 ${rowBgClass}`}
                      >
                        {isCardMode ? (
                          /* ==============================================================
                             MODE 1: SPACIOUS CARD LAYOUT (Generous touch targets & full row distribution)
                             Line 1: Question # and Flag on left, Status on right (zero overlap)
                             Line 2: Alternatives distributed evenly across the card width
                             ============================================================== */
                          <div className="p-2 sm:p-2.5 flex flex-col gap-1.5 w-full min-w-0">
                            {/* Line 1: Question Header & Status */}
                            <div className="flex items-center justify-between gap-2 w-full min-w-0">
                              <div className="flex items-center gap-1 min-w-0">
                                {flagButton}
                                <span
                                  className={`font-mono-code font-bold text-xs ${
                                    isActive
                                      ? isDark ? 'text-zinc-100 underline' : 'text-[#1c2b45] underline'
                                      : isDark ? 'text-zinc-200' : 'text-[#2b3952]'
                                  }`}
                                >
                                  Questão {qNum}
                                </span>
                              </div>
                              <div
                                className={`flex items-center justify-end min-w-0 text-right text-[10px] font-mono-code ${statusColorClass}`}
                                title={statusTitle}
                              >
                                {statusText}
                              </div>
                            </div>

                            {/* Line 2: Alternatives evenly distributed in card width */}
                            <div
                              className={`w-full ${
                                isTF ? 'max-w-[180px]' : 'max-w-sm'
                              } mx-auto flex items-center justify-center py-0.5`}
                            >
                              {renderBubbles(
                                idx,
                                qNum,
                                userAns,
                                keyAns,
                                hasKey,
                                isTF
                                  ? 'w-10 h-8 sm:w-12 sm:h-9 text-xs sm:text-sm'
                                  : 'w-8 h-8 sm:w-8.5 sm:h-8.5 text-xs'
                              )}
                            </div>
                          </div>
                        ) : (
                          /* ==============================================================
                             MODE 2: OPTICAL ANSWER SHEET ROW (Authentic aligned columns)
                             Strict CSS Grid: [38px] Left | [1fr] Middle | [64px] Right
                             Independent dedicated tracks ensure overlap is mathematically impossible!
                             ============================================================== */
                          <div className="grid grid-cols-[38px_1fr_64px] items-center gap-1 px-1.5 py-1 w-full min-w-0">
                            {/* Track 1 (Left): Flag & Question Number (strictly 38px) */}
                            <div className="flex items-center gap-0.5 min-w-0 shrink-0 w-[38px]">
                              {flagButton}
                              <span
                                className={`font-mono-code font-bold text-xs text-right w-5 transition-colors ${
                                  isActive
                                    ? isDark ? 'text-zinc-100 underline' : 'text-[#1c2b45] underline'
                                    : isDark ? 'text-zinc-400 group-hover:text-zinc-200' : 'text-[#5b6478] group-hover:text-[#1c2b45]'
                                }`}
                              >
                                {qNum}
                              </span>
                            </div>

                            {/* Track 2 (Center): Alternatives perfectly aligned with column guide */}
                            <div className="flex items-center justify-center min-w-0 flex-1 px-0.5 overflow-hidden">
                              <div
                                className={`w-full ${
                                  isTF
                                    ? numColumns >= 3
                                       ? 'max-w-[96px]'
                                       : 'max-w-[130px]'
                                    : numColumns >= 3
                                    ? 'max-w-[160px]'
                                    : 'max-w-[210px]'
                                } flex items-center justify-center`}
                              >
                                {renderBubbles(
                                  idx,
                                  qNum,
                                  userAns,
                                  keyAns,
                                  hasKey,
                                  isTF
                                    ? numColumns >= 3
                                      ? 'w-7.5 h-7 sm:w-8 sm:h-7.5 text-xs'
                                      : 'w-8.5 h-8 sm:w-9.5 sm:h-8.5 text-xs'
                                    : numColumns >= 3
                                    ? 'w-6 h-6 sm:w-6.5 sm:h-6.5 text-[11px]'
                                    : 'w-7 h-7 sm:w-7.5 sm:h-7.5 text-xs'
                                )}
                              </div>
                            </div>

                            {/* Track 3 (Right): Dedicated status slot (strictly 64px) */}
                            <div
                              className={`flex items-center justify-end min-w-0 text-right pr-0.5 shrink-0 w-[64px] overflow-hidden text-[10px] font-mono-code ${statusColorClass}`}
                              title={statusTitle}
                            >
                              {statusText}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
