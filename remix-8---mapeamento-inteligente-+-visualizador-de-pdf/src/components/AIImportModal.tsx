import { useEffect, useRef, useState } from 'react';
import { FileText, Image, Sparkles, X, LoaderCircle } from 'lucide-react';
import { ModalLayer } from './ModalLayer';
import { AIExtraction, ExtractionMode, validateAIFile, validateAIExtraction, answersFromExtraction } from '../utils/aiExtraction';
import { extractWithAI, listAIModels } from '../utils/aiClient';
import { SimuladoData } from '../types';

interface Props {
  initialMode: ExtractionMode;
  simulado: SimuladoData | null;
  onClose: () => void;
  onCreate: (result: AIExtraction, fileName: string) => Promise<void>;
  onKey: (result: AIExtraction) => Promise<void>;
}
export function AIImportModal({ initialMode, simulado, onClose, onCreate, onKey }: Props) {
  const [mode, setMode] = useState(initialMode);
  const [key, setKey] = useState('');
  const [models, setModels] = useState<{name:string;label:string}[]>([]);
  const [model, setModel] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState('');
  const [result, setResult] = useState<AIExtraction | null>(null);
  const [busy, setBusy] = useState<'models' | 'extract' | 'apply' | null>(null);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [versionHint, setVersionHint] = useState('');
  const controller = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; controller.current?.abort(); }; }, []);
  useEffect(() => {
    if (!file) { setPreviewURL(''); return; }
    const url = URL.createObjectURL(file); setPreviewURL(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const close = () => { if (busy === 'apply') return; controller.current?.abort(); setKey(''); onClose(); };
  const run = async (kind: 'models' | 'extract' | 'apply', action: (signal: AbortSignal) => Promise<void>) => {
    if (busy) return;
    const abort = new AbortController(); controller.current = abort;
    setBusy(kind); setError('');
    try { await action(abort.signal); }
    catch (cause) { if (alive.current) setError(abort.signal.aborted ? 'Leitura cancelada. Nenhuma prova foi alterada.' : cause instanceof Error ? cause.message : 'Não foi possível concluir a leitura.'); }
    finally { if (alive.current) setBusy(null); }
  };
  const changeMode = (next: ExtractionMode) => { setMode(next); setFile(null); setResult(null); setReviewed(false); setError(''); };
  const selectFile = (next?: File) => {
    setResult(null); setReviewed(false); setFile(null); setError('');
    if (!next) return;
    try { validateAIFile(next, mode); setFile(next); } catch(cause) { setError((cause as Error).message); }
  };
  const apply = () => run('apply', async () => {
    if (!result || !file || !reviewed) return;
    const validated = validateAIExtraction(result, mode);
    if (mode === 'exam') await onCreate(validated, file.name);
    else {
      if (!simulado) throw new Error('Crie ou selecione uma prova antes de importar o gabarito.');
      if (validated.examType !== (simulado.examType || 'multiple_choice')) throw new Error('O tipo do gabarito é diferente do cartão selecionado.');
      answersFromExtraction(validated, simulado.totalQuestions);
      await onKey(validated);
    }
    setKey('');
    onClose();
  });
  return <ModalLayer label="Importar com IA" onClose={close} className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-5 bg-black/60 backdrop-blur-sm">
    <div className="ai-modal w-full max-w-5xl max-h-[94dvh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b"><div className="flex items-center gap-3"><Sparkles className="w-6 h-6"/><div><h2 className="font-bold text-lg">Leitura de provas com IA</h2><p className="text-xs opacity-75">PDFs e gabaritos em imagem · Google Gemini</p></div></div><button aria-label="Fechar leitura com IA" disabled={busy === 'apply'} onClick={close}><X className="w-5 h-5"/></button></header>
      <div className="ai-scroll overflow-y-auto p-4 sm:p-5 space-y-5">
        <div className="flex flex-wrap gap-2"><button className={`secondary-action ${mode === 'exam' ? 'ai-selected' : ''}`} disabled={Boolean(busy)} aria-pressed={mode === 'exam'} onClick={()=>changeMode('exam')}><FileText className="w-4 h-4"/>Ler prova em PDF</button><button className={`secondary-action ${mode === 'key' ? 'ai-selected' : ''}`} disabled={Boolean(busy)} aria-pressed={mode === 'key'} onClick={()=>changeMode('key')}><Image className="w-4 h-4"/>Ler gabarito em imagem</button></div>
        {!result && <>
          <div className="ai-settings grid sm:grid-cols-2 gap-4 rounded-xl border p-4">
            <div><label htmlFor="ai-key" className="block text-sm font-semibold mb-2">Sua chave do Google AI Studio</label><input id="ai-key" type="password" autoComplete="off" spellCheck={false} value={key} disabled={Boolean(busy)} onChange={e=>{setKey(e.target.value);setModels([]);setModel('');}} className="w-full rounded-lg border p-2.5" placeholder="Cole a chave ou use a configurada no servidor"/><p className="text-xs opacity-70 mt-2">A chave fica apenas nesta tela e é descartada ao fechar. <a href="https://aistudio.google.com/api-keys" target="_blank" rel="noreferrer" className="underline">Obter chave</a>. Sem chave pessoal, o servidor exige login.</p></div>
            <div><label htmlFor="ai-model" className="block text-sm font-semibold mb-2">Modelo Gemini disponível</label><div className="flex gap-2"><select id="ai-model" disabled={Boolean(busy) || !models.length} value={model} onChange={e=>setModel(e.target.value)} className="min-w-0 flex-1 rounded-lg border p-2"><option value="">Carregue os modelos</option>{models.map(item=><option key={item.name} value={item.name}>{item.label}</option>)}</select><button className="secondary-action" disabled={Boolean(busy)} onClick={()=>run('models',async signal=>{const list=await listAIModels(key,signal);if(!signal.aborted){setModels(list);setModel(list[0].name);}})}>{busy === 'models' ? 'Verificando…' : 'Verificar chave'}</button></div><p className="text-xs opacity-70 mt-2">A lista é consultada no Google usando a sua chave.</p></div>
          </div>
          <div className="rounded-xl border border-dashed p-5 space-y-3"><label htmlFor="ai-file" className="block font-semibold">{mode === 'exam' ? 'Selecione a prova em PDF' : 'Selecione a imagem ou o PDF do gabarito oficial'}</label><input id="ai-file" type="file" disabled={Boolean(busy)} accept={mode === 'exam' ? 'application/pdf' : 'application/pdf,image/png,image/jpeg,image/webp'} onChange={e=>{selectFile(e.target.files?.[0]);e.target.value='';}} className="block max-w-full text-sm"/><p className="text-xs opacity-70">Até 10 MB e 200 questões. {mode === 'exam' ? 'A leitura cria uma nova prova com os enunciados; suas provas atuais são preservadas.' : `Destino: ${simulado?.title || 'nenhuma prova selecionada'}. O gabarito será conferido antes de substituir o atual.`}</p>{file && <p className="text-sm font-semibold">{file.name} · {(file.size /1024/1024).toFixed(2)} MB</p>}</div>
          {mode === 'key' && <label className="block text-sm font-semibold">Versão ou cor do caderno (opcional)<input value={versionHint} maxLength={160} disabled={Boolean(busy)} onChange={e=>setVersionHint(e.target.value)} placeholder="Ex.: caderno azul, prova tipo 1" className="block w-full rounded-lg border p-2.5 mt-2"/></label>}
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} disabled={Boolean(busy)} onChange={e=>setConsent(e.target.checked)} className="mt-1"/><span>Enviar este arquivo ao Google Gemini para leitura. O uso consome a cota da chave selecionada e pode gerar cobrança conforme o plano do Google. Os arquivos não são guardados pelo servidor da aplicação.</span></label>
          <button className="primary-action" disabled={Boolean(busy) || !file || !model || !consent || (mode === 'key' && !simulado)} onClick={()=>run('extract',async signal=>{if(file){const extracted=await extractWithAI(file,mode,key,model,signal,versionHint);if(!signal.aborted){setResult(extracted);setReviewed(false);}}})}><Sparkles className="w-4 h-4"/>Extrair e conferir</button>
        </>}
        {busy && <div className="flex items-center gap-3 rounded-xl border p-4" role="status"><LoaderCircle className="w-5 h-5 animate-spin"/><span>{busy === 'extract' ? 'Lendo o arquivo. Isso pode levar até dois minutos…' : busy === 'apply' ? 'Preservando os dados e importando…' : 'Verificando a chave e os modelos…'}</span>{busy !== 'apply' && <button className="text-action ml-auto" onClick={()=>controller.current?.abort()}>Cancelar</button>}</div>}
        {error && <p className="ai-error rounded-xl p-3 text-sm" role="alert">{error}</p>}
        {result && <>
          <div><h3 className="font-bold text-lg">Confira a leitura antes de importar</h3><p className="text-sm opacity-75">{result.totalQuestions} questões · {result.examType === 'true_false' ? 'Certo/Errado' : 'Múltipla escolha'}. A IA pode errar; compare com o arquivo original.</p></div>
          {result.warnings.length > 0 && <div className="ai-warning rounded-xl p-3 space-y-1" role="status">{result.warnings.map((warning,index)=><p className="text-sm" key={index}>{warning}</p>)}</div>}
          {mode === 'exam' && <label className="block text-sm font-semibold">Título da nova prova<input value={result.title} maxLength={180} disabled={Boolean(busy)} onChange={e=>setResult({...result,title:e.target.value})} className="block mt-2 w-full rounded-lg border p-2.5"/></label>}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="ai-original rounded-xl border overflow-hidden"><h4 className="p-3 text-sm font-semibold border-b">Arquivo original</h4>{file?.type === 'application/pdf' ? <iframe title="PDF original para conferência" src={previewURL} className="w-full h-[420px]" sandbox="allow-same-origin"/> : <img src={previewURL} alt="Gabarito original para conferência" className="w-full max-h-[600px] object-contain"/>}</div>
            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">{mode === 'exam' ? result.questions.map((question,index)=><details key={question.number} className="rounded-xl border p-3" open={index===0}><summary className="font-semibold cursor-pointer">Questão {question.number}{question.page ? ` · página ${question.page}` : ''}</summary><label className="block text-xs mt-3">Enunciado<textarea aria-label={`Enunciado da questão ${question.number}`} rows={5} value={question.statement} disabled={Boolean(busy)} onChange={e=>setResult({...result,questions:result.questions.map((item,i)=>i===index?{...item,statement:e.target.value}:item)})} className="block w-full rounded border p-2 mt-1 text-sm"/></label>{question.options.map((option,optionIndex)=><label key={option.label} className="block text-xs mt-2">Alternativa {option.label}<textarea aria-label={`Questão ${question.number}, texto da alternativa ${option.label}`} rows={2} disabled={Boolean(busy)} value={option.text} onChange={e=>setResult({...result,questions:result.questions.map((item,i)=>i===index?{...item,options:item.options.map((opt,j)=>j===optionIndex?{...opt,text:e.target.value}:opt)}:item)})} className="block w-full rounded border p-2 mt-1 text-sm"/></label>)}</details>) : result.answers.map((item,index)=><label key={item.number} className="flex items-center justify-between gap-3 rounded-lg border p-2 text-sm"><span>Questão {String(item.number).padStart(2,'0')}</span><select aria-label={`Gabarito da questão ${item.number}`} value={item.answer||''} disabled={Boolean(busy)} className="rounded border p-2" onChange={e=>setResult({...result,answers:result.answers.map((answer,i)=>i===index?{...answer,answer:(e.target.value||null) as typeof answer.answer}:answer)})}><option value="">Em branco / ilegível</option>{(result.examType==='true_false'?['V','F']:['A','B','C','D','E']).map(answer=><option key={answer} value={answer}>{answer}</option>)}</select></label>)}</div>
          </div>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={reviewed} disabled={Boolean(busy)} onChange={e=>setReviewed(e.target.checked)}/><span>Conferi a leitura e a versão da prova com o arquivo original.</span></label>
          <div className="flex flex-wrap gap-2"><button className="primary-action" disabled={Boolean(busy)||!reviewed} onClick={apply}>{mode==='exam'?'Criar prova com os enunciados':'Importar gabarito conferido'}</button><button className="secondary-action" disabled={Boolean(busy)} onClick={()=>{setResult(null);setReviewed(false);}}>Escolher outro arquivo</button></div>
        </>}
      </div>
    </div>
  </ModalLayer>;
}
