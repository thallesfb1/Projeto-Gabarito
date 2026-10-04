import { useState } from 'react';
import { Bell, CheckCircle2, LoaderCircle, Sparkles, X } from 'lucide-react';
import { AICompletionNotice } from './AICompletionNotice';
import { isReadingJob, type AIReadingJob } from '../utils/aiJobs';
import { AIReadingProgress } from './AIReadingProgress';
import { prepareReadingSound, useReadingSound, setReadingSound } from '../utils/readingSound';

export function AIReadingPanel({ jobs, error, notice, dismissNotice, onReview, onRemove, onRefresh, onRetry }: {
  jobs: AIReadingJob[]; error: string; notice: AIReadingJob | null; dismissNotice: () => void;
  onReview: (job: AIReadingJob) => Promise<void>; onRemove: (job: AIReadingJob) => Promise<void>; onRefresh: () => void;
  onRetry: (job: AIReadingJob) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const sound = useReadingSound();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => typeof Notification !== 'undefined' && window.isSecureContext ? Notification.permission : 'unsupported');
  const act = async (job: AIReadingJob, action: () => Promise<void>) => {
    if (busy) return; void prepareReadingSound(); setBusy(job.id); setActionError('');
    try { await action(); } catch (cause) { setOpen(true); setActionError((cause as Error).message); }
    finally { setBusy(null); }
  };
  const enable = async () => {
    try { setPermission(await Notification.requestPermission()); } catch { setPermission('unsupported'); }
  };
  if (!jobs.length && !error) return null;
  const active = jobs.some(isReadingJob);
  return <>
    <aside className="ai-reading-panel" aria-label="Leituras em segundo plano">
      <button className="ai-reading-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)}>
        {active ? <LoaderCircle className="animate-spin" size={18}/> : <Sparkles size={18}/>}
        <span>{active ? 'IA lendo em segundo plano' : 'Suas leituras com IA'}</span><strong>{jobs.length}</strong>
      </button>
      {open && <div className="ai-reading-content">
        <header><strong>Leituras da sua conta</strong><button aria-label="Recolher leituras" onClick={() => setOpen(false)}><X size={18}/></button></header>
        <p className="ai-reading-help">Continue nas outras provas. Os resultados ficam salvos até você conferir ou dispensar.</p>
        <div className="ai-notification-option"><Bell size={16}/><span>{permission === 'granted' ? 'Avisos externos ativados.' : 'Avisaremos aqui quando a leitura terminar.'}</span>
          {permission === 'default' && <button className="text-action" onClick={() => void enable()}>Ativar notificações</button>}
          {permission === 'denied' && <small>Para receber avisos fora do site, permita notificações nas configurações do navegador.</small>}
          {permission === 'unsupported' && <small>Este navegador não oferece avisos externos. Você receberá o aviso no site.</small>}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sound} onChange={event => {setReadingSound(event.target.checked);}}/>Aviso sonoro ao concluir</label>
        {(error || actionError) && <div role="alert" className="ai-error"><p>{actionError || error}</p><button className="text-action" onClick={onRefresh}>Atualizar leituras</button></div>}
        <ul>{jobs.map(job => <li key={job.id}>
          <div className="ai-reading-file"><span>{isReadingJob(job) ? <LoaderCircle size={18} className="animate-spin"/> : job.status === 'ready' ? <CheckCircle2 size={18}/> : <X size={18}/>}</span><div><strong>{job.source.name}</strong><small>{job.target_snapshot?.title || 'Novo simulado'} · {job.mode === 'exam' ? 'Prova' : 'Gabarito'}</small></div></div>
          {isReadingJob(job) ? <AIReadingProgress job={job}/> : <p role="status">{job.status === 'ready' ? 'Pronto para conferir e importar.' : job.error || 'Não foi possível concluir a leitura.'}</p>}
          <div className="ai-reading-actions">{job.status === 'ready' && <button className="primary-action" disabled={Boolean(busy)} onClick={() => void act(job, () => onReview(job))}>{busy === job.id ? 'Abrindo…' : 'Conferir leitura'}</button>}
            {isReadingJob(job) && <button className="primary-action" disabled={Boolean(busy)} onClick={() => void act(job, () => onReview(job))}>Acompanhar leitura</button>}
            {job.status === 'failed' && <><button className="primary-action" disabled={Boolean(busy)} onClick={() => {void prepareReadingSound();void act(job, () => onRetry(job));}}>Tentar novamente</button><button className="text-action" disabled={Boolean(busy)} onClick={() => void act(job, () => onReview(job))}>Ver arquivo e leitura</button></>}
            <button className="text-action" disabled={Boolean(busy)} onClick={() => void act(job, () => onRemove(job))}>{isReadingJob(job) ? 'Cancelar leitura' : 'Dispensar leitura'}</button></div>
        </li>)}</ul>
      </div>}
    </aside>
    {notice?.status === 'ready' && <AICompletionNotice filename={notice.source.name} count={notice.question_count || notice.extraction?.totalQuestions || 0} onClose={dismissNotice} onReview={() => void act(notice, () => onReview(notice))}/>}
    {notice?.status === 'failed' && <aside className="ai-completion-notice" role="alert"><div><strong>A leitura não foi concluída</strong><p>{notice.source.name}</p><small>{notice.error}</small><button className="text-action" onClick={() => { setOpen(true); dismissNotice(); }}>Ver leituras</button></div><button aria-label="Fechar aviso de falha na leitura" onClick={dismissNotice}><X size={18}/></button></aside>}
  </>;
}
