import { ModalLayer } from './ModalLayer';
import { ConfirmDialog } from './ConfirmDialog';
import { MAX_IMPORT_BYTES } from '../utils/validation';
import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Upload,
  Database,
  X,
  Check,
  AlertTriangle,
  FileJson,
  Copy,
  FolderArchive,
  RefreshCw,
  Layers,
  ShieldCheck,
  HardDrive,
  History,
  Trash2,
  Plus,
  Info,
} from 'lucide-react';
import { MultiSimuladoStore, FullBackupData, SimuladoData, StorageSnapshot, StorageEstimateInfo } from '../types';
import { exportFullBackupFile, validateAndParseBackup } from '../utils/provasManager';
import { copyTextToClipboard, computeSimuladoStats, getPerformanceInfo } from '../utils/parser';
import {
  getStorageEstimateInfo,
  getSnapshotsFromIndexedDB,
  saveSnapshotToIndexedDB,
  deleteSnapshotFromIndexedDB,
  clearAllSnapshots,
  requestPersistentStorage,
} from '../utils/indexedDbStorage';

interface BackupModalProps {
  scope?: string;
  isOpen: boolean;
  onClose: () => void;
  store: MultiSimuladoStore;
  onRestoreBackup: (newProvas: SimuladoData[], mode: 'replace' | 'merge') => void;
  onShowToast: (msg: string) => void;
  initialTab?: 'export' | 'import' | 'storage';
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  store,
  onRestoreBackup,
  onShowToast,
  initialTab = 'export',
  scope = 'guest',
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'storage'>(initialTab);
  const [importText, setImportText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    error?: string;
    data?: FullBackupData;
    examCount?: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'replace' | 'clear' | null>(null);

  // Storage info & snapshots state
  const [storageInfo, setStorageInfo] = useState<StorageEstimateInfo | null>(null);
  const [snapshots, setSnapshots] = useState<StorageSnapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [isRequestingPersist, setIsRequestingPersist] = useState(false);
  const [confirmRestoreSnapshot, setConfirmRestoreSnapshot] = useState<StorageSnapshot | null>(null);

  // Sync tab when opened with specific initialTab
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
      setImportText(''); setFileName(null); setValidationResult(null); setConfirmAction(null); setConfirmRestoreSnapshot(null);
    }
  }, [isOpen, initialTab]);

  // Fetch storage stats and snapshots whenever modal is opened
  const refreshStorageData = async () => {
    setIsLoadingSnapshots(true);
    try {
      const [estimate, list] = await Promise.all([
        getStorageEstimateInfo(),
        getSnapshotsFromIndexedDB(scope),
      ]);
      setStorageInfo(estimate);
      setSnapshots(list);
    } catch (err) {
      console.warn('Erro ao atualizar dados de armazenamento:', err);
    } finally {
      setIsLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshStorageData();
    }
  }, [isOpen]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportFile = () => {
    exportFullBackupFile(store);
    onShowToast(
      `Backup de ${store.provas.length === 1 ? '1 prova' : `${store.provas.length} provas`} exportado com sucesso!`
    );
  };

  const handleCopyJSON = async () => {
    const backupData: FullBackupData = {
      app: 'gabarito-online',
      version: 3,
      exportedAt: new Date().toISOString(),
      activeId: store.activeId,
      provas: store.provas,
    };
    const success = await copyTextToClipboard(JSON.stringify(backupData, null, 2));
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onShowToast('JSON de backup copiado para a área de transferência!');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > MAX_IMPORT_BYTES) { setValidationResult({ valid: false, error: 'Selecione um backup de até 10 MB.' }); return; }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      setImportText(text);
      const res = validateAndParseBackup(text);
      setValidationResult(res);
    };
    reader.onerror = () => setValidationResult({ valid: false, error: 'Não foi possível ler o arquivo. Selecione-o novamente.' });
    reader.readAsText(file);
  };

  const handleTextChange = (text: string) => {
    setImportText(text);
    if (!text.trim()) {
      setValidationResult(null);
      return;
    }
    const res = validateAndParseBackup(text);
    setValidationResult(res);
  };

  const handleExecuteRestore = async (mode: 'replace' | 'merge') => {
    if (busy || !validationResult || !validationResult.valid || !validationResult.data) {
      return;
    }

    setBusy(true);
    // Safety snapshot before restore
    if (store.provas.length > 0) {
      const snapshot = await saveSnapshotToIndexedDB(store, 'Antes de Importar Backup', scope);
      if (!snapshot) { onShowToast('Não foi possível preservar as provas atuais. Exporte um backup antes de restaurar.'); setBusy(false); return; }
    }

    onRestoreBackup(validationResult.data.provas, mode);
    onShowToast(
      mode === 'replace'
        ? `Backup restaurado! ${validationResult.data.provas.length === 1 ? '1 prova carregada' : `${validationResult.data.provas.length} provas carregadas`}.`
        : `Provas mescladas com sucesso! Adicionadas ao seu catálogo.`
    );
    onClose();
    setBusy(false);
  };

  const handleCreateSnapshot = async () => {
    if (store.provas.length === 0) {
      onShowToast('Não há provas para salvar em ponto de restauração.');
      return;
    }
    const snap = await saveSnapshotToIndexedDB(store, 'Ponto Manual Criado', scope);
    if (snap) {
      onShowToast('Ponto de restauração salvo no banco IndexedDB!');
      refreshStorageData();
    } else {
      onShowToast('Não foi possível gravar o ponto de restauração.');
    }
  };

  const handleDeleteSnapshot = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await deleteSnapshotFromIndexedDB(id);
    if (ok) {
      setSnapshots(prev => prev.filter(s => s.id !== id));
      onShowToast('Ponto de restauração removido.');
    }
  };

  const handleClearSnapshots = async () => {
      const ok = await clearAllSnapshots(scope);
      if (!ok) { onShowToast('Não foi possível limpar o histórico.'); return; }
      setSnapshots([]);
      setConfirmAction(null);
      onShowToast('Histórico de pontos limpo.');
  };

  const handleApplySnapshot = async (snapshot: StorageSnapshot) => {
    if (!snapshot || !snapshot.data || !Array.isArray(snapshot.data.provas)) return;
    const before = await saveSnapshotToIndexedDB(store, 'Antes de restaurar um ponto', scope);
    if (!before) { onShowToast('Não foi possível preservar os dados atuais. Exporte um backup antes de restaurar.'); return; }
    onRestoreBackup(snapshot.data.provas, 'replace');
    onShowToast(`Ponto restaurado com sucesso (${snapshot.data.provas.length} provas)!`);
    setConfirmRestoreSnapshot(null);
    onClose();
  };

  const handleRequestBrowserPersistence = async () => {
    setIsRequestingPersist(true);
    try {
      const granted = await requestPersistentStorage();
      if (granted) {
        onShowToast('Armazenamento persistente autorizado pelo navegador. Mantenha também um backup.');
      } else {
        onShowToast('O navegador manteve o armazenamento padrão. Exporte backups regularmente.');
      }
      refreshStorageData();
    } catch {
      onShowToast('Não foi possível alterar permissão do navegador.');
    } finally {
      setIsRequestingPersist(false);
    }
  };

  return (
    <ModalLayer label="Backup e armazenamento" onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#fdfbf7] dark:bg-[#22242a] border-2 border-[#1c2b45] dark:border-[#3b3e48] text-slate-800 dark:text-zinc-100 rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="theme-solid dark:bg-[#18191d] text-white px-5 py-4 flex items-center justify-between border-b dark:border-[#3b3e48]">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-amber-300" />
            <h2 className="font-serif-title italic font-bold text-lg text-amber-50">
              Backup & Armazenamento Seguro
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

        {/* Tab Navigation */}
        <div className="flex border-b border-[#dedad0] dark:border-[#3b3e48] bg-[#f0eee6] dark:bg-[#18191d] text-xs font-mono-code overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('storage')}
            className={`flex-1 min-w-[150px] flex items-center justify-center gap-1.5 py-3 px-3 font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'storage'
                ? 'border-[#1c2b45] dark:border-zinc-400 text-[#1c2b45] dark:text-zinc-100 bg-[#fdfbf7] dark:bg-[#22242a] font-bold'
                : 'border-transparent text-[#5b6478] dark:text-zinc-400 hover:text-[#1c2b45] dark:hover:text-zinc-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>IndexedDB & Snapshots</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex-1 min-w-[150px] flex items-center justify-center gap-1.5 py-3 px-3 font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'export'
                ? 'border-[#1c2b45] dark:border-zinc-400 text-[#1c2b45] dark:text-zinc-100 bg-[#fdfbf7] dark:bg-[#22242a] font-bold'
                : 'border-transparent text-[#5b6478] dark:text-zinc-400 hover:text-[#1c2b45] dark:hover:text-zinc-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Exportar Arquivo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex-1 min-w-[150px] flex items-center justify-center gap-1.5 py-3 px-3 font-semibold border-b-2 transition cursor-pointer ${
              activeTab === 'import'
                ? 'border-[#1c2b45] dark:border-zinc-400 text-[#1c2b45] dark:text-zinc-100 bg-[#fdfbf7] dark:bg-[#22242a] font-bold'
                : 'border-transparent text-[#5b6478] dark:text-zinc-400 hover:text-[#1c2b45] dark:hover:text-zinc-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Importar Arquivo</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: STORAGE & SNAPSHOTS (NEW) */}
          {activeTab === 'storage' && (
            <div className="space-y-4">
              {/* Storage Health Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Engine Card */}
                <div className="p-3.5 bg-white border border-[#dedad0] rounded-xl shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono-code font-bold uppercase tracking-wider text-[#5b6478] flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#1c2b45]" />
                      Motor de Banco
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <Check className="w-3 h-3 text-emerald-700" />
                      IndexedDB Ativo
                    </span>
                  </div>
                  <p className="text-xs text-[#2e3a4e] leading-relaxed">
                    As provas são salvas no banco nativo do navegador e em um espelho local. O espaço disponível depende do dispositivo. Exporte um backup para ter uma cópia independente.
                  </p>
                </div>

                {/* Browser Persistence Card */}
                <div className="p-3.5 bg-white border border-[#dedad0] rounded-xl shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono-code font-bold uppercase tracking-wider text-[#5b6478] flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      Proteção Anti-Limpeza
                    </span>
                    {storageInfo?.isPersisted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <Check className="w-3 h-3 text-emerald-700" />
                        Persistência Concedida
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono-code font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Armazenamento padrão
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#2e3a4e] leading-relaxed">
                    {storageInfo?.isPersisted
                      ? 'A persistência reduz a remoção automática por falta de espaço. Limpar os dados do site manualmente ainda pode apagar suas provas.'
                      : 'Solicite armazenamento persistente para reduzir a remoção automática por falta de espaço. Isso não substitui um backup.'}
                  </p>
                  {!storageInfo?.isPersisted && (
                    <button
                      type="button"
                      disabled={isRequestingPersist}
                      onClick={handleRequestBrowserPersistence}
                      className="mt-1 w-full py-1.5 px-3 theme-solid hover:bg-[#132038] text-white rounded-lg text-xs font-mono-code font-semibold transition cursor-pointer"
                    >
                      {isRequestingPersist ? 'Solicitando...' : 'Solicitar armazenamento persistente'}
                    </button>
                  )}
                </div>
              </div>

              {/* Disk Quota bar */}
              {storageInfo && storageInfo.quotaBytes > 0 && (
                <div className="p-3 bg-[#f7f6f2] border border-[#dedad0] rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono-code text-[#1c2b45]">
                    <span className="font-semibold flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-[#5b6478]" />
                      Espaço Local Utilizado
                    </span>
                    <span className="text-[#5b6478]">
                      <b>{storageInfo.usageFormatted}</b> de {storageInfo.quotaFormatted} disponíveis
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#dedad0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(1, Math.min(100, storageInfo.percentUsed))}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Automatic Safety Snapshots / Restore Points */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-mono-code font-bold uppercase tracking-wider text-[#1c2b45] flex items-center gap-1.5">
                      <History className="w-4 h-4 text-[#1c2b45]" />
                      Pontos de Restauração Salvos ({snapshots.length})
                    </h3>
                    <p className="text-[11px] text-[#5b6478] mt-0.5">
                      Cópias de segurança gravadas automaticamente no IndexedDB antes de alterações e importações.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateSnapshot}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 theme-solid hover:bg-[#132038] text-white text-xs font-mono-code font-semibold rounded-lg shadow-2xs transition cursor-pointer shrink-0"
                    title="Salvar uma cópia de segurança agora"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-300" />
                    <span>Criar Ponto Agora</span>
                  </button>
                </div>

                {isLoadingSnapshots ? (
                  <div className="p-6 text-center text-xs font-mono-code text-[#5b6478]">
                    Carregando pontos de restauração do IndexedDB...
                  </div>
                ) : snapshots.length === 0 ? (
                  <div className="p-5 border border-dashed border-[#dedad0] rounded-xl bg-white text-center space-y-1.5">
                    <Info className="w-5 h-5 text-[#5b6478] mx-auto" />
                    <p className="text-xs font-mono-code text-[#1c2b45] font-semibold">
                      Nenhum ponto gravado ainda
                    </p>
                    <p className="text-[11px] text-[#5b6478]">
                      Clique no botão acima para criar o seu primeiro ponto de segurança instantâneo.
                    </p>
                  </div>
                ) : (
                  <div className="border border-[#dedad0] rounded-xl bg-white divide-y divide-[#dedad0]/60 max-h-56 overflow-y-auto text-xs font-mono-code">
                    {snapshots.map(snap => {
                      const dateObj = new Date(snap.timestamp);
                      const formattedDate = dateObj.toLocaleDateString('pt-BR');
                      const formattedTime = dateObj.toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      return (
                        <div
                          key={snap.id}
                          className="p-2.5 sm:p-3 flex items-center justify-between gap-3 hover:bg-[#f7f6f2] transition"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-[#1c2b45]">
                                {formattedDate} às {formattedTime}
                              </span>
                              <span className="px-1.5 py-0.5 bg-[#f0eee6] text-[#5b6478] rounded text-[10px] font-semibold border border-[#dedad0]">
                                {snap.reason}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#5b6478] mt-0.5">
                              {snap.examCount} {snap.examCount === 1 ? 'prova cadastrada' : 'provas cadastradas'}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setConfirmRestoreSnapshot(snap)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold rounded text-[11px] transition cursor-pointer"
                              title="Restaurar dados deste ponto"
                            >
                              Restaurar
                            </button>
                            <button
                              type="button"
                              onClick={e => handleDeleteSnapshot(snap.id, e)}
                              className="p-1 text-[#a63b2c] hover:bg-red-50 rounded transition cursor-pointer"
                              title="Excluir este ponto de restauração"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {snapshots.length > 0 && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setConfirmAction('clear')}
                      className="text-[11px] text-[#a63b2c] hover:underline font-mono-code cursor-pointer"
                    >
                      Limpar histórico de pontos
                    </button>
                  </div>
                )}
              </div>

              {/* Confirm snapshot restore dialog overlay */}
              {confirmRestoreSnapshot && (
                <div className="p-3.5 bg-amber-50 border-2 border-amber-400 rounded-xl space-y-2 animate-fadeIn">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-mono-code font-bold text-amber-950">
                        Confirmar Restauração do Ponto?
                      </div>
                      <p className="text-xs text-amber-900 mt-0.5">
                        Isso substituirá suas provas atuais pelo estado salvo em{' '}
                        <b>
                          {new Date(confirmRestoreSnapshot.timestamp).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(confirmRestoreSnapshot.timestamp).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </b>{' '}
                        ({confirmRestoreSnapshot.examCount} provas).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1 font-mono-code text-xs">
                    <button
                      type="button"
                      onClick={() => setConfirmRestoreSnapshot(null)}
                      className="px-3 py-1 bg-white border border-[#dedad0] text-[#1c2b45] font-semibold rounded hover:bg-[#f0eee6] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplySnapshot(confirmRestoreSnapshot)}
                      className="px-3 py-1 theme-solid font-semibold rounded cursor-pointer shadow-xs"
                    >
                      Sim, Restaurar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT (JSON FILE) */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-3.5 sm:p-4 bg-white border border-[#dedad0] rounded-xl shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-[#1c2b45] flex items-center gap-1.5">
                      <FolderArchive className="w-4 h-4 text-[#1c2b45]" />
                      <span>Arquivo de Backup Geral (.json)</span>
                    </h3>
                    <p className="text-xs text-[#5b6478] mt-1 leading-relaxed">
                      Gera um arquivo JSON contendo {store.provas.length === 1 ? 'a única prova cadastrada' : `todas as ${store.provas.length} provas cadastradas`},
                      incluindo suas respostas marcadas, gabaritos oficiais, tempos e correções. Perfeito para guardar no Google Drive ou transferir entre dispositivos.
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-[#f0eee6] font-mono-code font-bold text-[#1c2b45] border border-[#dedad0] shrink-0">
                    {store.provas.length === 1 ? '1 prova' : `${store.provas.length} provas`}
                  </span>
                </div>

                <div className="pt-3 border-t border-[#dedad0] flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleExportFile}
                    className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-4 py-2.5 theme-solid hover:bg-[#132038] text-white rounded-lg font-mono-code text-xs font-semibold shadow-sm transition break-all cursor-pointer"
                  >
                    <Upload className="w-4 h-4 shrink-0" />
                    <span className="truncate">Baixar gabarito-backup-{new Date().toISOString().split('T')[0]}.json</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyJSON}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#f0eee6] hover:bg-white text-[#1c2b45] border border-[#dedad0] rounded-lg font-mono-code text-xs font-semibold transition cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copiado!' : 'Copiar JSON'}</span>
                  </button>
                </div>
              </div>

              {/* List of included exams summary */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono-code font-semibold text-[#5b6478] uppercase tracking-wider">
                  Provas incluídas neste backup:
                </span>
                <div className="max-h-48 overflow-y-auto border border-[#dedad0] rounded-lg bg-[#f7f6f2] divide-y divide-[#dedad0]/60 text-xs font-mono-code">
                  {store.provas.map((p, idx) => {
                    const userFilled = p.userAnswers.filter(Boolean).length;
                    const pStats = p.isCorrected ? computeSimuladoStats(p) : null;
                    const perf = pStats ? getPerformanceInfo(pStats.hits, pStats.keyCount, p.examType, pStats.netScore) : null;
                    return (
                      <div key={p.id} className="p-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-[11px] text-[#5b6478] font-bold">#{idx + 1}</span>
                          <span className="font-semibold text-[#1c2b45] truncate">{p.title}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-[#5b6478] shrink-0">
                          <span>{userFilled}/{p.totalQuestions} resp.</span>
                          {p.isCorrected && perf && pStats && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${perf.badgeClass}`}>
                              Concluída · {pStats.hits}/{pStats.keyCount} ({pStats.percentageFormatted}%)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* File drop zone */}
              <div
                role="button"
                tabIndex={0}
                onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInputRef.current?.click(); } }}
                onClick={() => fileInputRef.current?.click()}
                className="p-5 border-2 border-dashed border-[#dedad0] hover:border-[#1c2b45] bg-[#f7f6f2] hover:bg-white rounded-xl cursor-pointer text-center transition group space-y-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <FileJson className="w-8 h-8 text-[#5b6478] group-hover:text-[#1c2b45] mx-auto transition" />
                <div className="text-xs font-mono-code text-[#1c2b45] font-semibold">
                  {fileName ? (
                    <span className="text-emerald-700">Arquivo selecionado: {fileName}</span>
                  ) : (
                    <span>Clique para selecionar o arquivo de backup (.json)</span>
                  )}
                </div>
                <div className="text-[11px] text-[#5b6478]">
                  Ou cole o conteúdo do arquivo JSON na caixa abaixo
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="block text-xs font-mono-code font-semibold text-[#1c2b45] uppercase tracking-wider mb-1.5">
                  Conteúdo JSON do Backup
                </label>
                <textarea
                  value={importText}
                  onChange={e => handleTextChange(e.target.value)}
                  rows={4}
                  placeholder='Cole aqui o JSON gerado anteriormente pelo "Exportar Backup"...'
                  className="w-full px-3 py-2 bg-white border border-[#dedad0] rounded-lg text-xs font-mono-code text-[#1c2b45] focus:outline-none focus:ring-2 focus:ring-[#1c2b45]"
                />
              </div>

              {/* Validation Feedback */}
              {validationResult && (
                <div>
                  {validationResult.valid && validationResult.data ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-emerald-800 font-mono-code text-xs font-bold">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>
                          Backup válido! {validationResult.data.provas.length === 1 ? '1 prova pronta para restaurar' : `${validationResult.data.provas.length} provas prontas para restaurar`}.
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-900 font-mono-code max-h-24 overflow-y-auto">
                        {validationResult.data.provas.map((p, i) => (
                          <div key={p.id || i}>
                            • <b>{p.title}</b> ({p.totalQuestions} questões)
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50 border border-red-300 rounded-lg flex items-center gap-2 text-xs font-mono-code text-red-800">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{validationResult.error || 'Arquivo de backup inválido.'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Restore Action Buttons */}
              {validationResult?.valid && (
                <div className="pt-2 border-t border-[#dedad0] space-y-2">
                  <div className="text-xs font-mono-code font-semibold text-[#1c2b45]">
                    Escolha como deseja restaurar:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleExecuteRestore('merge')}
                      disabled={busy}
                      className="p-3 text-left border-2 border-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/70 rounded-lg transition space-y-1 cursor-pointer"
                    >
                      <div className="font-bold text-xs font-mono-code text-emerald-900 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-emerald-700" />
                        <span>Mesclar com as Provas Atuais</span>
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-snug">
                        Mantém as provas que você já tem abertas e adiciona as provas do arquivo. Seguro e sem perdas!
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => store.provas.length ? setConfirmAction('replace') : handleExecuteRestore('replace')}
                      disabled={busy}
                      className="p-3 text-left border-2 border-[#a63b2c] bg-red-50/50 hover:bg-red-100/70 rounded-lg transition space-y-1 cursor-pointer"
                    >
                      <div className="font-bold text-xs font-mono-code text-[#a63b2c] flex items-center gap-1.5">
                        <RefreshCw className="w-4 h-4 text-[#a63b2c]" />
                        <span>Substituir Todas as Provas</span>
                      </div>
                      <p className="text-[11px] text-red-800 leading-snug">
                        Substitui o catálogo atual pelas provas do backup. (Um ponto de restauração prévio será salvo automaticamente).
                      </p>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#f0eee6] dark:bg-[#18191d] border-t border-[#dedad0] dark:border-[#3b3e48] px-5 py-3 flex items-center justify-between text-xs font-mono-code text-[#5b6478] dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>{storageInfo?.isIndexedDBAvailable ? 'Armazenamento local disponível' : 'Verifique o armazenamento do navegador'}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#dedad0] dark:bg-[#2c2f38] hover:bg-[#d0ccc2] dark:hover:bg-[#3b3e48] text-[#1c2b45] dark:text-zinc-200 font-semibold rounded transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
      {confirmAction && <ConfirmDialog isOpen title={confirmAction === 'clear' ? 'Limpar pontos de restauração?' : 'Substituir todas as provas?'} description={confirmAction === 'clear' ? 'Os pontos de restauração deste espaço serão removidos. As provas atuais serão mantidas.' : 'As provas atuais serão substituídas pelas do backup. Uma cópia do catálogo atual será preservada antes da restauração.'} confirmLabel={confirmAction === 'clear' ? 'Limpar histórico' : 'Substituir provas'} onCancel={() => setConfirmAction(null)} onConfirm={confirmAction === 'clear' ? handleClearSnapshots : () => handleExecuteRestore('replace')} />}
    </ModalLayer>
  );
};
