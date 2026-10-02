import { ModalLayer } from './ModalLayer';
import React from 'react';
import { X, Zap, GraduationCap, BookOpen, Target, FileText, Building2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { ExamType } from '../types';

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
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-400 font-bold',
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
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    questions: 30,
    examType: 'multiple_choice',
    description: 'Sessão curta e ágil para treinar uma disciplina ou fazer revisão diária.',
    icon: Zap,
  },
  {
    id: 'concurso-50',
    title: 'Concurso Básico',
    badge: '50 questões',
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
    questions: 50,
    examType: 'multiple_choice',
    description: 'Estrutura tradicional para concursos municipais, administrativos e bancários.',
    icon: FileText,
  },
  {
    id: 'fcc-vunesp-60',
    title: 'FCC / VUNESP',
    badge: '60 questões',
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
    questions: 60,
    examType: 'multiple_choice',
    description: 'Padrão clássico de tribunais regionais, polícias civis e agências.',
    icon: Building2,
  },
  {
    id: 'fgv-cebraspe-70',
    title: 'FGV / Outras (M.E.)',
    badge: '70 questões',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    questions: 70,
    examType: 'multiple_choice',
    description: 'Estrutura de múltipla escolha para carreiras fiscais, controle, analistas e técnicos.',
    icon: GraduationCap,
  },
  {
    id: 'enem-90',
    title: 'ENEM / Vestibulares',
    badge: '90 questões',
    badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
    questions: 90,
    examType: 'multiple_choice',
    description: 'Simulado completo para 1º ou 2º dia de aplicação oficial do ENEM.',
    icon: BookOpen,
  },
  {
    id: 'extenso-100',
    title: 'Simulado Extenso',
    badge: '100 questões',
    badgeColor: 'bg-slate-100 text-slate-900 border-slate-300',
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
}

export const QuickPresetsModal: React.FC<QuickPresetsModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
}) => {
  if (!isOpen) return null;

  return (
    <ModalLayer label="Modelos de provas" onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#fdfbf7] dark:bg-[#22242a] border-2 border-[#1c2b45] dark:border-[#3b3e48] text-slate-800 dark:text-zinc-100 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-scaleUp max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#1c2b45] dark:bg-[#18191d] text-white px-4 sm:px-6 py-4 flex items-center justify-between shrink-0 border-b dark:border-[#3b3e48]">
          <div className="flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="font-serif-title italic font-bold text-lg sm:text-xl text-amber-50">
                Modelos Rápidos de Cartão-Resposta
              </h2>
              <p className="text-xs text-slate-300 dark:text-zinc-400 font-mono-code">
                Inicie um cartão-resposta limpo com formato padrão de banca em 1 clique
              </p>
            </div>
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
                  className="group bg-white dark:bg-[#18191d] hover:bg-[#faf7ee] dark:hover:bg-[#2c2f38] border border-[#dedad0] dark:border-[#3b3e48] hover:border-[#1c2b45] dark:hover:border-zinc-400 rounded-xl p-4 text-left transition-all duration-150 shadow-2xs hover:shadow-xs flex flex-col justify-between cursor-pointer focus-visible:outline-2 focus-visible:outline-[#1c2b45]"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#f0eee6] dark:bg-[#2c2f38] group-hover:bg-[#1c2b45] dark:group-hover:bg-[#3b3e48] text-[#1c2b45] dark:text-zinc-200 group-hover:text-white flex items-center justify-center transition-colors shadow-2xs">
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-sm text-[#1c2b45] dark:text-zinc-100 group-hover:underline">
                          {preset.title}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded border shrink-0 ${preset.badgeColor}`}
                      >
                        {preset.badge}
                      </span>
                    </div>

                    <p className="text-xs text-[#5b6478] dark:text-zinc-300 leading-relaxed pl-9">
                      {preset.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-[#dedad0]/60 dark:border-[#3b3e48] flex items-center justify-between text-xs font-mono-code text-[#1c2b45] dark:text-zinc-300 group-hover:text-amber-800 dark:group-hover:text-zinc-100">
                    <span className="text-[11px] text-[#717b8f] dark:text-zinc-400">Criar simulado vazio</span>
                    <span className="flex items-center gap-1 font-semibold text-[11px]">
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
        <div className="px-4 sm:px-6 py-3 bg-[#f5f2e9] dark:bg-[#18191d] border-t border-[#dedad0] dark:border-[#3b3e48] flex items-center justify-between text-xs font-mono-code shrink-0">
          <span className="text-[#5b6478] dark:text-zinc-400">
            Você também pode personalizar o nome e número exato de questões a qualquer momento.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white dark:bg-[#2c2f38] hover:bg-[#ede8db] dark:hover:bg-[#3b3e48] text-[#1c2b45] dark:text-zinc-200 border border-[#dedad0] dark:border-[#3b3e48] rounded-lg transition font-semibold cursor-pointer shrink-0"
          >
            Fechar
          </button>
        </div>
      </div>
    </ModalLayer>
  );
};
