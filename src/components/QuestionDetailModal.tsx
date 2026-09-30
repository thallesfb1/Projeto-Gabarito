import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  Bookmark,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Upload,
  Edit3,
  Check,
  RotateCcw,
  Loader2,
  ExternalLink,
  Tag,
} from 'lucide-react';
import { AnswerOption, AppTheme, ExamType, SimuladoQuestionItem, SimuladoQuestionAlternative } from '../types';

interface QuestionDetailModalProps {
  isOpen: boolean;
  questionIndex: number | null;
  totalQuestions: number;
  question?: SimuladoQuestionItem;
  userAnswer?: AnswerOption | null;
  keyAnswer?: AnswerOption | null;
  isCorrected: boolean;
  isLocked?: boolean;
  isFlagged?: boolean;
  examType?: ExamType;
  theme?: AppTheme;
  pdfFileName?: string;
  onClose: () => void;
  onSelectQuestion: (index: number) => void;
  onSelectAnswer?: (index: number, answer: AnswerOption) => void;
  onToggleFlag?: (index: number) => void;
  onOpenPdfImport?: () => void;
  onUpdateQuestion?: (index: number, updatedQuestion: SimuladoQuestionItem) => void;
}

export const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({
  isOpen,
  questionIndex,
  totalQuestions,
  question,
  userAnswer,
  keyAnswer,
  isCorrected,
  isLocked = false,
  isFlagged = false,
  examType = 'multiple_choice',
  theme = 'clean',
  pdfFileName,
  onClose,
  onSelectQuestion,
  onSelectAnswer,
  onToggleFlag,
  onOpenPdfImport,
  onUpdateQuestion,
}) => {
  const isNotebook = theme === 'notebook';

  const [isEditing, setIsEditing] = useState(false);
  const [statementDraft, setStatementDraft] = useState('');
  const [subjectDraft, setSubjectDraft] = useState('');
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const [explanationTab, setExplanationTab] = useState<'brief' | 'deep'>('brief');

  // Sync draft when question changes
  useEffect(() => {
    if (question) {
      setStatementDraft(question.statement || '');
      setSubjectDraft(question.subject || '');
      if (question.deepExplanation) {
        setExplanationTab('deep');
      } else {
        setExplanationTab('brief');
      }
    } else {
      setStatementDraft('');
      setSubjectDraft('');
      setExplanationTab('brief');
    }
    setIsEditing(false);
    setExplanationError(null);
  }, [questionIndex, question]);

  // Keyboard navigation inside modal: Left/Right arrows, Esc to close
  useEffect(() => {
    if (!isOpen || questionIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // If user is editing text in a textarea or input, do not trigger arrows navigation
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        if (e.key === 'Escape') {
          setIsEditing(false);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft' && questionIndex > 0) {
        e.preventDefault();
        onSelectQuestion(questionIndex - 1);
      } else if (e.key === 'ArrowRight' && questionIndex < totalQuestions - 1) {
        e.preventDefault();
        onSelectQuestion(questionIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, questionIndex, totalQuestions, onClose, onSelectQuestion]);

  // Options to display: either from the parsed question or default available letters
  const isTF = examType === 'true_false';
  const defaultLetters: AnswerOption[] = isTF ? ['V', 'F'] : ['A', 'B', 'C', 'D', 'E'];

  const optionsList: SimuladoQuestionAlternative[] =
    question?.options && question.options.length > 0
      ? question.options
      : defaultLetters.map(letter => ({
          letter,
          text: '',
        }));

  // Track auto-fetched questions to prevent duplicate background requests in the session
  const autoFetchedQuestionsRef = useRef<Set<number>>(new Set());

  // Handle request for deep AI explanation on demand
  const handleGenerateAiExplanation = async () => {
    if (!question || !question.statement || questionIndex === null) return;

    setIsGeneratingExplanation(true);
    setExplanationError(null);

    try {
      const res = await fetch('/api/gemini/explain-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionNumber: questionIndex + 1,
          statement: question.statement,
          options: question.options,
          officialAnswer: keyAnswer || question.officialAnswer || null,
          userAnswer: userAnswer || null,
          examType,
        }),
      });

      const resText = await res.text();
      let data: any;
      try {
        data = JSON.parse(resText);
      } catch {
        throw new Error(`Erro temporário no servidor (${res.status}). Aguarde alguns instantes e tente novamente.`);
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Não foi possível gerar a explicação com a IA.');
      }

      if (onUpdateQuestion) {
        onUpdateQuestion(questionIndex, {
          ...question,
          deepExplanation: data.explanation,
          explanation: question.explanation || 'Comentário gerado pela IA. Veja os detalhes na análise aprofundada.',
        });
        setExplanationTab('deep');
      }
    } catch (err: any) {
      console.error('Erro ao gerar explicação aprofundada:', err);
      setExplanationError(err?.message || 'Erro ao comunicar com o servidor da IA.');
    } finally {
      setIsGeneratingExplanation(false);
    }
  };

  // Automatically fetch commentary when opening question if official gabarito is attached
  useEffect(() => {
    if (!isOpen || questionIndex === null || !question || !question.statement) return;

    const hasKnownKey = Boolean(keyAnswer || question.officialAnswer);
    const hasAnyExplanation = Boolean(question.deepExplanation || question.explanation);

    if (
      hasKnownKey &&
      !hasAnyExplanation &&
      !isGeneratingExplanation &&
      !autoFetchedQuestionsRef.current.has(questionIndex)
    ) {
      autoFetchedQuestionsRef.current.add(questionIndex);
      handleGenerateAiExplanation();
    }
  }, [isOpen, questionIndex, keyAnswer, question?.statement, question?.officialAnswer, question?.deepExplanation, question?.explanation, isGeneratingExplanation]);

  if (!isOpen || questionIndex === null) return null;

  const currentNumber = questionIndex + 1;
  const hasKey = keyAnswer !== null && keyAnswer !== undefined;
  const isHit = isCorrected && hasKey && userAnswer === keyAnswer;
  const isMiss = isCorrected && hasKey && userAnswer !== null && userAnswer !== keyAnswer;
  const isBlank = isCorrected && hasKey && (userAnswer === null || userAnswer === undefined);

  const handleSaveManualEdit = () => {
    if (onUpdateQuestion) {
      const current = question || {
        number: currentNumber,
        statement: statementDraft,
      };
      onUpdateQuestion(questionIndex, {
        ...current,
        statement: statementDraft.trim(),
        subject: subjectDraft.trim() || null,
      });
    }
    setIsEditing(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden transition-all duration-200 ${
          isNotebook
            ? 'bg-[#fdfbf7] border-[#ded7c6] text-[#1c2b45]'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Top Header Bar */}
        <div
          className={`flex items-center justify-between px-4 sm:px-6 py-3.5 border-b shrink-0 select-none ${
            isNotebook ? 'border-[#ded7c6] bg-[#f6efe1]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Flag Review Button */}
            {onToggleFlag && (
              <button
                type="button"
                disabled={isLocked}
                onClick={() => onToggleFlag(questionIndex)}
                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                  isFlagged
                    ? 'bg-amber-100 border-amber-300 text-amber-700 shadow-2xs'
                    : isNotebook
                    ? 'border-[#ded7c6] text-[#827867] hover:text-[#1c2b45] hover:bg-white'
                    : 'border-slate-200 text-slate-400 hover:text-slate-800 hover:bg-white'
                }`}
                title={isFlagged ? 'Remover marcação de dúvida' : 'Marcar para revisão'}
              >
                <Bookmark className={`w-4 h-4 ${isFlagged ? 'fill-current text-amber-600' : ''}`} />
              </button>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-mono-code font-bold text-base sm:text-lg">
                  Questão {String(currentNumber).padStart(2, '0')}
                </h2>
                <span className="text-xs text-slate-600 font-mono-code">
                  de {totalQuestions}
                </span>

                {/* Subject Tag */}
                {question?.subject && (
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                      isNotebook
                        ? 'bg-[#ece5d5] border-[#d8cfbe] text-[#423a2f]'
                        : 'bg-slate-200/70 border-slate-300 text-slate-700'
                    }`}
                  >
                    <Tag className="w-3 h-3 text-slate-500" />
                    <span>{question.subject}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Badge in Correction Mode */}
            {isCorrected && (
              <div className="hidden xs:flex items-center gap-1 text-xs font-mono-code font-semibold px-2.5 py-1 rounded-full border shadow-2xs">
                {isHit && (
                  <span className="text-emerald-700 bg-emerald-50 border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Acerto (+1)
                  </span>
                )}
                {isMiss && (
                  <span className="text-red-700 bg-red-50 border-red-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                    Erro (Gab: {keyAnswer})
                  </span>
                )}
                {isBlank && (
                  <span className="text-slate-600 bg-slate-100 border-slate-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                    Em branco (Gab: {keyAnswer})
                  </span>
                )}
                {!hasKey && (
                  <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    Sem gabarito
                  </span>
                )}
              </div>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                isNotebook
                  ? 'hover:bg-[#eae1d0] text-[#6b6255]'
                  : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
              }`}
              title="Fechar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Main Question Statement */}
          {question && question.statement ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 font-mono-code">
                <span className="font-semibold uppercase tracking-wider">Enunciado:</span>
                <div className="flex items-center gap-2">
                  {question.page && (
                    <span className="text-[11px] text-slate-600">Pág. {question.page} do PDF</span>
                  )}
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-slate-600 hover:text-slate-900 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                      title="Editar enunciado manualmente"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={subjectDraft}
                    onChange={e => setSubjectDraft(e.target.value)}
                    placeholder="Disciplina ou Matéria (opcional)"
                    className={`w-full px-3 py-1.5 text-xs rounded-lg border outline-none font-mono-code ${
                      isNotebook
                        ? 'bg-white border-[#ded7c6] text-[#1c2b45]'
                        : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                  <textarea
                    rows={6}
                    value={statementDraft}
                    onChange={e => setStatementDraft(e.target.value)}
                    placeholder="Digite ou cole o enunciado da questão..."
                    className={`w-full p-3 text-sm rounded-lg border outline-none font-sans leading-relaxed resize-y ${
                      isNotebook
                        ? 'bg-white border-[#ded7c6] text-[#1c2b45]'
                        : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1 text-xs rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveManualEdit}
                      className="px-3.5 py-1 text-xs rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`p-4 rounded-xl border text-sm sm:text-base leading-relaxed whitespace-pre-line shadow-2xs font-sans ${
                    isNotebook
                      ? 'bg-white/80 border-[#ded7c6] text-[#2b3952]'
                      : 'bg-slate-50/70 border-slate-200 text-slate-900'
                  }`}
                >
                  {question.statement}
                </div>
              )}
            </div>
          ) : (
            /* Empty State when no question statement has been extracted yet */
            <div
              className={`p-6 sm:p-8 rounded-xl border text-center space-y-3.5 ${
                isNotebook ? 'bg-[#fcfaf4] border-[#ded7c6]' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-200/80 flex items-center justify-center text-slate-600">
                <BookOpen className="w-6 h-6 text-slate-600" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-bold text-sm sm:text-base">
                  Enunciado ainda não vinculado a esta questão
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Importe o caderno de prova em PDF para extrair automaticamente todas as questões,
                  alternativas e explicações didáticas com IA.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2.5 pt-2 flex-wrap">
                {onOpenPdfImport && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPdfImport();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm cursor-pointer transition"
                  >
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Importar Prova em PDF com IA</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer transition"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Digitar Enunciado</span>
                </button>
              </div>

              {isEditing && (
                <div className="mt-4 pt-4 border-t border-slate-200 text-left space-y-2">
                  <textarea
                    rows={4}
                    value={statementDraft}
                    onChange={e => setStatementDraft(e.target.value)}
                    placeholder="Digite ou cole o enunciado da questão..."
                    className="w-full p-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white text-slate-900 outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1 text-xs rounded border border-slate-300 text-slate-700"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveManualEdit}
                      className="px-3 py-1 text-xs rounded bg-slate-900 text-white font-medium"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Alternatives List */}
          <div className="space-y-2">
            <span className="text-xs font-mono-code font-semibold uppercase tracking-wider text-slate-600">
              Alternativas de Resposta:
            </span>

            <div className="space-y-2">
              {optionsList.map(opt => {
                const isSelected = userAnswer === opt.letter;
                const isOfficialKey = keyAnswer === opt.letter;

                let optCardStyle = isNotebook
                  ? 'bg-white border-[#ded7c6] hover:border-[#1c2b45]/40 text-[#2b3952]'
                  : 'bg-white border-slate-200 hover:border-slate-400 text-slate-800';

                let bubbleStyle = isNotebook
                  ? 'bg-[#fffefb] text-[#2b3952] border-[#ded7c6]'
                  : 'bg-white text-slate-800 border-slate-300';

                if (isCorrected) {
                  if (isSelected && isOfficialKey) {
                    // User chose correct answer
                    optCardStyle = isNotebook
                      ? 'bg-[#edf5ee] border-emerald-500 ring-1 ring-emerald-500/20 text-[#8e3703]'
                      : 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/20 text-emerald-950';
                    bubbleStyle = 'bg-emerald-600 text-white border-emerald-600 font-bold';
                  } else if (isSelected && !isOfficialKey) {
                    // User chose wrong answer
                    optCardStyle = isNotebook
                      ? 'bg-[#faf0ee] border-red-500 ring-1 ring-red-500/20 text-[#8a332c]'
                      : 'bg-red-50 border-red-500 ring-1 ring-red-500/20 text-red-950';
                    bubbleStyle = 'bg-red-600 text-white border-red-600 font-bold';
                  } else if (isOfficialKey) {
                    // Correct answer that user didn't choose
                    optCardStyle = isNotebook
                      ? 'bg-[#eef6f0] border-2 border-emerald-600 font-semibold text-[#8e3703]'
                      : 'bg-emerald-50 border-2 border-emerald-600 font-semibold text-emerald-950';
                    bubbleStyle = 'bg-emerald-600 text-white border-emerald-600 font-bold';
                  }
                } else if (isSelected) {
                  optCardStyle = isNotebook
                    ? 'bg-[#f4efe3] border-[#1c2b45] ring-1 ring-[#1c2b45]/20 font-medium'
                    : 'bg-slate-100 border-slate-900 ring-1 ring-slate-900/20 font-medium';
                  bubbleStyle = isNotebook
                    ? 'bg-[#1c2b45] text-white border-[#1c2b45]'
                    : 'bg-slate-900 text-white border-slate-900';
                }

                return (
                  <div
                    key={opt.letter}
                    onClick={() => {
                      if (!isLocked && onSelectAnswer) {
                        onSelectAnswer(questionIndex, opt.letter);
                      }
                    }}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                      isLocked ? 'cursor-default' : 'cursor-pointer'
                    } ${optCardStyle}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center font-mono-code font-bold text-xs shrink-0 mt-0.5 transition-transform ${bubbleStyle}`}
                    >
                      {opt.letter}
                    </div>

                    <div className="flex-1 min-w-0 text-xs sm:text-sm leading-relaxed pt-0.5">
                      {opt.text ? (
                        <span>{opt.text}</span>
                      ) : (
                        <span className="italic text-slate-600">Alternativa ({opt.letter})</span>
                      )}
                    </div>

                    {isCorrected && (
                      <div className="shrink-0 pt-0.5">
                        {isOfficialKey && (
                          <span className="text-[11px] font-mono-code font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Gabarito
                          </span>
                        )}
                        {isSelected && !isOfficialKey && (
                          <span className="text-[11px] font-mono-code font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <X className="w-3 h-3" />
                            Sua escolha
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Explanation / Pedagogical Commentary Section */}
          <div className="space-y-2.5 pt-2">
            <div className="flex items-center justify-between text-xs font-mono-code flex-wrap gap-2">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className={isNotebook ? 'text-[#1c2b45]' : 'text-slate-800'}>
                  Comentários Pedagógicos da IA
                </span>
              </div>

              {/* Tabs when deep explanation is available */}
              {question?.deepExplanation && (
                <div
                  className={`inline-flex p-0.5 rounded-lg border text-[11px] ${
                    isNotebook
                      ? 'bg-[#f0eee6] border-[#ded7c6]'
                      : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setExplanationTab('brief')}
                    className={`px-2.5 py-0.5 rounded-md transition font-medium cursor-pointer ${
                      explanationTab === 'brief'
                        ? isNotebook
                          ? 'bg-white text-[#1c2b45] shadow-2xs font-bold'
                          : 'bg-white text-slate-900 shadow-2xs font-bold'
                        : isNotebook
                        ? 'text-[#6b6255] hover:text-[#1c2b45]'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⚡ Breve
                  </button>
                  <button
                    type="button"
                    onClick={() => setExplanationTab('deep')}
                    className={`px-2.5 py-0.5 rounded-md transition font-medium cursor-pointer ${
                      explanationTab === 'deep'
                        ? isNotebook
                          ? 'bg-white text-[#1c2b45] shadow-2xs font-bold'
                          : 'bg-white text-slate-900 shadow-2xs font-bold'
                        : isNotebook
                        ? 'text-[#6b6255] hover:text-[#1c2b45]'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📖 Aprofundada
                  </button>
                </div>
              )}
            </div>

            {/* If has brief explanation */}
            {question?.explanation && explanationTab === 'brief' && (
              <div className="space-y-3">
                <div
                  className={`p-4 rounded-xl border text-xs sm:text-sm leading-relaxed shadow-2xs font-sans ${
                    isNotebook
                      ? 'bg-[#f7f3e8] border-[#ded7c6] text-[#2b3952]'
                      : 'bg-amber-50/50 border-amber-200/80 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-mono-code font-bold text-amber-900 mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                    <span>Comentário Rápido:</span>
                  </div>
                  <p className="whitespace-pre-line">{question.explanation}</p>
                </div>

                {/* Option to dive deeper if deepExplanation isn't generated yet */}
                {!question?.deepExplanation && (
                  <div
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                      isNotebook
                        ? 'bg-[#fcfaf4] border-[#ded7c6]'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <span className={`font-semibold block ${isNotebook ? 'text-[#1c2b45]' : 'text-slate-800'}`}>
                        Deseja entender a questão a fundo?
                      </span>
                      <p className={`text-[11px] mt-0.5 ${isNotebook ? 'text-[#6b6255]' : 'text-slate-500'}`}>
                        A IA analisa a fundamentação teórica, o erro de cada alternativa e macetes da banca.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isGeneratingExplanation}
                      onClick={handleGenerateAiExplanation}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm transition cursor-pointer disabled:opacity-50 shrink-0 font-sans"
                    >
                      {isGeneratingExplanation ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Aprofundando com IA...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Aprofundar Explicação</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* If viewing deep explanation */}
            {question?.deepExplanation && explanationTab === 'deep' && (
              <div className="space-y-2">
                <div
                  className={`p-4 sm:p-5 rounded-xl border text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-xs font-sans space-y-2 ${
                    isNotebook
                      ? 'bg-[#fbf8f0] border-[#ded7c6] text-[#1c2b45]'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between border-b pb-2 mb-2 border-slate-200/80">
                    <span className="font-mono-code font-bold text-xs text-amber-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Análise Pedagógica Detalhada
                    </span>
                    <button
                      type="button"
                      disabled={isGeneratingExplanation}
                      onClick={handleGenerateAiExplanation}
                      className="text-[11px] font-mono-code text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                      title="Gerar nova análise"
                    >
                      <RotateCcw className={`w-3 h-3 ${isGeneratingExplanation ? 'animate-spin' : ''}`} />
                      <span>Atualizar Análise</span>
                    </button>
                  </div>
                  <div>{question.deepExplanation}</div>
                </div>
              </div>
            )}

            {/* If background loading commentary */}
            {isGeneratingExplanation && !question?.deepExplanation && !question?.explanation && (
              <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 flex items-center gap-3 text-xs text-amber-950 animate-fadeIn">
                <Loader2 className="w-5 h-5 animate-spin text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-950">
                    Buscando comentário didático com IA em segundo plano...
                  </p>
                  <p className="text-[11px] text-amber-800">
                    {keyAnswer || question?.officialAnswer
                      ? `Gabarito oficial identificado (${keyAnswer || question?.officialAnswer}). A IA está fundamentando a resposta da banca.`
                      : 'Analisando o enunciado e alternativas pedagógicas...'}
                  </p>
                </div>
              </div>
            )}

            {/* If neither explanation exists and not loading */}
            {!isGeneratingExplanation && !question?.explanation && !question?.deepExplanation && (
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
                  isNotebook
                    ? 'bg-[#fcfaf4] border-[#ded7c6] text-[#6b6255]'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    {keyAnswer || question?.officialAnswer ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Gabarito Oficial: {keyAnswer || question?.officialAnswer}</span>
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-4 h-4 text-amber-600" />
                        <span>Gabarito da banca não anexado</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {keyAnswer || question?.officialAnswer
                      ? 'Clique no botão para gerar a fundamentação precisa com IA baseada na resposta da banca.'
                      : 'Anexe o gabarito oficial na tela principal para que a IA gere comentários 100% alinhados com a banca.'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isGeneratingExplanation}
                  onClick={handleGenerateAiExplanation}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-2xs cursor-pointer transition disabled:opacity-50 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{keyAnswer || question?.officialAnswer ? 'Gerar Comentário da Banca' : 'Explicar com IA'}</span>
                </button>
              </div>
            )}

            {explanationError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                ⚠️ {explanationError}
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer Navigation */}
        <div
          className={`flex items-center justify-between px-4 sm:px-6 py-3 border-t shrink-0 select-none ${
            isNotebook ? 'border-[#ded7c6] bg-[#f6efe1]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          {/* Previous Question Button */}
          <button
            type="button"
            disabled={questionIndex <= 0}
            onClick={() => onSelectQuestion(questionIndex - 1)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-mono-code font-semibold rounded-lg border transition ${
              questionIndex <= 0
                ? 'opacity-40 cursor-not-allowed border-transparent text-slate-400'
                : isNotebook
                ? 'bg-white border-[#ded7c6] hover:bg-[#ede7d8] text-[#1c2b45] cursor-pointer'
                : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800 cursor-pointer shadow-2xs'
            }`}
            title="Questão anterior (Seta para a esquerda)"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Anterior</span>
          </button>

          {/* Question Jump Selector */}
          <div className="flex items-center gap-1.5 font-mono-code text-xs text-slate-600">
            <span className="hidden sm:inline">Ir para:</span>
            <select
              value={questionIndex}
              onChange={e => onSelectQuestion(Number(e.target.value))}
              className={`px-2 py-1 text-xs rounded-md border font-mono-code font-bold outline-none cursor-pointer ${
                isNotebook
                  ? 'bg-white border-[#ded7c6] text-[#1c2b45]'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              {Array.from({ length: totalQuestions }, (_, i) => (
                <option key={i} value={i}>
                  Questão {String(i + 1).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>

          {/* Next Question Button */}
          <button
            type="button"
            disabled={questionIndex >= totalQuestions - 1}
            onClick={() => onSelectQuestion(questionIndex + 1)}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-mono-code font-semibold rounded-lg border transition ${
              questionIndex >= totalQuestions - 1
                ? 'opacity-40 cursor-not-allowed border-transparent text-slate-400'
                : isNotebook
                ? 'bg-white border-[#ded7c6] hover:bg-[#ede7d8] text-[#1c2b45] cursor-pointer'
                : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800 cursor-pointer shadow-2xs'
            }`}
            title="Próxima questão (Seta para a direita)"
          >
            <span className="hidden xs:inline">Próxima</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
