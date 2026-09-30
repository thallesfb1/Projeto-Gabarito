import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ControlsBar } from './components/ControlsBar';
import { ScorePanel } from './components/ScorePanel';
import { QuestionGrid } from './components/QuestionGrid';
import { OfficialKeyDrawer } from './components/OfficialKeyDrawer';
import { ExportImportModal, ModalTab } from './components/ExportImportModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Sidebar } from './components/Sidebar';
import { NewSimuladoModal } from './components/NewSimuladoModal';
import { RenameSimuladoModal } from './components/RenameSimuladoModal';
import { BackupModal } from './components/BackupModal';
import { WelcomeEmptyState } from './components/WelcomeEmptyState';
import { CompletionFeedbackModal } from './components/CompletionFeedbackModal';
import { QuickPresetsModal } from './components/QuickPresetsModal';
import { ParallaxBackground } from './components/ParallaxBackground';
import { QuestionDetailModal } from './components/QuestionDetailModal';
import { PdfExamImportModal } from './components/PdfExamImportModal';
import { FlashcardsOverlay } from './components/FlashcardsOverlay';
import { AnswerOption, ExamType, FilterMode, SimuladoData, MultiSimuladoStore, AppTheme, SimuladoQuestionItem, Flashcard } from './types';
import { VALID_LETTERS, downloadFile, generateFullReport, computeSimuladoStats } from './utils/parser';
import {
  loadMultiSimuladoStore,
  saveMultiSimuladoStore,
  syncStoreWithIndexedDB,
  createNewSimulado,
  duplicateSimulado,
  generateSimuladoId,
} from './utils/provasManager';
import { saveSnapshotToIndexedDB } from './utils/indexedDbStorage';
import { FolderKanban, MessageSquare, ExternalLink, Bookmark, Sun, BookOpen, Brain, Sparkles } from 'lucide-react';

