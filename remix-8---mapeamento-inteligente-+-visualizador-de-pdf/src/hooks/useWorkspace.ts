import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { MultiSimuladoStore } from '../types';
import { loadMultiSimuladoStore, saveMultiSimuladoStore, syncStoreWithIndexedDB, duplicateSimulado } from '../utils/provasManager';
import { saveSnapshotToIndexedDB, loadStoreFromIndexedDB } from '../utils/indexedDbStorage';
import { supabase } from '../utils/supabase';
import { CloudBaseline, readCloud, reconcileCloud, writeCloud } from '../utils/cloudSync';

const empty: MultiSimuladoStore = { version: 3, activeId: '', provas: [] };
export function useWorkspace() {
  const [store, setStore] = useState<MultiSimuladoStore>(empty);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabase);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error'>('saving');
  const [cloudStatus, setCloudStatus] = useState<'local' | 'loading' | 'synced' | 'error'>('local');
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const latest = useRef(store);
  latest.current = store;
  const baseline = useRef<CloudBaseline>({});
  const queue = useRef<Promise<void>>(Promise.resolve());
  const generation = useRef(0);
  const scope = session?.user.id || 'guest';
  const workspaceKey = `${scope}:${reload}`;
  const isStorageReady = authReady && hydratedKey === workspaceKey;
  const cloudLoaded = useRef(false);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, current) => {
      setSession(current);
      setAuthReady(true);
    });
    supabase.auth.getSession().then(({ error: authError }) => {
      if (authError) { setError('Não foi possível verificar a sessão. Você pode continuar localmente.'); setAuthReady(true); }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const checkpoint = useCallback((records: CloudBaseline, account: string) => {
    try { localStorage.setItem(`gabarito-cloud-baseline:${account}`, JSON.stringify(records)); } catch { /* Local proofs also use IndexedDB. */ }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const version = ++generation.current;
    setHydratedKey(null);
    cloudLoaded.current = false;
    setError('');
    setCloudStatus(session ? 'loading' : 'local');
    (async () => {
      await queue.current.catch(() => {});
      const local = (await syncStoreWithIndexedDB(loadMultiSimuladoStore(scope), scope)).store;
      let restored = local;
      let previous: CloudBaseline = {};
      const cachedDatabase = await loadStoreFromIndexedDB(scope);
      try {
        const cachedMirror = JSON.parse(localStorage.getItem(`gabarito-multi-v1:${scope}`) || 'null');
        // A missing cache means recovery, never a request to delete cloud proofs.
        if (cachedDatabase || Array.isArray(cachedMirror?.provas)) previous = JSON.parse(localStorage.getItem(`gabarito-cloud-baseline:${scope}`) || '{}');
      } catch { /* Start with no cloud checkpoint. */ }
      if (supabase && scope !== 'guest') {
        try {
          const remote = await readCloud(supabase, scope);
          restored = reconcileCloud(local, previous, remote);
          if (version !== generation.current) return;
          baseline.current = remote;
          await saveMultiSimuladoStore(restored, undefined, scope);
          checkpoint(remote, scope);
          cloudLoaded.current = true;
          setCloudStatus('synced');
        } catch {
          if (version !== generation.current) return;
          setCloudStatus('error');
          setError('Não foi possível recuperar as provas da conta. Seus dados locais foram preservados. Verifique a conexão e tente sincronizar novamente.');
        }
      }
      if (version !== generation.current) return;
      setStore(restored);
      setHydratedKey(workspaceKey);
    })();
    return () => { generation.current += 1; };
  }, [authReady, scope, reload, checkpoint, workspaceKey]);

  useEffect(() => {
    if (!isStorageReady) return;
    let active = true;
    setSaveStatus('saving');
    // Persist immediately: even a tab switch must not cancel the last edit.
    void saveMultiSimuladoStore(store, undefined, scope).then(saved => {
      if (active) setSaveStatus(saved ? 'saved' : 'error');
    });
    if (supabase && session && cloudLoaded.current) {
      setCloudStatus('loading');
      const version = generation.current;
      const timer = setTimeout(() => {
        const client = supabase;
        queue.current = queue.current.catch(() => {}).then(async () => {
          if (!client || version !== generation.current) return;
          await writeCloud(client, scope, store, baseline.current, records => checkpoint(records, scope));
          if (version === generation.current) { setCloudStatus('synced'); setError(''); }
        }).catch(() => {
          if (version === generation.current) {
            setCloudStatus('error');
            setError('Alterações salvas neste navegador, mas a conta ainda não foi atualizada. Tente sincronizar novamente.');
          }
        });
      }, 1200);
      return () => { active = false; clearTimeout(timer); };
    }
    return () => { active = false; };
  }, [store, isStorageReady, scope, session?.user.id, checkpoint]);

  useEffect(() => {
    if (!isStorageReady) return;
    const flush = () => { void saveMultiSimuladoStore(latest.current, undefined, scope); };
    const timer = setInterval(() => {
      if (latest.current.provas.length) void saveSnapshotToIndexedDB(latest.current, 'Ponto Automático', scope);
    }, 10 * 60 * 1000);
    const onHidden = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onHidden);
    return () => { clearInterval(timer); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', onHidden); };
  }, [isStorageReady, scope]);

  const signIn = async () => {
    if (!supabase) { setError('Login disponível na versão web com Supabase configurado.'); return; }
    setError('');
    const saved = await saveMultiSimuladoStore(latest.current, undefined, scope);
    if (!saved) { setError('Exporte um backup antes de entrar: não foi possível salvar as provas locais.'); return; }
    const { error: loginError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}${window.location.pathname}`, queryParams: { prompt: 'select_account' } } });
    if (loginError) setError('Não foi possível iniciar o login Google. Verifique a configuração do provedor no Supabase.');
  };
  const signOut = async () => {
    if (!supabase) return;
    await saveMultiSimuladoStore(latest.current, undefined, scope);
    if (cloudLoaded.current) {
      try {
        await queue.current;
        await writeCloud(supabase, scope, latest.current, baseline.current, records => checkpoint(records, scope));
      } catch {
        setError('Ainda há alterações pendentes. Sincronize ou exporte um backup antes de sair.');
        return;
      }
    }
    const { error: logoutError } = await supabase.auth.signOut({ scope: 'local' });
    if (logoutError) setError('Não foi possível sair da conta. Tente novamente.');
  };
  const importGuest = async () => {
    const version = generation.current;
    const before = latest.current;
    const guest = (await syncStoreWithIndexedDB(loadMultiSimuladoStore())).store;
    if (version !== generation.current) throw new Error('A conta mudou durante a importação. Tente novamente na conta desejada.');
    if (!guest.provas.length) throw new Error('Não há provas locais para importar. Você também pode restaurar um arquivo de backup.');
    const snapshot = await saveSnapshotToIndexedDB(before, 'Antes de importar provas locais', scope);
    if (!snapshot) throw new Error('Não foi possível criar uma cópia de segurança. Exporte um backup antes de importar.');
    if (version !== generation.current) throw new Error('A conta mudou durante a importação. Tente novamente na conta desejada.');
    setStore(current => {
      const copies = guest.provas.map(prova => ({ ...duplicateSimulado(prova), title: prova.title }));
      return { ...current, activeId: current.activeId || copies[0].id, provas: [...current.provas, ...copies] };
    });
  };
  const retry = async () => {
    await saveMultiSimuladoStore(latest.current, undefined, scope);
    await queue.current.catch(() => {});
    setReload(value => value + 1);
  };
  return { store, setStore, session, scope, isStorageReady, saveStatus, cloudStatus, error, signIn, signOut, importGuest, retry, configured: Boolean(supabase) };
}
