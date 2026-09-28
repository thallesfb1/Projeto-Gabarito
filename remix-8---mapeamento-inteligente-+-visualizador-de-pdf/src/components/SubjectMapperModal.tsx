import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Layers3, Plus, Save, Trash2, WandSparkles, X } from 'lucide-react';
import { AppTheme, SubjectColor, SubjectRange } from '../types';

interface SubjectMapperModalProps {
  isOpen: boolean;
  theme: AppTheme;
  totalQuestions: number;
  initialRanges: SubjectRange[];
  onClose: () => void;
  onSave: (ranges: SubjectRange[]) => void;
}

const colors: SubjectColor[] = ['blue', 'emerald', 'amber', 'violet', 'rose', 'cyan', 'slate'];

const makeRange = (index: number, totalQuestions: number): SubjectRange => ({
  id: `subject_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
  name: `Disciplina ${index + 1}`,
  start: 1,
  end: totalQuestions,
  color: colors[index % colors.length],
});

export const SubjectMapperModal: React.FC<SubjectMapperModalProps> = ({
  isOpen,
  theme,
  totalQuestions,
  initialRanges,
  onClose,
  onSave,
}) => {
  const isDark = theme === 'dark';
  const isNotebook = theme === 'notebook';
  const [ranges, setRanges] = useState<SubjectRange[]>([]);

  useEffect(() => {
    if (isOpen) {
      setRanges(initialRanges.length ? initialRanges.map(range => ({ ...range })) : [makeRange(0, totalQuestions)]);
    }
  }, [initialRanges, isOpen, totalQuestions]);

  const error = useMemo(() => {
    if (!ranges.length) return 'Adicione pelo menos uma disciplina.';
    for (const range of ranges) {
      if (!range.name.trim()) return 'Todas as disciplinas precisam de um nome.';
      if (range.start < 1 || range.end > totalQuestions || range.start > range.end) {
        return `Os intervalos devem estar entre 1 e ${totalQuestions} e começar antes de terminar.`;
      }
    }
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index].start <= sorted[index - 1].end) {
        return `Há sobreposição entre “${sorted[index - 1].name}” e “${sorted[index].name}”.`;
      }
    }
    return '';
  }, [ranges, totalQuestions]);

  if (!isOpen) return null;

  const splitEvenly = (count: number) => {
    const safeCount = Math.max(1, Math.min(count, totalQuestions));
    const base = Math.floor(totalQuestions / safeCount);
    const remainder = totalQuestions % safeCount;
    let cursor = 1;
    setRanges(
      Array.from({ length: safeCount }).map((_, index) => {
        const start = cursor;
        const blockSize = base + (index < remainder ? 1 : 0);
        const end = cursor + blockSize - 1;
        cursor = end + 1;
        return {
          ...makeRange(index, totalQuestions),
          name: `Bloco ${index + 1}`,
          start,
          end,
        };
      })
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs animate-fadeIn">
      <div className={`w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-2xl border-2 shadow-2xl flex flex-col ${
        isDark
          ? 'bg-[#22242a] border-[#3b3e48] text-zinc-100'
          : isNotebook
          ? 'bg-[#fdfbf7] border-[#1c2b45] text-[#1c2b45]'
          : 'bg-white border-slate-900 text-slate-900'
      }`}>
        <header className={`px-5 py-4 flex items-center justify-between gap-4 border-b ${
          isDark ? 'bg-[#18191d] border-[#3b3e48]' : 'bg-slate-900 border-slate-800 text-white'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-[#2c2f38]' : 'bg-white/10'}`}>
              <Layers3 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-serif-title text-xl font-bold">Mapa de Disciplinas</h2>
              <p className={`text-xs font-mono-code ${isDark ? 'text-zinc-400' : 'text-slate-300'}`}>
                Transforme o resultado geral em diagnóstico por assunto
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition cursor-pointer" title="Fechar">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div className={`rounded-xl border p-4 ${isDark ? 'bg-[#18191d] border-[#3b3e48]' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <strong className="text-sm">Divisão rápida</strong>
                <p className={`text-xs mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>Crie blocos iguais e renomeie conforme o edital.</p>
              </div>
              <div className="flex items-center gap-1.5">
                {[2, 3, 4].map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => splitEvenly(count)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      isDark ? 'bg-[#22242a] border-[#3b3e48] hover:bg-[#2c2f38]' : 'bg-white border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <WandSparkles className="w-3.5 h-3.5 text-amber-500" />
                    {count} blocos
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {ranges.map((range, index) => (
              <div key={range.id} className={`rounded-xl border p-3 sm:p-4 ${
                isDark ? 'bg-[#18191d] border-[#3b3e48]' : 'bg-white border-slate-200'
              }`}>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_90px_90px_48px] gap-3 items-end">
                  <label className="space-y-1">
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Disciplina / área</span>
                    <input
                      value={range.name}
                      onChange={event => setRanges(current => current.map(item => item.id === range.id ? { ...item, name: event.target.value } : item))}
                      className={`w-full px-3 py-2 rounded-lg border text-sm outline-none ${
                        isDark ? 'bg-[#22242a] border-[#3b3e48] text-zinc-100 focus:border-zinc-500' : 'bg-white border-slate-300 focus:border-slate-500'
                      }`}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Questão inicial</span>
                    <input
                      type="number"
                      min={1}
                      max={totalQuestions}
                      value={range.start}
                      onChange={event => setRanges(current => current.map(item => item.id === range.id ? { ...item, start: Number(event.target.value) } : item))}
                      className={`w-full px-2 py-2 rounded-lg border text-sm font-mono-code outline-none ${
                        isDark ? 'bg-[#22242a] border-[#3b3e48] text-zinc-100' : 'bg-white border-slate-300'
                      }`}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Questão final</span>
                    <input
                      type="number"
                      min={1}
                      max={totalQuestions}
                      value={range.end}
                      onChange={event => setRanges(current => current.map(item => item.id === range.id ? { ...item, end: Number(event.target.value) } : item))}
                      className={`w-full px-2 py-2 rounded-lg border text-sm font-mono-code outline-none ${
                        isDark ? 'bg-[#22242a] border-[#3b3e48] text-zinc-100' : 'bg-white border-slate-300'
                      }`}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setRanges(current => current.filter(item => item.id !== range.id))}
                    className={`h-[38px] flex items-center justify-center rounded-lg border transition cursor-pointer ${
                      isDark ? 'border-rose-900/60 text-rose-400 hover:bg-rose-950/40' : 'border-rose-200 text-rose-600 hover:bg-rose-50'
                    }`}
                    title={`Remover ${range.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setRanges(current => [...current, makeRange(current.length, totalQuestions)])}
            className={`w-full py-3 rounded-xl border border-dashed text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              isDark ? 'border-[#52525b] text-zinc-300 hover:bg-[#2c2f38]' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Plus className="w-4 h-4" /> Adicionar disciplina
          </button>

          {error && (
            <div className={`rounded-lg border px-3 py-2.5 text-xs flex items-start gap-2 ${
              isDark ? 'bg-amber-950/30 border-amber-800/60 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        <footer className={`px-5 py-4 border-t flex items-center justify-between gap-3 ${
          isDark ? 'bg-[#18191d] border-[#3b3e48]' : isNotebook ? 'bg-[#f5f0e3] border-[#ded7c6]' : 'bg-slate-50 border-slate-200'
        }`}>
          <span className={`text-[11px] font-mono-code ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
            {totalQuestions} questões · {ranges.length} {ranges.length === 1 ? 'área' : 'áreas'}
          </span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className={`px-4 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${isDark ? 'border-[#3b3e48] text-zinc-300' : 'border-slate-300 text-slate-600'}`}>
              Cancelar
            </button>
            <button
              type="button"
              disabled={Boolean(error)}
              onClick={() => onSave([...ranges].sort((a, b) => a.start - b.start))}
              className={`px-4 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2 transition ${
                error
                  ? isDark ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : isDark ? 'bg-zinc-100 text-zinc-950 hover:bg-white cursor-pointer' : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'
              }`}
            >
              <Save className="w-4 h-4" /> Salvar mapa
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
