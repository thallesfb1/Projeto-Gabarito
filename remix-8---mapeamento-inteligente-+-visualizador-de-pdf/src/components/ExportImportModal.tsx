import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Copy,
  Check,
  FileText,
  FileCode,
  BookOpen,
  Sparkles,
  AlertCircle,
  FileCheck,
  FolderDown,
  HelpCircle,
  Database,
} from 'lucide-react';
import { AnswerOption, SimuladoData, AppTheme } from '../types';
import {
  formatSequence,
  formatNumberedList,
  formatNumberedVOF,
  generateSampleNumberedVOF,
  parseAnswers,
  generateFullReport,
  downloadFile,
  copyTextToClipboard,
  generateSampleSequence,
} from '../utils/parser';
import { OfficialKeyImporter } from './OfficialKeyImporter';

export type ModalTab = 'export-user' | 'import-user' | 'key' | 'report' | 'backup';

interface ExportImportModalProps {
  isOpen: boolean;
  initialTab?: ModalTab;
  onClose: () => void;
  simulado: SimuladoData;
  onUpdateUserAnswers: (answers: (AnswerOption | null)[], newTotal?: number) => void;
  onUpdateKeyAnswers: (answers: (AnswerOption | null)[], newTotal?: number) => void;
  onOpenBackupModal?: () => void;
  theme?: AppTheme;
}

