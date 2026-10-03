import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Edit3,
  Check,
  Printer,
  Clock,
  FolderKanban,
  MessageSquare,
  ExternalLink,
  Home,
  Calendar,
  Sun,
  BookOpen,
  Moon,
} from 'lucide-react';
import { AppTheme } from '../types';

interface HeaderProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  date: string;
  onDateChange: (newDate: string) => void;
  timeSeconds: number;
  onTimeChange: (seconds: number | ((prev: number) => number)) => void;
  isTimerRunning: boolean;
  onToggleTimer: () => void;
  timerDisabled?: boolean;
  theme?: AppTheme;
  onThemeChange?: (theme: AppTheme) => void;
  onToggleSidebar?: () => void;
  onGoHome?: () => void;
  provasCount?: number;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onTitleChange,
  date,
  onDateChange,
  timeSeconds,
  onTimeChange,
  isTimerRunning,
  onToggleTimer,
  timerDisabled=false,
  theme = 'clean',
  onThemeChange,
  onToggleSidebar,
  onGoHome,
  provasCount = 1,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);

  const isNotebook = theme === 'notebook';
  const isDark = theme === 'dark';

  useEffect(() => {
    setTempTitle(title);
  }, [title]);

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSaveTitle = () => {
    if (tempTitle.trim()) {
      onTitleChange(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className={`pb-4 mb-4 border-b transition-colors min-w-0 space-y-3 ${
      isNotebook ? 'border-[#ded7c6]' : isDark ? 'border-[#3b3e48]' : 'border-slate-200'
    }`}>
      {/* Top Utility Bar: Navigation, Theme Switcher & Timer */}
      <div className="flex items-center justify-between gap-3 flex-wrap min-w-0">
        {/* Navigation buttons: Provas & Início */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {onToggleSidebar && (
            <button
              id="btn-header-toggle-provas"
              type="button"
              onClick={onToggleSidebar}
              className={`no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 border ${
                isNotebook
                  ? 'bg-[#f5f0e4] hover:bg-[#ebe4d4] text-[#1c2b45] border-[#ded7c6]'
                  : isDark
                  ? 'bg-[#2a2c34] hover:bg-[#343740] text-zinc-200 border-[#3b3e48]'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
              }`}
              title="Abrir ou recolher painel lateral de simulados"
            >
              <FolderKanban className={`w-3.5 h-3.5 ${isNotebook ? 'text-[#1c2b45]' : isDark ? 'text-zinc-300' : 'text-slate-600'}`} />
              <span>Cartões ({provasCount})</span>
            </button>
          )}

          {onGoHome && (
            <button
              id="btn-header-go-home"
              type="button"
              onClick={onGoHome}
              className={`no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 border ${
                isNotebook
                  ? 'bg-[#f5f0e4] hover:bg-[#ebe4d4] text-[#1c2b45] border-[#ded7c6]'
                  : isDark
                  ? 'bg-[#2a2c34] hover:bg-[#343740] text-zinc-200 border-[#3b3e48]'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
              }`}
              title="Ir para a Tela Inicial da plataforma"
            >
              <Home className={`w-3.5 h-3.5 ${isNotebook ? 'text-amber-800' : isDark ? 'text-zinc-300' : 'text-slate-600'}`} />
              <span>Painel Inicial</span>
            </button>
          )}
        </div>

        {/* Right Tools: Simulation Timer, Theme Switcher & Compact Utilities */}
        <div className="flex items-center gap-2 flex-wrap text-sm shrink-0">
          {/* Theme Switcher 3-Mode Toggle Button (Clean, Caderno, Escuro) */}
          {onThemeChange && (
            <div className={`no-print inline-flex items-center p-0.5 rounded-lg border text-xs shadow-2xs ${
              isNotebook
                ? 'bg-[#ede7d8] border-[#ded7c6]'
                : isDark
                ? 'bg-[#18191d] border-[#3b3e48]'
                : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                id="btn-theme-clean"
                type="button"
                onClick={() => onThemeChange('clean')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
                  theme === 'clean'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : isDark
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : isNotebook
                    ? 'text-[#5d6778] hover:text-[#1c2b45]'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tema Plataforma: visual limpo e contemporâneo"
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Clean</span>
              </button>
              <button
                id="btn-theme-notebook"
                type="button"
                onClick={() => onThemeChange('notebook')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
                  theme === 'notebook'
                    ? 'bg-[#fdfbf7] text-amber-950 shadow-2xs font-bold border border-amber-300/70'
                    : isDark
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : isNotebook
                    ? 'text-[#5d6778] hover:text-[#1c2b45]'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tema Caderno: linhas de caderno no fundo e tons pastéis confortáveis"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Caderno</span>
              </button>
              <button
                id="btn-theme-dark"
                type="button"
                onClick={() => onThemeChange('dark')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
                  theme === 'dark'
                    ? 'bg-[#2a2c34] text-zinc-100 shadow-2xs font-bold border border-[#4b4f5c]'
                    : isDark
                    ? 'text-zinc-400 hover:text-zinc-200'
                    : isNotebook
                    ? 'text-[#5d6778] hover:text-[#1c2b45]'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Tema Escuro: tons de grafite e cinza suave confortáveis para estudo"
              >
                <Moon className="w-3.5 h-3.5 text-zinc-300" />
                <span className="hidden sm:inline">Escuro</span>
              </button>
            </div>
          )}

          {/* Minimalist Simulation Timer */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-mono-code shadow-xs ${
            isNotebook ? 'theme-solid text-amber-50' : isDark ? 'bg-[#18191d] border border-[#3b3e48] text-zinc-100' : 'theme-solid text-white'
          }`}>
            <Clock className={`w-3.5 h-3.5 ${isNotebook ? 'text-amber-200/80' : isDark ? 'text-zinc-400' : 'text-slate-400'}`} />
            <span className="font-semibold tracking-wider">{formatTimer(timeSeconds)}</span>
            <button
              type="button"
              onClick={onToggleTimer}
              disabled={timerDisabled}
              aria-label={isTimerRunning ? 'Pausar cronômetro' : 'Iniciar cronômetro'}
              className={`p-1 rounded transition cursor-pointer ${
                isNotebook
                  ? 'hover:bg-white/10 text-amber-100 hover:text-white'
                  : isDark
                  ? 'hover:bg-[#2a2c34] text-zinc-300 hover:text-white'
                  : 'hover:bg-slate-800 text-slate-200 hover:text-white'
              }`}
              title={isTimerRunning ? 'Pausar cronômetro' : 'Iniciar cronômetro'}
            >
              {isTimerRunning ? (
                <Pause className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Play className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </button>
            {timeSeconds > 0 && !isTimerRunning && (
              <button
                type="button"
                onClick={() => onTimeChange(0)}
                className={`p-1 rounded transition cursor-pointer ${
                  isNotebook
                    ? 'hover:bg-white/10 text-amber-200/70 hover:text-white'
                    : isDark
                    ? 'hover:bg-[#2a2c34] text-zinc-400 hover:text-white'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Zerar cronômetro"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Print button */}
          <button
            type="button"
            onClick={() => window.print()}
            className={`no-print hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition cursor-pointer ${
              isNotebook
                ? 'text-[#414b60] hover:text-[#1c2b45] bg-[#fdfbf7] hover:bg-[#f5f0e4] border-[#ded7c6]'
                : isDark
                ? 'text-zinc-300 hover:text-white bg-[#2a2c34] hover:bg-[#343740] border-[#3b3e48]'
                : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border-slate-200'
            }`}
            title="Imprimir cartão-resposta em folha física"
          >
            <Printer className="w-3.5 h-3.5 opacity-70" />
            <span>Imprimir</span>
          </button>

          {/* Feedback Button */}
          <a
            id="btn-header-feedback"
            href="https://forms.gle/hjRkzSo75nfRcqPd8"
            target="_blank"
            rel="noopener noreferrer"
            className={`no-print inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition ${
              isNotebook
                ? 'text-[#414b60] hover:text-[#1c2b45] bg-[#fdfbf7] hover:bg-[#f5f0e4] border-[#ded7c6]'
                : isDark
                ? 'text-zinc-300 hover:text-white bg-[#2a2c34] hover:bg-[#343740] border-[#3b3e48]'
                : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border-slate-200'
            }`}
            title="Enviar sugestões de melhoria (Google Forms)"
          >
            <MessageSquare className="w-3.5 h-3.5 opacity-70" />
            <span className="hidden sm:inline">Feedback</span>
            <ExternalLink className="w-3 h-3 opacity-60" aria-hidden="true" />
          </a>
        </div>
      </div>

      {/* Main Title & Exam Metadata Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 pt-1">
        {/* Title Area */}
        <div className="min-w-0 flex-1">
          {isEditingTitle ? (
            <div className="flex items-center gap-2 min-w-0 max-w-full">
              <input
                type="text"
                value={tempTitle}
                onChange={e => setTempTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                autoFocus
                className={`font-sans font-bold text-xl sm:text-2xl px-2.5 py-1 rounded-lg shadow-xs outline-none min-w-0 flex-1 ${
                  isNotebook
                    ? 'text-[#1c2b45] bg-white border border-[#1c2b45] focus:ring-2 focus:ring-[#1c2b45]'
                    : isDark
                    ? 'text-zinc-100 bg-[#18191d] border border-[#3b3e48] focus:ring-2 focus:ring-zinc-400'
                    : 'text-slate-900 bg-white border border-slate-400 focus:ring-2 focus:ring-slate-900'
                }`}
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className={`p-2 rounded-lg text-white transition-colors shrink-0 cursor-pointer ${
                  isNotebook
                    ? 'theme-solid hover:bg-[#132038]'
                    : isDark
                    ? 'theme-solid hover:bg-white text-zinc-900'
                    : 'theme-solid hover:bg-slate-800'
                }`}
                title="Salvar título"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingTitle(true)}
              className="group cursor-pointer inline-flex items-center gap-2 min-w-0 max-w-full"
              title="Clique para renomear este simulado"
            >
              <h1
                className={`font-sans font-bold text-xl sm:text-2xl md:text-3xl tracking-tight min-w-0 truncate px-0.5 py-0.5 pr-2 ${
                  isNotebook ? 'text-[#1c2b45]' : isDark ? 'text-zinc-100' : 'text-slate-900'
                }`}
              >
                {title || 'Cartão de Respostas'}
              </h1>
              <span className={`opacity-0 group-hover:opacity-100 transition-opacity text-xs flex items-center gap-1 font-mono-code shrink-0 ${
                isNotebook ? 'text-[#677387]' : isDark ? 'text-zinc-400' : 'text-slate-500'
              }`}>
                <Edit3 className="w-3.5 h-3.5" /> renomear
              </span>
            </div>
          )}
        </div>

        {/* Date Label */}
        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg shrink-0 border ${
          isNotebook
            ? 'text-[#414b60] bg-[#f5f0e4] border-[#ded7c6]'
            : isDark
            ? 'text-zinc-300 bg-[#2a2c34] border-[#3b3e48]'
            : 'text-slate-500 bg-slate-50 border-slate-200'
        }`}>
          <Calendar className="w-3.5 h-3.5 opacity-70" />
          <span className="font-medium">Data:</span>
          <input
            type="text"
            value={date}
            onChange={e => onDateChange(e.target.value)}
            className={`bg-transparent font-semibold w-24 outline-none border-b border-transparent transition-colors ${
              isNotebook
                ? 'text-[#1c2b45] focus:border-[#1c2b45]'
                : isDark
                ? 'text-zinc-100 focus:border-zinc-400'
                : 'text-slate-800 focus:border-slate-800'
            }`}
            title="Clique para editar a data do simulado"
          />
        </div>
      </div>
    </header>
  );
};
