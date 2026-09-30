import React, { useState } from 'react';
import {
  Download,
  Upload,
  BookOpen,
  CheckCircle2,
  RotateCcw,
  Trash2,
  FileCheck,
  ChevronDown,
  FolderDown,
  FolderKanban,
  Sparkles,
} from 'lucide-react';
import { AppTheme } from '../types';

interface ControlsBarProps {
  totalQuestions: number;
  onTotalChange: (newTotal: number) => void;
  filledCount: number;
  keyFilledCount: number;
  isCorrected: boolean;
  onRunCorrection: () => void;
  onExitCorrection: () => void;
  onOpenExportModal: (tab: 'export-user' | 'import-user' | 'key' | 'report') => void;
  onClearUserAnswers: () => void;
  onResetAll: () => void;
  isKeyDrawerOpen?: boolean;
  onToggleKeyDrawer?: () => void;
  isExportModalOpen?: boolean;
  theme?: AppTheme;
  onOpenPdfImport?: () => void;
  hasPdfImported?: boolean;
  pdfQuestionsCount?: number;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  totalQuestions,
  onTotalChange,
  filledCount,
  keyFilledCount,
  isCorrected,
  onRunCorrection,
  onExitCorrection,
  onOpenExportModal,
  onClearUserAnswers,
  onResetAll,
  isKeyDrawerOpen = false,
  onToggleKeyDrawer,
  isExportModalOpen = false,
  theme = 'clean',
  onOpenPdfImport,
  hasPdfImported = false,
  pdfQuestionsCount,
}) => {
  const isNotebook = theme === 'notebook';
  const isDark = false;
  const percentage = Math.round((filledCount / totalQuestions) * 100) || 0;
  const presets = [20, 50, 70, 90, 100, 120];
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);

  const hasKey = keyFilledCount > 0;
  const isKeyComplete = keyFilledCount >= totalQuestions;

  return (
    <div className="space-y-3 mb-5 no-print">
      {/* Primary Unified Workspace Bar */}
      <div className={`rounded-xl p-2.5 sm:p-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 border transition-colors ${
        isNotebook ? 'bg-[#fcfaf4] border-[#ded7c6]' : isDark ? 'bg-[#18191d] border-[#3b3e48]' : 'bg-slate-50 border-slate-200/90'
      }`}>
        {/* Left Side: Question Quantity Selector & Filled count */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Question Count Dropdown / Input */}
          <div className="relative inline-flex items-center">
            <div className={`flex items-center border rounded-lg overflow-hidden shadow-2xs ${
              isDark ? 'bg-[#22242a] border-[#3b3e48]' : 'bg-white border-slate-300'
            }`}>
              <span className={`text-xs font-medium pl-2.5 pr-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Questões:</span>
              <input
                id="qty-input"
                type="number"
                min="1"
                max="200"
                value={totalQuestions}
                onChange={e => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1 && val <= 200) {
                    onTotalChange(val);
                  }
                }}
                className={`w-14 py-1.5 px-1 text-xs font-mono-code font-bold outline-none text-center ${
                  isDark ? 'bg-[#22242a] text-zinc-100' : 'bg-white text-slate-900'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPresetsMenu(prev => !prev)}
                className={`px-2 py-1.5 border-l transition cursor-pointer ${
                  isDark
                    ? 'bg-[#2a2c34] hover:bg-[#343740] border-[#3b3e48] text-zinc-300'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                }`}
                title="Escolher número de questões predefinido"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Presets popover menu */}
            {showPresetsMenu && (
              <div
                className={`absolute top-full left-0 mt-1 z-30 border rounded-lg shadow-lg p-2 flex flex-col gap-1 w-44 animate-fadeIn ${
                  isDark ? 'bg-[#22242a] border-[#3b3e48] text-zinc-100' : 'bg-white border-slate-200 text-slate-800'
                }`}
                onMouseLeave={() => setShowPresetsMenu(false)}
              >
                <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 ${
                  isDark ? 'text-zinc-400' : 'text-slate-400'
                }`}>
                  Tamanhos Padrão:
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {presets.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        onTotalChange(p);
                        setShowPresetsMenu(false);
                      }}
                      className={`px-2 py-1 text-xs font-mono-code rounded transition cursor-pointer ${
                        totalQuestions === p
                          ? isDark ? 'bg-zinc-200 text-zinc-900 font-bold' : isNotebook ? 'bg-[#cd5c08] shadow-sm text-white font-bold' : 'bg-slate-900 text-white font-bold'
                          : isDark ? 'bg-[#2a2c34] hover:bg-[#343740] text-zinc-200' : isNotebook ? 'bg-white hover:bg-[#f0ece1] text-[#1c2b45]' : 'bg-slate-50 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Clean metadata text for filled questions (No pills) */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono-code">
            <span>{filledCount} de {totalQuestions} marcadas ({percentage}%)</span>
          </div>
        </div>

        {/* Right Side: Primary Actions (PDF IA, Gabarito, Central, Corrigir) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Ler Prova em PDF com IA */}
          {onOpenPdfImport && (
            <button
              id="btn-open-pdf-import"
              type="button"
              onClick={onOpenPdfImport}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition shadow-2xs cursor-pointer ${
                hasPdfImported
                  ? isNotebook
                    ? 'bg-[#f7f3e8] border-amber-600/40 text-amber-900 hover:bg-[#efe9da]'
                    : 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100'
                  : isNotebook
                  ? 'bg-white hover:bg-[#ede7d8] border-[#ded7c6] text-[#1c2b45]'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
              }`}
              title={
                hasPdfImported
                  ? `Prova em PDF vinculada (${pdfQuestionsCount} questões com IA). Clique para alterar ou reimportar.`
                  : 'Importar caderno de prova em PDF para extrair questões e explicações com IA'
              }
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">
                {hasPdfImported ? 'PDF Carregado' : 'Ler PDF com IA'}
              </span>
              <span className="sm:hidden">
                {hasPdfImported ? 'PDF (IA)' : 'PDF IA'}
              </span>
              {hasPdfImported && typeof pdfQuestionsCount === 'number' && pdfQuestionsCount > 0 && (
                <span className="text-[10px] font-mono-code font-bold px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-950">
                  {pdfQuestionsCount} Q
                </span>
              )}
            </button>
          )}

          {/* Central de Exportação e Gabarito */}
          <button
            id="btn-open-export-import-center"
            type="button"
            onClick={() => onOpenExportModal('import-user')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition shadow-2xs cursor-pointer ${
              isExportModalOpen
                ? isNotebook
                  ? 'bg-[#f4efe3] border-[#1c2b45] text-[#1c2b45] ring-1 ring-[#1c2b45]/20 font-bold'
                  : isDark
                  ? 'bg-[#2c2f38] border-zinc-400 text-white ring-1 ring-zinc-400/30 font-bold'
                  : 'bg-slate-900 text-white border-slate-900 shadow-2xs font-bold'
                : isNotebook
                ? 'bg-white hover:bg-[#ede7d8] border-[#ded7c6] text-[#1c2b45] active:bg-[#f4efe3]'
                : isDark
                ? 'bg-[#22242a] hover:bg-[#2a2c34] border-[#3b3e48] text-zinc-200 active:bg-[#2c2f38]'
                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 active:bg-slate-200'
            }`}
            title="Abrir a Central de Exportação e Gabarito (importar respostas, exportar respostas, gabarito oficial e espelho)"
          >
            <FolderKanban className={`w-3.5 h-3.5 ${
              isExportModalOpen
                ? isDark ? 'text-zinc-200' : isNotebook ? 'text-[#1c2b45]' : 'text-white'
                : isNotebook ? 'text-[#1c2b45]' : isDark ? 'text-zinc-300' : 'text-slate-700'
            }`} />
            <span className="hidden sm:inline">Central de Exportação e Gabarito</span>
            <span className="sm:hidden">Central de Gabarito</span>
          </button>

          {/* Official Key Button */}
          <button
            id="btn-toggle-key-drawer"
            type="button"
            onClick={() => {
              if (onToggleKeyDrawer) {
                onToggleKeyDrawer();
              } else {
                onOpenExportModal('key');
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition shadow-2xs cursor-pointer ${
              isKeyDrawerOpen
                ? isDark
                  ? 'bg-amber-950/80 text-amber-200 border-amber-500 font-semibold ring-1 ring-amber-500/20'
                  : isNotebook
                  ? 'bg-[#fefce8] text-[#854d0e] border-[#854d0e] font-semibold ring-1 ring-[#854d0e]/20'
                  : 'bg-amber-100 text-amber-950 border-amber-400 font-semibold ring-1 ring-amber-500/20'
                : hasKey
                ? isDark
                  ? 'bg-amber-950/50 text-amber-200 border-amber-700/60 hover:bg-amber-900/40'
                  : isNotebook
                  ? 'bg-[#fefce8]/80 text-[#854d0e] border-amber-300 hover:bg-[#fef9c3]'
                  : 'bg-amber-50/90 text-amber-950 border-amber-300 hover:bg-amber-100'
                : isDark
                ? 'bg-[#22242a] text-zinc-300 border-[#3b3e48] hover:bg-[#2a2c34]'
                : isNotebook
                ? 'bg-white text-[#1c2b45] border-[#ded7c6] hover:bg-[#ede7d8]'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
            title="Abrir painel para conferir ou importar o gabarito oficial da banca"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>Gabarito Oficial</span>
            <span className={`text-[10px] font-mono-code font-bold px-1.5 py-0.2 rounded-full ${
              isDark
                ? 'bg-amber-900/60 text-amber-200 border border-amber-700/60'
                : isNotebook
                ? 'bg-amber-200 text-amber-950 border border-amber-300'
                : 'bg-amber-200/80 text-amber-950'
            }`}>
              {keyFilledCount}/{totalQuestions}
            </span>
          </button>

          {/* Report Button (if corrected) */}
          {isCorrected && (
            <button
              type="button"
              onClick={() => onOpenExportModal('report')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition shadow-2xs cursor-pointer border ${
                isNotebook
                  ? 'bg-[#edf5ee] text-[#163824] border-[#cbe1d0] hover:bg-[#e2ede3]'
                  : isDark
                  ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/40'
                  : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
              }`}
              title="Ver e baixar o espelho de correção completo"
            >
              <FileCheck className={`w-3.5 h-3.5 ${isNotebook ? 'text-[#e6721d]' : isDark ? 'text-emerald-400' : 'text-emerald-700'}`} />
              <span className="hidden sm:inline">Espelho</span>
            </button>
          )}

          {/* Primary CTA: Corrigir Simulado ou Voltar a Editar */}
          {isCorrected ? (
            <button
              id="btn-exit-correction"
              type="button"
              onClick={onExitCorrection}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition shadow-2xs cursor-pointer ${
                isDark
                  ? 'bg-[#22242a] border-[#3b3e48] text-zinc-200 hover:bg-[#2a2c34]'
                  : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
              }`}
              title="Voltar ao modo de preenchimento e alterar respostas"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`} />
              <span>Voltar a Editar</span>
            </button>
          ) : (
            <button
              id="btn-run-correction"
              type="button"
              onClick={onRunCorrection}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition shadow-sm cursor-pointer ${
                isDark
                  ? 'bg-zinc-200 hover:bg-white text-zinc-950 font-bold'
                  : isNotebook
                  ? 'bg-[#cd5c08] shadow-sm hover:bg-[#b84f06] text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
              title="Conferir respostas com o gabarito oficial e ver desempenho"
            >
              <CheckCircle2 className={`w-3.5 h-3.5 ${isNotebook ? 'text-[#fceddf]' : 'text-emerald-500'}`} />
              <span>Corrigir Simulado</span>
            </button>
          )}

          {/* Quick Clear Action */}
          <button
            id="btn-clear-user-answers"
            type="button"
            onClick={onClearUserAnswers}
            className={`p-1.5 rounded-lg transition cursor-pointer ml-1 ${
              isDark
                ? 'text-zinc-400 hover:text-rose-300 hover:bg-rose-950/40'
                : 'text-slate-400 hover:text-red-700 hover:bg-red-50'
            }`}
            title="Limpar marcações deste simulado"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sleek Progress Indicator */}
      <div className="px-1 space-y-1">
        <div className={`flex items-center justify-between text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>Preenchimento:</span>
            <span className={`font-mono-code font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
              {filledCount} de {totalQuestions} respondidas ({percentage}%)
            </span>
          </div>
          {filledCount < totalQuestions && (
            <span className={`font-medium text-[11px] ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
              {totalQuestions - filledCount} em branco
            </span>
          )}
        </div>

        {/* Minimalist Progress Bar */}
        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#3b3e48]' : 'bg-slate-200'}`}>
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isDark ? 'bg-zinc-300' : isNotebook ? 'bg-[#cd5c08] shadow-sm' : 'bg-slate-900'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
