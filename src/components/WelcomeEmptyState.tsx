import React from 'react';
import {
  PlusCircle,
  Play,
  Upload,
  BookOpen,
  CheckCircle2,
  Shield,
  ArrowRight,
  MessageSquare,
  ExternalLink,
  Zap,
  Scale,
  Lock,
  FileText,
  FileCheck,
  Calendar,
  Sun,
  Check,
  Brain,
} from 'lucide-react';
import { SimuladoData, AppTheme } from '../types';
import { computeSimuladoStats, getPerformanceInfo } from '../utils/parser';

interface WelcomeEmptyStateProps {
  provas?: SimuladoData[];
  provasCount?: number;
  activeProva?: SimuladoData | null;
  theme?: AppTheme;
  onThemeChange?: (theme: AppTheme) => void;
  onContinueActiveProva?: () => void;
  onSelectProva?: (prova: SimuladoData) => void;
  onCreateFirstProva: () => void;
  onImportPdf: () => void;
  onOpenPresetsModal: () => void;
  onOpenBackupModal: (tab?: 'export' | 'import') => void;
}

export const WelcomeEmptyState: React.FC<WelcomeEmptyStateProps> = ({
  provas = [],
  provasCount = 0,
  activeProva = null,
  theme = 'clean',
  onThemeChange,
  onContinueActiveProva,
  onSelectProva,
  onCreateFirstProva,
  onImportPdf,
  onOpenPresetsModal,
  onOpenBackupModal,
}) => {
  const isNotebook = theme === 'notebook';
  const isDark = false;

  const steps = [
    {
      number: '1',
      title: 'Crie e Preencha',
      description: 'Defina o tamanho da prova (1 a 200 questões) ou escolha um modelo de banca. Responda pelas bolhas com toque intuitivo ou leitura de PDF.',
      icon: CheckCircle2,
      accent: isNotebook ? 'text-blue-700' : isDark ? 'text-zinc-200' : 'text-blue-600',
      bg: isNotebook ? 'bg-[#f4f7fa] border-[#cddce8]' : isDark ? 'bg-[#22242a] border-[#3b3e48]' : 'bg-blue-50/60 border-blue-200/80',
    },
    {
      number: '2',
      title: 'Gabarito da Banca',
      description: 'Cole o gabarito oficial divulgado pela banca ou marque as respostas no painel lateral com conferência inteligente.',
      icon: BookOpen,
      accent: isNotebook ? 'text-amber-700' : isDark ? 'text-amber-400' : 'text-amber-600',
      bg: isNotebook ? 'bg-[#fdfbf2] border-[#e8dfbe]' : isDark ? 'bg-[#22242a] border-[#3b3e48]' : 'bg-amber-50/60 border-amber-200/80',
    },
    {
      number: '3',
      title: 'Correção e Espelho',
      description: 'Veja instantaneamente acertos, erros, pontuação líquida Cebraspe e exporte o espelho em arquivo de texto para arquivar.',
      icon: FileCheck,
      accent: isNotebook ? 'text-[#2f6846]' : isDark ? 'text-emerald-400' : 'text-emerald-600',
      bg: isNotebook ? 'bg-[#f2f7f1] border-[#cbe1ca]' : isDark ? 'bg-[#22242a] border-[#3b3e48]' : 'bg-emerald-50/60 border-emerald-200/80',
    },
  ];

  const highlights = [
    {
      icon: FileText,
      title: 'Leitor Inteligente de Caderno em PDF',
      description: 'Digitalize seu PDF de prova, indexe enunciados e visualize comentários objetivos fundamentados na banca.',
    },
    {
      icon: Brain,
      title: 'Flashcards com IA (Novo!)',
      description: 'Ao terminar uma prova, a IA cria flashcards instantâneos dos seus erros para revisar por repetição espaçada.',
    },
    {
      icon: Scale,
      title: 'Cálculo Líquido Cebraspe',
      description: 'Suporte a simulados Certo/Errado com a regra tradicional da banca: cada erro desconta um acerto.',
    },
    {
      icon: Lock,
      title: 'Trava Pós-Correção',
      description: 'Após corrigir, as respostas são protegidas contra toques acidentais para garantir fidelidade ao espelho.',
    },
    {
      icon: Shield,
      title: '100% no seu Navegador',
      description: 'Seus dados e simulados ficam armazenados com total privacidade no dispositivo, sem necessidade de login.',
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto py-2 sm:py-6 space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Main Hero Card */}
      <div className={`rounded-2xl p-6 sm:p-10 shadow-xs relative overflow-hidden border ${
        isNotebook ? 'bg-[#fdfbf7] border-[#ded7c6]' : isDark ? 'bg-[#22242a] border-[#3b3e48] text-zinc-100' : 'bg-white border-slate-200'
      }`}>
        {/* Subtle accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-700 via-amber-600 to-zinc-500" />

        <div className="max-w-3xl space-y-5">
          {/* Header kicker with Theme Switcher */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-mono-code font-bold uppercase tracking-wider ${
                isNotebook ? 'text-[#5d6778]' : isDark ? 'text-zinc-400' : 'text-slate-500'
              }`}>
                Gabarito Pro · Plataforma de Estudos
              </span>
              <span className="text-slate-300 dark:text-zinc-600">·</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                isNotebook
                  ? 'bg-[#fbf4de] text-amber-900 border-amber-300/80'
                  : isDark
                  ? 'bg-amber-950/40 text-amber-200 border-amber-800/60'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                Sem Cadastro · 100% no Navegador
              </span>
            </div>

            {/* Theme Switcher Toggle */}
            {onThemeChange && (
              <div className={`inline-flex items-center p-0.5 rounded-lg border text-xs shadow-2xs ${
                isNotebook
                  ? 'bg-[#ede7d8] border-[#ded7c6]'
                  : isDark
                  ? 'bg-[#18191d] border-[#3b3e48]'
                  : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  id="welcome-btn-theme-clean"
                  type="button"
                  onClick={() => onThemeChange('clean')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
                    theme === 'clean'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : isNotebook
                      ? 'text-[#5d6778] hover:text-[#1c2b45]'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Tema Clean: visual limpo e contemporâneo"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span>Clean</span>
                </button>
                <button
                  id="welcome-btn-theme-notebook"
                  type="button"
                  onClick={() => onThemeChange('notebook')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer font-medium ${
                    theme === 'notebook'
                      ? 'bg-[#fdfbf7] text-amber-950 shadow-2xs font-bold border border-amber-300/70'
                      : isNotebook
                      ? 'text-[#5d6778] hover:text-[#1c2b45]'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Tema Caderno: linhas de caderno no fundo e tons pastéis confortáveis"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                  <span>Caderno</span>
                </button>
              </div>
            )}
          </div>

          {/* Main Headline */}
          <h1 className={`font-serif-title font-bold text-2xl sm:text-4xl tracking-tight leading-snug ${
            isNotebook ? 'text-[#1c2b45]' : isDark ? 'text-zinc-100' : 'text-slate-900'
          }`}>
            O seu cartão-resposta digital e inteligente para simulados.
          </h1>

          {/* Subtitle */}
          <p className={`text-sm sm:text-base leading-relaxed ${
            isNotebook ? 'text-[#485366]' : isDark ? 'text-zinc-300' : 'text-slate-600'
          }`}>
            Simule com fidelidade o dia da sua prova de concurso público ou vestibular. Preencha suas alternativas com rapidez, compare com o gabarito oficial da banca e receba uma análise detalhada dos seus erros e acertos.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              id="btn-welcome-create-first"
              type="button"
              onClick={onCreateFirstProva}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all cursor-pointer text-white ${
                isDark ? 'bg-[#3b3e48] hover:bg-[#464956] text-white border border-zinc-600' : isNotebook ? 'bg-[#cd5c08] shadow-sm hover:bg-[#b84f06]' : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              <PlusCircle className={`w-4 h-4 ${isNotebook ? 'text-[#fceddf]' : 'text-emerald-400'}`} />
              <span>{provasCount > 0 ? '+ Criar Novo Cartão-Resposta' : '+ Criar Cartão-Resposta'}</span>
            </button>

            <button
              type="button"
              onClick={onImportPdf}
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all cursor-pointer border-2 ${
                isNotebook
                  ? 'bg-gradient-to-r from-[#e6721d]/10 to-[#6e2802]/10 text-[#ad4705] border-[#e6721d]/30 hover:bg-[#e6721d]/20'
                  : 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300'
              }`}
            >
              <Brain className={`w-4 h-4 animate-pulse ${isNotebook ? 'text-[#e6721d]' : 'text-indigo-600'}`} />
              <span>Ler PDF com IA</span>
            </button>

            <button
              id="btn-welcome-open-presets"
              type="button"
              onClick={onOpenPresetsModal}
              className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm shadow-2xs transition cursor-pointer border ${
                isNotebook
                  ? 'bg-white hover:bg-[#f6f2e8] text-[#1c2b45] border-[#ded7c6]'
                  : isDark
                  ? 'bg-[#22242a] hover:bg-[#2c2f38] text-zinc-100 border-[#3b3e48]'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
              }`}
              title="Criar simulado com formato padrão (Cebraspe V/F, ENEM, FGV, FCC, 30 a 120 questões)"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Modelos por Banca</span>
            </button>

            <button
              id="btn-welcome-import-backup-quick"
              type="button"
              onClick={() => onOpenBackupModal('import')}
              className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-xs sm:text-sm transition cursor-pointer ${
                isNotebook
                  ? 'bg-[#f4efe4] hover:bg-[#eae4d5] text-[#1c2b45]'
                  : isDark
                  ? 'bg-[#22242a] hover:bg-[#2c2f38] text-zinc-300 border border-[#3b3e48]'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Restaurar backup com provas anteriores"
            >
              <Upload className="w-4 h-4 text-slate-400" />
              <span>Importar Backup</span>
            </button>
          </div>

          {/* Trust markers */}
          <div className={`pt-2 flex items-center gap-3 sm:gap-4 flex-wrap text-xs font-mono-code ${
            isDark ? 'text-zinc-400' : 'text-slate-500'
          }`}>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className={`w-3.5 h-3.5 ${isNotebook ? 'text-[#387652]' : 'text-emerald-500'}`} />
              <span>Salvamento Instantâneo</span>
            </div>
            <span className="opacity-50">·</span>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-zinc-400" />
              <span>Privacidade Total</span>
            </div>
            <span className="opacity-50">·</span>
            <div className="flex items-center gap-1.5">
              <Check className={`w-3.5 h-3.5 ${isNotebook ? 'text-[#387652]' : 'text-emerald-400'}`} />
              <span>Sem necessidade de login</span>
            </div>
          </div>
        </div>
      </div>

      {/* Seus Simulados Recentes (If exams exist) */}
      {provas.length > 0 && (
        <div className={`rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 border ${
          isNotebook ? 'bg-[#fdfbf7] border-[#ded7c6]' : isDark ? 'bg-[#22242a] border-[#3b3e48] text-zinc-100' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`font-semibold text-base ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                Seus Cartões-Resposta Cadastrados
              </h2>
              <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                Continue de onde parou ou revise seus resultados anteriores.
              </p>
            </div>
            <span className={`text-xs font-mono-code font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              {provas.length} {provas.length === 1 ? 'cartão-resposta' : 'cartões-resposta'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {provas.map(p => {
              const filled = p.userAnswers.filter(Boolean).length;
              const pct = Math.round((filled / p.totalQuestions) * 100) || 0;
              const isActive = activeProva?.id === p.id;
              const pStats = computeSimuladoStats(p);
              const perfInfo = getPerformanceInfo(pStats.hits, pStats.keyCount, p.examType, pStats.netScore);

              return (
                <div
                  key={p.id}
                  onClick={() => {
                    if (onSelectProva) onSelectProva(p);
                    else if (onContinueActiveProva) onContinueActiveProva();
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    isActive
                      ? isNotebook
                        ? 'bg-[#f6f2e8] border-[#1c2b45] shadow-xs ring-1 ring-[#1c2b45]/20'
                        : isDark
                        ? 'bg-[#2c2f38] border-zinc-500 text-zinc-100 shadow-xs ring-1 ring-zinc-500/30'
                        : 'bg-slate-50 border-slate-900 shadow-xs ring-1 ring-slate-900/10'
                      : isNotebook
                      ? 'bg-white border-[#ded7c6] hover:border-[#1c2b45]/40 hover:shadow-2xs'
                      : isDark
                      ? 'bg-[#18191d] border-[#3b3e48] text-zinc-200 hover:border-zinc-500 hover:bg-[#22242a]'
                      : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-2xs'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-mono-code font-bold uppercase tracking-wider ${
                        isDark ? 'text-zinc-400' : 'text-slate-500'
                      }`}>
                        {p.examType === 'true_false' ? 'Cebraspe (V/F)' : 'Múltipla Escolha'}
                      </span>
                      {p.isCorrected ? (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isDark ? perfInfo.badgeClassDark : isNotebook ? perfInfo.badgeClassNotebook : perfInfo.badgeClass
                          }`}
                        >
                          Concluída · {pStats.hits}/{pStats.keyCount} ({pStats.percentageFormatted}%)
                        </span>
                      ) : (
                        <span className={`text-[10px] font-mono-code px-1.5 py-0.5 rounded ${
                          isDark ? 'bg-[#2c2f38] text-zinc-300' : 'bg-slate-100 text-slate-500'
                        }`}>
                          Em preenchimento
                        </span>
                      )}
                    </div>
                    <h3 className={`font-semibold text-sm line-clamp-1 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                      {p.title}
                    </h3>
                    <div className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      <span>{p.date}</span>
                      <span>·</span>
                      <span>{p.totalQuestions} questões</span>
                    </div>
                  </div>

                  {p.isCorrected ? (
                    <div className={`space-y-1 pt-1 border-t ${isDark ? 'border-[#3b3e48]' : 'border-slate-100'}`}>
                      <div className={`flex items-center justify-between text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        <span className="font-medium">Aproveitamento</span>
                        <span className={`font-mono-code font-bold ${perfInfo.textColor}`}>
                          {pStats.hits} acertos / {pStats.misses} erros ({pStats.percentageFormatted}%)
                        </span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#18191d]' : 'bg-slate-100'}`}>
                        <div
                          className={`h-full rounded-full transition-all ${perfInfo.barColorClass}`}
                          style={{ width: `${Math.max(4, pStats.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className={`space-y-1 pt-1 border-t ${isDark ? 'border-[#3b3e48]' : 'border-slate-100'}`}>
                      <div className={`flex items-center justify-between text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        <span>Preenchimento</span>
                        <span className={`font-mono-code font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                          {filled}/{p.totalQuestions} ({pct}%)
                        </span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#18191d]' : 'bg-slate-100'}`}>
                        <div className={`h-full rounded-full transition-all ${
                          isDark ? 'bg-zinc-400' : isNotebook ? 'bg-[#1c2b45]' : 'bg-slate-900'
                        }`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Como Funciona em 3 Passos */}
      <div className="space-y-3">
        <div className="px-1">
          <span className={`text-[11px] font-mono-code font-bold uppercase tracking-wider ${
            isDark ? 'text-zinc-400' : 'text-slate-400'
          }`}>
            Fluxo de Uso
          </span>
          <h2 className={`font-serif-title font-bold text-lg sm:text-xl ${
            isDark ? 'text-zinc-100' : 'text-slate-900'
          }`}>
            Como funciona a plataforma
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map(s => {
            const Icon = s.icon;
            return (
              <div
                key={s.number}
                className={`p-5 rounded-2xl border ${s.bg} flex flex-col justify-between space-y-3 shadow-2xs`}
              >
                <div className="flex items-center justify-between">
                  <span className={`w-7 h-7 rounded-lg border font-mono-code font-bold text-xs flex items-center justify-center shadow-2xs ${
                    isDark ? 'bg-[#18191d] border-[#3b3e48] text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
                  }`}>
                    0{s.number}
                  </span>
                  <Icon className={`w-5 h-5 ${s.accent}`} />
                </div>
                <div>
                  <h3 className={`font-bold text-sm mb-1 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>{s.title}</h3>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>{s.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Destaques e Recursos do Sistema */}
      <div className={`rounded-2xl p-6 shadow-xs space-y-4 border ${
        isNotebook ? 'bg-[#fdfbf7] border-[#ded7c6]' : isDark ? 'bg-[#22242a] border-[#3b3e48] text-zinc-100' : 'bg-white border-slate-200'
      }`}>
        <div className="px-1">
          <span className={`text-[11px] font-mono-code font-bold uppercase tracking-wider ${
            isDark ? 'text-zinc-400' : 'text-slate-400'
          }`}>
            Produtividade no Estudo
          </span>
          <h2 className={`font-semibold text-base ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
            Recursos pensados para concurseiros e vestibulandos
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {highlights.map((h, i) => {
            const Icon = h.icon;
            return (
              <div key={i} className={`p-4 rounded-xl border flex items-start gap-3 ${
                isNotebook ? 'bg-[#f8f5ee] border-[#e2dccf]' : isDark ? 'bg-[#18191d] border-[#3b3e48]' : 'bg-slate-50 border-slate-200/70'
              }`}>
                <div className={`p-2 rounded-lg border shrink-0 ${
                  isDark ? 'bg-[#22242a] border-[#3b3e48] text-zinc-200' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <h4 className={`font-semibold text-xs flex items-center gap-1.5 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                    {h.title.replace(' (Novo!)', '')}
                    {h.title.includes('(Novo!)') && (
                      <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold animate-pulse">
                        Novo
                      </span>
                    )}
                  </h4>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>{h.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Support & Feedback Banner */}
      <div className={`p-4 sm:p-5 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
        isNotebook ? 'bg-[#1c2b45]' : isDark ? 'bg-[#18191d] border border-[#3b3e48]' : 'bg-slate-900'
      }`}>
        <div className="space-y-1">
          <div className="font-bold text-sm text-white">Tem sugestões ou encontrou alguma dúvida?</div>
          <p className="text-xs text-slate-300">
            Sua opinião nos ajuda a evoluir a plataforma para todos os estudantes.
          </p>
        </div>
        <a
          id="welcome-btn-feedback"
          href="https://forms.gle/hjRkzSo75nfRcqPd8"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-slate-900 hover:bg-slate-100 font-semibold text-xs shadow-2xs transition self-start sm:self-auto cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-slate-700" />
          <span>Enviar Feedback</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
      </div>
    </div>
  );
};

