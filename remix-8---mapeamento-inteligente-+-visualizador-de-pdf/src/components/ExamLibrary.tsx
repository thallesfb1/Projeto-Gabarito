import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Filter,
  Layers3,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AppTheme } from '../types';
import { EXAM_BLUEPRINTS, ExamBlueprint } from '../utils/examCatalog';

interface ExamLibraryProps {
  theme: AppTheme;
  onBack: () => void;
  onCreateFromBlueprint: (blueprint: ExamBlueprint) => void;
}

const categories = ['Todas', 'Concursos', 'Vestibulares', 'OAB', 'Revisão'] as const;

export const ExamLibrary: React.FC<ExamLibraryProps> = ({
  theme,
  onBack,
  onCreateFromBlueprint,
}) => {
  const isDark = theme === 'dark';
  const isNotebook = theme === 'notebook';
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof categories)[number]>('Todas');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return EXAM_BLUEPRINTS.filter(blueprint => {
      const matchesCategory = category === 'Todas' || blueprint.category === category;
      const haystack = [
        blueprint.title,
        blueprint.organizer,
        blueprint.category,
        ...blueprint.tags,
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR');
      return matchesCategory && (!normalized || haystack.includes(normalized));
    });
  }, [category, query]);

  return (
    <div className="space-y-5 animate-fadeIn">
      <section className={`rounded-2xl overflow-hidden border shadow-xs ${
        isNotebook
          ? 'bg-[#fdfbf7] border-[#ded7c6]'
          : isDark
          ? 'bg-[#22242a] border-[#3b3e48] text-zinc-100'
          : 'bg-white border-slate-200'
      }`}>
        <div className={`relative p-6 sm:p-8 border-b ${
          isDark ? 'border-[#3b3e48] bg-[#18191d]' : isNotebook ? 'border-[#ded7c6] bg-[#f8f3e8]' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-slate-700" />
          <button
            type="button"
            onClick={onBack}
            className={`mb-5 inline-flex items-center gap-1.5 text-xs font-mono-code font-semibold transition cursor-pointer ${
              isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao painel
          </button>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] font-mono-code font-bold text-emerald-500">
                <BookOpenCheck className="w-4 h-4" />
                Biblioteca de Provas
              </div>
              <h1 className={`font-serif-title text-3xl sm:text-4xl font-bold tracking-tight ${
                isDark ? 'text-zinc-100' : 'text-slate-900'
              }`}>
                Comece pela estrutura da prova, não por uma tela vazia.
              </h1>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                Escolha um blueprint, use a prova ou PDF da sua fonte preferida e receba métricas separadas por área. Todos os blocos podem ser editados depois.
              </p>
            </div>

            <div className={`grid grid-cols-3 gap-2 min-w-[280px] rounded-xl p-3 border ${
              isDark ? 'bg-[#22242a] border-[#3b3e48]' : 'bg-white border-slate-200'
            }`}>
              {[
                ['6', 'modelos'],
                ['3', 'formatos'],
                ['100%', 'editável'],
              ].map(([value, label]) => (
                <div key={label} className="text-center">
                  <strong className={`block text-lg font-mono-code ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</strong>
                  <span className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`p-4 sm:p-5 border-b space-y-3 ${isDark ? 'border-[#3b3e48]' : 'border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="relative flex-1">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Buscar banca, prova ou formato..."
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm outline-none transition ${
                  isDark
                    ? 'bg-[#18191d] border-[#3b3e48] text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-slate-500'
                }`}
              />
            </label>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Filter className={`w-4 h-4 shrink-0 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
              {categories.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap border transition cursor-pointer ${
                    category === item
                      ? isDark
                        ? 'theme-solid text-zinc-950 border-zinc-100'
                        : 'theme-solid text-white border-slate-900'
                      : isDark
                      ? 'bg-[#22242a] text-zinc-300 border-[#3b3e48] hover:bg-[#2c2f38]'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {filtered.length === 0 ? (
            <div className={`py-16 text-center rounded-xl border border-dashed ${
              isDark ? 'border-[#3b3e48] text-zinc-400' : 'border-slate-300 text-slate-500'
            }`}>
              Nenhuma estrutura encontrada para essa busca.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map(blueprint => (
                <article
                  key={blueprint.id}
                  className={`group rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    isDark
                      ? 'bg-[#18191d] border-[#3b3e48] hover:border-zinc-500'
                      : isNotebook
                      ? 'bg-white border-[#ded7c6] hover:border-[#1c2b45]/50'
                      : 'bg-white border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={`text-[10px] uppercase tracking-wider font-mono-code font-bold ${
                        isDark ? 'text-zinc-500' : 'text-slate-400'
                      }`}>
                        {blueprint.category} · {blueprint.organizer}
                      </span>
                      <h2 className={`mt-1 font-serif-title text-xl font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                        {blueprint.title}
                      </h2>
                    </div>
                    <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-mono-code font-bold border ${
                      isDark ? 'bg-amber-950/50 text-amber-300 border-amber-800/60' : 'bg-amber-50 text-amber-900 border-amber-200'
                    }`}>
                      {blueprint.questions} questões
                    </span>
                  </div>

                  <p className={`mt-3 text-xs leading-relaxed ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                    {blueprint.description}
                  </p>

                  <div className="mt-4 flex items-center gap-3 text-[11px] font-mono-code flex-wrap">
                    <span className={`inline-flex items-center gap-1 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                      <Clock3 className="w-3.5 h-3.5" /> {Math.floor(blueprint.durationMinutes / 60)}h{blueprint.durationMinutes % 60 ? ` ${blueprint.durationMinutes % 60}min` : ''}
                    </span>
                    <span className={`inline-flex items-center gap-1 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
                      <Layers3 className="w-3.5 h-3.5" /> {blueprint.subjectRanges.length} {blueprint.subjectRanges.length === 1 ? 'área' : 'áreas'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <Sparkles className="w-3.5 h-3.5" /> {blueprint.highlight}
                    </span>
                  </div>

                  <div className={`mt-4 rounded-xl p-3 border ${isDark ? 'bg-[#22242a] border-[#3b3e48]' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="space-y-2">
                      {blueprint.subjectRanges.map(range => (
                        <div key={`${range.name}-${range.start}`} className="flex items-center justify-between gap-3 text-xs">
                          <span className={`font-medium ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}>{range.name}</span>
                          <span className={`font-mono-code ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                            Q{range.start}–Q{range.end}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className={`flex items-center gap-1 text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Sem conteúdo copiado · só a estrutura
                    </div>
                    <button
                      type="button"
                      onClick={() => onCreateFromBlueprint(blueprint)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                        isDark
                          ? 'theme-solid hover:bg-white text-zinc-950'
                          : 'theme-solid hover:bg-slate-800 text-white'
                      }`}
                    >
                      Usar modelo
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 text-xs ${
        isDark ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      }`}>
        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
        <p><strong>Estratégia local-first:</strong> a biblioteca organiza o formato e as métricas; a prova continua sendo do usuário. Isso preserva privacidade e evita prender o produto a um banco editorial caro.</p>
      </div>
    </div>
  );
};
