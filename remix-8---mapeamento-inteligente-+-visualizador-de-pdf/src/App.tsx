import { uploadOriginalFile } from './utils/sourceDocuments';
import { SourceDocuments } from './components/SourceDocuments';
import { ParallaxBackground } from './components/ParallaxBackground';
import { applyAnswerImport, generateExamplePair } from './utils/exampleData';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { ControlsBar } from './components/ControlsBar';
import { ScorePanel } from './components/ScorePanel';
import { QuestionGrid } from './components/QuestionGrid';
import { OfficialKeyDrawer } from './components/OfficialKeyDrawer';
import type { ModalTab } from './components/ExportImportModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Sidebar } from './components/Sidebar';
import { NewSimuladoModal } from './components/NewSimuladoModal';
import { RenameSimuladoModal } from './components/RenameSimuladoModal';
import { WelcomeEmptyState } from './components/WelcomeEmptyState';
import { CompletionFeedbackModal } from './components/CompletionFeedbackModal';
import { SubjectMapperModal } from './components/SubjectMapperModal';
import { AnswerOption, ExamType, FilterMode, SimuladoData, MultiSimuladoStore, AppTheme, SubjectRange } from './types';
import { VALID_LETTERS, downloadFile, generateFullReport, computeSimuladoStats } from './utils/parser';
import {
  createNewSimulado,
  duplicateSimulado,
  generateSimuladoId,
} from './utils/provasManager';
import { saveSnapshotToIndexedDB } from './utils/indexedDbStorage';
import { ExamBlueprint, materializeSubjectRanges, metadataFromBlueprint } from './utils/examCatalog';
import { normalizeTotal, resizeAnswers } from './utils/validation';
import { useWorkspace } from './hooks/useWorkspace';
import { AccountBar } from './components/AccountBar';
import { ExamReader } from './components/ExamReader';
import { AIExtraction, ExtractionMode } from './utils/aiExtraction';
import { applyAIReading,sameAIImportTarget } from './utils/aiImport';
import { saveFlashcardReview } from './utils/flashcards';
import {useExamTimer} from './hooks/useExamTimer';
import {TimerStartModal} from './components/TimerStartModal';
import {moveProof,orderedProofs} from './utils/proofOrder';
import { FolderKanban, MessageSquare, ExternalLink, Bookmark, Sun, BookOpen, Moon } from 'lucide-react';

const ExamLibrary = React.lazy(() => import('./components/ExamLibrary').then(module => ({ default: module.ExamLibrary })));
const StudyInsights = React.lazy(() => import('./components/StudyInsights').then(module => ({ default: module.StudyInsights })));
const BackupModal = React.lazy(() => import('./components/BackupModal').then(module => ({ default: module.BackupModal })));
const ExportImportModal = React.lazy(() => import('./components/ExportImportModal').then(module => ({ default: module.ExportImportModal })));
const QuickPresetsModal = React.lazy(() => import('./components/QuickPresetsModal').then(module => ({ default: module.QuickPresetsModal })));
const AIImportModal = React.lazy(() => import('./components/AIImportModal').then(module => ({ default: module.AIImportModal })));
const FlashcardsReview = React.lazy(() => import('./components/FlashcardsReview').then(module => ({ default: module.FlashcardsReview })));

