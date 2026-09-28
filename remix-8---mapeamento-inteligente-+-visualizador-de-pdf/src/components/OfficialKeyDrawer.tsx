import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, Sparkles, Check, Trash2, Copy, FileText, CheckCircle2 } from 'lucide-react';
import { AnswerOption, ExamType, AppTheme } from '../types';
import { VALID_LETTERS_MC, VALID_LETTERS_TF, formatSequence, formatNumberedVOF, copyTextToClipboard } from '../utils/parser';
import { OfficialKeyImporter } from './OfficialKeyImporter';

interface OfficialKeyDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  total: number;
  keyAnswers: (AnswerOption | null)[];
  onKeyChange: (newKey: (AnswerOption | null)[]) => void;
  onClearKey: () => void;
  requestedTab?: 'import' | 'manual';
  examType?: ExamType;
  theme?: AppTheme;
}

export const OfficialKeyDrawer: React.FC<OfficialKeyDrawerProps> = ({
  isOpen,
  onToggle,
  total,
  keyAnswers,
  onKeyChange,
  onClearKey,
  requestedTab,
  examType = 'multiple_choice',
  theme = 'clean',
}) => {
  const isDark = theme === 'dark';
  const isNotebook = theme === 'notebook';
  const [drawerTab, setDrawerTab] = useState<'import' | 'manual'>('import');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const isTF = examType === 'true_false';
  const availableLetters: AnswerOption[] = isTF ? VALID_LETTERS_TF : VALID_LETTERS_MC;

  React.useEffect(() => {
    if (requestedTab) {
      setDrawerTab(requestedTab);
    }
  }, [requestedTab]);

  const filledCount = keyAnswers.filter(Boolean).length;

  const handleCopyKey = async () => {
    const seq = isTF ? formatNumberedVOF(keyAnswers) : formatSequence(keyAnswers, 10);
    const success = await copyTextToClipboard(seq);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSelectKeyBubble = (qIdx: number, letter: AnswerOption) => {
    const next = [...keyAnswers];
    next[qIdx] = next[qIdx] === letter ? null : letter;
    onKeyChange(next);
  };

  const handleConfirmFromImporter = (newKey: (AnswerOption | null)[]) => {
    onKeyChange(newKey);
    setDrawerTab('manual');
    setFeedbackMsg('Gabarito oficial salvo com sucesso.');
    setTimeout(() => setFeedbackMsg(''), 4500);
  };

  const perCol = total <= 20 ? total : total <= 50 ? 25 : total <= 75 ? 25 : 30;
  const numCols = Math.ceil(total / perCol);

  return (
    <div className={`border rounded-xl mb-6 overflow-hidden transition-all shadow-xs ${
      isDark
        ? 'border-amber-700/50 bg-[#22242a] text-zinc-100'
        : isNotebook
        ? 'border-[#ded7c6] bg-[#fdfbf7] text-[#1c2b45]'
        : 'border-slate-300 bg-white text-slate-900'
    }`}>
      {/* Drawer Bar Header */}
      <div
        onClick={onToggle}
        className={`flex items-center justify-between px-3 sm:px-4 py-3 cursor-pointer transition select-none flex-wrap gap-2 ${
          isDark
            ? 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-200'
            : isNotebook
            ? 'bg-[#fefce8] hover:bg-[#fef9c3] text-[#854d0e]'
            : 'bg-amber-50/80 hover:bg-amber-100/80 text-amber-950'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <BookOpen className="w-4 h-4 text-amber-500" />
          <h2 className="font-serif-title italic font-semibold text-base">
            Gabarito Oficial da Prova
          </h2>
          <span className={`text-xs font-mono-code font-bold px-2 py-0.5 rounded-full ml-1 ${
            isDark ? 'bg-amber-600 text-white' : isNotebook ? 'bg-[#854d0e] text-white' : 'bg-slate-900 text-white'
          }`}>
            {filledCount} de {total} questões
          </span>
          {isTF && (
            <span className={`text-[11px] font-mono-code font-semibold px-2 py-0.5 rounded-full border ${
              isDark
                ? 'bg-amber-900/60 text-amber-200 border-amber-700/60'
                : 'bg-amber-200 text-amber-900 border-amber-300'
            }`}>
              Formato V/F
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs font-mono-code opacity-90">
          <span>{isOpen ? 'Ocultar gabarito' : 'Visualizar ou colar gabarito'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Drawer Body Content */}
      {isOpen && (
        <div className="p-4 space-y-4">
          {/* Subtabs: Importar com conferência vs Marcação manual */}
          <div className={`flex items-center justify-between border-b pb-2 flex-wrap gap-2 ${
            isDark ? 'border-[#3b3e48]' : 'border-[#dedad0]'
          }`}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerTab('import')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  drawerTab === 'import'
                    ? isDark
                      ? 'bg-amber-600 text-white shadow-2xs font-bold'
                      : isNotebook
                      ? 'bg-[#854d0e] text-white shadow-2xs font-bold'
                      : 'bg-slate-900 text-white shadow-2xs font-bold'
                    : isDark
                    ? 'bg-[#2a2c34] text-zinc-300 hover:text-white border border-[#3b3e48]'
                    : isNotebook
                    ? 'bg-white text-[#5b6478] hover:text-[#1c2b45] border border-[#dedad0]'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Colar Gabarito (com conferência)</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawerTab('manual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  drawerTab === 'manual'
                    ? isDark
                      ? 'bg-amber-600 text-white shadow-2xs font-bold'
                      : isNotebook
                      ? 'bg-[#854d0e] text-white shadow-2xs font-bold'
                      : 'bg-slate-900 text-white shadow-2xs font-bold'
                    : isDark
                    ? 'bg-[#2a2c34] text-zinc-300 hover:text-white border border-[#3b3e48]'
                    : isNotebook
                    ? 'bg-white text-[#5b6478] hover:text-[#1c2b45] border border-[#dedad0]'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Gabarito Atual ({filledCount}/{total})</span>
              </button>
            </div>

            {/* Quick Actions if filled */}
            {filledCount > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className={`px-2.5 py-1 text-xs border rounded-md flex items-center gap-1 cursor-pointer transition ${
                    isDark
                      ? 'border-[#3b3e48] bg-[#2a2c34] hover:bg-[#343740] text-zinc-200'
                      : isNotebook
                      ? 'border-[#dedad0] bg-white hover:bg-[#f0eee6] text-[#1c2b45]'
                      : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800'
                  }`}
                  title="Copiar sequência do gabarito oficial cadastrado"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClearKey}
                  className={`px-2.5 py-1 text-xs rounded-md flex items-center gap-1 cursor-pointer transition ${
                    isDark
                      ? 'text-rose-300 hover:bg-rose-950/40'
                      : 'text-[#a63b2c] hover:bg-red-50'
                  }`}
                  title="Limpar gabarito oficial"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Limpar</span>
                </button>
              </div>
            )}
          </div>

          {/* Feedback message banner */}
          {feedbackMsg && (
            <div className={`p-2.5 border rounded-lg flex items-center gap-2 text-xs animate-fadeIn ${
              isDark ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{feedbackMsg}</span>
            </div>
          )}

          {/* Tab 1: Importer with 2-step mandatory review */}
          {drawerTab === 'import' && (
            <OfficialKeyImporter
              totalQuestions={total}
              currentKeyAnswers={keyAnswers}
              onConfirmKey={handleConfirmFromImporter}
              isDrawerMode
              examType={examType}
              theme={theme}
            />
          )}

          {/* Tab 2: Manual viewing & direct editing */}
          {drawerTab === 'manual' && (
            <div className="space-y-3">
              <div className={`flex items-center justify-between text-xs ${isDark ? 'text-zinc-400' : 'text-[#5b6478]'}`}>
                <span>Marcação direta e conferência do gabarito oficial salvo:</span>
                <span className={`font-mono-code font-bold ${isDark ? 'text-amber-400' : 'text-[#854d0e]'}`}>
                  {filledCount} de {total} preenchidas
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 sm:gap-4 w-full">
                {Array.from({ length: numCols }).map((_, c) => {
                  const colQuestions: number[] = [];
                  for (let i = c * perCol; i < Math.min((c + 1) * perCol, total); i++) {
                    colQuestions.push(i);
                  }

                  return (
                    <div
                      key={c}
                      className={`w-full min-w-0 rounded-lg p-2.5 border text-xs shadow-2xs ${
                        isDark
                          ? 'bg-[#18191d] border-[#3b3e48]'
                          : isNotebook
                          ? 'bg-[#fdfbf7] border-[#ded7c6]'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Column Guide Bar: Nº | A B C D E or Nº | V F */}
                      <div className={`grid grid-cols-[2rem_1fr] items-center gap-2 px-1 pb-1.5 mb-1.5 border-b text-[10px] font-mono-code font-bold uppercase tracking-wider select-none ${
                        isDark
                          ? 'border-[#3b3e48] text-amber-400'
                          : isNotebook
                          ? 'border-[#ded7c6] text-[#854d0e]'
                          : 'border-slate-200 text-slate-700'
                      }`}>
                        <span className="text-right">Nº</span>
                        <div className={`grid ${isTF ? 'grid-cols-2' : 'grid-cols-5'} gap-1 text-center`}>
                          {availableLetters.map(letter => (
                            <span key={letter}>{letter}</span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        {colQuestions.map(idx => {
                          const qNum = String(idx + 1).padStart(2, '0');
                          const selected = keyAnswers[idx];

                          return (
                            <div
                              key={idx}
                              className={`group grid grid-cols-[2rem_1fr] items-center gap-2 py-0.5 px-1 rounded transition-all duration-150 ${
                                isDark
                                  ? 'hover:bg-[#2a2c34]'
                                  : isNotebook
                                  ? 'hover:bg-[#fef9c3]/60'
                                  : 'hover:bg-slate-100'
                              }`}
                            >
                              <span className={`font-mono-code text-right font-medium transition-colors ${
                                isDark
                                  ? 'text-zinc-400 group-hover:text-amber-300'
                                  : isNotebook
                                  ? 'text-[#5b6478] group-hover:text-[#854d0e]'
                                  : 'text-slate-500 group-hover:text-slate-900'
                              }`}>
                                {qNum}
                              </span>
                              <div className={`grid ${isTF ? 'grid-cols-2' : 'grid-cols-5'} gap-1 justify-items-center`}>
                                {availableLetters.map(letter => {
                                  const isChosen = selected === letter;
                                  return (
                                    <button
                                      key={letter}
                                      type="button"
                                      onClick={() => handleSelectKeyBubble(idx, letter)}
                                      className={`w-6 h-6 rounded-full border text-xs font-mono-code font-semibold flex items-center justify-center transition-all duration-150 cursor-pointer ${
                                        isChosen
                                          ? isDark
                                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs hover:scale-115'
                                            : isNotebook
                                            ? 'bg-[#854d0e] text-white border-[#854d0e] shadow-xs hover:scale-115 hover:bg-[#713f12]'
                                            : 'bg-slate-900 text-white border-slate-900 shadow-xs hover:scale-115 hover:bg-slate-800'
                                          : isDark
                                          ? 'border-amber-600/50 text-amber-300 hover:bg-amber-600 hover:text-white hover:border-amber-600 hover:scale-115'
                                          : isNotebook
                                          ? 'border-[#854d0e]/40 text-[#854d0e] hover:bg-[#854d0e] hover:text-white hover:border-[#854d0e] hover:scale-115'
                                          : 'border-slate-300 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 hover:scale-115'
                                      }`}
                                      title={`Questão ${qNum}: definir gabarito oficial ${letter}`}
                                    >
                                      {letter}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
