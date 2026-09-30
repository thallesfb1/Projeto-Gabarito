import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  BookOpen,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AnswerOption, AppTheme, ExamType, SimuladoQuestionItem } from '../types';
import { parseOfficialKey } from '../utils/officialKeyParser';

interface PdfExamImportModalProps {
  isOpen: boolean;
  theme?: AppTheme;
  currentTotalQuestions: number;
  currentExamType?: ExamType;
  simuladoTitle?: string;
  onClose: () => void;
  onImportComplete: (payload: {
    fileName: string;
    questions: SimuladoQuestionItem[];
    detectedKey?: (AnswerOption | null)[];
    examTitle?: string;
    examType?: ExamType;
    totalQuestions: number;
    destinationMode?: 'current' | 'new';
  }) => void;
  onOpenKeyDrawer?: (tab?: 'import' | 'manual') => void;
}

export const PdfExamImportModal: React.FC<PdfExamImportModalProps> = ({
  isOpen,
  theme = 'clean',
  currentTotalQuestions,
  currentExamType = 'multiple_choice',
  simuladoTitle,
  onClose,
  onImportComplete,
  onOpenKeyDrawer,
}) => {
  const isNotebook = theme === 'notebook';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [destinationMode, setDestinationMode] = useState<'current' | 'new'>(simuladoTitle ? 'current' : 'new');

  const [generateExplanations, setGenerateExplanations] = useState(false);
  const [extractKey, setExtractKey] = useState(true);
  const [adjustTotalQuestions, setAdjustTotalQuestions] = useState(true);

  // Direct Banca Key Input for 100% precision (0 divergences)
  const [bancaKeyText, setBancaKeyText] = useState('');
  const [showBancaKeyInput, setShowBancaKeyInput] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [resultSummary, setResultSummary] = useState<{
    questionsCount: number;
    hasKey: boolean;
    keyCount: number;
    title?: string;
    bancaKeyApplied?: boolean;
    payload?: any;
  } | null>(null);

  // Detect how many valid answers are in the pasted banca key in real time
  const detectedBancaCount = React.useMemo(() => {
    if (!bancaKeyText.trim()) return 0;
    try {
      const parsed = parseOfficialKey(bancaKeyText.trim(), 200, currentExamType);
      return parsed.detectedCount;
    } catch {
      return 0;
    }
  }, [bancaKeyText, currentExamType]);

  // Crucial: Cleanly reset state and file input value whenever modal opens
  // so the user can import, delete and re-import the exact same PDF without any blockage!
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setIsProcessing(false);
      setProcessStep(0);
      setErrorMessage(null);
      setResultSummary(null);
      setBancaKeyText('');
      setShowBancaKeyInput(false);
      setDestinationMode(simuladoTitle ? 'current' : 'new');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen, simuladoTitle]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('Por favor, selecione um arquivo no formato PDF (.pdf).');
        return;
      }
      if (file.size > 40 * 1024 * 1024) {
        setErrorMessage('O arquivo PDF excede o limite recomendado de 40MB.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
      setResultSummary(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setErrorMessage('Por favor, arraste um arquivo no formato PDF (.pdf).');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
      setResultSummary(null);
    }
  };

  const handleStartProcessing = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setProcessStep(1);

    try {
      // Step 1: Read file as base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res);
        };
        reader.onerror = () => reject(new Error('Falha ao ler o arquivo PDF local.'));
      });
      reader.readAsDataURL(selectedFile);
      const base64Data = await base64Promise;

      setProcessStep(2);

      // Step 2: Call backend endpoint to let Gemini analyze PDF
      const response = await fetch('/api/pdf/extract-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: base64Data,
          options: {
            model: 'gemini-3.8-flash',
            generateExplanations,
            extractKey,
            examType: currentExamType,
          },
        }),
      });

      setProcessStep(3);

      const rawText = await response.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        console.error('Resposta não-JSON recebida:', rawText);
        if (response.status === 504 || response.status === 408) {
          throw new Error('O tempo limite de leitura expirou. O documento PDF pode ser muito extenso. Tente novamente.');
        }
        if (response.status === 413) {
          throw new Error('O arquivo PDF é muito pesado. Tente utilizar um arquivo menor ou comprimido.');
        }
        throw new Error(
          `O servidor retornou uma resposta inesperada (status ${response.status}). Aguarde alguns instantes e tente novamente.`
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Não foi possível processar o PDF com a IA.');
      }

      setProcessStep(4);

      const questions: SimuladoQuestionItem[] = data.questions || [];
      const totalQ = questions.length;

      // Extract official key if detected
      let detectedKey: (AnswerOption | null)[] | undefined = undefined;
      let keyCount = 0;

      if (extractKey) {
        detectedKey = new Array(totalQ).fill(null);
        // Method 1: from officialKeyList if provided
        if (Array.isArray(data.officialKeyList)) {
          data.officialKeyList.forEach((letter: string, idx: number) => {
            if (idx < totalQ && ['A', 'B', 'C', 'D', 'E', 'V', 'F'].includes(letter.toUpperCase())) {
              detectedKey![idx] = letter.toUpperCase() as AnswerOption;
              keyCount++;
            }
          });
        }
        // Method 2: from each question's officialAnswer field
        questions.forEach((q, idx) => {
          if (q.officialAnswer && (!detectedKey![idx] || detectedKey![idx] === null)) {
            detectedKey![idx] = q.officialAnswer;
            keyCount++;
          }
        });
      }

      // Priority 1: User-provided Banca Key (Guarantees 100% precision, 0 AI divergence)
      let bancaKeyApplied = false;
      if (bancaKeyText.trim()) {
        try {
          const parsedBanca = parseOfficialKey(bancaKeyText.trim(), totalQ, currentExamType);
          if (parsedBanca.detectedCount > 0) {
            detectedKey = parsedBanca.answers;
            keyCount = parsedBanca.detectedCount;
            bancaKeyApplied = true;
            // Overwrite individual question officialAnswer with the true banca key
            questions.forEach((q, idx) => {
              if (idx < parsedBanca.answers.length && parsedBanca.answers[idx]) {
                q.officialAnswer = parsedBanca.answers[idx];
              }
            });
          }
        } catch (e) {
          console.warn('Erro ao processar gabarito da banca colado:', e);
        }
      }

      const payload = {
        fileName: selectedFile.name,
        questions,
        detectedKey: keyCount > 0 ? detectedKey : undefined,
        examTitle: data.examTitle || selectedFile.name.replace(/\.pdf$/i, ''),
        examType: data.examType || currentExamType,
        totalQuestions: adjustTotalQuestions ? totalQ : currentTotalQuestions,
        destinationMode,
      };

      setResultSummary({
        questionsCount: totalQ,
        hasKey: keyCount > 0,
        keyCount,
        title: payload.examTitle,
        bancaKeyApplied,
        payload,
      });

      setProcessStep(5);
    } catch (err: any) {
      console.error('Erro no processamento do PDF:', err);
      setErrorMessage(
        err?.message ||
          'Ocorreu um erro ao comunicar com a inteligência artificial para leitura da prova.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinish = () => {
    if (resultSummary && resultSummary.payload) {
      onImportComplete(resultSummary.payload);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={e => {
        if (!isProcessing && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full max-w-4xl lg:max-w-5xl my-auto rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[92vh] transition-all duration-200 ${
          isNotebook
            ? 'bg-[#fdfbf7] border-[#ded7c6] text-[#1c2b45]'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header - Horizontal and Compact */}
        <div
          className={`flex items-center justify-between px-5 sm:px-6 py-3.5 border-b select-none shrink-0 ${
            isNotebook ? 'border-[#ded7c6] bg-[#f6efe1]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono-code font-bold text-base leading-tight">
                  Importar Prova em PDF com IA
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono-code font-semibold rounded bg-amber-100 text-amber-800 border border-amber-300">
                  Leitura Completa
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                {simuladoTitle ? (
                  <span>
                    Vinculado à prova: <b className={isNotebook ? 'text-[#1c2b45]' : 'text-slate-800'}>{simuladoTitle}</b>
                  </span>
                ) : (
                  <span>Digitalização inteligente de enunciados, alternativas e gabarito</span>
                )}
              </p>
            </div>
          </div>

          {!isProcessing && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-200/80 text-slate-500 hover:text-slate-900 transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body - Responsive 2-Column Horizontal Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {!resultSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-start">
              
              {/* Left Column (Upload Zone & Destination) */}
              <div className="md:col-span-6 space-y-4">
                <div>
                  <label
                    className={`block font-mono-code font-bold uppercase tracking-wider text-[11px] mb-1.5 ${
                      isNotebook ? 'text-[#6b6255]' : 'text-slate-600'
                    }`}
                  >
                    1. Arquivo do Caderno de Prova
                  </label>
                  
                  {/* Drop / File Selector Zone */}
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => !isProcessing && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-5 sm:p-6 text-center transition cursor-pointer min-h-[160px] flex flex-col items-center justify-center ${
                      selectedFile
                        ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950'
                        : isNotebook
                        ? 'border-[#ded7c6] hover:border-[#1c2b45]/40 bg-white/60 hover:bg-white'
                        : 'border-slate-300 hover:border-slate-500 bg-slate-50 hover:bg-slate-100/80'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      onClick={e => {
                        (e.target as HTMLInputElement).value = '';
                      }}
                      onChange={handleFileChange}
                      disabled={isProcessing}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="space-y-2 w-full">
                        <div className="w-11 h-11 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="px-2">
                          <p className="font-semibold text-sm truncate max-w-xs mx-auto">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-slate-500 font-mono-code mt-0.5">
                            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · PDF Selecionado
                          </p>
                        </div>
                        {!isProcessing && (
                          <div className="flex items-center justify-center gap-3 pt-1">
                            <span className="text-[11px] text-emerald-700 underline font-medium">
                              Trocar arquivo
                            </span>
                            <span className="text-slate-300">·</span>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="text-[11px] text-red-600 hover:text-red-800 font-medium cursor-pointer underline"
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div
                          className={`w-11 h-11 mx-auto rounded-full flex items-center justify-center ${
                            isNotebook ? 'bg-[#ede6d6] text-[#1c2b45]' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${isNotebook ? 'text-[#1c2b45]' : 'text-slate-800'}`}>
                            Arraste seu PDF aqui ou clique para selecionar
                          </p>
                          <p className={`text-xs mt-1 ${isNotebook ? 'text-[#6b6255]' : 'text-slate-500'}`}>
                            Suporta provas da FGV, Cebraspe, FCC, Vunesp, ENEM, etc.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Destination Selector */}
                <div>
                  <label
                    className={`block font-mono-code font-bold uppercase tracking-wider text-[11px] mb-1.5 ${
                      isNotebook ? 'text-[#6b6255]' : 'text-slate-600'
                    }`}
                  >
                    2. Destino das Questões no App
                  </label>
                  <div
                    className={`p-3 rounded-xl border text-xs space-y-2 ${
                      isNotebook ? 'bg-[#fcfaf4] border-[#ded7c6]' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {simuladoTitle && (
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="radio"
                          name="destinationMode"
                          value="current"
                          checked={destinationMode === 'current'}
                          onChange={() => setDestinationMode('current')}
                          disabled={isProcessing}
                          className="mt-0.5 text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                        <div>
                          <span className={`font-semibold block ${isNotebook ? 'text-[#1c2b45]' : 'text-slate-800'}`}>
                            Vincular à prova atual: {simuladoTitle}
                          </span>
                          <p className={`text-[11px] ${isNotebook ? 'text-[#6b6255]' : 'text-slate-500'}`}>
                            Preenche os enunciados, gabarito e alternativas diretamente neste cartão-resposta.
                          </p>
                        </div>
                      </label>
                    )}

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        name="destinationMode"
                        value="new"
                        checked={destinationMode === 'new'}
                        onChange={() => setDestinationMode('new')}
                        disabled={isProcessing}
                        className="mt-0.5 text-slate-900 focus:ring-slate-900 cursor-pointer"
                      />
                      <div>
                        <span className={`font-semibold block ${isNotebook ? 'text-[#1c2b45]' : 'text-slate-800'}`}>
                          Criar como um Novo Cartão-Resposta no app
                        </span>
                        <p className={`text-[11px] ${isNotebook ? 'text-[#6b6255]' : 'text-slate-500'}`}>
                          Gera uma nova prova na sua lista com o nome do órgão/concurso extraído do PDF.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Right Column (Destino & Gabarito da Banca) */}
              <div className="md:col-span-6 space-y-4">
                
                {/* 3. Gabarito Oficial da Banca (Opcional - Garante 100% de Precisão) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      className={`block font-mono-code font-bold uppercase tracking-wider text-[11px] ${
                        isNotebook ? 'text-[#6b6255]' : 'text-slate-600'
                      }`}
                    >
                      3. Gabarito Oficial da Banca (Opcional)
                    </label>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setShowBancaKeyInput(prev => !prev)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer underline flex items-center gap-1 transition"
                    >
                      {showBancaKeyInput ? 'Recolher campo' : '+ Colar Gabarito da Banca'}
                    </button>
                  </div>

                  {showBancaKeyInput ? (
                    <div
                      className={`p-3.5 rounded-xl border text-xs space-y-2.5 animate-fadeIn ${
                        isNotebook ? 'bg-[#fcfaf4] border-[#ded7c6]' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start gap-2 text-slate-600">
                        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] leading-relaxed">
                          Ao colar o gabarito oficial da banca, a IA saberá a resposta exata de cada questão e formulará comentários explicativos e fundamentados diretamente ao abrir qualquer questão.
                        </p>
                      </div>

                      <textarea
                        value={bancaKeyText}
                        onChange={e => setBancaKeyText(e.target.value)}
                        disabled={isProcessing}
                        placeholder={`Cole o texto do gabarito oficial da banca aqui...\nExemplo:\n1 - A\n2 - C\n3 - B\n...ou copie e cole o texto direto do PDF da banca`}
                        rows={4}
                        className="w-full text-xs font-mono-code p-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900 resize-none"
                      />

                      {detectedBancaCount > 0 ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-mono-code text-[11px] font-semibold bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>✓ {detectedBancaCount} respostas válidas identificadas no texto colado!</span>
                        </div>
                      ) : bancaKeyText.trim().length > 0 ? (
                        <div className="text-[11px] text-amber-700 font-mono-code bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                          Cole o texto com números e letras (ex: 1-A 2-B 3-C) para identificarmos as respostas.
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div
                      onClick={() => !isProcessing && setShowBancaKeyInput(true)}
                      className="p-3.5 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 bg-slate-50/70 hover:bg-slate-50 text-[11px] text-slate-600 cursor-pointer flex items-center justify-between transition group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <span className="font-semibold block text-slate-800">Possui o gabarito oficial da banca?</span>
                          <span className="text-slate-500 text-[10px]">Cole aqui para 100% de exatidão e comentários imediatos em cada questão.</span>
                        </div>
                      </div>
                      <span className="text-blue-600 group-hover:text-blue-800 font-semibold underline text-xs shrink-0 pl-2">
                        Colar Gabarito
                      </span>
                    </div>
                  )}
                </div>

                {/* Sleek Progress Bar Indicator during processing */}
                {isProcessing && (
                  <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center space-y-4 animate-fadeIn ${
                    isNotebook ? 'bg-[#f4efe3] border-[#e6721d]/30 text-[#6e2802]' : 'bg-indigo-50 border-indigo-200 text-indigo-900'
                  }`}>
                    <div className="relative">
                      <Sparkles className={`w-8 h-8 absolute -top-2 -right-2 animate-ping opacity-50 ${isNotebook ? 'text-[#e6721d]' : 'text-indigo-400'}`} />
                      <Cpu className={`w-12 h-12 animate-pulse ${isNotebook ? 'text-[#e6721d]' : 'text-indigo-600'}`} />
                    </div>
                    <div className="space-y-1">
                      <h4 className={`font-bold text-lg ${isNotebook ? 'font-serif-title' : ''}`}>
                        A Inteligência Artificial está lendo sua prova...
                      </h4>
                      <p className={`text-xs ${isNotebook ? 'text-[#ad4705]/80' : 'text-indigo-700/80'}`}>
                        Isso pode levar alguns segundos dependendo do tamanho do PDF.
                      </p>
                    </div>
                    
                    {/* Animated Progress Bar */}
                    <div className="w-full max-w-sm h-3 rounded-full bg-black/5 overflow-hidden border border-black/5 mt-2 relative">
                      <div 
                        className={`h-full transition-all duration-1000 ease-out rounded-full relative overflow-hidden ${
                          isNotebook ? 'bg-gradient-to-r from-[#ad4705] to-[#e6721d]' : 'bg-gradient-to-r from-indigo-500 to-purple-600'
                        }`}
                        style={{ width: `${Math.max(15, (processStep / 5) * 100)}%` }}
                      >
                        <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message with Retry */}
                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Aviso do Processamento:</span>
                        <span className="leading-relaxed">{errorMessage}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleStartProcessing}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shrink-0 cursor-pointer shadow-2xs self-end sm:self-auto transition disabled:opacity-50"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                )}

              </div>
            </div>
          ) : (
            /* Success Summary State - Landscape Horizontal */
            <div className="space-y-5 py-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-mono-code font-bold text-lg text-slate-900">
                    Prova Processada com Sucesso!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    A IA leu e organizou todas as questões do documento com enunciados integrais e alternativas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono-code text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">
                    Questões Extraídas
                  </span>
                  <span className="font-bold text-lg text-slate-900 mt-1 block">
                    {resultSummary.questionsCount} questões
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">
                    Gabarito Oficial
                  </span>
                  <span className="font-bold text-lg text-emerald-700 mt-1 block">
                    {resultSummary.hasKey
                      ? `${resultSummary.keyCount} respostas`
                      : 'Não identificado'}
                  </span>
                  {resultSummary.bancaKeyApplied ? (
                    <span className="text-[10px] font-mono-code font-bold text-emerald-600 block mt-0.5">
                      ✓ Fiel à Banca (100%)
                    </span>
                  ) : resultSummary.hasKey ? (
                    <span className="text-[10px] font-mono-code text-amber-700 block mt-0.5">
                      Estimado pela IA
                    </span>
                  ) : null}
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">
                    Status da Prova
                  </span>
                  <span className="font-bold text-sm text-emerald-700 mt-1.5 block">
                    ✓ Pronta para responder
                  </span>
                </div>
              </div>

              {!resultSummary.bancaKeyApplied && resultSummary.hasKey && (
                <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed text-amber-900">
                      <strong>Dica sobre divergências:</strong> Como o caderno da prova não tinha folha de gabarito da banca impressa, as respostas foram deduzidas pela IA. Questões de concurso podem divergir da banca oficial devido a pegadinhas ou jurisprudência. Para 100% de exatidão, você pode conferir ou colar as respostas da banca na gaveta "Gabarito Oficial".
                    </p>
                  </div>
                  {onOpenKeyDrawer && (
                    <button
                      type="button"
                      onClick={() => {
                        handleFinish();
                        onOpenKeyDrawer('manual');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs shrink-0 cursor-pointer shadow-2xs self-end sm:self-auto transition whitespace-nowrap"
                    >
                      Conferir Gabarito Agora
                    </button>
                  )}
                </div>
              )}

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Dados prontos e vinculados ao seu simulado com persistência no IndexedDB.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Horizontal and Anchored */}
        <div
          className={`flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t select-none shrink-0 ${
            isNotebook ? 'border-[#ded7c6] bg-[#f6efe1]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          {!resultSummary ? (
            <>
              <button
                type="button"
                disabled={isProcessing}
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedFile || isProcessing}
                onClick={handleStartProcessing}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm cursor-pointer disabled:opacity-50 transition"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Processando Prova...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Iniciar Leitura com IA</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="inline-flex items-center gap-2 px-6 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm cursor-pointer transition"
            >
              <span>Concluir e Abrir Questões</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