export const ExportImportModal: React.FC<ExportImportModalProps> = ({
  isOpen,
  initialTab = 'export-user',
  onClose,
  simulado,
  onUpdateUserAnswers,
  onUpdateKeyAnswers,
  onOpenBackupModal,
  theme = 'clean',
}) => {
  const isDark = theme === 'dark';
  const isNotebook = theme === 'notebook';
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Import states
  const [importText, setImportText] = useState('');
  const [importTarget, setImportTarget] = useState<'user' | 'key'>('user');
  const [importMode, setImportMode] = useState<'replace' | 'fill-blanks'>('replace');
  const [autoAdjustQuestions, setAutoAdjustQuestions] = useState(true);
  const [importStatus, setImportStatus] = useState<{
    success?: boolean;
    message: string;
    count?: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initial tab when opening
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setImportStatus(null);
      setImportText('');
      if (initialTab === 'key') {
        setImportTarget('key');
      } else {
        setImportTarget('user');
      }
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const isTF = simulado.examType === 'true_false';
  const { title, date, totalQuestions, userAnswers, keyAnswers } = simulado;
  const userSequence = formatSequence(userAnswers);
  const userSequenceSpaced = formatSequence(userAnswers, 10);
  const userNumbered = formatNumberedList(userAnswers);
  const userNumberedVOF = formatNumberedVOF(userAnswers);
  const userFilledCount = userAnswers.filter(Boolean).length;

  const keySequence = formatSequence(keyAnswers);
  const keySequenceSpaced = formatSequence(keyAnswers, 10);
  const keyNumberedVOF = formatNumberedVOF(keyAnswers);
  const keyFilledCount = keyAnswers.filter(Boolean).length;

  // Filename generator sanitized for folder saving
  const getSafeFileName = (type: string, ext: string) => {
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_');
    const cleanDate = date.replace(/[^0-9-]/g, '_');
    return `${cleanTitle}_${type}_${cleanDate}.${ext}`;
  };

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, typeKey: string) => {
    const success = await copyTextToClipboard(text);
    if (success) {
      setCopiedType(typeKey);
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  // Export handlers
  const handleDownloadUserTxt = () => {
    const content = [
      `SIMULADO: ${title}`,
      `DATA: ${date}`,
      `FORMATO: ${isTF ? 'Verdadeiro ou Falso / Certo ou Errado (V/F)' : 'Múltipla Escolha (A, B, C, D, E)'}`,
      `TOTAL DE QUESTÕES: ${totalQuestions}`,
      `RESPOSTAS PREENCHIDAS: ${userFilledCount}/${totalQuestions}`,
      '',
      isTF ? '--- ITENS NUMERADOS (1V, 2V, 3F, 4V...) ---' : '--- LISTA NUMERADA ---',
      isTF ? userNumberedVOF : userNumbered,
      '',
      '--- SEQUÊNCIA CONTÍNUA ---',
      userSequence,
      '',
      '--- SEQUÊNCIA EM BLOCOS (10 em 10) ---',
      userSequenceSpaced,
    ].join('\n');

    downloadFile(getSafeFileName('minhas_respostas', 'txt'), content);
  };

  const handleDownloadUserJson = () => {
    const payload = {
      app: 'gabarito-de-simulados',
      version: '1.0',
      title,
      date,
      examType: simulado.examType,
      totalQuestions,
      userAnswers,
      keyAnswers,
      exportedAt: new Date().toISOString(),
    };
    downloadFile(
      getSafeFileName('backup_simulado', 'json'),
      JSON.stringify(payload, null, 2),
      'application/json'
    );
  };

  const handleDownloadReport = () => {
    const report = generateFullReport(simulado);
    downloadFile(getSafeFileName('relatorio_desempenho', 'txt'), report);
  };

  // Import handler from Textarea
  const handleProcessImport = () => {
    if (!importText.trim()) {
      setImportStatus({
        success: false,
        message: 'Por favor, cole as respostas ou selecione um arquivo.',
      });
      return;
    }

    const parsed = parseAnswers(importText, simulado.examType);
    if (parsed.count === 0) {
      setImportStatus({
        success: false,
        message: isTF
          ? 'Não reconhecemos respostas (V/F ou C/E) válidas no texto colado.'
          : 'Não reconhecemos alternativas (A-E) válidas no texto colado.',
      });
      return;
    }

    const targetCount = autoAdjustQuestions && parsed.impliedTotal > 0
      ? Math.max(parsed.impliedTotal, totalQuestions)
      : totalQuestions;

    const targetList = importTarget === 'user' ? [...userAnswers] : [...keyAnswers];

    // Resize array if needed
    while (targetList.length < targetCount) {
      targetList.push(null);
    }

    let appliedCount = 0;
    for (let i = 0; i < parsed.results.length && i < targetCount; i++) {
      const val = parsed.results[i];
      if (val !== null) {
        if (importMode === 'replace') {
          targetList[i] = val;
          appliedCount++;
        } else if (importMode === 'fill-blanks' && targetList[i] === null) {
          targetList[i] = val;
          appliedCount++;
        }
      }
    }

    if (importTarget === 'user') {
      onUpdateUserAnswers(targetList, autoAdjustQuestions ? targetCount : undefined);
    } else {
      onUpdateKeyAnswers(targetList, autoAdjustQuestions ? targetCount : undefined);
    }

    setImportStatus({
      success: true,
      count: appliedCount,
      message: `Sucesso! ${appliedCount} respostas foram aplicadas ao ${
        importTarget === 'user' ? 'seu cartão de respostas' : 'gabarito oficial'
      }${targetCount !== totalQuestions ? ` (cartão ajustado para ${targetCount} questões)` : ''}.`,
    });
  };

  // Import handler from File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      if (text) {
        setImportText(text);
        setImportStatus({
          success: true,
          message: `Arquivo "${file.name}" carregado. Clique em "Aplicar Respostas" para confirmar.`,
        });
      }
    };
    reader.onerror = () => {
      setImportStatus({
        success: false,
        message: 'Erro ao ler o arquivo selecionado.',
      });
    };
    reader.readAsText(file);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn ${isDark ? 'dark' : ''}`}>
      <div className={`rounded-xl shadow-2xl w-full max-w-4xl lg:max-w-5xl max-h-[92vh] flex flex-col overflow-hidden transition-colors ${
        isNotebook
          ? 'bg-[#fdfbf7] border-2 border-[#1c2b45] text-[#1c2b45]'
          : isDark
          ? 'bg-[#22242a] border-2 border-[#3b3e48] text-zinc-100'
          : 'bg-[#fcfbf9] border-2 border-slate-900 text-slate-900'
      }`}>
        {/* Modal Header */}
        <div className={`px-4 sm:px-6 py-3.5 flex items-center justify-between border-b transition-colors ${
          isNotebook
            ? 'bg-[#1c2b45] border-[#1c2b45] text-white'
            : isDark
            ? 'bg-[#18191d] border-[#3b3e48] text-white'
            : 'bg-slate-900 border-slate-800 text-white'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-1.5 rounded-lg shrink-0 ${isDark ? 'bg-zinc-800 text-amber-400' : 'bg-white/10 text-amber-300'}`}>
              <FolderDown className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-serif-title italic font-semibold text-lg sm:text-xl truncate text-white">
                Central de Exportação e Gabarito
              </h2>
              <p className="text-xs text-slate-300 dark:text-zinc-400 font-mono-code truncate">
                Simulado: <span className="text-white font-semibold">{title}</span> ({totalQuestions} questões)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer shrink-0 ml-2"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Functional Tabs - Responsive Grid without horizontal scroll cramping */}
        <div className={`p-2 sm:p-3 border-b transition-colors ${
          isNotebook
            ? 'bg-[#f5f0e3] border-[#ded7c6]'
            : isDark
            ? 'bg-[#18191d] border-[#3b3e48]'
            : 'bg-[#f3f1ea] border-[#dedad0]'
        }`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2">
            {/* Tab 1: Import Answers */}
            <button
              id="modal-tab-import-user"
              type="button"
              onClick={() => {
                setActiveTab('import-user');
                setImportTarget('user');
                setImportStatus(null);
              }}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer text-left ${
                activeTab === 'import-user'
                  ? isNotebook
                    ? 'bg-white text-[#1c2b45] border border-[#1c2b45] shadow-xs ring-1 ring-[#1c2b45]/20 font-bold'
                    : isDark
                    ? 'bg-[#2c2f38] text-zinc-100 border border-zinc-500 shadow-xs ring-1 ring-zinc-400/30 font-bold'
                    : 'bg-white text-slate-900 border border-slate-400 shadow-xs ring-1 ring-slate-400/30 font-bold'
                  : isNotebook
                  ? 'bg-[#faf7f0] text-[#414b60] border border-[#dedad0] hover:bg-[#ede7d8] hover:text-[#1c2b45]'
                  : isDark
                  ? 'bg-[#22242a] text-zinc-300 border border-[#3b3e48] hover:bg-[#2c2f38] hover:text-white'
                  : 'bg-white/70 text-[#414b60] border border-[#dedad0] hover:bg-white hover:text-slate-900'
              }`}
            >
              <Download className={`w-4 h-4 shrink-0 ${
                activeTab === 'import-user'
                  ? isDark ? 'text-zinc-200' : 'text-[#1c2b45]'
                  : isDark ? 'text-zinc-400' : 'text-zinc-500'
              }`} />
              <span className="truncate">Importar Respostas</span>
            </button>

            {/* Tab 2: Export Answers */}
            <button
              id="modal-tab-export-user"
              type="button"
              onClick={() => {
                setActiveTab('export-user');
                setImportStatus(null);
              }}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer text-left ${
                activeTab === 'export-user'
                  ? isNotebook
                    ? 'bg-[#edf5ee] text-[#163824] border border-[#cbe1d0] shadow-xs ring-1 ring-[#387652]/25 font-bold'
                    : isDark
                    ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-600/70 shadow-xs ring-1 ring-emerald-500/25 font-bold'
                    : 'bg-white text-emerald-900 border border-emerald-400 shadow-xs ring-1 ring-emerald-500/25 font-bold'
                  : isNotebook
                  ? 'bg-[#faf7f0] text-[#414b60] border border-[#dedad0] hover:bg-[#ede7d8] hover:text-[#1c2b45]'
                  : isDark
                  ? 'bg-[#22242a] text-zinc-300 border border-[#3b3e48] hover:bg-[#2c2f38] hover:text-white'
                  : 'bg-white/70 text-[#414b60] border border-[#dedad0] hover:bg-white hover:text-slate-900'
              }`}
            >
              <Upload className={`w-4 h-4 shrink-0 ${
                activeTab === 'export-user'
                  ? isNotebook ? 'text-[#387652]' : isDark ? 'text-emerald-400' : 'text-emerald-600'
                  : isDark ? 'text-zinc-400' : 'text-emerald-500'
              }`} />
              <span className="truncate">Exportar Respostas</span>
            </button>

            {/* Tab 3: Official Answer Key */}
            <button
              id="modal-tab-key"
              type="button"
              onClick={() => {
                setActiveTab('key');
                setImportTarget('key');
                setImportStatus(null);
              }}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer text-left ${
                activeTab === 'key'
                  ? isNotebook
                    ? 'bg-[#fefce8] text-[#854d0e] border border-[#fef08a] shadow-xs ring-1 ring-[#854d0e]/25 font-bold'
                    : isDark
                    ? 'bg-amber-950/70 text-amber-300 border border-amber-600/70 shadow-xs ring-1 ring-amber-500/25 font-bold'
                    : 'bg-white text-amber-950 border border-amber-400 shadow-xs ring-1 ring-amber-500/25 font-bold'
                  : isNotebook
                  ? 'bg-[#faf7f0] text-[#414b60] border border-[#dedad0] hover:bg-[#ede7d8] hover:text-[#1c2b45]'
                  : isDark
                  ? 'bg-[#22242a] text-zinc-300 border border-[#3b3e48] hover:bg-[#2c2f38] hover:text-white'
                  : 'bg-white/70 text-[#414b60] border border-[#dedad0] hover:bg-white hover:text-slate-900'
              }`}
            >
              <BookOpen className={`w-4 h-4 shrink-0 ${
                activeTab === 'key'
                  ? isNotebook ? 'text-[#854d0e]' : isDark ? 'text-amber-400' : 'text-amber-700'
                  : isDark ? 'text-zinc-400' : 'text-amber-600'
              }`} />
              <div className="flex items-center gap-1.5 truncate">
                <span className="truncate">Gabarito Oficial</span>
                <span className={`text-[10px] font-mono-code px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                  isNotebook
                    ? 'bg-amber-200 text-amber-950'
                    : isDark
                    ? 'bg-amber-900/80 text-amber-200 border border-amber-700/60'
                    : 'bg-amber-100 text-amber-900'
                }`}>
                  {keyFilledCount}/{totalQuestions}
                </span>
              </div>
            </button>

            {/* Tab 4: Performance Report */}
            <button
              id="modal-tab-report"
              type="button"
              onClick={() => {
                setActiveTab('report');
                setImportStatus(null);
              }}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer text-left ${
                activeTab === 'report'
                  ? isNotebook
                    ? 'bg-[#edf5ee] text-[#163824] border border-[#cbe1d0] shadow-xs ring-1 ring-[#387652]/25 font-bold'
                    : isDark
                    ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-600/70 shadow-xs ring-1 ring-emerald-500/25 font-bold'
                    : 'bg-white text-[#1c2b45] border border-slate-400 shadow-xs ring-1 ring-slate-900/10 font-bold'
                  : isNotebook
                  ? 'bg-[#faf7f0] text-[#414b60] border border-[#dedad0] hover:bg-[#ede7d8] hover:text-[#1c2b45]'
                  : isDark
                  ? 'bg-[#22242a] text-zinc-300 border border-[#3b3e48] hover:bg-[#2c2f38] hover:text-white'
                  : 'bg-white/70 text-[#414b60] border border-[#dedad0] hover:bg-white hover:text-slate-900'
              }`}
            >
              <FileCheck className={`w-4 h-4 shrink-0 ${
                activeTab === 'report'
                  ? isNotebook ? 'text-[#387652]' : isDark ? 'text-emerald-400' : 'text-[#2f6846]'
                  : isDark ? 'text-zinc-400' : 'text-slate-500'
              }`} />
              <span className="truncate">Espelho & Relatório</span>
            </button>
          </div>

          {/* Secondary Utilities Sub-bar: Global Backup */}
          <div className={`mt-2 pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-xs ${
            isNotebook ? 'border-[#ded7c6]' : isDark ? 'border-[#3b3e48]' : 'border-[#dedad0]/70'
          }`}>
            <span className={`font-mono-code text-[11px] hidden sm:inline ${
              isNotebook ? 'text-[#6b6255]' : isDark ? 'text-zinc-400' : 'text-[#5b6478]'
            }`}>
              Preenchidas: <b className={isDark ? 'text-zinc-200' : isNotebook ? 'text-[#1c2b45]' : 'text-slate-900'}>{userFilledCount} de {totalQuestions}</b> ({Math.round((userFilledCount / totalQuestions) * 100) || 0}%)
            </span>

            <div className="flex items-center gap-2 ml-auto">
              <button
                id="modal-tab-backup"
                type="button"
                onClick={() => {
                  if (onOpenBackupModal) {
                    onClose();
                    onOpenBackupModal();
                  } else {
                    setActiveTab('backup');
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono-code transition cursor-pointer font-medium border ${
                  isNotebook
                    ? 'bg-white text-[#1c2b45] border-[#dedad0] hover:bg-[#ede7d8]'
                    : isDark
                    ? 'bg-[#2a2c34] text-zinc-200 border-[#3b3e48] hover:bg-[#343740]'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                }`}
                title="Salvar ou restaurar todas as provas salvas no navegador"
              >
                <Database className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-300' : isNotebook ? 'text-[#1c2b45]' : 'text-slate-700'}`} />
                <span>Backup Geral</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 space-y-4 text-sm">
          {/* TAB 1: EXPORT USER ANSWERS (Main feature) */}
          {activeTab === 'export-user' && (
            <div className="space-y-4">
              <div className={`p-3 rounded-lg flex items-start gap-3 border transition-colors ${
                isNotebook
                  ? 'bg-[#edf5ee] border-[#cbe1d0] text-[#163824]'
                  : isDark
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                  : 'bg-[#eaf4ed] border-[#cbe3cf] text-emerald-950'
              }`}>
                <Upload className={`w-5 h-5 shrink-0 mt-0.5 ${
                  isNotebook ? 'text-[#387652]' : isDark ? 'text-emerald-400' : 'text-emerald-700'
                }`} />
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold">Salvar na pasta do simulado: </span>
                  Você pode salvar o arquivo de texto com as suas respostas ou copiar a sequência para conferir onde quiser.
                  Atualmente há <b>{userFilledCount} de {totalQuestions} questões</b> preenchidas.
                </div>
              </div>

              {/* Quick Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Download TXT */}
                <button
                  type="button"
                  onClick={handleDownloadUserTxt}
                  className={`p-3 rounded-lg text-left transition hover:shadow-sm flex items-start gap-3 group border cursor-pointer ${
                    isNotebook
                      ? 'bg-white border-[#dedad0] hover:border-[#387652]'
                      : isDark
                      ? 'bg-[#2a2c34] border-[#3b3e48] hover:border-emerald-500'
                      : 'bg-white border-slate-200 hover:border-emerald-600'
                  }`}
                >
                  <div className={`p-2 rounded transition ${
                    isNotebook
                      ? 'bg-[#edf5ee] border border-[#cbe1d0] text-[#163824] group-hover:bg-[#387652] group-hover:text-white'
                      : isDark
                      ? 'bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800 group-hover:bg-emerald-700 group-hover:text-white'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`font-semibold text-xs sm:text-sm ${
                      isDark ? 'text-zinc-100' : isNotebook ? 'text-[#1c2b45]' : 'text-slate-900'
                    }`}>
                      Baixar Arquivo (.txt)
                    </div>
                    <div className={`text-[11px] mt-0.5 ${
                      isDark ? 'text-zinc-400' : isNotebook ? 'text-[#6b6255]' : 'text-slate-500'
                    }`}>
                      Arquivo pronto para salvar direto na pasta do simulado no seu computador.
                    </div>
                  </div>
                </button>

                {/* Download JSON Backup */}
                <button
                  type="button"
                  onClick={handleDownloadUserJson}
                  className={`p-3 rounded-lg text-left transition hover:shadow-sm flex items-start gap-3 group border cursor-pointer ${
                    isNotebook
                      ? 'bg-white border-[#dedad0] hover:border-[#387652]'
                      : isDark
                      ? 'bg-[#2a2c34] border-[#3b3e48] hover:border-emerald-500'
                      : 'bg-white border-slate-200 hover:border-emerald-600'
                  }`}
                >
                  <div className={`p-2 rounded transition ${
                    isNotebook
                      ? 'bg-[#edf5ee] border border-[#cbe1d0] text-[#163824] group-hover:bg-[#387652] group-hover:text-white'
                      : isDark
                      ? 'bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800 group-hover:bg-emerald-700 group-hover:text-white'
                  }`}>
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`font-semibold text-xs sm:text-sm ${
                      isDark ? 'text-zinc-100' : isNotebook ? 'text-[#1c2b45]' : 'text-slate-900'
                    }`}>
                      Backup Completo (.json)
                    </div>
                    <div className={`text-[11px] mt-0.5 ${
                      isDark ? 'text-zinc-400' : isNotebook ? 'text-[#6b6255]' : 'text-slate-500'
                    }`}>
                      Salva o estado integral com gabarito oficial para restaurar com 1 clique.
                    </div>
                  </div>
                </button>
              </div>

              {/* VOF Numbered Sequence (if true_false) */}
              {isTF && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-semibold ${isDark ? 'text-zinc-200' : isNotebook ? 'text-[#1c2b45]' : 'text-slate-800'}`}>
                      Formato numerado V/F (1V, 2V, 3F, 4V...):
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(userNumberedVOF, 'vof-num')}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded font-mono-code text-xs transition cursor-pointer border ${
                        isNotebook
                          ? 'border-[#dedad0] bg-white hover:bg-[#ede7d8] text-[#1c2b45]'
                          : isDark
                          ? 'border-[#3b3e48] bg-[#2a2c34] hover:bg-[#343740] text-zinc-200'
                          : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      {copiedType === 'vof-num' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-500 font-bold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar numerado (1V 2V 3F)</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className={`p-3 rounded-md font-mono-code text-xs break-words select-all max-h-24 overflow-y-auto border ${
                    isNotebook
                      ? 'bg-white border-[#dedad0] text-[#1c2b45]'
                      : isDark
                      ? 'bg-[#18191d] border-[#3b3e48] text-zinc-100'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    {userNumberedVOF || '(Nenhuma questão preenchida ainda)'}
                  </div>
                </div>
              )}

              {/* Sequence Display with 1-click copy */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-semibold ${isDark ? 'text-zinc-200' : isNotebook ? 'text-[#1c2b45]' : 'text-slate-800'}`}>
                    {isTF
                      ? 'Sequência contínua de respostas (V e F):'
                      : 'Sequência simples das suas respostas (A, B, C, D, E):'}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(userSequence, 'seq')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded font-mono-code text-xs transition cursor-pointer border ${
                      isNotebook
                        ? 'border-[#dedad0] bg-white hover:bg-[#ede7d8] text-[#1c2b45]'
                        : isDark
                        ? 'border-[#3b3e48] bg-[#2a2c34] hover:bg-[#343740] text-zinc-200'
                        : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    {copiedType === 'seq' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500 font-bold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar sequência</span>
                      </>
                    )}
                  </button>
                </div>

                <div className={`p-3 rounded-md font-mono-code text-xs break-all select-all max-h-24 overflow-y-auto border ${
                  isNotebook
                    ? 'bg-white border-[#dedad0] text-[#1c2b45]'
                    : isDark
                    ? 'bg-[#18191d] border-[#3b3e48] text-zinc-100'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  {userSequence || '(Nenhuma questão preenchida ainda)'}
                </div>
              </div>

              {/* Numbered List preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-semibold ${isDark ? 'text-zinc-200' : isNotebook ? 'text-[#1c2b45]' : 'text-slate-800'}`}>
                    Formato agrupado por blocos (de 10 em 10):
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(userSequenceSpaced, 'spaced')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded font-mono-code text-xs transition cursor-pointer border ${
                      isNotebook
                        ? 'border-[#dedad0] bg-white hover:bg-[#ede7d8] text-[#1c2b45]'
                        : isDark
                        ? 'border-[#3b3e48] bg-[#2a2c34] hover:bg-[#343740] text-zinc-200'
                        : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    {copiedType === 'spaced' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500 font-bold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar em blocos</span>
                      </>
                    )}
                  </button>
                </div>
                <div className={`p-2.5 rounded-md font-mono-code text-xs break-words select-all border ${
                  isNotebook
                    ? 'bg-white border-[#dedad0] text-[#1c2b45]'
                    : isDark
                    ? 'bg-[#18191d] border-[#3b3e48] text-zinc-100'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  {userSequenceSpaced || '(Nenhuma questão preenchida ainda)'}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT USER ANSWERS */}
          {activeTab === 'import-user' && (
            <div className="space-y-4">
              <div className={`p-3 rounded-lg text-xs leading-relaxed border transition-colors ${
                isNotebook
                  ? 'bg-[#f4efe3] border-[#ded7c6] text-[#1c2b45]'
                  : isDark
                  ? 'bg-[#2a2c34] border-[#3b3e48] text-zinc-200'
                  : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}>
                <span className="font-semibold">Recuperar ou carregar respostas: </span>
                {isTF
                  ? 'Cole o texto com respostas no formato V/F (ex: 1V, 2V, 3F, 4V... ou sequência VVFVFF...) ou selecione o arquivo salvo.'
                  : 'Cole o texto com a sequência que você exportou ou selecione o arquivo .txt ou .json salvo no seu computador.'}
              </div>

              {/* Target choice */}
              <div className="flex items-center gap-4 text-xs font-semibold">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="target"
                    checked={importTarget === 'user'}
                    onChange={() => setImportTarget('user')}
                  />
                  <span>Aplicar em: Minhas Respostas</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="target"
                    checked={importTarget === 'key'}
                    onChange={() => setImportTarget('key')}
                  />
                  <span>Aplicar em: Gabarito Oficial</span>
                </label>
              </div>

              {/* File upload shortcut */}
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.json,.csv"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full py-2.5 px-3 border border-dashed rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer ${
                    isDark
                      ? 'border-zinc-500 bg-[#2a2c34] hover:bg-[#343740] text-zinc-200'
                      : isNotebook
                      ? 'border-[#dedad0] bg-[#faf8f4] hover:bg-[#ede7d8] text-[#1c2b45]'
                      : 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <Download className={`w-4 h-4 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`} />
                  <span>Carregar arquivo salvo (.txt ou .json)</span>
                </button>
              </div>

              {/* Paste textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="import-textarea" className={`block text-xs font-semibold ${
                    isDark ? 'text-zinc-200' : isNotebook ? 'text-[#1c2b45]' : 'text-slate-800'
                  }`}>
                    {isTF ? 'Ou cole as respostas V/F:' : 'Ou cole o texto com as respostas:'}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      id="btn-prefill-test-example"
                      type="button"
                      onClick={() => {
                        setImportText(
                          isTF
                            ? generateSampleNumberedVOF(totalQuestions)
                            : generateSampleSequence(totalQuestions, 'multiple_choice')
                        );
                      }}
                      className={`text-[11px] font-mono-code underline cursor-pointer ${
                        isDark ? 'text-zinc-400 hover:text-zinc-100' : isNotebook ? 'text-[#5b6478] hover:text-[#1c2b45]' : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title={
                        isTF
                          ? `Inserir exemplo numerado VOF (1V, 2V, 3F, 4V...) de ${totalQuestions} questões`
                          : `Inserir sequência modelo de ${totalQuestions} questões para teste`
                      }
                    >
                      {isTF ? `Inserir teste V/F (1V, 2V, 3F...)` : `Inserir teste (${totalQuestions} questões)`}
                    </button>
                    {importText && (
                      <button
                        id="btn-clear-import-textarea"
                        type="button"
                        onClick={() => setImportText('')}
                        className={`text-[11px] cursor-pointer ${
                          isDark ? 'text-zinc-400 hover:text-rose-400' : 'text-[#5b6478] hover:text-[#a63b2c]'
                        }`}
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  id="import-textarea"
                  rows={4}
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder={
                    isTF
                      ? 'Exemplo numerado: 1V, 2V, 3F, 4V, 5V...\nou em pares: 1-V 2-F 3-V 4-F...\nou sequência contínua: VVFVFFVV...'
                      : 'Exemplo de sequência: ABCDEABCDEABCD...\nou numerado: 1-A 2-B 3-C 4-D 5-E...\nou conteúdo JSON'
                  }
                  className={`w-full p-2.5 font-mono-code text-xs rounded-md outline-none border transition ${
                    isNotebook
                      ? 'bg-white border-[#dedad0] text-[#1c2b45] focus:border-[#1c2b45]'
                      : isDark
                      ? 'bg-[#18191d] border-[#3b3e48] text-zinc-100 placeholder-zinc-500 focus:border-zinc-400'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-slate-800'
                  }`}
                />
              </div>

              {/* Import Options */}
              <div className={`space-y-2 p-3 rounded border text-xs ${
                isNotebook
                  ? 'bg-white border-[#dedad0] text-[#1c2b45]'
                  : isDark
                  ? 'bg-[#2a2c34] border-[#3b3e48] text-zinc-200'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className={`font-semibold ${isDark ? 'text-zinc-100' : isNotebook ? 'text-[#1c2b45]' : 'text-slate-900'}`}>Opções de importação:</div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                    />
                    <span>Substituir marcações existentes</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="mode"
                      checked={importMode === 'fill-blanks'}
                      onChange={() => setImportMode('fill-blanks')}
                    />
                    <span>Apenas preencher questões em branco</span>
                  </label>
                </div>
                <label className={`flex items-center gap-1.5 cursor-pointer pt-1 border-t ${
                  isDark ? 'border-[#3b3e48]' : 'border-[#dedad0]/60'
                }`}>
                  <input
                    type="checkbox"
                    checked={autoAdjustQuestions}
                    onChange={e => setAutoAdjustQuestions(e.target.checked)}
                  />
                  <span>Ajustar quantidade total de questões do cartão automaticamente</span>
                </label>
              </div>

              {/* Status Message */}
              {importStatus && (
                <div
                  className={`p-3 rounded-md text-xs flex items-center gap-2 border ${
                    importStatus.success
                      ? isDark
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                        : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : isDark
                      ? 'bg-red-950/40 border-red-800/60 text-red-200'
                      : 'bg-red-50 text-red-900 border-red-200'
                  }`}
                >
                  {importStatus.success ? (
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <span>{importStatus.message}</span>
                </div>
              )}

              {/* Action button */}
              <button
                type="button"
                onClick={handleProcessImport}
                className={`w-full py-2.5 px-4 font-semibold rounded-lg transition flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer shadow-sm ${
                  isNotebook
                    ? 'bg-[#1c2b45] text-white hover:bg-[#132038]'
                    : isDark
                    ? 'bg-zinc-200 text-zinc-950 font-bold hover:bg-white'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <Check className={`w-4 h-4 ${isDark ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <span>Aplicar Respostas ao Cartão</span>
              </button>
            </div>
          )}

          {/* TAB 3: GABARITO OFICIAL */}
          {activeTab === 'key' && (
            <div className="space-y-4">
              <div className={`p-3.5 rounded-xl text-xs leading-relaxed flex items-start justify-between gap-3 flex-wrap border ${
                isNotebook
                  ? 'bg-[#fefce8] border-[#fef08a] text-[#854d0e]'
                  : isDark
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}>
                <div>
                  <span className="font-semibold">
                    {isTF ? 'Gabarito Oficial V/F da Banca (Cebraspe): ' : 'Gabarito da Banca Concurseira: '}
                  </span>
                  Importe o gabarito oficial com conferência prévia inteligente ou copie o gabarito registrado.
                  Atualmente há <b>{keyFilledCount} de {totalQuestions} questões</b> salvas na prova.
                </div>

                {keyFilledCount > 0 && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(isTF ? keyNumberedVOF : keySequence, 'key-seq')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded border font-mono-code text-xs transition shrink-0 cursor-pointer ${
                      isNotebook
                        ? 'border-[#dedad0] bg-white hover:bg-[#f0eee6] text-[#854d0e]'
                        : isDark
                        ? 'border-amber-800/60 bg-[#2a2c34] hover:bg-[#343740] text-amber-300'
                        : 'border-amber-300 bg-white hover:bg-amber-50 text-amber-900'
                    }`}
                  >
                    {copiedType === 'key-seq' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500 font-bold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{isTF ? 'Copiar gabarito (1V 2V 3F)' : 'Copiar sequência salva'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Status Message if any */}
              {importStatus && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                    importStatus.success
                      ? isDark
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                        : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : isDark
                      ? 'bg-red-950/40 border-red-800/60 text-red-200'
                      : 'bg-red-50 text-red-900 border-red-200'
                  }`}
                >
                  {importStatus.success ? (
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <span>{importStatus.message}</span>
                </div>
              )}

              {/* Mandatory 2-Step Interactive Official Key Importer with examType and theme passed! */}
              <div className="pt-1">
                <OfficialKeyImporter
                  totalQuestions={totalQuestions}
                  currentKeyAnswers={keyAnswers}
                  examType={simulado.examType}
                  theme={theme}
                  onConfirmKey={newKey => {
                    onUpdateKeyAnswers(newKey, totalQuestions);
                    setImportStatus({
                      success: true,
                      message: `Gabarito oficial salvo com sucesso! (${newKey.filter(Boolean).length} de ${totalQuestions} questões)`,
                      count: newKey.filter(Boolean).length,
                    });
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 4: REPORT & AUDIT SHEET */}
          {activeTab === 'report' && (
            <div className="space-y-4">
              <div className={`p-3 rounded-lg text-xs leading-relaxed border ${
                isNotebook
                  ? 'bg-[#edf5ee] border-[#cbe1d0] text-[#163824]'
                  : isDark
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                  : 'bg-[#eaf4ed] border-[#cbe3cf] text-emerald-950'
              }`}>
                <span className="font-semibold">Espelho Completo de Desempenho: </span>
                Gera um relatório minucioso com sua nota, percentual, e a comparação questão por questão para arquivar no histórico de estudos.
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className={`px-4 py-2 font-semibold rounded-lg transition flex items-center gap-2 text-xs text-white cursor-pointer ${
                    isNotebook
                      ? 'bg-[#387652] hover:bg-[#2c5f40]'
                      : isDark
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>Baixar Relatório (.txt)</span>
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(generateFullReport(simulado), 'full-report')}
                  className={`px-3 py-2 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    isNotebook
                      ? 'border-[#dedad0] bg-white hover:bg-[#f0eee6] text-[#1c2b45]'
                      : isDark
                      ? 'border-[#3b3e48] bg-[#2a2c34] hover:bg-[#343740] text-zinc-200'
                      : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  {copiedType === 'full-report' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-bold">Relatório copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar relatório</span>
                    </>
                  )}
                </button>
              </div>

              {/* Preview */}
              <div className={`p-3 rounded-md font-mono-code text-[11px] max-h-60 overflow-y-auto whitespace-pre-wrap leading-tight border ${
                isNotebook
                  ? 'bg-white border-[#dedad0] text-[#1c2b45]'
                  : isDark
                  ? 'bg-[#18191d] border-[#3b3e48] text-zinc-200'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}>
                {generateFullReport(simulado)}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`border-t px-5 py-3 flex items-center justify-between text-xs transition-colors flex-wrap gap-2 ${
          isNotebook
            ? 'bg-[#f5f0e3] border-[#ded7c6] text-[#6b6255]'
            : isDark
            ? 'bg-[#18191d] border-[#3b3e48] text-zinc-400'
            : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}>
          <span>Todas as alterações confirmadas são salvas automaticamente na memória deste navegador.</span>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded font-semibold transition border cursor-pointer ${
              isNotebook
                ? 'bg-white border-[#1c2b45] text-[#1c2b45] hover:bg-[#1c2b45] hover:text-white'
                : isDark
                ? 'bg-[#2a2c34] border-[#3b3e48] text-zinc-200 hover:bg-zinc-100 hover:text-zinc-950'
                : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-900 hover:text-white'
            }`}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