export default function App() {
  // Multi-exam centralized state with auto-migration from legacy single-exam storage
  const workspace = useWorkspace();
  const { store, setStore, isStorageReady, saveStatus, scope } = workspace;
  const currentStore = useRef(store);
  currentStore.current = store;
  const currentScope = useRef(scope);
  currentScope.current = scope;

  // Active simulado derived from store (null if no exams yet)
  const simulado: SimuladoData | null =
    store.provas.find(p => p.id === store.activeId) || store.provas[0] || null;
  const currentProvaId = useRef(simulado?.id);
  currentProvaId.current = simulado?.id;

  // Visual Theme state (clean, notebook pastel or dark mode)
  const [theme, setTheme] = useState<AppTheme>(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem('gabarito_pro_theme'); } catch { /* Storage may be blocked. */ }
    if (saved === 'notebook' || saved === 'clean' || saved === 'dark') return saved;
    return 'clean';
  });

  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    try { localStorage.setItem('gabarito_pro_theme', newTheme); } catch { /* Theme still works in memory. */ }
  };

  // Synchronize dark class on document element for tailwind and sub-elements
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.remove('theme-clean', 'theme-notebook', 'theme-dark');
    document.documentElement.classList.add(`theme-${theme}`);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Sidebar states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals
  const [isNewProvaModalOpen, setIsNewProvaModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [renameModalProva, setRenameModalProva] = useState<SimuladoData | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [backupInitialTab, setBackupInitialTab] = useState<'export' | 'import' | 'storage'>('storage');
  const [isCompletionFeedbackOpen, setIsCompletionFeedbackOpen] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<'exam' | 'home' | 'library' | 'insights'>('home');
  const isHomeView = workspaceView === 'home';
  const setIsHomeView = (show: boolean) => setWorkspaceView(show ? 'home' : 'exam');
  const [mapperProvaId, setMapperProvaId] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<'exam' | 'key' | null>(null);
  const [aiTargetId, setAiTargetId] = useState<string | null>(null);
  const aiTargetProof = aiTargetId ? store.provas.find(proof=>proof.id===aiTargetId) || null : null;
  const openAI = (mode: ExtractionMode, targetId: string | null = null) => {setAiTargetId(targetId);setAiMode(mode);};
  const [readerQuestionIndex, setReaderQuestionIndex] = useState<number | null>(null);
  const pendingReader=useRef<number|null>(null);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState<number | null>(0);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [isKeyDrawerOpen, setIsKeyDrawerOpen] = useState(false);
  const [keyDrawerRequestedTab, setKeyDrawerRequestedTab] = useState<'import' | 'manual'>('import');
  const [showShortcutsHint, setShowShortcutsHint] = useState(false);
  const [modalState, setModalState] = useState<{ isOpen: boolean; tab: ModalTab }>({
    isOpen: false,
    tab: 'export-user',
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  useEffect(() => { setReaderQuestionIndex(null); }, [scope, simulado?.id, workspaceView]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    setWorkspaceView('home');
    setIsKeyDrawerOpen(false);
    setActiveQuestionIndex(0);
    setFilterMode('all');
    setIsBackupModalOpen(false);
    setMapperProvaId(null);
    setAiMode(null); setAiTargetId(null);
    setModalState(previous => ({ ...previous, isOpen: false }));
  }, [scope]);

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

  const timer=useExamTimer(simulado,scope,updateActiveSimulado);
  const handleQuestionFocus=(index:number|null)=>{setActiveQuestionIndex(index);if(index!==null)timer.requestStart();};
  const handleQuestionOpen=(index:number)=>{if(timer.requestStart())pendingReader.current=index;else setReaderQuestionIndex(index);};
  const decideTimer=(start:boolean)=>{timer.decide(start);if(pendingReader.current!==null){setReaderQuestionIndex(pendingReader.current);pendingReader.current=null;}};
  useEffect(()=>{pendingReader.current=null;},[scope,simulado?.id,workspaceView]);

  // Keyboard navigation & quick answers for active exam
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!simulado || !isStorageReady || workspaceView !== 'exam' || isKeyDrawerOpen || e.ctrlKey || e.metaKey || e.altKey || e.isComposing || e.repeat) return;

      // If user is in an input or textarea or any modal is open, ignore global shortcuts
      if (
        modalState.isOpen || aiMode !== null || readerQuestionIndex !== null || timer.promptOpen ||
        isNewProvaModalOpen ||
        renameModalProva !== null ||
        isBackupModalOpen ||
        confirmDialog !== null ||
        isPresetsModalOpen || mapperProvaId !== null || isCompletionFeedbackOpen ||
        (e.target instanceof HTMLElement && Boolean(e.target.closest('[role="dialog"], select, [contenteditable="true"]'))) ||
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
        if (['A', 'B', 'C', 'D', 'E'].includes(keyUpper)) {
          matchedAnswer = keyUpper as AnswerOption;
        }
      }

      if (matchedAnswer) {
        e.preventDefault();
        if (isExamLocked) return;

        const currentIdx = activeQuestionIndex ?? 0;
        const letter = matchedAnswer;
        timer.requestStart();

        updateActiveSimulado(prev => {
          const nextAnswers = [...prev.userAnswers];
          nextAnswers[currentIdx] = nextAnswers[currentIdx] === letter ? null : letter;
          return {
            ...prev,
            userAnswers: nextAnswers,
            exampleData: { ...prev.exampleData, user: false },
            reviewedQuestionIndexes: (prev.reviewedQuestionIndexes || []).filter(index => index !== currentIdx),
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
            exampleData: { ...prev.exampleData, user: false },
            reviewedQuestionIndexes: (prev.reviewedQuestionIndexes || []).filter(index => index !== currentIdx),
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
    workspaceView, isStorageReady, isKeyDrawerOpen, isPresetsModalOpen, mapperProvaId, isCompletionFeedbackOpen, aiMode, readerQuestionIndex,
    activeQuestionIndex,
    simulado?.totalQuestions,
    simulado?.isCorrected,
    simulado?.isLocked,
    simulado?.examType, simulado?.id,
    modalState.isOpen,
    isNewProvaModalOpen,
    renameModalProva,
    isBackupModalOpen,
    confirmDialog,
    timer.promptOpen, timer.requestStart,
    updateActiveSimulado,
  ]);

  // Answer selection via mouse/touch
  const handleSelectAnswer = useCallback(
    (questionIdx: number, letter: AnswerOption) => {
      if (simulado && simulado.isCorrected && simulado.isLocked) return;

      setActiveQuestionIndex(questionIdx);
      timer.requestStart();
      updateActiveSimulado(prev => {
        const next = [...prev.userAnswers];
        next[questionIdx] = next[questionIdx] === letter ? null : letter;
        return {
          ...prev,
          userAnswers: next,
          exampleData: { ...prev.exampleData, user: false },
          reviewedQuestionIndexes: (prev.reviewedQuestionIndexes || []).filter(
            index => index !== questionIdx
          ),
          isResultOutdated: prev.isCorrected ? true : prev.isResultOutdated,
        };
      });
    },
    [simulado, updateActiveSimulado, timer.requestStart]
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

  // Switch active prova
  const handleSelectProva = (id: string) => {
    setWorkspaceView('exam');
    setIsKeyDrawerOpen(false);
    setIsMobileSidebarOpen(false);
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

  const handleCreateFromBlueprint = (blueprint: ExamBlueprint) => {
    const newProva = createNewSimulado(
      blueprint.title,
      blueprint.questions,
      store.provas.length,
      blueprint.examType
    );
    newProva.subjectRanges = materializeSubjectRanges(blueprint.subjectRanges);
    newProva.examMetadata = metadataFromBlueprint(blueprint);
    setStore(prev => ({
      ...prev,
      activeId: newProva.id,
      provas: [newProva, ...prev.provas],
    }));
    setWorkspaceView('exam');
    setActiveQuestionIndex(0);
    setFilterMode('all');
    showToast(`Prova “${blueprint.shortTitle}” criada com mapa de disciplinas.`);
  };

  const handleOpenExamFromInsights = (simuladoId: string, questionIndex: number = 0) => {
    setStore(prev => ({ ...prev, activeId: simuladoId }));
    setWorkspaceView('exam');
    setActiveQuestionIndex(questionIndex);
    setFilterMode('all');
  };

  const handleToggleReviewed = (simuladoId: string, questionIndex: number) => {
    setStore(prev => ({
      ...prev,
      provas: prev.provas.map(prova => {
        if (prova.id !== simuladoId) return prova;
        const reviewed = prova.reviewedQuestionIndexes || [];
        const exists = reviewed.includes(questionIndex);
        return {
          ...prova,
          reviewedQuestionIndexes: exists
            ? reviewed.filter(index => index !== questionIndex)
            : [...reviewed, questionIndex],
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  };

  const handleSaveSubjectRanges = (ranges: SubjectRange[]) => {
    if (!mapperProvaId) return;
    setStore(prev => ({
      ...prev,
      provas: prev.provas.map(prova =>
        prova.id === mapperProvaId
          ? { ...prova, subjectRanges: ranges, updatedAt: new Date().toISOString() }
          : prova
      ),
    }));
    setMapperProvaId(null);
    showToast('Mapa de disciplinas salvo. O diagnóstico foi atualizado.');
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
      description: `Excluir a prova "${prova.title}" deste espaço de estudos${workspace.session ? ' e da conta sincronizada' : ''}? Uma cópia será preservada nos pontos de restauração.`,
      confirmLabel: 'Sim, Excluir',
      isDestructive: true,
      onConfirm: async () => {
        // Save safety snapshot in IndexedDB before deleting
        const snapshot = await saveSnapshotToIndexedDB(store, `Antes de excluir "${prova.title}"`, scope);
        if (!snapshot) { showToast('Não foi possível criar uma cópia de segurança. Exporte um backup antes de excluir.'); return; }
        if (currentScope.current !== scope) return;

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
    if (currentScope.current !== scope) return;
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
          existingIds.add(p.id);
        }
        return {
          ...prev,
          activeId: prev.activeId || merged[0]?.id || '',
          provas: merged,
        };
      });
      setIsHomeView(false);
    }
  };

  // Update total questions for active exam
  const handleTotalQuestionsChange = (newTotal: number) => {
    if (!simulado) return;
    const validTotal = Math.min(200, normalizeTotal(newTotal));
    if (validTotal === simulado.totalQuestions) return;
    const apply = () => {
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
        userAnswers: prev.exampleData?.user && prev.exampleData?.key ? generateExamplePair(validTotal, prev.examType).userAnswers : newUser,
        keyAnswers: prev.exampleData?.user && prev.exampleData?.key ? generateExamplePair(validTotal, prev.examType).keyAnswers : newKey,
        flaggedQuestions: prev.flaggedQuestions.filter(idx => idx < validTotal),
        reviewedQuestionIndexes: (prev.reviewedQuestionIndexes || []).filter(
          idx => idx < validTotal
        ),
        subjectRanges: (prev.subjectRanges || [])
          .map(range => ({ ...range, end: Math.min(range.end, validTotal) }))
          .filter(range => range.start <= validTotal && range.start <= range.end),
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
    if (validTotal < simulado.totalQuestions && (simulado.userAnswers.slice(validTotal).some(Boolean) || simulado.keyAnswers.slice(validTotal).some(Boolean) || simulado.subjectRanges?.some(range => range.end > validTotal))) {
      setConfirmDialog({ isOpen: true, title: 'Reduzir o cartão-resposta?', description: `As questões após a ${validTotal} serão removidas, incluindo suas marcações, gabarito e disciplinas. Uma cópia será salva antes da alteração.`, confirmLabel: 'Reduzir cartão', onConfirm: async () => {
        const snapshot = await saveSnapshotToIndexedDB(store, 'Antes de reduzir questões', scope);
        if (!snapshot) { showToast('Não foi possível criar uma cópia. Exporte um backup antes de reduzir.'); return; }
        if (currentScope.current !== scope || currentProvaId.current !== simulado.id) return;
        apply(); setConfirmDialog(null);
      } });
    } else apply();
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
      onConfirm: async () => {
        const snapshot = await saveSnapshotToIndexedDB(store, 'Antes de limpar marcações', scope);
        if (!snapshot) { showToast('Exporte um backup: não foi possível preservar as marcações.'); return; }
        if (currentScope.current !== scope || currentProvaId.current !== simulado.id) return;
        updateActiveSimulado(prev => ({
          ...prev,
          userAnswers: new Array(prev.totalQuestions).fill(null),
          exampleData: { ...prev.exampleData, user: false },
          flaggedQuestions: [],
          reviewedQuestionIndexes: [],
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
      onConfirm: async () => {
        const snapshot = await saveSnapshotToIndexedDB(store, 'Antes de reiniciar a prova', scope);
        if (!snapshot) { showToast('Exporte um backup: não foi possível preservar a prova.'); return; }
        if (currentScope.current !== scope || currentProvaId.current !== simulado.id) return;
        const resetTotal = simulado.totalQuestions || 70;
        timer.stop();
        updateActiveSimulado(prev => ({
          ...prev,
          userAnswers: new Array(resetTotal).fill(null),
          exampleData: { user: false, key: false },
          keyAnswers: new Array(resetTotal).fill(null),
          flaggedQuestions: [],
          isCorrected: false,
          isLocked: false,
          isResultOutdated: false,
          timeSpentSeconds: 0,
          reviewedQuestionIndexes: [],
          notes: '',
        }));
        setActiveQuestionIndex(0);
        setConfirmDialog(null);
        showToast('Prova reiniciada com sucesso.');
      },
    });
  };

  // Run correction
  const handleRunCorrection = () => {
    timer.stop();
    if (!simulado) return;
    const keyHasAnswers = simulado.keyAnswers.some(a => a !== null);
    if (!keyHasAnswers) {
      setIsKeyDrawerOpen(true);
      setKeyDrawerRequestedTab('import');
      showToast('Adicione o gabarito oficial antes de corrigir o simulado.');
      return;
    }

    const allQuestionsFilled =
      simulado.userAnswers.length === simulado.totalQuestions &&
      simulado.userAnswers.every(a => a !== null && a !== undefined);

    updateActiveSimulado(prev => ({
      ...prev,
      isCorrected: true,
      isLocked: true,
      isResultOutdated: false,
    }));
    setFilterMode('all');
    showToast('Simulado corrigido com sucesso!');

    // Exibe pop-up de feedback APENAS se todas as questões estiverem preenchidas
    if (allQuestionsFilled) {
      setIsCompletionFeedbackOpen(true);
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
  const mapperProva = mapperProvaId
    ? store.provas.find(prova => prova.id === mapperProvaId) || null
    : null;

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

  if (!isStorageReady) return (
    <div className="workspace-loading" role="status" aria-live="polite">
      <BookOpen className="w-9 h-9" />
      <h1>Preparando seu espaço de estudos</h1>
      <p>Recuperando suas provas e verificando o salvamento.</p>
    </div>
  );

  const handleAIReading = async (result: AIExtraction, file: File, mode: ExtractionMode) => {
    const account=scope; const destination=aiTargetId;
    const target=destination?currentStore.current.provas.find(proof=>proof.id===destination) || null:null;
    if(destination && !target) throw new Error('Esta prova não está mais disponível. Abra novamente a importação.');
    const proof=applyAIReading(result,mode,target,currentStore.current.provas.length);
    if(target) {
      if((target.sourceDocuments || []).length>=100) throw new Error('Esta prova já possui 100 originais salvos.');
      const snapshot=await saveSnapshotToIndexedDB(currentStore.current,'Antes de importar arquivo por IA',account);
      if(!snapshot) throw new Error('Não foi possível preservar a prova atual. Exporte um backup antes de importar.');
    }
    if(currentScope.current!==account) throw new Error('A conta mudou. Abra novamente a importação.');
    const original=await uploadOriginalFile(file,proof.id,mode);
    if(currentScope.current!==account) throw new Error('A conta mudou durante o salvamento. Abra novamente a importação.');
    if(target && !sameAIImportTarget(target,currentStore.current.provas.find(item=>item.id===destination))) throw new Error('A prova mudou durante a leitura. Confira a versão atual e importe novamente.');
    proof.sourceDocuments=[...(target?.sourceDocuments || []),original];
    if(mode==='exam') proof.sourceFileName=file.name;
    proof.updatedAt=new Date().toISOString();
    setStore(previous=>({...previous,activeId:proof.id,provas:destination?previous.provas.map(item=>item.id===destination?{...proof,timeSpentSeconds:item.timeSpentSeconds}:item):[...previous.provas,proof]}));
    setWorkspaceView('exam');setActiveQuestionIndex(0);setFilterMode('all');setIsKeyDrawerOpen(false);
    showToast(target?(mode==='exam'?'PDF e disciplinas adicionados à prova.':'Gabarito conferido importado. Corrija a prova para atualizar o resultado.'):(mode==='exam'?'Simulado criado com enunciados e disciplinas.':'Novo simulado criado com o gabarito conferido.'));
  };

  return (
    <div className={`workspace-canvas min-h-screen ${
      theme === 'notebook'
        ? 'canvas-notebook theme-notebook text-[#1c2b45]'
        : theme === 'dark'
        ? 'canvas-dark theme-dark text-zinc-100 dark'
        : 'canvas-clean theme-clean text-[#1c2b45]'
    } py-4 px-2 sm:px-4 flex justify-center selection:bg-slate-900 selection:text-white dark:selection:bg-zinc-700 dark:selection:text-zinc-100 transition-colors duration-200 relative`}>
      <ParallaxBackground theme={theme} />

      <div className="w-full max-w-7xl relative z-10">
        <AccountBar workspace={workspace} theme={theme} onThemeChange={handleThemeChange} onAI={() => openAI('exam',workspaceView==='exam'?simulado?.id || null:null)} onMenu={() => setIsMobileSidebarOpen(true)} onHome={() => setWorkspaceView('home')} onBackup={() => { setBackupInitialTab('export'); setIsBackupModalOpen(true); }} />
        <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-start justify-center">
        {/* Sidebar with saved exams list */}
        <Sidebar
          provas={orderedProofs(store.provas)}
          activeId={store.activeId}
          isOpen={isSidebarOpen}
          isMobileOpen={isMobileSidebarOpen}
          isHomeActive={workspaceView === 'home' || (!simulado && workspaceView === 'exam')}
          isLibraryActive={workspaceView === 'library'}
          isInsightsActive={workspaceView === 'insights'}
          theme={theme}
          onToggleOpen={() => setIsSidebarOpen(prev => !prev)}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onGoHome={() => setWorkspaceView('home')}
          onOpenLibrary={() => setWorkspaceView('library')}
          onOpenInsights={() => setWorkspaceView('insights')}
          onSelectProva={handleSelectProva}
          onReorderProva={(id,targetId)=>setStore(previous=>({...previous,provas:moveProof(previous.provas,id,targetId)}))}
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
        <div className="flex-1 w-full min-w-0 max-w-5xl">
          <React.Suspense fallback={<div className="p-8 text-center text-sm" role="status">Carregando seu espaço de estudos…</div>}>
          {workspaceView === 'library' ? (
            <ExamLibrary
              theme={theme}
              onBack={() => setWorkspaceView('home')}
              onCreateFromBlueprint={handleCreateFromBlueprint}
            />
          ) : workspaceView === 'insights' ? (
            <StudyInsights
              theme={theme}
              provas={store.provas}
              onBack={() => setWorkspaceView('home')}
              onOpenLibrary={() => setWorkspaceView('library')}
              onOpenExam={handleOpenExamFromInsights}
              onOpenMapper={setMapperProvaId}
              onToggleReviewed={handleToggleReviewed}
            />
          ) : !simulado || isHomeView ? (
            <div className="space-y-4">
              {/* Mobile top bar to access sidebar & active exam */}
              <div className={`md:hidden flex items-center justify-between pb-2 border-b gap-2 ${
                theme === 'notebook'
                  ? 'border-[#ded7c6]'
                  : theme === 'dark'
                  ? 'border-[#3b3e48]'
                  : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono-code rounded-lg shadow-2xs cursor-pointer border ${
                      theme === 'notebook'
                        ? 'bg-white text-slate-800 border-[#ded7c6]'
                        : theme === 'dark'
                        ? 'bg-[#22242a] text-zinc-200 border-[#3b3e48]'
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
                          : theme === 'dark'
                          ? 'bg-[#2a2c34] hover:bg-[#343740] text-zinc-200 border-[#3b3e48]'
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
                      if (theme === 'clean') handleThemeChange('notebook');
                      else if (theme === 'notebook') handleThemeChange('dark');
                      else handleThemeChange('clean');
                    }}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border shadow-2xs transition ${
                      theme === 'notebook'
                        ? 'bg-[#ede7d8] border-[#ded7c6] text-[#1c2b45]'
                        : theme === 'dark'
                        ? 'bg-[#22242a] border-[#3b3e48] text-zinc-200'
                        : 'bg-white border-slate-200 text-slate-700'
                    }`}
                    title="Alternar tema visual (Clean / Caderno / Escuro)"
                  >
                    {theme === 'clean' ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[11px] font-medium">Clean</span>
                      </>
                    ) : theme === 'notebook' ? (
                      <>
                        <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                        <span className="text-[11px] font-medium">Caderno</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-zinc-300" />
                        <span className="text-[11px] font-medium">Escuro</span>
                      </>
                    )}
                  </button>

                  <a
                    href="https://forms.gle/hjRkzSo75nfRcqPd8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1 text-xs font-mono-code px-2 py-1.5 rounded-lg shadow-2xs border transition ${
                      theme === 'dark'
                        ? 'text-zinc-300 bg-[#22242a] hover:bg-[#2a2c34] border-[#3b3e48]'
                        : 'text-slate-600 bg-white hover:bg-slate-50 border-slate-200'
                    }`}
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
                onOpenPresetsModal={() => setIsPresetsModalOpen(true)}
                onOpenLibrary={() => setWorkspaceView('library')}
                onOpenInsights={() => setWorkspaceView('insights')}
                onOpenAI={() => openAI('exam')}
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
                : theme === 'dark'
                ? 'bg-[#22242a] border border-[#3b3e48] text-zinc-100 shadow-xl shadow-black/40'
                : 'bg-white border border-slate-200'
            }`}>
              {/* Header with Title, Date, Simulation Timer & Provas toggle button */}
              <Header
                key={simulado.id}
                title={simulado.title}
                onTitleChange={newTitle => updateActiveSimulado(prev => ({ ...prev, title: newTitle }))}
                date={simulado.date}
                onDateChange={newDate => updateActiveSimulado(prev => ({ ...prev, date: newDate }))}
                timeSeconds={simulado.timeSpentSeconds}
                isTimerRunning={timer.running}
                onToggleTimer={timer.toggle}
                timerDisabled={simulado.isCorrected}
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
                showShortcutsHint={showShortcutsHint}
                onToggleShortcutsHint={() => setShowShortcutsHint(prev => !prev)}
                isKeyDrawerOpen={isKeyDrawerOpen}
                onToggleKeyDrawer={() => setIsKeyDrawerOpen(prev => !prev)}
                isExportModalOpen={modalState.isOpen}
                subjectRangeCount={simulado.subjectRanges?.length || 0}
                onOpenSubjectMapper={() => setMapperProvaId(simulado.id)}
                onOpenAI={() => openAI('key',simulado.id)}
                theme={theme}
              />

              {Boolean(simulado.sourceDocuments?.length) && <SourceDocuments key={scope + simulado.id} documents={simulado.sourceDocuments || []} />}

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
                onKeyChange={(newKey, isExample) => {
                  const wasCorrected = simulado.isCorrected;
                  updateActiveSimulado(prev => applyAnswerImport(prev, 'key', newKey, undefined, isExample));
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
                        exampleData: { ...prev.exampleData, key: false },
                        reviewedQuestionIndexes: [],
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

              {/* The Optical Bubble Sheet Grid */}
              <main className="mt-3 w-full min-w-0">
                <QuestionGrid
                  total={simulado.totalQuestions}
                  userAnswers={simulado.userAnswers}
                  keyAnswers={simulado.keyAnswers}
                  flaggedQuestions={simulado.flaggedQuestions}
                  isCorrected={simulado.isCorrected}
                  isLocked={Boolean(simulado.isCorrected && simulado.isLocked)}
                  filterMode={filterMode}
                  activeQuestionIndex={activeQuestionIndex}
                  onSetActiveQuestion={handleQuestionFocus}
                  onOpenQuestion={simulado.extractedQuestions?.length ? handleQuestionOpen : undefined}
                  onSelectAnswer={handleSelectAnswer}
                  onToggleFlag={handleToggleFlag}
                  onResetFilter={setFilterMode}
                  examType={simulado.examType}
                  theme={theme}
                />
              </main>

              {/* Footer note */}
              <footer className={`mt-8 pt-4 border-t flex flex-col sm:flex-row items-center justify-between text-xs font-mono-code gap-2 ${
                theme === 'notebook'
                  ? 'border-[#ded7c6] text-[#6b6255]'
                  : theme === 'dark'
                  ? 'border-[#3b3e48] text-zinc-400'
                  : 'border-slate-200 text-slate-500'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span role="status">{saveStatus === 'error' ? 'Não foi possível salvar. Exporte um backup antes de sair.' : saveStatus === 'saving' ? 'Salvando alterações…' : `Gabarito Pro · ${store.provas.length} ${store.provas.length === 1 ? 'simulado salvo' : 'simulados salvos'} neste navegador`}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setBackupInitialTab('storage');
                      setIsBackupModalOpen(true);
                    }}
                    className={`font-semibold underline underline-offset-2 cursor-pointer transition-colors ${
                      theme === 'dark' ? 'hover:text-white text-zinc-300' : 'hover:text-slate-900'
                    }`}
                  >
                    Backup & Snapshots
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setModalState({ isOpen: true, tab: 'export-user' })}
                    className={`underline underline-offset-2 cursor-pointer transition-colors ${
                      theme === 'dark' ? 'hover:text-white text-zinc-300' : 'hover:text-slate-900'
                    }`}
                  >
                    Exportar
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setModalState({ isOpen: true, tab: 'import-user' })}
                    className="hover:text-slate-900 dark:hover:text-white dark:text-zinc-300 underline underline-offset-2 cursor-pointer"
                  >
                    Importar
                  </button>
                  <span>·</span>
                  <a
                    id="footer-feedback-link"
                    href="https://forms.gle/hjRkzSo75nfRcqPd8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white font-semibold inline-flex items-center gap-1 hover:underline underline-offset-2 transition-colors"
                    title="Dar feedback sobre a plataforma (Google Forms)"
                  >
                    <MessageSquare className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
                    <span>Feedback</span>
                    <ExternalLink className="w-3 h-3 inline text-slate-400 dark:text-zinc-500" aria-hidden="true" />
                  </a>
                </div>
              </footer>
            </div>
          )}
          </React.Suspense>
        </div>
      </div>

      </div>
      {timer.promptOpen && <TimerStartModal onDecide={decideTimer}/>}
      {/* Export / Import Modal for Individual Exam */}
      <React.Suspense fallback={<div className="fixed inset-0 bg-black/50 z-[100] grid place-items-center text-white" role="status">Abrindo painel…</div>}>
      {aiMode && isStorageReady && <AIImportModal key={scope+':'+(aiTargetId||'new')} initialMode={aiMode} purpose={aiTargetId?'attach':'create'} simulado={aiTargetProof} signedIn={Boolean(workspace.session)} onSignIn={workspace.signIn} onClose={() => {setAiMode(null);setAiTargetId(null);}}
        onCreate={handleAIReading}
        onKey={(result,file)=>handleAIReading(result,file,'key')} />}
      {simulado && (
        <ExportImportModal
          isOpen={modalState.isOpen}
          initialTab={modalState.tab}
          onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
          simulado={simulado}
          theme={theme}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
          onUpdateUserAnswers={(answers, newTotal, isExample) => {
            updateActiveSimulado(prev => applyAnswerImport(prev, 'user', answers, newTotal, isExample));
            setFilterMode('all');
            showToast('Respostas importadas com sucesso!');
          }}
          onUpdateKeyAnswers={(answers, newTotal, isExample) => {
            updateActiveSimulado(prev => applyAnswerImport(prev, 'key', answers, newTotal, isExample));
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
      />

      {/* Quick Presets Modal (Bank templates: ENEM, FGV, FCC, 30-100 questions) */}
      <QuickPresetsModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        onSelectPreset={handleSelectPreset}
      />

      {mapperProva && (
        <SubjectMapperModal
          isOpen={true}
          theme={theme}
          totalQuestions={mapperProva.totalQuestions}
          initialRanges={mapperProva.subjectRanges || []}
          onClose={() => setMapperProvaId(null)}
          onSave={handleSaveSubjectRanges}
        />
      )}

      {/* Rename Simulado Modal */}
      {renameModalProva && (
        <RenameSimuladoModal
          isOpen={true}
          currentTitle={renameModalProva.title}
          onClose={() => setRenameModalProva(null)}
          onRename={handleRenameProva}
        />
      )}

      {/* Full Backup & Restore Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        store={store}
        scope={scope}
        onRestoreBackup={handleRestoreBackup}
        onShowToast={showToast}
        initialTab={backupInitialTab}
      />
      </React.Suspense>

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

      {simulado && readerQuestionIndex !== null && <ExamReader key={scope + simulado.id} simulado={simulado} index={readerQuestionIndex} onNavigate={index => { setReaderQuestionIndex(index); setActiveQuestionIndex(index); }} onAnswer={handleSelectAnswer} onClose={() => setReaderQuestionIndex(null)}/>}

      {simulado && workspaceView === 'exam' && isStorageReady && <React.Suspense fallback={null}><FlashcardsReview key={scope + simulado.id} proof={simulado} signedIn={Boolean(workspace.session)} onSignIn={workspace.signIn} onMapSubjects={() => setMapperProvaId(simulado.id)} onSave={deck => {
        if (currentScope.current !== scope || currentProvaId.current !== simulado.id) return;
        updateActiveSimulado(previous => previous.id === simulado.id ? saveFlashcardReview(previous,deck) : previous);
      }}/></React.Suspense>}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1c2b45] dark:bg-[#22242a] text-white dark:text-zinc-100 text-xs sm:text-sm px-4 py-2.5 rounded-lg shadow-xl border border-white/20 dark:border-[#3b3e48] animate-fadeIn flex items-center gap-2 font-mono-code">
          <span>✓ {toastMessage}</span>
        </div>
      )}

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
        />
      )}
    </div>
  );
}
