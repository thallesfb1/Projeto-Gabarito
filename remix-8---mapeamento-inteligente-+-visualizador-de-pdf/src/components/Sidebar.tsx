import React, { useState } from 'react';
import {
  PlusCircle,
  FolderKanban,
  Edit3,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Database,
  CheckCircle2,
  Clock,
  Search,
  X,
  FileText,
  MessageSquare,
  ExternalLink,
  Home,
  BookMarked,
  Sun,
  BookOpen,
  XCircle,
  AlertCircle,
  Moon,
  LibraryBig,
  BarChart3,
} from 'lucide-react';
import { SimuladoData, AppTheme } from '../types';
import { computeSimuladoStats, getPerformanceInfo } from '../utils/parser';

interface SidebarProps {
  provas: SimuladoData[];
  activeId: string;
  isOpen: boolean; // desktop expanded state
  isMobileOpen: boolean; // mobile drawer state
  isHomeActive?: boolean;
  isLibraryActive?: boolean;
  isInsightsActive?: boolean;
  theme?: AppTheme;
  onThemeChange?: (theme: AppTheme) => void;
  onToggleOpen: () => void;
  onCloseMobile: () => void;
  onGoHome?: () => void;
  onOpenLibrary?: () => void;
  onOpenInsights?: () => void;
  onSelectProva: (id: string) => void;
  onOpenNewProvaModal: () => void;
  onOpenRenameModal: (prova: SimuladoData) => void;
  onDuplicateProva: (prova: SimuladoData) => void;
  onDeleteProva: (prova: SimuladoData) => void;
  onOpenBackupModal: () => void;
  onOpenExportModal?: (tab?: 'export-user' | 'import-user' | 'key' | 'report') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  provas,
  activeId,
  isOpen,
  isMobileOpen,
  isHomeActive = false,
  isLibraryActive = false,
  isInsightsActive = false,
  theme = 'clean',
  onThemeChange,
  onToggleOpen,
  onCloseMobile,
  onGoHome,
  onOpenLibrary,
  onOpenInsights,
  onSelectProva,
  onOpenNewProvaModal,
  onOpenRenameModal,
  onDuplicateProva,
  onDeleteProva,
  onOpenBackupModal,
  onOpenExportModal,
}) => {
  const isNotebook = theme === 'notebook';
  const isDark = theme === 'dark';
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProvas = provas.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const formatLastUpdated = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return `Hoje às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      }
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const formatTimer = (totalSec: number) => {
    if (!totalSec) return '';
    const mins = Math.floor(totalSec / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  };

  const renderProvaItem = (prova: SimuladoData) => {
    const isActive = prova.id === activeId;
    const stats = computeSimuladoStats(prova);

    return (
      <div
        key={prova.id}
        id={`sidebar-item-${prova.id}`}
        onClick={() => {
          onSelectProva(prova.id);
          onCloseMobile();
        }}
        className={`group p-3 rounded-xl border transition-all cursor-pointer select-none text-left ${
          isActive
            ? isNotebook
              ? 'bg-[#f4efe3] border-[#1c2b45] shadow-xs ring-1 ring-[#1c2b45]/15'
              : isDark
              ? 'bg-[#2a2c34] border-[#52525b] shadow-xs ring-1 ring-zinc-400/20'
              : 'bg-slate-50 border-slate-900 shadow-xs ring-1 ring-slate-900/10'
            : isNotebook
              ? 'bg-white border-[#ded7c6] hover:border-[#1c2b45]/40 hover:bg-[#faf7f0]'
              : isDark
              ? 'bg-[#18191d]/80 border-[#3b3e48] hover:border-zinc-500 hover:bg-[#2a2c34]/60 text-zinc-200'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
        }`}
      >
        <div className="w-full">
          {/* Title & Active badge */}
          <div className="flex items-start justify-between gap-1.5 mb-1.5">
            <h4
              className={`text-xs sm:text-sm font-semibold tracking-tight line-clamp-1 ${
                isActive
                  ? isNotebook ? 'text-[#1c2b45]' : isDark ? 'text-white' : 'text-slate-900'
                  : isNotebook ? 'text-[#2e3a4e]' : isDark ? 'text-zinc-200' : 'text-slate-800'
              }`}
              title={prova.title}
            >
              {prova.title}
            </h4>
            {isActive && (
              <span className={`shrink-0 text-[10px] uppercase font-mono-code font-bold px-1.5 py-0.5 rounded ${
                isNotebook ? 'theme-solid text-white' : isDark ? 'theme-solid text-zinc-950 font-bold' : 'theme-solid text-white'
              }`}>
                Ativo
              </span>
            )}
          </div>

          {/* Status badge & metrics */}
          <div className={`flex items-center justify-between text-[11px] font-mono-code ${
            isNotebook ? 'text-[#6b6255]' : isDark ? 'text-zinc-400' : 'text-slate-500'
          } gap-1.5 mb-2 flex-wrap`}>
            <div className="flex items-center gap-1.5 flex-wrap">
              {prova.isCorrected ? (
                (() => {
                  const perf = getPerformanceInfo(stats.hits, stats.keyCount, prova.examType, stats.netScore);
                  return (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold text-[10px] border ${
                          isNotebook
                            ? perf.badgeClassNotebook
                            : isDark
                            ? perf.tier === 'high'
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                              : perf.tier === 'medium'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                              : 'bg-rose-950/80 text-rose-300 border-rose-700/60'
                            : perf.badgeClass
                        }`}
                        title={`Prova concluída: ${stats.hits} acertos de ${stats.keyCount} avaliadas (${stats.percentageFormatted}%)`}
                      >
                        {perf.tier === 'high' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : perf.tier === 'medium' ? (
                          <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                        ) : (
                          <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                        )}
                        <span>
                          Concluída · {stats.hits}/{stats.keyCount} ({stats.percentageFormatted}%)
                        </span>
                      </span>
                      {stats.isPartialKey && (
                        <span className={`text-[9px] font-mono-code px-1 py-0.5 rounded border ${
                          isDark ? 'text-amber-300 bg-amber-950/60 border-amber-700/60' : 'text-amber-800 bg-amber-50 border-amber-200'
                        }`}>
                          {stats.keyCount}/{stats.total} gab.
                        </span>
                      )}
                    </div>
                  );
                })()
              ) : (
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                  isNotebook ? 'bg-[#ede7d8] text-[#1c2b45]' : isDark ? 'bg-[#22242a] text-zinc-300 border border-[#3b3e48]' : 'bg-slate-100 text-slate-700'
                }`}>
                  <FileText className={`w-3 h-3 ${isDark ? 'text-zinc-300' : 'text-slate-500'}`} />
                  <span>{stats.userFilledCount}/{stats.total} marcadas</span>
                </span>
              )}

              {prova.timeSpentSeconds > 0 && (
                <span className={`inline-flex items-center gap-0.5 text-[10px] ${
                  isNotebook ? 'text-[#7d7465]' : isDark ? 'text-zinc-500' : 'text-slate-500'
                }`}>
                  <Clock className="w-2.5 h-2.5" />
                  <span>{formatTimer(prova.timeSpentSeconds)}</span>
                </span>
              )}
            </div>

            <span className={`text-[10px] shrink-0 ${
              isNotebook ? 'text-[#8c8270]' : isDark ? 'text-zinc-400' : 'text-slate-400'
            }`} title={`Atualizada: ${prova.updatedAt}`}>
              {formatLastUpdated(prova.updatedAt)}
            </span>
          </div>

          {/* Item actions */}
          <div
            className={`flex items-center justify-end gap-1 pt-1.5 border-t ${
              isNotebook ? 'border-[#ded7c6]' : isDark ? 'border-[#3b3e48]' : 'border-slate-100'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onOpenRenameModal(prova)}
              className={`p-1 rounded transition ${
                isNotebook ? 'text-[#6b6255] hover:text-[#1c2b45] hover:bg-[#ede7d8]' : isDark ? 'text-zinc-400 hover:text-zinc-100 hover:bg-[#2a2c34]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title="Renomear este cartão-resposta"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDuplicateProva(prova)}
              className={`p-1 rounded transition ${
                isNotebook ? 'text-[#6b6255] hover:text-[#1c2b45] hover:bg-[#ede7d8]' : isDark ? 'text-zinc-400 hover:text-zinc-100 hover:bg-[#2a2c34]' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title="Duplicar este cartão-resposta (criar cópia independente)"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteProva(prova)}
              className={`p-1 rounded transition ${
                isDark ? 'text-zinc-400 hover:text-rose-300 hover:bg-rose-950/30' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
              }`}
              title="Excluir este cartão-resposta"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const sidebarContent = (
    <div className={`h-full w-full flex flex-col min-h-0 select-none transition-colors ${
      isNotebook
        ? 'bg-[#fcfaf4] border-r border-[#ded7c6] text-[#1c2b45]'
        : isDark
        ? 'bg-[#22242a] border-r border-[#3b3e48] text-zinc-100'
        : 'bg-white border-r border-slate-200 text-slate-900'
    }`}>
      {/* Top Header */}
      <div className={`shrink-0 p-4 border-b flex items-center justify-between ${
        isNotebook ? 'bg-[#f5f0e3] border-[#ded7c6]' : isDark ? 'bg-[#18191d] border-[#3b3e48]' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <FolderKanban className={`w-5 h-5 ${isNotebook ? 'text-[#1c2b45]' : isDark ? 'text-zinc-300' : 'text-slate-700'}`} />
          <div>
            <h3 className={`font-bold text-sm ${isNotebook ? 'text-[#1c2b45]' : isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
              Cartões-Resposta
            </h3>
            <span className={`text-[10px] font-mono-code ${isNotebook ? 'text-[#6b6255]' : isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {provas.length} {provas.length === 1 ? 'salvo' : 'salvos'} localmente
            </span>
          </div>
        </div>

        {/* Toggle / Close Button */}
        <div className="flex items-center gap-1">
          {/* Mobile close */}
          <button
            type="button"
            onClick={onCloseMobile}
            className={`md:hidden p-1.5 rounded-lg transition ${
              isNotebook ? 'text-[#5d6778] hover:text-[#1c2b45] hover:bg-[#ede7d8]' : isDark ? 'text-zinc-400 hover:text-white hover:bg-[#2a2c34]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="Fechar menu lateral"
          >
            <X className="w-5 h-5" />
          </button>
          {/* Desktop collapse */}
          <button
            type="button"
            onClick={onToggleOpen}
            className={`hidden md:flex p-1.5 rounded-lg transition ${
              isNotebook ? 'text-[#5d6778] hover:text-[#1c2b45] hover:bg-[#ede7d8]' : isDark ? 'text-zinc-400 hover:text-white hover:bg-[#2a2c34]' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="Recolher barra lateral"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* New Answer Sheet Action Button */}
      <div className={`shrink-0 p-3 border-b space-y-2 ${
        isNotebook ? 'bg-[#fdfbf7] border-[#ded7c6]' : isDark ? 'bg-[#22242a] border-[#3b3e48]' : 'bg-white border-slate-200'
      }`}>
        <button
          id="btn-sidebar-new-prova"
          type="button"
          onClick={() => {
            onOpenNewProvaModal();
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-mono-code text-xs font-semibold shadow-xs transition active:scale-[0.99] cursor-pointer ${
            isDark
              ? 'theme-solid hover:bg-white text-zinc-950 font-bold'
              : 'theme-solid hover:bg-slate-800 text-white'
          }`}
          title="Criar novo cartão-resposta para simulado"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Criar Cartão-Resposta</span>
        </button>

        {/* Quick Central de Gabarito & Exportação button */}
        {onOpenExportModal && !isHomeActive && !isLibraryActive && !isInsightsActive && provas.some(prova=>prova.id===activeId) && (
          <button
            id="btn-sidebar-export-center"
            type="button"
            onClick={() => {
              onOpenExportModal('import-user');
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono-code transition cursor-pointer border ${
              isNotebook
                ? 'bg-[#f8f5ec] text-[#2e3b52] border-[#ded7c6] hover:bg-[#ede7d8]'
                : isDark
                ? 'bg-[#18191d] text-zinc-200 border-[#3b3e48] hover:bg-[#2a2c34]'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Abrir Central de Exportação e Gabarito"
          >
            <div className="flex items-center gap-2 truncate">
              <FolderKanban className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-300' : 'text-slate-600'} shrink-0`} />
              <span className="truncate">Central de Gabarito</span>
            </div>
            <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-slate-400'} font-mono-code shrink-0`}>Abrir</span>
          </button>
        )}

        {/* Home / Overview quick link for existing exams */}
        {onGoHome && (
          <button
            id="btn-sidebar-home"
            type="button"
            onClick={() => {
              onGoHome();
              onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono-code transition cursor-pointer border ${
              isHomeActive
                ? isDark
                  ? 'theme-solid text-zinc-950 border-zinc-200 font-bold shadow-2xs'
                  : 'theme-solid text-white border-slate-900 font-semibold shadow-2xs'
                : isDark
                ? 'bg-[#18191d] text-zinc-200 border-[#3b3e48] hover:bg-[#2a2c34]'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Acessar tela inicial com orientações e funcionamento"
          >
            <div className="flex items-center gap-2">
              <Home className={`w-3.5 h-3.5 ${isHomeActive ? 'text-current' : isDark ? 'text-zinc-300' : 'text-slate-500'}`} />
              <span>Painel Inicial</span>
            </div>
            {isHomeActive && (
              <span className="text-[10px] text-current font-mono-code font-bold">Ativo</span>
            )}
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          {onOpenLibrary && (
            <button
              id="btn-sidebar-library"
              type="button"
              onClick={() => {
                onOpenLibrary();
                onCloseMobile();
              }}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-mono-code font-semibold transition cursor-pointer border ${
                isLibraryActive
                  ? isDark
                    ? 'theme-solid text-zinc-950 border-zinc-200'
                    : 'theme-solid text-white border-slate-900'
                  : isDark
                  ? 'bg-[#18191d] text-zinc-300 border-[#3b3e48] hover:bg-[#2a2c34]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Abrir Biblioteca de Provas estruturadas"
            >
              <LibraryBig className={`w-3.5 h-3.5 ${isLibraryActive ? 'text-current' : ''}`} />
              Biblioteca
            </button>
          )}
          {onOpenInsights && (
            <button
              id="btn-sidebar-insights"
              type="button"
              onClick={() => {
                onOpenInsights();
                onCloseMobile();
              }}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-mono-code font-semibold transition cursor-pointer border ${
                isInsightsActive
                  ? isDark
                    ? 'theme-solid text-zinc-950 border-zinc-200'
                    : 'theme-solid text-white border-slate-900'
                  : isDark
                  ? 'bg-[#18191d] text-zinc-300 border-[#3b3e48] hover:bg-[#2a2c34]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
              title="Abrir diagnóstico de desempenho e fila de revisão"
            >
              <BarChart3 className={`w-3.5 h-3.5 ${isInsightsActive ? 'text-amber-500' : ''}`} />
              Desempenho
            </button>
          )}
        </div>
      </div>

      {/* Search Bar (if more than 2 provas) */}
      {provas.length > 2 && (
        <div className={`shrink-0 p-2.5 border-b ${
          isNotebook
            ? 'border-[#dedad0]/60 bg-[#fbf9f4]'
            : isDark
            ? 'border-[#3b3e48] bg-[#18191d]'
            : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="relative">
            <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-400' : 'text-[#5b6478]'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome..."
              className={`w-full pl-8 pr-2.5 py-1.5 rounded-md text-xs font-mono-code focus:outline-none transition ${
                isNotebook
                  ? 'bg-white border border-[#dedad0] text-[#1c2b45] focus:ring-1 focus:ring-[#1c2b45]'
                  : isDark
                  ? 'bg-[#22242a] border border-[#3b3e48] text-zinc-100 placeholder-zinc-500 focus:ring-1 focus:ring-zinc-400'
                  : 'bg-white border border-slate-300 text-slate-900 focus:ring-1 focus:ring-slate-900'
              }`}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5b6478] hover:text-[#1c2b45] dark:hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Provas List with dedicated vertical scrollbar */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 overscroll-contain">
        {provas.length === 0 ? (
          /* Acolhedor Estado Vazio Conforme Requisito 9 */
          <div className="py-8 px-4 text-center text-xs font-mono-code text-[#5b6478] dark:text-zinc-400 flex flex-col items-center justify-center space-y-2.5 my-auto">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-2xs border ${
              isNotebook
                ? 'bg-[#f0eee6] border-[#dedad0] text-[#1c2b45]'
                : isDark
                ? 'bg-[#18191d] border-[#3b3e48] text-zinc-300'
                : 'bg-[#f0eee6] border-[#dedad0] text-[#1c2b45]'
            }`}>
              <BookMarked className="w-5 h-5 opacity-90" />
            </div>
            <div className="space-y-1">
              <p className={`font-serif-title italic font-bold text-sm ${
                isNotebook ? 'text-[#1c2b45]' : isDark ? 'text-zinc-200' : 'text-[#1c2b45]'
              }`}>
                Um lugar para cada nova conquista.
              </p>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-[#5b6478]'}`}>
                Seus cartões-resposta aparecerão aqui.
              </p>
            </div>
          </div>
        ) : filteredProvas.length === 0 ? (
          <div className={`p-4 text-center text-xs font-mono-code space-y-1.5 ${isDark ? 'text-zinc-400' : 'text-[#5b6478]'}`}>
            <p>Nenhum cartão-resposta encontrado com este termo.</p>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className={`${isDark ? 'text-zinc-200' : 'text-[#1c2b45]'} underline font-semibold cursor-pointer`}
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          filteredProvas.map(renderProvaItem)
        )}
      </div>

      {/* Sidebar Footer: FIXED AT BOTTOM WITH THEME, BACKUP & FEEDBACK */}
      <div className={`shrink-0 p-3 border-t space-y-2.5 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.04)] ${
        isNotebook ? 'border-[#ded7c6] bg-[#f5f0e3]' : isDark ? 'border-[#3b3e48] bg-[#18191d]' : 'border-slate-200 bg-slate-50'
      }`}>
        {/* Theme Toggle within Sidebar (Clean, Caderno, Escuro) */}
        {onThemeChange && (
          <div className="space-y-1">
            <span className={`text-[10px] font-mono-code font-bold uppercase tracking-wider block px-0.5 ${
              isDark ? 'text-zinc-400' : 'text-slate-500'
            }`}>
              Tema Visual
            </span>
            <div className={`grid grid-cols-3 p-0.5 rounded-lg border text-xs shadow-2xs ${
              isNotebook
                ? 'bg-[#ede7d8] border-[#ded7c6]'
                : isDark
                ? 'bg-[#22242a] border-[#3b3e48]'
                : 'bg-slate-200/70 border-slate-300/80'
            }`}>
              <button
                id="sidebar-theme-clean"
                type="button"
                onClick={() => onThemeChange('clean')}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-md transition-all cursor-pointer font-medium ${
                  theme === 'clean'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : isDark
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tema Clean: visual limpo e contemporâneo"
              >
                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">Clean</span>
              </button>
              <button
                id="sidebar-theme-notebook"
                type="button"
                onClick={() => onThemeChange('notebook')}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-md transition-all cursor-pointer font-medium ${
                  theme === 'notebook'
                    ? 'bg-[#fdfbf7] text-amber-950 shadow-2xs font-bold border border-amber-300/70'
                    : isDark
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-[#5d6778] hover:text-[#1c2b45]'
                }`}
                title="Tema Caderno: linhas de caderno no fundo e tons pastéis confortáveis"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="truncate">Caderno</span>
              </button>
              <button
                id="sidebar-theme-dark"
                type="button"
                onClick={() => onThemeChange('dark')}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-md transition-all cursor-pointer font-medium ${
                  theme === 'dark'
                    ? 'bg-[#2a2c34] text-zinc-100 shadow-2xs font-bold border border-[#4b4f5c]'
                    : isDark
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tema Escuro: tons de grafite e cinza suave"
              >
                <Moon className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                <span className="truncate">Escuro</span>
              </button>
            </div>
          </div>
        )}

        <button
          id="btn-sidebar-backup"
          type="button"
          onClick={() => {
            onOpenBackupModal();
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-center gap-2 py-2 px-3 border rounded-lg font-mono-code text-xs font-semibold transition cursor-pointer ${
            isNotebook
              ? 'bg-white hover:bg-[#ede7d8] border-[#ded7c6] text-[#1c2b45]'
              : isDark
              ? 'bg-[#22242a] hover:bg-[#2a2c34] border-[#3b3e48] text-zinc-200'
              : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
          }`}
          title="Exportar, restaurar backups ou gerenciar pontos de restauração no IndexedDB"
        >
          <Database className={`w-3.5 h-3.5 ${isNotebook ? 'text-[#1c2b45]' : isDark ? 'text-zinc-300' : 'text-slate-700'}`} />
          <span>Backup & Snapshots</span>
        </button>

        <a
          id="btn-sidebar-feedback"
          href="https://forms.gle/hjRkzSo75nfRcqPd8"
          target="_blank"
          rel="noopener noreferrer"
          className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-mono-code text-xs font-semibold transition shadow-2xs group cursor-pointer border ${
            isDark
              ? 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-800/60 text-amber-200'
              : 'bg-amber-50/70 hover:bg-amber-100/90 border-amber-200/90 hover:border-amber-300 text-amber-950'
          }`}
          title="Dar feedback sobre o aplicativo (Google Forms)"
        >
          <MessageSquare className="w-3.5 h-3.5 text-amber-500 group-hover:scale-105 transition-transform" />
          <span>Dar feedback</span>
          <ExternalLink className="w-3 h-3 text-amber-500/80" aria-hidden="true" />
          <span className="sr-only">(abre em nova aba)</span>
        </a>

        <button
          type="button"
          onClick={() => {
            onOpenBackupModal();
            onCloseMobile();
          }}
          className={`w-full flex items-center justify-center gap-1.5 py-0.5 text-[10px] text-center font-mono-code transition cursor-pointer group ${
            isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-[#5b6478] hover:text-[#1c2b45]'
          }`}
          title="Armazenamento seguro em IndexedDB com redundância dupla"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform shrink-0" />
          <span>Armazenamento & recuperação</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`md:hidden fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] h-full shadow-2xl flex flex-col min-h-0 transition-transform duration-200 ease-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className={`h-full w-full flex flex-col min-h-0 overflow-hidden ${isDark ? 'bg-[#22242a]' : 'bg-white'}`}>
          {sidebarContent}
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={`workspace-sidebar hidden md:block shrink-0 sticky top-4 h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] transition-all duration-200 ease-in-out ${
          isOpen ? 'w-72' : 'w-12'
        }`}
      >
        {isOpen ? (
          <div className={`h-full w-full rounded-xl border-2 overflow-hidden shadow-md flex flex-col min-h-0 ${
            isDark ? 'border-[#3b3e48] bg-[#22242a]' : 'border-[#1c2b45] bg-white'
          }`}>
            {sidebarContent}
          </div>
        ) : (
          /* Collapsed Desktop Strip */
          <div className={`h-full w-full rounded-xl border-2 flex flex-col items-center py-4 px-1 shadow-sm justify-between select-none ${
            isDark
              ? 'bg-[#22242a] border-[#3b3e48] text-zinc-200'
              : 'bg-[#fdfbf7] border-[#1c2b45]'
          }`}>
            <div className="flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={onToggleOpen}
                className={`p-2 rounded-lg transition cursor-pointer ${
                  isDark ? 'text-zinc-300 hover:bg-[#2a2c34]' : 'text-[#1c2b45] hover:bg-[#dedad0]/60'
                }`}
                title="Expandir barra de provas"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={onOpenNewProvaModal}
                className={`p-2 rounded-lg transition shadow-xs cursor-pointer ${
                  isDark
                    ? 'theme-solid text-zinc-950 hover:bg-white font-bold'
                    : 'theme-solid text-white hover:bg-[#132038]'
                }`}
                title="Criar Cartão-Resposta"
              >
                <PlusCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-700" />
              </button>

              <div className={`w-6 h-px ${isDark ? 'bg-[#3b3e48]' : 'bg-[#dedad0]'}`} />

              <div
                className={`text-[11px] font-mono-code font-bold -rotate-90 origin-center whitespace-nowrap mt-8 ${
                  isDark ? 'text-zinc-300' : 'text-[#1c2b45]'
                }`}
                style={{ transformOrigin: 'center' }}
              >
                {provas.length} {provas.length === 1 ? 'CARTÃO' : 'CARTÕES'}
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenBackupModal}
              className={`p-2 rounded-lg transition cursor-pointer ${
                isDark ? 'text-zinc-400 hover:text-white hover:bg-[#2a2c34]' : 'text-[#5b6478] hover:text-[#1c2b45] hover:bg-[#dedad0]/60'
              }`}
              title="Backup completo"
            >
              <Database className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
