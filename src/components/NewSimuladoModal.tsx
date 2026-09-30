import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, X, Check, HelpCircle, CheckCircle2 } from 'lucide-react';
import { ExamType, AppTheme } from '../types';

interface NewSimuladoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, totalQuestions: number, examType?: ExamType) => void;
  suggestedIndex: number;
  theme?: AppTheme;
}

export const NewSimuladoModal: React.FC<NewSimuladoModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  suggestedIndex,
  theme = 'clean',
}) => {
  const isNotebook = theme === 'notebook';
  const [title, setTitle] = useState('');
  const [totalQuestions, setTotalQuestions] = useState<number>(70);
  const [examType, setExamType] = useState<ExamType>('multiple_choice');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(`Cartão-Resposta ${suggestedIndex}`);
      setTotalQuestions(70);
      setExamType('multiple_choice');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, suggestedIndex]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || `Cartão-Resposta ${suggestedIndex}`;
    const validTotal = Math.max(1, Math.min(200, Number(totalQuestions) || 70));
    onCreate(finalTitle, validTotal, examType);
    onClose();
  };

  const presetTotals = [30, 50, 60, 70, 90, 100, 120];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`border-2 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scaleUp transition-colors ${
          isNotebook
            ? 'bg-[#fdfbf7] border-[#ded7c6] text-[#1c2b45]'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between border-b ${
            isNotebook
              ? 'bg-[#1c2b45] text-white border-[#1c2b45]'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <PlusCircle className="w-5 h-5 text-amber-300" />
            <h2 className="font-sans font-bold text-lg text-amber-50">
              Criar Cartão-Resposta
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div>
            <label
              className={`block text-xs font-mono-code font-semibold uppercase tracking-wider mb-1.5 ${
                isNotebook ? 'text-[#1c2b45]' : 'text-slate-700'
              }`}
            >
              Nome do Cartão-Resposta
            </label>
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Cartão-Resposta 01 - DATAPREV ou Simulado FGV"
              className={`w-full px-3.5 py-2.5 border rounded-lg text-sm font-sans font-bold focus:outline-none focus:ring-2 transition ${
                isNotebook
                  ? 'bg-white border-[#ded7c6] text-[#1c2b45] placeholder-[#6b6255]/50 focus:ring-[#1c2b45]'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-slate-900 focus:bg-white'
              }`}
            />
            <p className={`text-[11px] font-mono-code mt-1 ${isNotebook ? 'text-[#6b6255]' : 'text-slate-500'}`}>
              Dica: você pode renomear a qualquer momento depois.
            </p>
          </div>

          {/* Exam Type Selector (Múltipla Escolha vs Certo/Errado V/F) */}
          <div>
            <label
              className={`block text-xs font-mono-code font-semibold uppercase tracking-wider mb-1.5 ${
                isNotebook ? 'text-[#1c2b45]' : 'text-slate-700'
              }`}
            >
              Formato de Respostas da Prova
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setExamType('multiple_choice')}
                className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                  examType === 'multiple_choice'
                    ? isNotebook
                      ? 'bg-[#1c2b45] text-white border-[#1c2b45] shadow-xs'
                      : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : isNotebook
                    ? 'bg-white text-[#1c2b45] border-[#dedad0] hover:bg-[#f0eee6]'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  <span>Múltipla Escolha</span>
                  {examType === 'multiple_choice' && <Check className="w-3.5 h-3.5 text-amber-300" />}
                </div>
                <div
                  className={`text-[10px] mt-1 font-mono-code ${
                    examType === 'multiple_choice'
                      ? 'text-slate-300'
                      : isNotebook
                      ? 'text-[#6b6255]'
                      : 'text-slate-500'
                  }`}
                >
                  Alternativas A, B, C, D, E
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExamType('true_false')}
                className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                  examType === 'true_false'
                    ? isNotebook
                      ? 'bg-[#1c2b45] text-white border-[#1c2b45] shadow-xs'
                      : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : isNotebook
                    ? 'bg-white text-[#1c2b45] border-[#dedad0] hover:bg-[#f0eee6]'
                    : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-xs flex items-center justify-between">
                  <span>Certo / Errado (V/F)</span>
                  {examType === 'true_false' && <Check className="w-3.5 h-3.5 text-amber-300" />}
                </div>
                <div
                  className={`text-[10px] mt-1 font-mono-code ${
                    examType === 'true_false'
                      ? 'text-slate-300'
                      : isNotebook
                      ? 'text-[#6b6255]'
                      : 'text-slate-500'
                  }`}
                >
                  Cebraspe / Cespe (V ou F)
                </div>
              </button>
            </div>
          </div>

          <div>
            <label
              className={`block text-xs font-mono-code font-semibold uppercase tracking-wider mb-1.5 ${
                isNotebook ? 'text-[#1c2b45]' : 'text-slate-700'
              }`}
            >
              Número de Questões (1 a 200)
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={totalQuestions}
              onChange={e => setTotalQuestions(Math.max(1, Math.min(200, parseInt(e.target.value, 10) || 1)))}
              className={`w-full px-3 py-2 border rounded-lg text-sm font-mono-code focus:outline-none focus:ring-2 transition ${
                isNotebook
                  ? 'bg-white border-[#ded7c6] text-[#1c2b45] focus:ring-[#1c2b45]'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:ring-slate-900 focus:bg-white'
              }`}
            />
            {/* Quick preset buttons */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className={`text-[11px] font-mono-code mr-1 ${isNotebook ? 'text-[#6b6255]' : 'text-slate-500'}`}>
                Atalhos:
              </span>
              {presetTotals.map(tot => (
                <button
                  key={tot}
                  type="button"
                  onClick={() => setTotalQuestions(tot)}
                  className={`text-[11px] font-mono-code px-2 py-0.5 rounded border transition cursor-pointer ${
                    totalQuestions === tot
                      ? isNotebook
                        ? 'bg-[#1c2b45] text-white border-[#1c2b45] font-bold'
                        : 'bg-slate-900 text-white border-slate-900 font-bold'
                      : isNotebook
                      ? 'bg-[#f0eee6] hover:bg-white text-[#1c2b45] border-[#dedad0]'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {tot}q
                </button>
              ))}
            </div>

            {/* Modelos rápidos por banca */}
            <div
              className={`mt-3 pt-2.5 border-t space-y-1.5 ${
                isNotebook ? 'border-[#dedad0]/60' : 'border-slate-200'
              }`}
            >
              <span className={`text-[11px] font-mono-code block font-medium ${isNotebook ? 'text-[#6b6255]' : 'text-slate-600'}`}>
                Modelos de bancas (ajusta nome, formato e questões):
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: 'Cebraspe V/F (120q)', name: 'Simulado Cebraspe (120 itens V/F)', count: 120, type: 'true_false' as ExamType },
                  { label: 'Cebraspe V/F (60q)', name: 'Simulado Cebraspe (60 itens V/F)', count: 60, type: 'true_false' as ExamType },
                  { label: 'Treino (30q)', name: 'Treino Rápido (30q)', count: 30, type: 'multiple_choice' as ExamType },
                  { label: 'Concurso (50q)', name: 'Concurso Geral (50q)', count: 50, type: 'multiple_choice' as ExamType },
                  { label: 'FCC/Vunesp (60q)', name: 'Simulado FCC/Vunesp (60q)', count: 60, type: 'multiple_choice' as ExamType },
                  { label: 'FGV (70q)', name: 'Simulado FGV (70q)', count: 70, type: 'multiple_choice' as ExamType },
                  { label: 'ENEM (90q)', name: 'Simulado ENEM (90q)', count: 90, type: 'multiple_choice' as ExamType },
                ].map(b => (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() => {
                      setTitle(b.name);
                      setTotalQuestions(b.count);
                      setExamType(b.type);
                    }}
                    className={`text-[11px] font-mono-code px-2 py-0.5 rounded border transition cursor-pointer ${
                      isNotebook
                        ? 'bg-[#f5f2e9] hover:bg-[#1c2b45] text-[#1c2b45] hover:text-white border-[#dedad0] hover:border-[#1c2b45]'
                        : 'bg-white hover:bg-slate-900 text-slate-700 hover:text-white border-slate-200 hover:border-slate-900'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            className={`pt-2 flex items-center justify-end gap-2.5 border-t ${
              isNotebook ? 'border-[#dedad0]' : 'border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 text-xs font-mono-code font-semibold rounded-lg transition cursor-pointer border ${
                isNotebook
                  ? 'text-[#6b6255] hover:text-[#1c2b45] hover:bg-[#f0eee6] border-transparent'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-transparent'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex items-center gap-1.5 px-5 py-2.5 text-white text-xs font-mono-code font-semibold rounded-lg shadow-md transition cursor-pointer ${
                isNotebook
                  ? 'bg-[#1c2b45] hover:bg-[#132038]'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Criar Cartão-Resposta</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
