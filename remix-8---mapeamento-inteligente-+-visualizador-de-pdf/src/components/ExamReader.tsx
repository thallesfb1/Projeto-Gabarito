import { useEffect, useId, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, FileText, X } from 'lucide-react';
import { AnswerOption, SimuladoData } from '../types';
import { ModalLayer } from './ModalLayer';
import { SourceDocuments } from './SourceDocuments';
import { DocumentPreview } from './DocumentPreview';

export function ExamReader({ simulado, index, onNavigate, onAnswer, onClose, readOnly = false }: { simulado: SimuladoData; index: number; onNavigate: (index:number)=>void; onAnswer:(index:number,answer:AnswerOption)=>void; onClose:()=>void; readOnly?: boolean }) {
  const [pdf, setPdf] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);
  const [mobilePane, setMobilePane] = useState<'question' | 'original'>('question');
  const [wide, setWide] = useState(() => window.matchMedia?.('(min-width: 1024px)').matches ?? false);
  const panelId = useId();
  useEffect(() => { if (showOriginal && !wide) document.getElementById(`${panelId}-${mobilePane}-tab`)?.focus(); }, [showOriginal, wide, mobilePane, panelId]);
  useEffect(() => {
    const query = window.matchMedia?.('(min-width: 1024px)');
    if (!query) return;
    const update = () => setWide(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(()=>{ if(!pdf){setUrl('');return;}const next=URL.createObjectURL(pdf);setUrl(next);return()=>URL.revokeObjectURL(next);},[pdf]);
  const question=simulado.extractedQuestions?.find(item=>item.number===index+1);
  const originals = (simulado.sourceDocuments || []).filter(doc => doc.kind === 'exam');
  return <ModalLayer label={`Questão ${index + 1} da prova`} onClose={onClose} className="question-overlay fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/55 backdrop-blur-md">
    <section className={`question-dialog exam-reader rounded-2xl border shadow-2xl w-full max-h-[92dvh] flex flex-col overflow-hidden ${showOriginal ? 'question-dialog-split' : ''}`}>
      <header className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b shrink-0"><div className="min-w-0"><p className="text-xs opacity-65 mb-1 break-words">{simulado.sourceFileName || simulado.title}</p><h2 className="font-bold text-lg">Questão {String(index + 1).padStart(2, '0')}</h2></div><button aria-label="Fechar questão" className="account-icon-button shrink-0" onClick={onClose}><X size={20}/></button></header>
      {showOriginal && !wide && <div className="question-reader-tabs" role="tablist" aria-label="Consulta da prova">
        {(['question', 'original'] as const).map(pane => <button key={pane} id={`${panelId}-${pane}-tab`} role="tab" aria-selected={mobilePane === pane} aria-controls={`${panelId}-${pane}`} tabIndex={mobilePane === pane ? 0 : -1} onClick={() => setMobilePane(pane)} onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 'question' : event.key === 'End' ? 'original' : mobilePane === 'question' ? 'original' : 'question'; setMobilePane(next); document.getElementById(`${panelId}-${next}-tab`)?.focus(); } }}>{pane === 'question' ? <BookOpen size={16}/> : <FileText size={16}/>} {pane === 'question' ? 'Questão' : 'PDF original'}</button>)}
      </div>}
      <div className="question-reader-workspace">
      <div id={`${panelId}-question`} className="question-reader-question p-4 sm:p-5 space-y-4" role={showOriginal && !wide ? 'tabpanel' : undefined} aria-labelledby={showOriginal && !wide ? `${panelId}-question-tab` : undefined} hidden={showOriginal && !wide && mobilePane !== 'question'}>
        {question ? <><p className="text-xs opacity-70">{question.subject || 'Disciplina não identificada'}{question.page ? ` · página ${question.page}`:''}</p><p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">{question.statement}</p><div className="space-y-2">{(simulado.examType==='true_false' ? [{label:'V' as const,text:'Certo'},{label:'F' as const,text:'Errado'}] : question.options).map(option=><button key={option.label} className={`reader-option w-full text-left flex gap-3 rounded-xl border p-3 ${simulado.userAnswers[index]===option.label?'ai-selected':''}`} disabled={readOnly || Boolean(simulado.isCorrected&&simulado.isLocked)} aria-pressed={simulado.userAnswers[index]===option.label} onClick={()=>onAnswer(index,option.label)}><strong>{option.label}</strong><span className="whitespace-pre-wrap text-sm">{option.text}</span></button>)}</div></> : <p className="text-sm">Esta questão não foi transcrita. Consulte o PDF original e marque a resposta no cartão.</p>}
        <button className="secondary-action" aria-expanded={showOriginal} aria-controls={`${panelId}-original`} onClick={()=>{setShowOriginal(show=>!show);setMobilePane('original');}}><FileText size={16}/>{showOriginal ? 'Ocultar arquivo original' : 'Ver arquivo original da prova'}</button>
      </div>
        {showOriginal && <aside id={`${panelId}-original`} className="question-reader-original p-4 sm:p-5 space-y-3" role={!wide ? 'tabpanel' : undefined} aria-label={wide ? 'Arquivo original da prova' : undefined} aria-labelledby={!wide ? `${panelId}-original-tab` : undefined} hidden={!wide && mobilePane !== 'original'}>
          <div className="question-original-heading"><div><h3><FileText size={17}/>Original da prova</h3><p>{wide ? 'Acompanhe o PDF enquanto lê o enunciado ao lado.' : 'Alterne para a aba Questão para voltar ao enunciado.'}</p></div><button className="account-icon-button" aria-label="Fechar painel do PDF" onClick={()=>{setShowOriginal(false);setMobilePane('question');}}><X size={18}/></button></div>
          {originals.length > 0 && <SourceDocuments documents={originals} initialPage={question?.page || 1} expanded autoOpen/>}
          <details open={!pdf && originals.length === 0 || undefined} className="border rounded-xl p-3"><summary className="text-sm font-semibold cursor-pointer">Abrir uma cópia deste dispositivo</summary><p className="text-xs opacity-70 my-3">Selecione o PDF para consultar figuras, tabelas e fórmulas.</p><input aria-label="Abrir PDF original da prova" type="file" accept="application/pdf" className="text-sm max-w-full" onChange={e=>{const file=e.target.files?.[0];if(file?.type==='application/pdf')setPdf(file);e.target.value='';}}/></details>
          {url && pdf && <div className="space-y-3"><p className="text-xs font-semibold break-words">{pdf.name}</p><DocumentPreview blob={pdf} url={url} name={pdf.name} mime="application/pdf" initialPage={question?.page || 1}/></div>}
        </aside>}
      </div>
      <footer className="flex items-center justify-between gap-2 p-4 border-t shrink-0"><button aria-label="Questão anterior do PDF" className="secondary-action" disabled={index===0} onClick={()=>onNavigate(index-1)}><ChevronLeft size={16}/>Anterior</button><span className="text-xs opacity-70">{index+1} de {simulado.totalQuestions}</span><button aria-label="Próxima questão do PDF" className="secondary-action" disabled={index>=simulado.totalQuestions-1} onClick={()=>onNavigate(index+1)}>Próxima<ChevronRight size={16}/></button></footer>
    </section>
  </ModalLayer>;
}
