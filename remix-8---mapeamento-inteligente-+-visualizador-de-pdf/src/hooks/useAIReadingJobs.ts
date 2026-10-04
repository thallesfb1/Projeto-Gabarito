import { useEffect, useRef, useState } from 'react';
import { cancelAIJob, completeAIJob, listAIJobs, submitAIJob, retryAIJob } from '../utils/aiJobClient';
import { isReadingJob, type AIReadingJob } from '../utils/aiJobs';
import type { ExtractionMode } from '../utils/aiExtraction';
import type { SimuladoData } from '../types';
import { notifyCompletedReading } from '../components/AICompletionNotice';

export function useAIReadingJobs(scope: string, enabled: boolean) {
  const [state, setState] = useState<{ scope: string; jobs: AIReadingJob[] }>({ scope, jobs: [] });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<AIReadingJob | null>(null);
  const current = useRef(scope); current.current = scope;
  const refreshRef = useRef<() => void>(() => {});
  const changes = useRef({ scope, added: new Map<string, AIReadingJob>(), removed: new Set<string>() });
  useEffect(() => {
    changes.current = { scope, added: new Map(), removed: new Set() };
    setState({ scope, jobs: [] }); setError(''); setNotice(null);
    if (!enabled || scope === 'guest') return;
    let disposed = false, busy = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const seen = new Set<string>();
    try { for (const id of JSON.parse(localStorage.getItem(`ai-reading-notified:${scope}`) || '[]')) seen.add(id); } catch { /* Notices still work in memory. */ }
    const refresh = async () => {
      if (disposed || busy) return;
      busy = true; clearTimeout(timer);
      let next = 5_000;
      try {
        const received = await listAIJobs(controller.signal);
        if (disposed) return;
        const local = changes.current;
        const jobs = received.filter(job => !local.removed.has(job.id)).map(job => {
          const added = local.added.get(job.id);
          if (added && added.started_at && (!job.started_at || new Date(job.started_at) < new Date(added.started_at))) return added;
          local.added.delete(job.id); return job;
        });
        for (const added of local.added.values()) if (!jobs.some(job => job.id === added.id)) jobs.push(added);
        setState({ scope, jobs }); setError('');
        for (const job of jobs) if ((job.status === 'ready' || job.status === 'failed') && !seen.has(`${job.id}:${job.status}:${job.started_at || job.created_at}`)) {
          seen.add(`${job.id}:${job.status}:${job.started_at || job.created_at}`); setNotice(job);
          if (job.status === 'ready') void notifyCompletedReading(job.id);
        }
        try { localStorage.setItem(`ai-reading-notified:${scope}`, JSON.stringify([...seen].slice(-100))); } catch { /* No effect on the saved result. */ }
        next = jobs.some(isReadingJob) ? 5_000 : 30_000;
      } catch (cause) { if (!disposed) setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar as leituras.'); next = 30_000; }
      finally { busy = false; if (!disposed) timer = setTimeout(() => void refresh(), next); }
    };
    refreshRef.current = () => void refresh();
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    void refresh();
    return () => { disposed = true; controller.abort(); clearTimeout(timer); window.removeEventListener('focus', onFocus); window.removeEventListener('online', onFocus); };
  }, [scope, enabled]);
  const addJob = (job: AIReadingJob, account: string) => {
    if (current.current !== account) return;
    changes.current.added.set(job.id, job);
    setState(previous => ({ scope: account, jobs: [job, ...(previous.scope === account ? previous.jobs.filter(item => item.id !== job.id) : [])] }));
    setNotice(previous => previous?.id === job.id ? null : previous);
    refreshRef.current();
  };
  const start = async (file: File, mode: ExtractionMode, target: SimuladoData | null, hint: string) => {
    const account = scope;
    const job = await submitAIJob(file, mode, target, hint);
    addJob(job, account);
    return job;
  };
  const retry = async (job: AIReadingJob) => { const next = await retryAIJob(job.id); addJob(next, scope); return next; };
  const remove = async (job: AIReadingJob, applied = false) => {
    if (applied) await completeAIJob(job.id); else await cancelAIJob(job.id);
    if (current.current !== scope) return;
    changes.current.added.delete(job.id); changes.current.removed.add(job.id);
    setState(previous => ({ ...previous, jobs: previous.jobs.filter(item => item.id !== job.id) }));
    setNotice(previous => previous?.id === job.id ? null : previous);
    refreshRef.current();
  };
  return { jobs: state.scope === scope ? state.jobs : [], error, notice: notice?.user_id === scope ? notice : null,
    dismissNotice: () => setNotice(null), refresh: () => refreshRef.current(), start, remove, retry };
}
