import React from 'react';
import { X, Zap, GraduationCap, BookOpen, Target, FileText, Building2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ExamType, AppTheme } from '../types';

export interface ExamPreset {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  questions: number;
  examType?: ExamType;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const EXAM_PRESETS: ExamPreset[] = [
  {
    id: 'cebraspe-vf-120',
    title: 'Cebraspe / Cespe (V ou F)',
    badge: '120 itens · V/F',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
    questions: 120,
    examType: 'true_false',
    description: 'Padrão clássico Cebraspe: itens Certo/Errado (V ou F) com cálculo automático de nota líquida.',
    icon: CheckCircle2,
  },
  {
    id: 'cebraspe-vf-60',
    title: 'Cebraspe Curto (V ou F)',
    badge: '60 itens · V/F',
    badgeColor: 'bg-teal-100 text-teal-900 border-teal-300 font-semibold',
    questions: 60,
    examType: 'true_false',
    description: 'Treino compacto de 60 itens no modelo V ou F para disciplinas específicas.',
    icon: Zap,
  },
  {
    id: 'rapido-30',
    title: 'Treino Rápido',
    badge: '30 questões',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
    questions: 30,
    examType: 'multiple_choice',
    description: 'Sessão curta e ágil para treinar uma disciplina ou fazer revisão diária.',
    icon: Zap,
  },
  {
    id: 'concurso-50',
    title: 'Concurso Básico',
    badge: '50 questões',
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-300 font-semibold',
    questions: 50,
    examType: 'multiple_choice',
    description: 'Estrutura tradicional para concursos municipais, administrativos e bancários.',
    icon: FileText,
  },
  {
    id: 'fcc-vunesp-60',
    title: 'FCC / VUNESP',
    badge: '60 questões',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300 font-semibold',
    questions: 60,
    examType: 'multiple_choice',
    description: 'Padrão clássico de tribunais regionais, polícias civis e agências.',
    icon: Building2,
  },
  {
    id: 'fgv-cebraspe-70',
    title: 'FGV / Outras (M.E.)',
    badge: '70 questões',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold',
    questions: 70,
    examType: 'multiple_choice',
    description: 'Estrutura de múltipla escolha para carreiras fiscais, controle, analistas e técnicos.',
    icon: GraduationCap,
  },
  {
    id: 'enem-90',
    title: 'ENEM / Vestibulares',
    badge: '90 questões',
    badgeColor: 'bg-rose-100 text-rose-900 border-rose-300 font-semibold',
    questions: 90,
    examType: 'multiple_choice',
    description: 'Simulado completo para 1º ou 2º dia de aplicação oficial do ENEM.',
    icon: BookOpen,
  },
  {
    id: 'extenso-100',
    title: 'Simulado Extenso',
    badge: '100 questões',
    badgeColor: 'bg-slate-100 text-slate-900 border-slate-300 font-semibold',
    questions: 100,
    examType: 'multiple_choice',
    description: 'Maratona completa de alta resistência para carreiras de elite e magistratura.',
    icon: Target,
  },
];

interface QuickPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (title: string, totalQuestions: number, examType?: ExamType) => void;
  theme?: AppTheme;
}

export const QuickPresetsModal: React.FC<QuickPresetsModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  theme = 'clean',
}) => {
  if (!isOpen) return null;

  const isNotebook = theme === 'notebook';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-scaleUp max-h-[90vh] flex flex-col border transition-all ${
          isNotebook
            ? 'bg-[#fdfbf7] border-[#ded7c6] text-[#1c2b45]'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`px-4 sm:px-6 py-4 flex items-center justify-between shrink-0 border-b select-none ${
            isNotebook
              ? 'bg-[#f6efe1] border-[#ded7c6] text-[#1c2b45]'
              : 'bg-slate-50 border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                isNotebook
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
            >
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg leading-tight">
                Modelos Rápidos de Cartão-Resposta
              </h2>
              <p
                className={`text-xs font-mono-code leading-tight ${
                  isNotebook ? 'text-[#6b6255]' : 'text-slate-500'
                }`}
              >
                Inicie um cartão-resposta limpo com formato padrão de banca em 1 clique
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer ${
              isNotebook
                ? 'hover:bg-[#eae1d0] text-[#6b6255]'
                : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
            }`}
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {EXAM_PRESETS.map(preset => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onSelectPreset(preset.title, preset.questions, preset.examType);
                    onClose();
                  }}
                  className={`group rounded-xl p-4 text-left transition-all duration-150 shadow-2xs hover:shadow-xs flex flex-col justify-between cursor-pointer border ${
                    isNotebook
                      ? 'bg-white hover:bg-[#faf7ee] border-[#dedad0] hover:border-[#1c2b45]/40 text-[#1c2b45]'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-400 text-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shadow-2xs shrink-0 ${
                            isNotebook
                              ? 'bg-[#f0eee6] group-hover:bg-[#1c2b45] text-[#1c2b45] group-hover:text-white'
                              : 'bg-slate-100 group-hover:bg-slate-900 text-slate-700 group-hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-sm truncate group-hover:underline">
                          {preset.title}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono-code px-2 py-0.5 rounded border shrink-0 ${preset.badgeColor}`}
                      >
                        {preset.badge}
                      </span>
                    </div>

                    <p
                      className={`text-xs leading-relaxed pl-9 ${
                        isNotebook ? 'text-[#6b6255]' : 'text-slate-600'
                      }`}
                    >
                      {preset.description}
                    </p>
                  </div>

                  <div
                    className={`mt-3 pt-2.5 border-t flex items-center justify-between text-xs font-mono-code ${
                      isNotebook ? 'border-[#dedad0]' : 'border-slate-200'
                    }`}
                  >
                    <span className={isNotebook ? 'text-[#877e6e]' : 'text-slate-500'}>
                      Criar simulado vazio
                    </span>
                    <span
                      className={`flex items-center gap-1 font-semibold text-[11px] ${
                        isNotebook
                          ? 'text-[#1c2b45] group-hover:text-amber-800'
                          : 'text-slate-900 group-hover:text-slate-900'
                      }`}
                    >
                      <span>Usar este modelo</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          className={`px-4 sm:px-6 py-3 border-t flex items-center justify-between text-xs font-mono-code shrink-0 select-none ${
            isNotebook
              ? 'bg-[#f5f2e9] border-[#ded7c6] text-[#6b6255]'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <span className="truncate pr-2">
            Você também pode personalizar o nome e número exato de questões a qualquer momento.
          </span>
          <button
            type="button"
            onClick={onClose}
            className={`px-3.5 py-1.5 rounded-lg transition font-semibold cursor-pointer shrink-0 border ${
              isNotebook
                ? 'bg-white hover:bg-[#ede8db] text-[#1c2b45] border-[#ded7c6]'
                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
            }`}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