export default function App() {
  // Multi-exam centralized state with auto-migration from legacy single-exam storage
  const [store, setStore] = useState<MultiSimuladoStore>(() => loadMultiSimuladoStore());

  // Active simulado derived from store (null if no exams yet)
  const simulado: SimuladoData | null =
    store.provas.find(p => p.id === store.activeId) || store.provas[0] || null;

  // Visual Theme state (clean or notebook pastel)
  const [theme, setTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('gabarito_pro_theme');
    if (saved === 'notebook' || saved === 'clean') return saved;
    return 'clean';
  });

  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    localStorage.setItem('gabarito_pro_theme', newTheme);
  };

  // Ensure document never has dark class
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  // Sidebar states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleRetry = () => {
      if (simulado && simulado.isCorrected) {
        generateFlashcardsAsync(simulado, true);
      }
    };
    window.addEventListener('retry-flashcards', handleRetry);
    return () => window.removeEventListener('retry-flashcards', handleRetry);
  }, [simulado]);

  // Modals
  const [isNewProvaModalOpen, setIsNewProvaModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [renameModalProva, setRenameModalProva] = useState<SimuladoData | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupInitialTab, setBackupInitialTab] = useState<'export' | 'import' | 'storage'>('storage');
  const [isCompletionFeedbackOpen, setIsCompletionFeedbackOpen] = useState(false);
  const [isHomeView, setIsHomeView] = useState(false);
  const [isPdfImportModalOpen, setIsPdfImportModalOpen] = useState(false);
  const [detailQuestionIndex, setDetailQuestionIndex] = useState<number | null>(null);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(0);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [isKeyDrawerOpen, setIsKeyDrawerOpen] = useState(false);
  const [keyDrawerRequestedTab, setKeyDrawerRequestedTab] = useState<'import' | 'manual'>('import');
  const [modalState, setModalState] = useState<{ isOpen: boolean; tab: ModalTab }>({
    isOpen: false,
    tab: 'export-user',
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Auto-save multi-exam store to IndexedDB & LocalStorage on any state modification
  useEffect(() => {
    saveMultiSimuladoStore(store);
  }, [store]);

  // Synchronize on startup: recover from IndexedDB if localStorage was cleared
  useEffect(() => {
    syncStoreWithIndexedDB(store).then(result => {
      if (result.updated) {
        setStore(result.store);
        if (result.reason) {
          showToast(result.reason);
        }
      }
    });
  }, []);

  // Periodic automatic safety snapshot in IndexedDB every 10 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      if (store.provas.length > 0) {
        saveSnapshotToIndexedDB(store, 'Ponto Automático').catch(() => {});
      }
    }, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, [store]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Helper to mutate active simulado immutably and update timestamp
  const updateActiveSimulado = useCallback((updater: (prev: SimuladoData) => SimuladoData) => {
    setStore(prevStore => {
      const activeIdx = prevStore.provas.findIndex(p => p.id === prevStore.activeId);
      if (activeIdx === -1) return prevStore;
      const currentActive = prevStore.provas[activeIdx];
      const updated = updater(currentActive);
      updated.updatedAt = new Date().toISOString();
      const nextProvas = [...prevStore.provas];
      nextProvas[activeIdx] = updated;
      return {
        ...prevStore,
        provas: nextProvas,
      };
    });
  }, []);

  // Keyboard navigation & quick answers for active exam
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!simulado) return;

      // If user is in an input or textarea or any modal is open, ignore global shortcuts
      if (
        modalState.isOpen ||
        isNewProvaModalOpen ||
        renameModalProva !== null ||
        isBackupModalOpen ||
        confirmDialog !== null ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const keyUpper = e.key.toUpperCase();
      const isExamLocked = Boolean(simulado.isCorrected && simulado.isLocked);
      const isTF = simulado.examType === 'true_false';

      // Answer selection via keyboard
      let matchedAnswer: AnswerOption | null = null;
      if (isTF) {
        if (keyUpper === 'V' || keyUpper === 'C') matchedAnswer = 'V';
        else if (keyUpper === 'F' || keyUpper === 'E') matchedAnswer = 'F';
      } else {
        if (VALID_LETTERS.includes(keyUpper as AnswerOption)) {
          matchedAnswer = keyUpper as AnswerOption;
        }
      }

      if (matchedAnswer) {
        e.preventDefault();
        if (isExamLocked) return;

        const currentIdx = activeQuestionIndex ?? 0;
        const letter = matchedAnswer;

        updateActiveSimulado(prev => {
          const nextAnswers = [...prev.userAnswers];
          nextAnswers[currentIdx] = nextAnswers[currentIdx] === letter ? null : letter;
          return {
            ...prev,
            userAnswers: nextAnswers,
            isResultOutdated: prev.isCorrected ? true : prev.isResultOutdated,
          };
        });

        // Advance to next question automatically
        if (currentIdx < simulado.totalQuestions - 1) {
          setActiveQuestionIndex(currentIdx + 1);
        }
        return;
      }

      // Backspace or Delete to clear
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        if (isExamLocked) return;

        const currentIdx = activeQuestionIndex ?? 0;
        updateActiveSimulado(prev => {
          const nextAnswers = [...prev.userAnswers];
          nextAnswers[currentIdx] = null;
          return {
            ...prev,
            userAnswers: nextAnswers,
            isResultOutdated: prev.isCorrected ? true : prev.isResultOutdated,
          };
        });
        return;
      }

      // Arrow Down
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveQuestionIndex(prev =>
          prev === null ? 0 : Math.min(simulado.totalQuestions - 1, prev + 1)
        );
        return;
      }

      // Arrow Up
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveQuestionIndex(prev => (prev === null ? 0 : Math.max(0, prev - 1)));
        return;
      }

      // Flag for review: 'R' (or 'F' if NOT true_false mode)
      const isFlagShortcut = isTF ? keyUpper === 'R' : keyUpper === 'F' || keyUpper === 'R';
      if (isFlagShortcut) {
        e.preventDefault();
        if (isExamLocked) return;
        if (activeQuestionIndex !== null) {
          handleToggleFlag(activeQuestionIndex);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeQuestionIndex,
    simulado?.totalQuestions,
    simulado?.isCorrected,
    simulado?.isLocked,
    simulado?.examType,
    modalState.isOpen,
    isNewProvaModalOpen,
    renameModalProva,
    isBackupModalOpen,
    confirmDialog,
    updateActiveSimulado,
  ]);

  // Answer selection via mouse/touch
  const handleSelectAnswer = useCallback(
    (questionIdx: number, letter: AnswerOption) => {
      if (simulado && simulado.isCorrected && simulado.isLocked) return;

      setActiveQuestionIndex(questionIdx);
      updateActiveSimulado(prev => {
        const next = [...prev.userAnswers];
        next[questionIdx] = next[questionIdx] === letter ? null : letter;
        return {
          ...prev,
          userAnswers: next,
          isResultOutdated: prev.isCorrected ? true : prev.isResultOutdated,
        };
      });
    },
    [simulado, updateActiveSimulado]
  );

  // Flag toggle
  const handleToggleFlag = useCallback(
    (questionIdx: number) => {
      if (simulado && simulado.isCorrected && simulado.isLocked) return;

      updateActiveSimulado(prev => {
        const exists = prev.flaggedQuestions.includes(questionIdx);
        const nextFlags = exists
          ? prev.flaggedQuestions.filter(i => i !== questionIdx)
          : [...prev.flaggedQuestions, questionIdx];
        return { ...prev, flaggedQuestions: nextFlags };
      });
    },
    [simulado, updateActiveSimulado]
  );

  // Question Detail Modal handler
  const handleOpenQuestionDetail = useCallback((idx: number) => {
    setActiveQuestionIndex(idx);
    setDetailQuestionIndex(idx);
  }, []);

  const handleUpdateQuestion = useCallback(
    (idx: number, updatedQuestion: SimuladoQuestionItem) => {
      updateActiveSimulado(prev => {
        const nextQuestions = [...(prev.questions || [])];
        while (nextQuestions.length < prev.totalQuestions) {
          nextQuestions.push({
            number: nextQuestions.length + 1,
            statement: '',
          });
        }
        nextQuestions[idx] = updatedQuestion;
        return {
          ...prev,
          questions: nextQuestions,
        };
      });
    },
    [updateActiveSimulado]
  );

  const handlePdfImportComplete = (payload: {
    fileName: string;
    questions: SimuladoQuestionItem[];
    detectedKey?: (AnswerOption | null)[];
    examTitle?: string;
    examType?: ExamType;
    totalQuestions: number;
    destinationMode?: 'current' | 'new';
  }) => {
    const validTotal = Math.max(1, Math.min(200, payload.totalQuestions));
    const now = new Date().toISOString();

    if (payload.destinationMode === 'new' || store.provas.length === 0) {
      const newProvaTitle = payload.examTitle || payload.fileName.replace(/\.pdf$/i, '');
      const newKey = new Array(validTotal).fill(null);
      if (payload.detectedKey && payload.detectedKey.length > 0) {
        for (let i = 0; i < validTotal; i++) {
          newKey[i] = payload.detectedKey[i] ?? null;
        }
      }

      const newProva: SimuladoData = {
        id: generateSimuladoId(),
        title: newProvaTitle,
        date: new Date().toLocaleDateString('pt-BR'),
        createdAt: now,
        updatedAt: now,
        totalQuestions: validTotal,
        userAnswers: new Array(validTotal).fill(null),
        keyAnswers: newKey,
        flaggedQuestions: [],
        isCorrected: false,
        timeSpentSeconds: 0,
        examType: payload.examType || 'multiple_choice',
        pdfFileName: payload.fileName,
        pdfImportedAt: now,
        questions: payload.questions,
      };

      setStore(prev => ({
        ...prev,
        activeId: newProva.id,
        provas: [newProva, ...prev.provas],
      }));
      setIsHomeView(false);
      showToast(`Novo simulado "${newProva.title}" criado a partir do PDF!`);
    } else {
      updateActiveSimulado(prev => {
        const newUser = new Array(validTotal).fill(null);
        const newKey = new Array(validTotal).fill(null);

        // Preserve existing user answers
        for (let i = 0; i < Math.min(prev.userAnswers.length, validTotal); i++) {
          newUser[i] = prev.userAnswers[i] ?? null;
        }

        // If detectedKey was found in PDF, use it; otherwise preserve existing key
        if (payload.detectedKey && payload.detectedKey.length > 0) {
          for (let i = 0; i < validTotal; i++) {
            newKey[i] = payload.detectedKey[i] ?? prev.keyAnswers[i] ?? null;
          }
        } else {
          for (let i = 0; i < Math.min(prev.keyAnswers.length, validTotal); i++) {
            newKey[i] = prev.keyAnswers[i] ?? null;
          }
        }

        const nextTitle =
          prev.title.startsWith('Cartão-Resposta') && payload.examTitle
            ? payload.examTitle
            : prev.title;

        return {
          ...prev,
          title: nextTitle,
          totalQuestions: validTotal,
          userAnswers: newUser,
          keyAnswers: newKey,
          examType: payload.examType || prev.examType,
          pdfFileName: payload.fileName,
          pdfImportedAt: now,
          questions: payload.questions,
          isCorrected: false,
          isLocked: false,
          isResultOutdated: false,
          flaggedQuestions: prev.flaggedQuestions.filter(idx => idx < validTotal),
        };
      });
      showToast(`Prova em PDF importada! ${payload.questions.length} questões com IA vinculadas.`);
    }

    setFilterMode('all');
    setActiveQuestionIndex(0);
    // Automatically open first question so user can start reading immediately
    setDetailQuestionIndex(0);
  };

  // Switch active prova
  const handleSelectProva = (id: string) => {
    setIsHomeView(false);
    if (id === store.activeId) return;
    setStore(prev => ({ ...prev, activeId: id }));
    setActiveQuestionIndex(0);
    setFilterMode('all');
    const target = store.provas.find(p => p.id === id);
    if (target) {
      showToast(`Prova "${target.title}" carregada.`);
    }
  };

  // Create new prova
  const handleCreateNewProva = (title: string, totalQuestions: number, examType?: ExamType) => {
    const newProva = createNewSimulado(title, totalQuestions, store.provas.length, examType);
    setStore(prev => ({
      ...prev,
      activeId: newProva.id,
      provas: [newProva, ...prev.provas],
    }));
    setIsHomeView(false);
    setActiveQuestionIndex(0);
    setFilterMode('all');
    showToast(`Cartão-resposta "${newProva.title}" criado com sucesso!`);
  };

  // Duplicate prova
  const handleDuplicateProva = (prova: SimuladoData) => {
    const copy = duplicateSimulado(prova);
    setStore(prev => {
      const idx = prev.provas.findIndex(p => p.id === prova.id);
      const nextProvas = [...prev.provas];
      nextProvas.splice(idx + 1, 0, copy);
      return {
        ...prev,
        activeId: copy.id,
        provas: nextProvas,
      };
    });
    setIsHomeView(false);
    setActiveQuestionIndex(0);
    showToast(`Prova duplicada como "${copy.title}"!`);
  };

  // Rename prova
  const handleRenameProva = (newTitle: string) => {
    if (!renameModalProva) return;
    const targetId = renameModalProva.id;
    setStore(prev => ({
      ...prev,
      provas: prev.provas.map(p =>
        p.id === targetId ? { ...p, title: newTitle, updatedAt: new Date().toISOString() } : p
      ),
    }));
    setRenameModalProva(null);
    showToast(`Prova renomeada para "${newTitle}".`);
  };

  // Delete prova with confirmation
  const handleDeleteProva = (prova: SimuladoData) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Excluir Prova',
      description: `Deseja realmente excluir a prova "${prova.title}"? Todas as marcações e o gabarito serão removidos permanentemente deste navegador.`,
      confirmLabel: 'Sim, Excluir',
      isDestructive: true,
      onConfirm: () => {
        // Save safety snapshot in IndexedDB before deleting
        saveSnapshotToIndexedDB(store, `Antes de excluir "${prova.title}"`).catch(() => {});

        setStore(prev => {
          const remaining = prev.provas.filter(p => p.id !== prova.id);
          if (remaining.length === 0) {
            // If deleting the only exam, transition cleanly to the empty welcome state
            return {
              version: 3,
              activeId: '',
              provas: [],
            };
          }
          const nextActiveId = prev.activeId === prova.id ? remaining[0].id : prev.activeId;
          return {
            ...prev,
            activeId: nextActiveId,
            provas: remaining,
          };
        });
        setConfirmDialog(null);
        showToast(`Prova "${prova.title}" excluída.`);
      },
    });
  };

  // Create exam directly from a preset template (ENEM, FGV, FCC, Cebraspe V/F, etc.)
  const handleSelectPreset = (presetTitle: string, totalQuestions: number, examType?: ExamType) => {
    const newProva = createNewSimulado(presetTitle, totalQuestions, store.provas.length, examType);
    setStore(prev => ({
      ...prev,
      activeId: newProva.id,
      provas: [newProva, ...prev.provas],
    }));
    setIsHomeView(false);
    setActiveQuestionIndex(0);
    setFilterMode('all');
    showToast(`Modelo "${newProva.title}" pronto para responder!`);
  };

  // Restore full backup (replace or merge)
  const handleRestoreBackup = (importedProvas: SimuladoData[], mode: 'replace' | 'merge') => {
    if (store.provas.length > 0) {
      saveSnapshotToIndexedDB(store, 'Antes de Restaurar Backup').catch(() => {});
    }

    if (mode === 'replace') {
      const firstId = importedProvas[0]?.id || '';
      setStore({
        version: 3,
        activeId: firstId,
        provas: importedProvas,
      });
      setIsHomeView(false);
      setActiveQuestionIndex(0);
      setFilterMode('all');
    } else {
      // Merge mode
      setStore(prev => {
        const existingIds = new Set(prev.provas.map(p => p.id));
        const merged = [...prev.provas];
        for (const p of importedProvas) {
          if (existingIds.has(p.id)) {
            merged.push({
              ...p,
              id: generateSimuladoId(),
              title: `${p.title} (Importada)`,
            });
          } else {
            merged.push(p);
          }
        }
        return {
          ...prev,
          provas: merged,
        };
      });
      setIsHomeView(false);
    }
  };

  // Update total questions for active exam
  const handleTotalQuestionsChange = (newTotal: number) => {
    if (!simulado) return;
    const validTotal = Math.max(1, Math.min(200, newTotal));
    updateActiveSimulado(prev => {
      const newUser = new Array(validTotal).fill(null);
      const newKey = new Array(validTotal).fill(null);
      for (let i = 0; i < Math.min(prev.totalQuestions, validTotal); i++) {
        newUser[i] = prev.userAnswers[i] ?? null;
        newKey[i] = prev.keyAnswers[i] ?? null;
      }
      return {
        ...prev,
        totalQuestions: validTotal,
        userAnswers: newUser,
        keyAnswers: newKey,
        flaggedQuestions: prev.flaggedQuestions.filter(idx => idx < validTotal),
        isCorrected: false,
        isLocked: false,
        isResultOutdated: false,
      };
    });
    setFilterMode('all');
    if (activeQuestionIndex && activeQuestionIndex >= validTotal) {
      setActiveQuestionIndex(validTotal - 1);
    }
  };

  // Clear user markings with reliable in-app confirmation
  const handleClearUserAnswers = () => {
    if (!simulado) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Limpar Marcações',
      description: `Deseja realmente limpar todas as suas marcações da prova "${simulado.title}"? As respostas preenchidas serão apagadas do cartão.`,
      confirmLabel: 'Sim, Limpar',
      cancelLabel: 'Cancelar',
      isDestructive: true,
      onConfirm: () => {
        updateActiveSimulado(prev => ({
          ...prev,
          userAnswers: new Array(prev.totalQuestions).fill(null),
          flaggedQuestions: [],
          isCorrected: false,
          isLocked: false,
          isResultOutdated: false,
        }));
        setConfirmDialog(null);
        showToast('Marcações limpas com sucesso.');
      },
    });
  };

  // Reset active exam with in-app confirmation
  const handleResetAll = () => {
    if (!simulado) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Reiniciar Esta Prova',
      description: `Atenção: deseja reiniciar todo o cartão e o gabarito oficial da prova "${simulado.title}"? Todas as respostas e tempos serão redefinidos.`,
      confirmLabel: 'Reiniciar Prova',
      cancelLabel: 'Cancelar',
      isDestructive: true,
      onConfirm: () => {
        const resetTotal = simulado.totalQuestions || 70;
        updateActiveSimulado(prev => ({
          ...prev,
          userAnswers: new Array(resetTotal).fill(null),
          keyAnswers: new Array(resetTotal).fill(null),
          flaggedQuestions: [],
          isCorrected: false,
          isLocked: false,
          isResultOutdated: false,
          timeSpentSeconds: 0,
          notes: '',
        }));
        setActiveQuestionIndex(0);
        setConfirmDialog(null);
        showToast('Prova reiniciada com sucesso.');
      },
    });
  };

  // Flashcard States
  const [isFlashcardsDrawerOpen, setIsFlashcardsDrawerOpen] = useState(false);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);

  const generateFlashcardsAsync = async (exam: SimuladoData, force: boolean = false) => {
    // Only generate if user has not yet generated flashcards for this exam, unless forced
    if (exam.flashcards && exam.flashcards.length > 0 && !force) return;

    const errorsList = [];
    for (let i = 0; i < exam.totalQuestions; i++) {
       const u = exam.userAnswers[i];
       const k = exam.keyAnswers[i];
       if (u && k && u !== k) {
          const q = exam.questions?.[i];
          if (q && q.statement) {
             errorsList.push({
               subject: q.subject || 'Assunto Geral',
               topic: q.topic || 'Conceito abordado na questão',
               statement: q.statement,
               officialAnswer: k
             });
          }
       }
    }
    
    if (errorsList.length === 0) {
      console.log('Nenhum erro com texto suficiente para gerar flashcards.');
      return;
    }
    
    setIsGeneratingFlashcards(true);
    try {
      const res = await fetch('/api/gemini/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors: errorsList.slice(0, 15) }) // Max 15 errors to avoid huge payload
      });
      const data = await res.json();
      if (data.success && data.flashcards && data.flashcards.length > 0) {
         updateActiveSimulado(prev => ({
           ...prev,
           flashcards: data.flashcards
         }));
         showToast('✨ Seus Flashcards de Revisão estão prontos!');
      } else {
         showToast('Erro ao gerar flashcards: ' + (data.error || 'Erro desconhecido.'));
      }
    } catch (e) {
      console.error('Failed to generate flashcards', e);
      showToast('Erro ao conectar com a IA para gerar flashcards. Limite da API atingido?');
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  // Run correction
  const handleRunCorrection = () => {
    if (!simulado) return;
    const keyHasAnswers = simulado.keyAnswers.some(a => a !== null);
    if (!keyHasAnswers) {
      setIsKeyDrawerOpen(true);
      setKeyDrawerRequestedTab('import');
      showToast('Adicione o gabarito oficial antes de corrigir o simulado.');
      return;
    }

    const userFilledCount = simulado.userAnswers.filter(a => a !== null && a !== undefined).length;
    const filledPercentage = (userFilledCount / simulado.totalQuestions) * 100;
    const allQuestionsFilled = userFilledCount === simulado.totalQuestions;

    const updatedExam = {
      ...simulado,
      isCorrected: true,
      isLocked: true,
      isResultOutdated: false,
    };

    updateActiveSimulado(() => updatedExam);
    setFilterMode('all');
    showToast('Simulado corrigido com sucesso!');

    // Exibe pop-up de feedback APENAS se todas as questões estiverem preenchidas
    if (allQuestionsFilled) {
      setIsCompletionFeedbackOpen(true);
    }

    // Aciona a IA de Flashcards em 2º plano se preencheu >= 75%
    if (filledPercentage >= 75) {
      if (simulado.flashcards && simulado.flashcards.length > 0) {
        setConfirmDialog({
          isOpen: true,
          title: 'Atualizar Flashcards?',
          description: 'Você alterou as respostas deste simulado. Deseja que a IA gere novos flashcards baseados nos seus erros atuais? Os flashcards antigos serão apagados.',
          confirmLabel: 'Sim, atualizar',
          cancelLabel: 'Não, manter os antigos',
          isDestructive: false,
          onConfirm: () => {
            generateFlashcardsAsync(updatedExam, true);
            setConfirmDialog(null);
          },
        });
      } else {
        generateFlashcardsAsync(updatedExam);
      }
    }
  };

  const handleExitCorrection = () => {
    if (!simulado) return;
    updateActiveSimulado(prev => ({
      ...prev,
      isCorrected: false,
      isLocked: false,
      isResultOutdated: false,
    }));
    setFilterMode('all');
  };

  // Request unlock with confirmation dialog
  const handleRequestUnlock = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Desbloquear Respostas?',
      description:
        'Deseja desbloquear as respostas? A edição tornará a pontuação atual desatualizada até uma nova correção.',
      confirmLabel: 'Sim, Desbloquear',
      cancelLabel: 'Cancelar',
      isDestructive: false,
      onConfirm: () => {
        updateActiveSimulado(prev => ({
          ...prev,
          isLocked: false,
          isResultOutdated: true,
        }));
        setConfirmDialog(null);
        showToast('Respostas desbloqueadas para edição.');
      },
    });
  };

  // Calculate unified score stats for active exam
  const stats = simulado ? computeSimuladoStats(simulado) : null;
  const hits = stats?.hits ?? 0;
  const misses = stats?.misses ?? 0;
  const blanks = stats?.blanks ?? 0;
  const keyCount = stats?.keyCount ?? 0;
  const withoutKeyCount = stats?.withoutKeyCount ?? 0;
  const userFilledCount = stats?.userFilledCount ?? 0;
  const keyFilledCount = stats?.keyCount ?? 0;

  const handleDownloadReportDirect = () => {
    if (!simulado) return;
    const cleanTitle = simulado.title
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_');
    const cleanDate = simulado.date.replace(/[^0-9-]/g, '_');
    const reportText = generateFullReport(simulado);
    downloadFile(`relatorio_${cleanTitle}_${cleanDate}.txt`, reportText);
    showToast('Relatório baixado para a sua pasta!');
  };

  return (
    <div className={`min-h-screen ${
      theme === 'notebook'
        ? 'canvas-notebook theme-notebook text-[#1c2b45]'
        : 'canvas-clean theme-clean text-[#1c2b45]'
    } py-4 px-2 sm:px-4 flex justify-center selection:bg-slate-900 selection:text-white transition-colors duration-200 relative`}>
      {/* Dynamic Interactive Parallax Depth Background */}
      <ParallaxBackground theme={theme} />

      <div className="w-full max-w-7xl flex flex-col md:flex-row gap-4 sm:gap-6 items-start justify-center relative z-10">
        {/* Sidebar with saved exams list */}
        <Sidebar
          provas={store.provas}
          activeId={store.activeId}
          isOpen={isSidebarOpen}
          isMobileOpen={isMobileSidebarOpen}
          isHomeActive={!simulado || isHomeView}
          theme={theme}
          onThemeChange={handleThemeChange}
          onToggleOpen={() => setIsSidebarOpen(prev => !prev)}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onGoHome={() => setIsHomeView(true)}
          onSelectProva={handleSelectProva}
          onOpenNewProvaModal={() => setIsNewProvaModalOpen(true)}
          onOpenRenameModal={p => setRenameModalProva(p)}
          onDuplicateProva={handleDuplicateProva}
          onDeleteProva={handleDeleteProva}
          onOpenBackupModal={() => {
            setBackupInitialTab('export');
            setIsBackupModalOpen(true);
          }}
          onOpenExportModal={tab => {
            setModalState({ isOpen: true, tab: tab || 'import-user' });
          }}
        />

        {/* Main Exam Paper or Empty Welcome Container */}
        <div className="flex-1 w-full min-w-0 max-w-7xl">
          {!simulado || isHomeView ? (
            <div className="space-y-4">
              {/* Mobile top bar to access sidebar & active exam */}
              <div className={`md:hidden flex items-center justify-between pb-2 border-b gap-2 ${
                theme === 'notebook'
                  ? 'border-[#ded7c6]'
                  : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-code rounded-lg shadow-2xs cursor-pointer border ${
                      theme === 'notebook'
                        ? 'bg-white text-slate-800 border-[#ded7c6]'
                        : 'bg-white text-slate-800 border-slate-200'
                    }`}
                  >
                    <FolderKanban className="w-4 h-4 text-slate-500" />
                    <span className="font-bold">Cartões ({store.provas.length})</span>
                  </button>
                  {simulado && isHomeView && (
                    <button
                      type="button"
                      onClick={() => setIsHomeView(false)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono-code rounded-lg shadow-2xs transition cursor-pointer border ${
                        theme === 'notebook'
                          ? 'bg-[#f5f0e4] hover:bg-[#eae4d4] text-[#1c2b45] border-[#ded7c6]'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                      }`}
                      title="Voltar para o cartão-resposta ativo"
                    >
                      <span>Voltar ao Cartão</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleThemeChange(theme === 'clean' ? 'notebook' : 'clean');
                    }}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border shadow-2xs transition ${
                      theme === 'notebook'
                        ? 'bg-[#ede7d8] border-[#ded7c6] text-[#1c2b45]'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                    title="Alternar tema visual (Clean / Caderno)"
                  >
                    {theme === 'clean' ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[11px] font-medium">Clean</span>
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                        <span className="text-[11px] font-medium">Caderno</span>
                      </>
                    )}
                  </button>

                  <a
                    href="https://forms.gle/hjRkzSo75nfRcqPd8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-mono-code px-2 py-1.5 rounded-lg shadow-2xs border transition text-slate-600 bg-white hover:bg-slate-50 border-slate-200"
                    title="Dar feedback sobre o aplicativo (Google Forms)"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              </div>

              <WelcomeEmptyState
                provas={store.provas}
                provasCount={store.provas.length}
                activeProva={simulado}
                theme={theme}
                onThemeChange={handleThemeChange}
                onContinueActiveProva={() => setIsHomeView(false)}
                onSelectProva={p => {
                  handleSelectProva(p.id);
                  setIsHomeView(false);
                }}
                onCreateFirstProva={() => setIsNewProvaModalOpen(true)}
                onImportPdf={() => setIsPdfImportModalOpen(true)}
                onOpenPresetsModal={() => setIsPresetsModalOpen(true)}
                onOpenBackupModal={(tab) => {
                  setBackupInitialTab(tab || 'export');
                  setIsBackupModalOpen(true);
                }}
              />
            </div>
          ) : (
            <div className={`rounded-2xl shadow-xs p-4 sm:p-6 lg:p-8 transition-all min-w-0 ${
              theme === 'notebook'
                ? 'bg-[#fdfbf7] border border-[#ded7c6]'
                : 'bg-white border border-slate-200'
            }`}>
              {/* Header with Title, Date, Simulation Timer & Provas toggle button */}
              <Header
                title={simulado.title}
                onTitleChange={newTitle => updateActiveSimulado(prev => ({ ...prev, title: newTitle }))}
                date={simulado.date}
                onDateChange={newDate => updateActiveSimulado(prev => ({ ...prev, date: newDate }))}
                timeSeconds={simulado.timeSpentSeconds}
                onTimeChange={newTime =>
                  updateActiveSimulado(prev => ({
                    ...prev,
                    timeSpentSeconds: typeof newTime === 'function' ? newTime(prev.timeSpentSeconds) : newTime,
                  }))
                }
                theme={theme}
                onThemeChange={handleThemeChange}
                onToggleSidebar={() => {
                  // In mobile, opens drawer; in desktop, toggles sidebar
                  if (window.innerWidth < 768) {
                    setIsMobileSidebarOpen(true);
                  } else {
                    setIsSidebarOpen(prev => !prev);
                  }
                }}
                onGoHome={() => setIsHomeView(true)}
                provasCount={store.provas.length}
                isSidebarOpen={isSidebarOpen}
              />

              {/* Action and Control Bar */}
              <ControlsBar
                totalQuestions={simulado.totalQuestions}
                onTotalChange={handleTotalQuestionsChange}
                filledCount={userFilledCount}
                keyFilledCount={keyFilledCount}
                isCorrected={simulado.isCorrected}
                onRunCorrection={handleRunCorrection}
                onExitCorrection={handleExitCorrection}
                onOpenExportModal={tab => setModalState({ isOpen: true, tab })}
                onClearUserAnswers={handleClearUserAnswers}
                onResetAll={handleResetAll}
                isKeyDrawerOpen={isKeyDrawerOpen}
                onToggleKeyDrawer={() => setIsKeyDrawerOpen(prev => !prev)}
                isExportModalOpen={modalState.isOpen}
                theme={theme}
                onOpenPdfImport={() => setIsPdfImportModalOpen(true)}
                hasPdfImported={Boolean(simulado.pdfFileName || (simulado.questions && simulado.questions.length > 0))}
                pdfQuestionsCount={simulado.questions?.length}
              />

              {/* Score Performance Panel (Shown when corrected) */}
              {simulado.isCorrected && (
                <ScorePanel
                  total={simulado.totalQuestions}
                  hits={hits}
                  misses={misses}
                  blanks={blanks}
                  flaggedCount={simulado.flaggedQuestions.length}
                  keyCount={keyCount}
                  withoutKeyCount={withoutKeyCount}
                  filterMode={filterMode}
                  onFilterChange={setFilterMode}
                  onExitCorrection={handleExitCorrection}
                  onDownloadReport={handleDownloadReportDirect}
                  isLocked={Boolean(simulado.isCorrected && simulado.isLocked)}
                  isResultOutdated={simulado.isResultOutdated}
                  onUnlockRequest={handleRequestUnlock}
                  onRunCorrection={handleRunCorrection}
                  examType={simulado.examType}
                  netScore={stats?.netScore}
                  theme={theme}
                />
              )}

              {/* Official Key Drawer */}
              <OfficialKeyDrawer
                isOpen={isKeyDrawerOpen}
                onToggle={() => setIsKeyDrawerOpen(prev => !prev)}
                total={simulado.totalQuestions}
                keyAnswers={simulado.keyAnswers}
                examType={simulado.examType}
                theme={theme}
                onKeyChange={newKey => {
                  const wasCorrected = simulado.isCorrected;
                  updateActiveSimulado(prev => ({
                    ...prev,
                    keyAnswers: newKey,
                    isCorrected: false, // Invalidate previous correction immediately
                    isLocked: false,
                    isResultOutdated: false,
                  }));
                  setFilterMode('all');
                  if (wasCorrected) {
                    showToast('Gabarito alterado. Resultado anterior invalidado — corrija novamente.');
                  }
                }}
                requestedTab={keyDrawerRequestedTab}
                onClearKey={() => {
                  setConfirmDialog({
                    isOpen: true,
                    title: 'Limpar Gabarito Oficial',
                    description: `Deseja realmente limpar todas as respostas cadastradas no gabarito oficial da prova "${simulado.title}"?`,
                    confirmLabel: 'Sim, Limpar',
                    cancelLabel: 'Cancelar',
                    isDestructive: true,
                    onConfirm: () => {
                      updateActiveSimulado(prev => ({
                        ...prev,
                        keyAnswers: new Array(prev.totalQuestions).fill(null),
                        isCorrected: false, // Invalidate previous correction immediately
                        isLocked: false,
                        isResultOutdated: false,
                      }));
                      setFilterMode('all');
                      setConfirmDialog(null);
                      showToast('Gabarito oficial limpo. Simulado pronto para nova correção.');
                    },
                  });
                }}
              />

                {/* Main Sheet Area (Now takes full width for a cleaner layout) */}
                <main className="flex-1 w-full min-w-0">
                  <QuestionGrid
                    total={simulado.totalQuestions}
                    userAnswers={simulado.userAnswers}
                    keyAnswers={simulado.keyAnswers}
                    flaggedQuestions={simulado.flaggedQuestions}
                    isCorrected={simulado.isCorrected}
                    isLocked={Boolean(simulado.isCorrected && simulado.isLocked)}
                    filterMode={filterMode}
                    activeQuestionIndex={activeQuestionIndex}
                    onSetActiveQuestion={setActiveQuestionIndex}
                    onSelectAnswer={handleSelectAnswer}
                    onToggleFlag={handleToggleFlag}
                    onResetFilter={setFilterMode}
                    examType={simulado.examType}
                    theme={theme}
                    questions={simulado.questions}
                    onOpenQuestionDetail={handleOpenQuestionDetail}
                  />
                </main>

              {/* Footer note */}
              <footer className={`mt-8 pt-4 border-t flex flex-col sm:flex-row items-center justify-between text-xs font-mono-code gap-2 ${
                theme === 'notebook'
                  ? 'border-[#ded7c6] text-[#6b6255]'
                  : 'border-slate-200 text-slate-500'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Gabarito Pro · {store.provas.length === 1 ? '1 simulado salvo' : `${store.provas.length} simulados salvos`} com IndexedDB seguro</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setBackupInitialTab('storage');
                      setIsBackupModalOpen(true);
                    }}
                    className="font-semibold underline underline-offset-2 cursor-pointer transition-colors hover:text-slate-900"
                  >
                    Backup & Snapshots
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setModalState({ isOpen: true, tab: 'export-user' })}
                    className="underline underline-offset-2 cursor-pointer transition-colors hover:text-slate-900"
                  >
                    Exportar
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setModalState({ isOpen: true, tab: 'import-user' })}
                    className="hover:text-slate-900 underline underline-offset-2 cursor-pointer"
                  >
                    Importar
                  </button>
                  <span>·</span>
                  <a
                    id="footer-feedback-link"
                    href="https://forms.gle/hjRkzSo75nfRcqPd8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-600 hover:text-slate-900 font-semibold inline-flex items-center gap-1 hover:underline underline-offset-2 transition-colors"
                    title="Dar feedback sobre a plataforma (Google Forms)"
                  >
                    <MessageSquare className="w-3 h-3 text-slate-500" />
                    <span>Feedback</span>
                    <ExternalLink className="w-3 h-3 inline text-slate-400" aria-hidden="true" />
                  </a>
                </div>
              </footer>
            </div>
          )}
        </div>
      </div>

      {/* Export / Import Modal for Individual Exam */}
      {simulado && (
        <ExportImportModal
          isOpen={modalState.isOpen}
          initialTab={modalState.tab}
          onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
          simulado={simulado}
          theme={theme}
          onOpenBackupModal={(tab) => {
            setBackupInitialTab(tab || 'export');
            setIsBackupModalOpen(true);
          }}
          onOpenPdfImport={() => setIsPdfImportModalOpen(true)}
          onUpdateUserAnswers={(answers, newTotal) => {
            updateActiveSimulado(prev => {
              const finalTotal = newTotal || prev.totalQuestions;
              return {
                ...prev,
                totalQuestions: finalTotal,
                userAnswers: answers,
                isCorrected: false,
                isLocked: false,
                isResultOutdated: false,
              };
            });
            setFilterMode('all');
            showToast('Respostas importadas com sucesso!');
          }}
          onUpdateKeyAnswers={(answers, newTotal) => {
            updateActiveSimulado(prev => {
              const finalTotal = newTotal || prev.totalQuestions;
              return {
                ...prev,
                totalQuestions: finalTotal,
                keyAnswers: answers,
                isCorrected: false,
                isLocked: false,
                isResultOutdated: false,
              };
            });
            setFilterMode('all');
            showToast('Gabarito oficial atualizado. Corrija o simulado para ver o resultado.');
          }}
        />
      )}

      {/* New Simulado Modal */}
      <NewSimuladoModal
        isOpen={isNewProvaModalOpen}
        onClose={() => setIsNewProvaModalOpen(false)}
        onCreate={handleCreateNewProva}
        suggestedIndex={store.provas.length + 1}
        theme={theme}
      />

      {/* Quick Presets Modal (Bank templates: ENEM, FGV, FCC, 30-100 questions) */}
      <QuickPresetsModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        onSelectPreset={handleSelectPreset}
        theme={theme}
      />

      {/* Rename Simulado Modal */}
      {renameModalProva && (
        <RenameSimuladoModal
          isOpen={true}
          currentTitle={renameModalProva.title}
          onClose={() => setRenameModalProva(null)}
          onRename={handleRenameProva}
          theme={theme}
        />
      )}

      {/* Full Backup & Restore Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        store={store}
        onRestoreBackup={handleRestoreBackup}
        onShowToast={showToast}
        initialTab={backupInitialTab}
        theme={theme}
      />

      {/* Completion Feedback Modal (appears only when correcting with 100% of questions filled) */}
      {simulado && (
        <CompletionFeedbackModal
          isOpen={isCompletionFeedbackOpen}
          onClose={() => setIsCompletionFeedbackOpen(false)}
          simuladoTitle={simulado.title}
          totalQuestions={simulado.totalQuestions}
          hits={hits}
          misses={misses}
          keyCount={keyCount}
          withoutKeyCount={withoutKeyCount}
          theme={theme}
        />
      )}

      {/* Question Reader & AI Explanation Modal */}
      {simulado && (
        <QuestionDetailModal
          isOpen={detailQuestionIndex !== null}
          questionIndex={detailQuestionIndex}
          totalQuestions={simulado.totalQuestions}
          question={
            detailQuestionIndex !== null ? simulado.questions?.[detailQuestionIndex] : undefined
          }
          userAnswer={
            detailQuestionIndex !== null ? simulado.userAnswers[detailQuestionIndex] : null
          }
          keyAnswer={
            detailQuestionIndex !== null ? simulado.keyAnswers[detailQuestionIndex] : null
          }
          isCorrected={simulado.isCorrected}
          isLocked={Boolean(simulado.isCorrected && simulado.isLocked)}
          isFlagged={
            detailQuestionIndex !== null
              ? simulado.flaggedQuestions.includes(detailQuestionIndex)
              : false
          }
          examType={simulado.examType}
          theme={theme}
          pdfFileName={simulado.pdfFileName}
          onClose={() => setDetailQuestionIndex(null)}
          onSelectQuestion={idx => {
            setActiveQuestionIndex(idx);
            setDetailQuestionIndex(idx);
          }}
          onSelectAnswer={handleSelectAnswer}
          onToggleFlag={handleToggleFlag}
          onOpenPdfImport={() => {
            setDetailQuestionIndex(null);
            setIsPdfImportModalOpen(true);
          }}
          onUpdateQuestion={handleUpdateQuestion}
        />
      )}

      {/* PDF Exam AI Import Modal */}
      <PdfExamImportModal
        isOpen={isPdfImportModalOpen}
        theme={theme}
        currentTotalQuestions={isHomeView ? 120 : (simulado ? simulado.totalQuestions : 120)}
        currentExamType={isHomeView ? 'multiple_choice' : (simulado ? simulado.examType : 'multiple_choice')}
        simuladoTitle={isHomeView ? undefined : simulado?.title}
        onClose={() => setIsPdfImportModalOpen(false)}
        onImportComplete={(payload) => {
          handlePdfImportComplete(payload);
          if (isHomeView) setIsHomeView(false);
        }}
        onOpenKeyDrawer={tab => {
          setIsKeyDrawerOpen(true);
          if (tab) setKeyDrawerRequestedTab(tab);
        }}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1c2b45] text-white text-xs sm:text-sm px-4 py-2.5 rounded-lg shadow-xl border border-white/20 animate-fadeIn flex items-center gap-2 font-mono-code">
          <span>✓ {toastMessage}</span>
        </div>
      )}

      {/* Flashcards Drawer and Floating Button */}
      {(() => {
        if (isHomeView) return false;
        if (!simulado?.isCorrected) return false;
        const hasFlashcards = simulado.flashcards && simulado.flashcards.length > 0;
        return hasFlashcards || isGeneratingFlashcards;
      })() && (
        <button
          onClick={() => setIsFlashcardsDrawerOpen(true)}
          className={`fixed right-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-2 px-3 py-4 rounded-l-2xl shadow-lg transition-transform hover:-translate-x-1 ${
            theme === 'notebook' 
              ? 'bg-[#e6721d] text-white border border-r-0 border-[#ad4705]' 
              : 'bg-indigo-600 text-white border border-r-0 border-indigo-700'
          }`}
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          {isGeneratingFlashcards ? (
            <Sparkles className="w-5 h-5 animate-pulse mb-2" />
          ) : (
            <Brain className="w-5 h-5 mb-2" />
          )}
          <span className="font-bold tracking-widest text-xs uppercase">
            {isGeneratingFlashcards ? 'Analisando...' : 'Flashcards'}
          </span>
        </button>
      )}

      <FlashcardsOverlay
        isOpen={isFlashcardsDrawerOpen}
        onClose={() => setIsFlashcardsDrawerOpen(false)}
        flashcards={simulado?.flashcards || []}
        isGenerating={isGeneratingFlashcards}
        theme={theme}
      />

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          cancelLabel={confirmDialog.cancelLabel}
          isDestructive={confirmDialog.isDestructive}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          theme={theme}
        />
      )}
    </div>
  );
}
