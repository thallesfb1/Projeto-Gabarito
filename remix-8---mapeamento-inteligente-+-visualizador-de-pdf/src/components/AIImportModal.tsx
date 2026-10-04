import { useEffect, useRef, useState } from 'react';
import { Bell, FileText, Image, Sparkles, X, LoaderCircle, FolderOpen, CheckCircle2, Cloud, Trash2 } from 'lucide-react';
import { ModalLayer } from './ModalLayer';
import { AIExtraction, ExtractionMode, validateAIFile, validateAIExtraction, answersFromExtraction, subjectRangesFromQuestions } from '../utils/aiExtraction';
import { extractWithAI } from '../utils/aiClient';
import { SimuladoData } from '../types';
import { GoogleIcon } from './GoogleIcon';
import { AICompletionNotice, notifyCompletedReading } from './AICompletionNotice';
import { DocumentPreview } from './DocumentPreview';
import { isReadingJob, type AIReadingJob } from '../utils/aiJobs';
import { AIReadingProgress, ReadingElapsedTime } from './AIReadingProgress';
import { prepareReadingSound, useReadingSound, setReadingSound } from '../utils/readingSound';

interface Props {
  initialMode: ExtractionMode;
  purpose?: 'create' | 'attach';
  signedIn?: boolean;
  onSignIn?: () => Promise<void>;
  simulado: SimuladoData | null;
  onClose: () => void;
  onCreate: (result: AIExtraction, file: File, mode: ExtractionMode) => Promise<void>;
  onKey: (result: AIExtraction, file: File) => Promise<void>;
  onStart?: (file: File, mode: ExtractionMode, versionHint: string) => Promise<void>;
  initialExtraction?: AIExtraction;
  initialFile?: File;
  initialJob?: AIReadingJob;
  proofs?: SimuladoData[];
  onDestinationChange?: (id: string | null) => void;
  onRetry?: () => Promise<void>;
  onCancel?: () => Promise<void>;
}
export function AIImportModal({ initialMode, purpose, simulado, onClose, onCreate, onKey, signedIn, onSignIn, onStart, initialExtraction, initialFile, initialJob, proofs = [], onDestinationChange, onRetry, onCancel }: Props) {
  const creating = purpose ? purpose === 'create' : !simulado;
  const [mode, setMode] = useState(initialMode);
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [previewURL, setPreviewURL] = useState('');
  const [result, setResult] = useState<AIExtraction | null>(initialExtraction || null);
  const [busy, setBusy] = useState<'extract' | 'apply' | null>(null);
  const [busyStartedAt, setBusyStartedAt] = useState('');
  const [error, setError] = useState('');
  const [failedReading, setFailedReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [reviewed, setReviewed] = useState(false);
  const [versionHint, setVersionHint] = useState('');
  const [completed, setCompleted] = useState<{ filename: string; count: number } | null>(null);
  const sound = useReadingSound();
  const tracking = Boolean(initialJob && isReadingJob(initialJob));
  useEffect(() => { if (initialExtraction) { setResult(initialExtraction); setReviewed(false); } }, [initialExtraction]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => typeof Notification !== 'undefined' && window.isSecureContext ? Notification.permission : 'unsupported');
  const enableNotifications = async () => {
    try { setNotificationPermission(await Notification.requestPermission()); }
    catch { setNotificationPermission('unsupported'); }
  };
  const controller = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; controller.current?.abort(); }; }, []);
  useEffect(() => {
    if (!file) { setPreviewURL(''); return; }
    const url = URL.createObjectURL(file); setPreviewURL(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const close = () => { if (busy === 'apply' || (onStart && busy)) return; controller.current?.abort(); onClose(); };
  const run = async (kind: 'extract' | 'apply', action: (signal: AbortSignal) => Promise<void>) => {
    if (busy) return;
    const abort = new AbortController(); controller.current = abort;
    setBusyStartedAt(new Date().toISOString());setBusy(kind); setError(''); setFailedReading(false);
    try { await action(abort.signal); }
    catch (cause) { if (alive.current) { setFailedReading(kind === 'extract' && !abort.signal.aborted && Boolean(file)); setError(abort.signal.aborted ? 'Leitura cancelada. Nenhuma prova foi alterada.' : cause instanceof Error ? cause.message : 'Não foi possível concluir a leitura. Isso pode acontecer temporariamente. Tente novamente.'); } }
    finally { if (alive.current) setBusy(null); }
  };
  const changeMode = (next: ExtractionMode) => { setCompleted(null); setMode(next); setFile(null); setResult(null); setReviewed(false); setError(''); setFailedReading(false); };
  const selectFile = (next?: File) => {
    setCompleted(null); setResult(null); setReviewed(false); setFile(null); setError(''); setFailedReading(false);
    if (!next) return;
    try { validateAIFile(next, mode); setFile(next); } catch(cause) { setError((cause as Error).message); }
  };
  const apply = () => run('apply', async () => {
    if (!result || !file || !reviewed) return;
    const validated = validateAIExtraction(result, mode);
    if (creating) await onCreate(validated, file, mode);
    else {
      if (!simulado) throw new Error('Esta prova não está mais disponível. Abra novamente a importação dentro da prova desejada.');
      if (validated.examType !== (simulado.examType || 'multiple_choice')) throw new Error('O tipo do arquivo é diferente do cartão selecionado.');
      if(mode==='exam') {
        if(validated.totalQuestions!==simulado.totalQuestions) throw new Error('O PDF tem um total de questões diferente deste cartão. Crie um novo simulado pela página inicial.');
        await onCreate(validated,file,mode);
      } else { answersFromExtraction(validated, simulado.totalQuestions); await onKey(validated, file); }
    }
    onClose();
  });
  return <ModalLayer label="Importar com IA" onClose={close} className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-5 bg-black/60 backdrop-blur-sm">
    <div data-reading-active={initialJob ? 'true' : undefined} data-reading-id={initialJob?.id} className="ai-modal w-full max-w-5xl max-h-[94dvh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b"><div className="flex items-center gap-3"><Sparkles className="w-6 h-6"/><div><h2 className="font-bold text-lg">Leitura de provas com IA</h2><p className="text-xs opacity-75">Envie o arquivo, continue no site e confira a leitura quando estiver pronta</p></div></div><button aria-label="Fechar leitura com IA" disabled={busy === 'apply' || Boolean(onStart && busy)} onClick={close}><X className="w-5 h-5"/></button></header>
      <div className="ai-scroll overflow-y-auto p-4 sm:p-5 space-y-5">
        {onDestinationChange && !initialJob && !result && <label className="block text-sm font-semibold">Onde importar?<select aria-label="Destino da importação" value={simulado?.id || ''} disabled={Boolean(busy)} onChange={event => onDestinationChange(event.target.value || null)} className="block w-full rounded-lg border p-2.5 mt-2"><option value="">Criar novo simulado</option>{proofs.map(proof => <option key={proof.id} value={proof.id}>{proof.title} · {proof.totalQuestions} questões</option>)}</select></label>}
        <div className="ai-destination" role="note"><strong>{creating?'Novo simulado':'Importar nesta prova'}</strong><p>{creating?'Esta importação cria um novo cartão-resposta. Suas provas salvas serão preservadas.':simulado?.title || 'A prova selecionada não está mais disponível.'}</p>{!creating&&simulado&&<small>{simulado.totalQuestions} questões · O PDF atualiza o nome, os enunciados e as disciplinas; o gabarito atualiza as respostas oficiais desta prova.</small>}</div>
        <div className="flex flex-wrap gap-2"><button className={`secondary-action ${mode === 'exam' ? 'ai-selected' : ''}`} disabled={Boolean(busy) || Boolean(initialJob) || Boolean(result)} aria-pressed={mode === 'exam'} onClick={()=>changeMode('exam')}><FileText className="w-4 h-4"/>Ler prova em PDF</button><button className={`secondary-action ${mode === 'key' ? 'ai-selected' : ''}`} disabled={Boolean(busy) || Boolean(initialJob) || Boolean(result)} aria-pressed={mode === 'key'} onClick={()=>changeMode('key')}><Image className="w-4 h-4"/>Ler gabarito em imagem ou PDF</button></div>
        {initialJob && !result && <section className="ai-warning rounded-xl p-4 space-y-3">
          <strong className="break-words">{file?.name || initialJob.source.name}</strong>
          {initialJob.status === 'ready' ? <><p role="status">Leitura concluída. Recuperando o resultado para conferência…</p><button className="secondary-action" onClick={onClose}>Conferir depois</button></> : tracking ? <><AIReadingProgress job={initialJob}/><p>Você pode acessar o restante do site enquanto lemos o arquivo. Para voltar a esta tela, abra Suas leituras com IA e selecione Acompanhar leitura.</p><div className="flex flex-wrap gap-2"><button className="primary-action" onClick={onClose}>Continuar pelo site</button>{onCancel && <button className="text-action" disabled={Boolean(busy)} onClick={() => void run('extract', onCancel)}>Cancelar leitura</button>}</div></> : <><p role="alert">{initialJob.error || 'A leitura não foi concluída.'}</p>{initialJob.status === 'failed' && onRetry && <button className="primary-action" disabled={Boolean(busy)} onClick={() => void run('extract', onRetry)}>Tentar novamente com este arquivo</button>}</>}
        </section>}
        {initialJob && !result && file && <details className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-semibold">Ver arquivo anexado</summary><div className="mt-3">{file.type === 'application/pdf' ? <DocumentPreview blob={file} url={previewURL} name={file.name} mime={file.type}/> : <img src={previewURL || undefined} alt="Arquivo anexado para leitura" className="w-full max-h-[400px] object-contain"/>}</div></details>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sound} onChange={event => {setReadingSound(event.target.checked);}}/>Aviso sonoro ao concluir fora desta leitura</label>
        {!result && !initialJob && <>
          {onSignIn && !signedIn && <div className="ai-warning rounded-xl p-4 space-y-3"><p className="text-sm">Entre na sua conta para ler arquivos com IA e salvar suas provas.</p><button className="google-button" disabled={Boolean(busy)} onClick={() => run('extract', async () => { await onSignIn(); })}><GoogleIcon />Entrar com Google</button></div>}
          {!creating && !simulado && <p className="ai-warning rounded-xl p-3 text-sm">Abra a prova desejada antes de iniciar a leitura.</p>}
          <div className="ai-upload-panel">
            <input ref={fileInput} id="ai-file" aria-label={mode === 'exam' ? 'Selecione a prova em PDF' : 'Selecione a imagem ou o PDF do gabarito oficial'} type="file" className="sr-only" disabled={Boolean(busy)} accept={mode === 'exam' ? 'application/pdf' : 'application/pdf,image/png,image/jpeg,image/webp'} onChange={e=>{selectFile(e.target.files?.[0]);e.target.value='';}} />
            <button type="button" className="ai-dropzone" data-dragging={dragging} data-selected={Boolean(file)} disabled={Boolean(busy)} onClick={()=>fileInput.current?.click()}
              onDragEnter={e=>{e.preventDefault();if(!busy){dragDepth.current++;setDragging(true);}}}
              onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect=busy?'none':'copy';}}
              onDragLeave={e=>{e.preventDefault();dragDepth.current=Math.max(0,dragDepth.current-1);if(!dragDepth.current)setDragging(false);}}
              onDrop={e=>{e.preventDefault();dragDepth.current=0;setDragging(false);if(busy)return;if(e.dataTransfer.files.length!==1){setError('Arraste apenas um arquivo por leitura.');return;}selectFile(e.dataTransfer.files[0]);}}>
              <span className="ai-drop-icon">{file ? <CheckCircle2 /> : mode==='exam'?<FileText />:<Image />}</span>
              <strong>{dragging?'Solte seu arquivo aqui':file?file.name:mode==='exam'?'Arraste sua prova em PDF':'Arraste a imagem do gabarito'}</strong>
              <span>{file? (file.size/1024/1024).toFixed(2)+' MB · pronto para leitura' : 'ou escolha um arquivo no seu dispositivo'}</span>
              <span className="ai-browse"><FolderOpen className="w-4 h-4"/>{file?'Trocar arquivo':'Selecionar arquivo'}</span>
              <small>{mode==='exam'?'PDF':'PNG, JPEG, WebP ou PDF'} · até 10 MB · até 200 questões</small>
            </button>
            {file && <div className="ai-file-summary"><span>{file.type.startsWith('image/')?<img src={previewURL || undefined} alt="Prévia do gabarito selecionado"/>:<FileText className="w-8 h-8"/>}<span><strong>{file.name}</strong><small>{creating?'Novo simulado após sua conferência.':'Arquivo para: '+(simulado?.title||'prova indisponível')}</small></span></span><button type="button" className="account-icon-button" disabled={Boolean(busy)} aria-label="Remover arquivo selecionado" onClick={()=>selectFile()}><Trash2 className="w-4 h-4"/></button></div>}
            <p className="ai-storage-note"><Cloud className="w-4 h-4"/><span>Ao solicitar a leitura, o original fica salvo de forma privada na sua conta e é enviado à IA. Suas respostas só mudam depois da sua conferência.</span></p>
          </div>
          {mode === 'key' && <label className="block text-sm font-semibold">Versão ou cor do caderno (opcional)<input value={versionHint} maxLength={160} disabled={Boolean(busy)} onChange={e=>setVersionHint(e.target.value)} placeholder="Ex.: caderno azul, prova tipo 1" className="block w-full rounded-lg border p-2.5 mt-2"/></label>}
          <div className="ai-notification-option"><Bell size={16}/><span>{notificationPermission === 'granted' ? 'Você também receberá um aviso se estiver em outra aba.' : 'Um aviso aparecerá aqui quando a leitura terminar.'}</span>{notificationPermission === 'default' && <button className="text-action" onClick={()=>void enableNotifications()}>Ativar aviso neste dispositivo</button>}{notificationPermission === 'denied' && <small>O navegador bloqueou avisos externos; o aviso no site continua ativo.</small>}</div>
          <button className="primary-action" disabled={Boolean(busy) || !file || (Boolean(onSignIn) && !signedIn) || (!creating && !simulado)} onClick={()=>{void prepareReadingSound();void run('extract',async signal=>{setCompleted(null);if(file && onStart){await onStart(file,mode,versionHint);return;}if(file){const extracted=await extractWithAI(file,mode,signal,versionHint);if(!signal.aborted && alive.current){setResult(extracted);setReviewed(false);setCompleted({filename:file.name,count:extracted.totalQuestions});notifyCompletedReading();}}});}}><Sparkles className="w-4 h-4"/>{failedReading ? 'Tentar novamente' : onStart ? 'Ler arquivo' : 'Extrair e conferir'}</button>
        </>}
        {busy && <div className="flex items-center gap-3 rounded-xl border p-4" role="status"><LoaderCircle className="w-5 h-5 animate-spin"/><span>{busy === 'extract' && onStart ? 'Enviando o arquivo com segurança. Assim que o envio terminar, você poderá continuar nas outras provas.' : busy === 'extract' ? 'Lendo o arquivo. PDFs maiores podem levar alguns minutos. Se houver demora ou falha temporária, tentaremos novamente automaticamente. Aguarde até cinco minutos…' : 'Preservando os dados e importando…'}</span>{busy !== 'apply' && !onStart && <button className="text-action ml-auto" onClick={()=>controller.current?.abort()}>Cancelar</button>}</div>}
        {busy && <ReadingElapsedTime startedAt={busyStartedAt}/>}
        {error && <p className="ai-error rounded-xl p-3 text-sm" role="alert">{error}</p>}
        {result && <>
          <div><h3 className="font-bold text-lg">Confira a leitura antes de importar</h3><p className="text-sm opacity-75">{result.totalQuestions} questões · {result.examType === 'true_false' ? 'Certo/Errado' : 'Múltipla escolha'}. A IA pode errar; compare com o arquivo original.</p></div>
          {result.warnings.length > 0 && <div className="ai-warning rounded-xl p-3 space-y-1" role="status">{result.warnings.map((warning,index)=><p className="text-sm" key={index}>{warning}</p>)}</div>}
          {(creating || mode === 'exam') && <label className="block text-sm font-semibold">{creating ? 'Título da nova prova' : 'Nome da prova identificado no PDF'}<input value={result.title} maxLength={180} disabled={Boolean(busy)} onChange={e=>setResult({...result,title:e.target.value})} className="block mt-2 w-full rounded-lg border p-2.5"/></label>}
          {mode==='exam' && <section className="ai-subject-summary"><h4>Disciplinas identificadas</h4>{subjectRangesFromQuestions(result.questions).map(range=><p key={range.id}><strong>{range.name}</strong><span>Questões {range.start}{range.end!==range.start?`–${range.end}`:''}</span></p>)}{result.questions.some(question=>!question.subject?.trim())&&<small>Algumas disciplinas precisam de identificação. Confira os campos de cada questão abaixo.</small>}</section>}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="ai-original rounded-xl border overflow-hidden"><h4 className="p-3 text-sm font-semibold border-b">Arquivo original</h4>{file?.type === 'application/pdf' ? <DocumentPreview blob={file} url={previewURL} name={file.name} mime={file.type}/> : <img src={previewURL || undefined} alt="Gabarito original para conferência" className="w-full max-h-[600px] object-contain"/>}</div>
          <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">{mode === 'exam' ? result.questions.map((question,index)=><details key={question.number} className="rounded-xl border p-3"><summary className="font-semibold cursor-pointer">Questão {question.number}{question.page ? ` · página ${question.page}` : ''}</summary><label className="block text-xs mt-3">Disciplina<input aria-label={`Disciplina da questão ${question.number}`} value={question.subject||''} maxLength={120} disabled={Boolean(busy)} onChange={e=>setResult({...result,questions:result.questions.map((item,i)=>i===index?{...item,subject:e.target.value}:item)})} className="block w-full rounded border p-2 mt-1 text-sm"/></label><label className="block text-xs mt-3">Enunciado<textarea aria-label={`Enunciado da questão ${question.number}`} rows={5} value={question.statement} disabled={Boolean(busy)} onChange={e=>setResult({...result,questions:result.questions.map((item,i)=>i===index?{...item,statement:e.target.value}:item)})} className="block w-full rounded border p-2 mt-1 text-sm"/></label>{question.options.map((option,optionIndex)=><label key={option.label} className="block text-xs mt-2">Alternativa {option.label}<textarea aria-label={`Questão ${question.number}, texto da alternativa ${option.label}`} rows={2} disabled={Boolean(busy)} value={option.text} onChange={e=>setResult({...result,questions:result.questions.map((item,i)=>i===index?{...item,options:item.options.map((opt,j)=>j===optionIndex?{...opt,text:e.target.value}:opt)}:item)})} className="block w-full rounded border p-2 mt-1 text-sm"/></label>)}</details>) : result.answers.map((item,index)=><label key={item.number} className="flex items-center justify-between gap-3 rounded-lg border p-2 text-sm"><span>Questão {String(item.number).padStart(2,'0')}</span><select aria-label={`Gabarito da questão ${item.number}`} value={item.answer||''} disabled={Boolean(busy)} className="rounded border p-2" onChange={e=>setResult({...result,answers:result.answers.map((answer,i)=>i===index?{...answer,answer:(e.target.value||null) as typeof answer.answer}:answer)})}><option value="">Em branco / ilegível</option>{(result.examType==='true_false'?['V','F']:['A','B','C','D','E']).map(answer=><option key={answer} value={answer}>{answer}</option>)}</select></label>)}</div>
          </div>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={reviewed} disabled={Boolean(busy)} onChange={e=>setReviewed(e.target.checked)}/><span>Conferi a leitura e a versão da prova com o arquivo original.</span></label>
          <div className="flex flex-wrap gap-2"><button className="primary-action" disabled={Boolean(busy)||!reviewed} onClick={apply}>{creating?(mode==='exam'?'Criar prova com os enunciados':'Criar simulado com este gabarito'):(mode==='exam'?'Adicionar PDF e disciplinas à prova':'Importar gabarito conferido')}</button><button className="secondary-action" disabled={Boolean(busy)} onClick={()=>{if(initialExtraction){onClose();return;}setResult(null);setReviewed(false);}}>{initialExtraction ? 'Conferir depois' : 'Escolher outro arquivo'}</button></div>
        </>}
      </div>
    </div>
    {completed && <AICompletionNotice {...completed} onClose={()=>setCompleted(null)}/>}
  </ModalLayer>;
}
