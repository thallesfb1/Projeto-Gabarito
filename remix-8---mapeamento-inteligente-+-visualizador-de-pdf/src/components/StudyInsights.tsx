import React, { useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Check,
  CheckCircle2,
  Clock3,
  Layers3,
  LibraryBig,
  Map,
  RotateCcw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { AppTheme, SimuladoData, SubjectColor } from '../types';
import { computeSimuladoStats } from '../utils/parser';
import { aggregateSubjectPerformance, buildReviewQueue } from '../utils/examCatalog';

interface StudyInsightsProps {
  theme: AppTheme;
  provas: SimuladoData[];
  onBack: () => void;
  onOpenLibrary: () => void;
  onOpenExam: (simuladoId: string, questionIndex?: number) => void;
  onOpenMapper: (simuladoId: string) => void;
  onToggleReviewed: (simuladoId: string, questionIndex: number) => void;
}

const colorClasses: Record<SubjectColor, { bar: string; badge: string }> = {
  slate: { bar: 'bg-slate-500', badge: 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300' },
  amber: { bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
  emerald: { bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
  blue: { bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' },
  violet: { bar: 'bg-violet-500', badge: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300' },
  rose: { bar: 'bg-rose-500', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' },
  cyan: { bar: 'bg-cyan-500', badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300' },
};

export const StudyInsights: React.FC<StudyInsightsProps> = ({
  theme,
  provas,
  onBack,
  onOpenLibrary,
  onOpenExam,
  onOpenMapper,
  onToggleReviewed,
}) => {
  const isDark = theme === 'dark';
  const isNotebook = theme === 'notebook';

  const corrected = useMemo(() => provas.filter(prova => prova.isCorrected), [provas]);
  const subjects = useMemo(() => aggregateSubjectPerformance(provas), [provas]);
  const reviewQueue = useMemo(() => buildReviewQueue(provas), [provas]);
  const pendingReview = reviewQueue.filter(item => !item.isReviewed);
  const mappingPending = corrected.filter(prova => !prova.subjectRanges?.length);

  const totals = useMemo(() => {
    let hits = 0;
    let evaluated = 0;
    let seconds = 0;
    corrected.forEach(prova => {
      const stats = computeSimuladoStats(prova);
      hits += stats.hits;
      evaluated += stats.keyCount;
      seconds += prova.timeSpentSeconds || 0;
    });
    return {
      accuracy: evaluated > 0 ? Math.round((hits / evaluated) * 100) : 0,
      hours: Math.floor(seconds / 3600),
      minutes: Math.floor((seconds % 3600) / 60),
    };
  }, [corrected]);

  const surface = isDark
    ? 'bg-[#22242a] border-[#3b3e48] text-zinc-100'
    : isNotebook
    ? 'bg-[#fdfbf7] border-[#ded7c6] text-[#1c2b45]'
    : 'bg-white border-slate-200 text-slate-900';

  return (
    <div className="space-y-5 animate-fadeIn">
      <section className={`rounded-2xl border shadow-xs overflow-hidden ${surface}`}>
        <header className={`p-6 sm:p-8 border-b relative ${
          isDark ? 'bg-[#18191d] border-[#3b3e48]' : isNotebook ? 'bg-[#f8f3e8] border-[#ded7c6]' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500" />
          <button type="button" onClick={onBack} className={`inline-flex items-center gap-1.5 text-xs font-semibold font-mono-code mb-5 cursor-pointer ${isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao painel
          </button>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] font-mono-code font-bold text-amber-500">
                <BarChart3 className="w-4 h-4" /> Central de Desempenho
              </div>
              <h1 className={`font-serif-title text-3xl sm:text-4xl font-bold mt-2 ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                Seus resultados precisam indicar a próxima ação.
              </h1>
              <p className={`text-sm leading-relaxed mt-3 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                O diagnóstico combina provas corrigidas, mapas de disciplinas e questões pendentes para mostrar onde revisar primeiro.
              </p>
            </div>
            <button type="button" onClick={onOpenLibrary} className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition cursor-pointer ${isDark ? 'bg-zinc-100 text-zinc-950 hover:bg-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
              <LibraryBig className="w-4 h-4" /> Nova prova estruturada
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Provas corrigidas', value: corrected.length, icon: CheckCircle2, accent: 'text-emerald-500' },
              { label: 'Aproveitamento', value: `${totals.accuracy}%`, icon: Target, accent: 'text-amber-500' },
              { label: 'Revisões pendentes', value: pendingReview.length, icon: RotateCcw, accent: 'text-rose-500' },
              { label: 'Tempo registrado', value: totals.hours ? `${totals.hours}h ${totals.minutes}m` : `${totals.minutes}m`, icon: Clock3, accent: 'text-blue-500' },
            ].map(({ label, value, icon: Icon, accent }) => (
              <div key={label} className={`rounded-xl border p-4 ${isDark ? 'bg-[#18191d] border-[#3b3e48]' : 'bg-white border-slate-200'}`}>
                <Icon className={`w-4 h-4 ${accent}`} />
                <strong className={`block mt-3 text-2xl font-mono-code ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</strong>
                <span className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>{label}</span>
              </div>
            ))}
          </div>

          {corrected.length === 0 ? (
            <div className={`rounded-2xl border border-dashed p-10 text-center ${isDark ? 'border-[#3b3e48]' : 'border-slate-300'}`}>
              <TrendingUp className="w-9 h-9 mx-auto text-emerald-500" />
              <h2 className="font-serif-title text-xl font-bold mt-4">O diagnóstico começa na primeira correção.</h2>
              <p className={`text-sm mt-2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Corrija uma prova ou crie um modelo estruturado para liberar métricas por disciplina.</p>
              <button type="button" onClick={onOpenLibrary} className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer">
                Explorar Biblioteca <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.15fr] gap-5">
              <section className={`rounded-2xl border p-5 ${isDark ? 'bg-[#18191d] border-[#3b3e48]' : 'bg-white border-slate-200'}`}>
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <h2 className="font-serif-title text-xl font-bold flex items-center gap-2"><Layers3 className="w-5 h-5 text-amber-500" /> Desempenho por área</h2>
                    <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Ordenado do ponto mais fraco para o mais forte.</p>
                  </div>
                </div>

                {subjects.length ? (
                  <div className="space-y-4">
                    {subjects.slice(0, 8).map(subject => (
                      <div key={subject.id}>
                        <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
                          <span className="font-semibold truncate">{subject.name}</span>
                          <span className={`font-mono-code font-bold ${subject.percentage < 60 ? 'text-rose-500' : subject.percentage < 80 ? 'text-amber-500' : 'text-emerald-500'}`}>{subject.percentage}%</span>
                        </div>
                        <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-[#2c2f38]' : 'bg-slate-100'}`}>
                          <div className={`h-full rounded-full ${colorClasses[subject.color].bar}`} style={{ width: `${Math.max(3, subject.percentage)}%` }} />
                        </div>
                        <div className={`mt-1 flex items-center justify-between text-[10px] font-mono-code ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
                          <span>{subject.hits} acertos · {subject.misses} erros</span>
                          <span>{subject.examCount} {subject.examCount === 1 ? 'prova' : 'provas'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`rounded-xl border border-dashed p-6 text-center ${isDark ? 'border-[#3b3e48] text-zinc-400' : 'border-slate-300 text-slate-500'}`}>
                    <Map className="w-7 h-7 mx-auto text-amber-500" />
                    <p className="text-sm font-semibold mt-3">Falta mapear as disciplinas</p>
                    <p className="text-xs mt-1">Adicione intervalos de questões para obter um diagnóstico útil.</p>
                  </div>
                )}

                {mappingPending.length > 0 && (
                  <div className={`mt-5 pt-4 border-t ${isDark ? 'border-[#3b3e48]' : 'border-slate-200'}`}>
                    <p className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Aguardando mapeamento</p>
                    <div className="mt-2 space-y-2">
                      {mappingPending.slice(0, 3).map(prova => (
                        <button key={prova.id} type="button" onClick={() => onOpenMapper(prova.id)} className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs border cursor-pointer ${isDark ? 'border-[#3b3e48] hover:bg-[#22242a]' : 'border-slate-200 hover:bg-slate-50'}`}>
                          <span className="truncate">{prova.title}</span>
                          <span className="font-semibold text-amber-500 shrink-0">Mapear</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#18191d] border-[#3b3e48]' : 'bg-white border-slate-200'}`}>
                <div className={`p-5 border-b ${isDark ? 'border-[#3b3e48]' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-serif-title text-xl font-bold flex items-center gap-2"><BookOpenCheck className="w-5 h-5 text-rose-500" /> Fila de revisão</h2>
                      <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>Erros primeiro; sinalizadas em seguida.</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono-code ${isDark ? 'bg-rose-950/50 text-rose-300' : 'bg-rose-50 text-rose-700'}`}>{pendingReview.length} pendentes</span>
                  </div>
                </div>
                <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-200 dark:divide-[#3b3e48]">
                  {reviewQueue.length ? reviewQueue.slice(0, 18).map(item => (
                    <div key={item.id} className={`p-4 flex items-start gap-3 ${item.isReviewed ? 'opacity-55' : ''}`}>
                      <button
                        type="button"
                        onClick={() => onToggleReviewed(item.simuladoId, item.questionIndex)}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition cursor-pointer ${
                          item.isReviewed
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : isDark ? 'border-zinc-600 hover:border-emerald-500' : 'border-slate-300 hover:border-emerald-500'
                        }`}
                        title={item.isReviewed ? 'Marcar como pendente' : 'Marcar como revisada'}
                      >
                        {item.isReviewed && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-xs">Questão {String(item.questionNumber).padStart(2, '0')}</strong>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${colorClasses[item.subjectColor].badge}`}>{item.subjectName}</span>
                          {item.isWrong && <span className="text-[9px] font-bold text-rose-500">ERRO</span>}
                          {item.isFlagged && <span className="text-[9px] font-bold text-amber-500">SINALIZADA</span>}
                        </div>
                        <p className={`text-[11px] mt-1 truncate ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>{item.simuladoTitle}</p>
                        {item.isWrong && (
                          <p className={`text-[10px] font-mono-code mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Sua resposta: {item.userAnswer} · Gabarito: {item.keyAnswer}</p>
                        )}
                      </div>
                      <button type="button" onClick={() => onOpenExam(item.simuladoId, item.questionIndex)} className={`p-2 rounded-lg transition cursor-pointer ${isDark ? 'text-zinc-400 hover:bg-[#2c2f38] hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-900'}`} title="Abrir questão no cartão">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )) : (
                    <div className={`py-14 text-center ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                      <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                      <p className="text-sm font-semibold mt-3">Nenhuma revisão pendente.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
