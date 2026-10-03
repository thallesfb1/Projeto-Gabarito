import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, Layers, LoaderCircle, RotateCcw, Sparkles, X } from 'lucide-react';
import { ModalLayer } from './ModalLayer';
import { ExamReader } from './ExamReader';
import { FlashcardCarousel } from './FlashcardCarousel';
import type { FlashcardDeck, SimuladoData } from '../types';
import { compatibleFlashcardDeck, flashcardSourceKey, flashcardSources } from '../utils/flashcards';
import { generateFlashcardsWithAI } from '../utils/aiClient';

interface Props {
  proof: SimuladoData;
  signedIn: boolean;
  onSignIn: () => Promise<void>;
  onSave: (deck: FlashcardDeck) => void;
  onMapSubjects: () => void;
}

export function FlashcardsReview({ proof, signedIn, onSignIn, onSave, onMapSubjects }: Props) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [generated, setGenerated] = useState<FlashcardDeck>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [finished, setFinished] = useState(false);
  const [referenceQuestion, setReferenceQuestion] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);
  const ready = proof.isCorrected && !proof.isResultOutdated;
  const wrongCount = proof.userAnswers.filter((answer, idx) => idx < proof.totalQuestions && answer && proof.keyAnswers[idx] && answer !== proof.keyAnswers[idx]).length;
  const sources = flashcardSources(proof);
  const sourceKey = flashcardSourceKey(proof);
  const deck = compatibleFlashcardDeck(proof) || (ready && generated?.sourceKey === sourceKey ? generated : undefined);
  const card = deck?.cards[index];
  const legacyDeck = deck?.cards.some(item => !item.context || !item.explanation);
  useEffect(() => { abort.current?.abort(); setBusy(false); setGenerated(undefined); setStarted(false); setIndex(0); setFlipped(false); setFinished(false); setReferenceQuestion(null); setError(''); return () => abort.current?.abort(); }, [sourceKey, ready]);
  const close = () => { abort.current?.abort(); setOpen(false); setBusy(false); setReferenceQuestion(null); setError(''); };
  const create = async () => {
    if (busy || !ready || !sources.length || !signedIn) return;
    const controller = new AbortController(); abort.current = controller;
    setBusy(true); setError('');
    try {
      const cards = await generateFlashcardsWithAI(proof, controller.signal);
      if (controller.signal.aborted) return;
      const next = { sourceKey, createdAt: new Date().toISOString(), cards, masteredCardIds: [] };
      setGenerated(next); onSave(next); setStarted(false); setIndex(0); setFinished(false);
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Não foi possível criar os flashcards.'); }
    finally { if (abort.current === controller) setBusy(false); }
  };
  const move = useCallback((next: number) => { setIndex(next); setFlipped(false); }, []);
  const remember = (mastered: boolean) => {
    if (!deck || !card) return;
    const ids = new Set(deck.masteredCardIds); if (mastered) ids.add(card.id); else ids.delete(card.id);
    const next = { ...deck, masteredCardIds: [...ids] }; setGenerated(next); onSave(next);
    if (index + 1 >= deck.cards.length) setFinished(true); else move(index + 1);
  };
  const duration = reduced ? 0 : 0.55;
  return <>
    <motion.button className={`flashcards-launcher ${ready && sources.length ? 'flashcards-ready' : ''}`} aria-label="Flashcards de revisão" title={ready ? 'Revisar os conceitos desta prova' : 'Disponível após corrigir a prova'} onClick={() => { setOpen(true); setStarted(false); setFinished(false); move(0); }} initial={false} animate={ready && wrongCount && !reduced ? { scale: [1, 1.06, 1] } : { scale: 1 }} transition={{ duration: 0.8 }}>
      <Layers size={22}/><span>Flashcards<small>{ready ? wrongCount ? `${wrongCount} ${wrongCount === 1 ? 'erro para revisar' : 'erros para revisar'}` : 'Reforçar acertos' : 'Após a correção'}</small></span>{ready && wrongCount > 0 && <i/>}
    </motion.button>
    <AnimatePresence>{open && <ModalLayer label="Flashcards de revisão" onClose={close} className="flashcards-overlay">
      <motion.section className="flashcards-dialog" initial={{ opacity: 0, x: reduced ? 0 : 180, y: reduced ? 0 : 70, rotate: reduced ? 0 : 7, scale: reduced ? 1 : 0.9 }} animate={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }} exit={{ opacity: 0, y: reduced ? 0 : 30, scale: reduced ? 1 : 0.96 }} transition={{ duration, type: 'tween', ease: 'easeOut' }}>
        <header className="flashcards-header"><div><span className="flashcards-eyebrow"><Sparkles size={13}/>SEU PRÓXIMO ACERTO</span><h2>Flashcards de revisão</h2><p>{proof.title}</p></div><button className="account-icon-button" aria-label="Fechar flashcards" onClick={close}><X size={20}/></button></header>
        <div className="flashcards-content">
          {!ready ? <div className="flashcards-empty"><Layers size={38}/><h3>Primeiro, conclua sua prova</h3><p>Marque suas respostas, adicione o gabarito oficial e clique em “Corrigir Simulado”. Seus erros vão orientar esta revisão.</p></div>
          : !sources.length ? <div className="flashcards-empty"><BookOpen size={38}/><h3>Vamos dar contexto à sua revisão</h3><p>Importe os enunciados do PDF ou mapeie as disciplinas das questões corrigidas para criar uma revisão útil.</p><button className="primary-action" onClick={()=>{close();onMapSubjects();}}>Mapear disciplinas<ArrowRight size={16}/></button></div>
          : busy ? <div className="flashcards-generating" role="status"><div className="flashcards-mini-stack"><Layers size={40}/></div><LoaderCircle size={22} className="animate-spin"/><h3>Transformando erros em aprendizado</h3><p>A IA está identificando os temas e preparando até 10 cartões para você. Isso pode levar até dois minutos.</p><button className="secondary-action" onClick={()=>{abort.current?.abort();setBusy(false);}}>Cancelar geração</button></div>
          : !deck ? <div className="flashcards-empty"><div className="flashcards-mini-stack"><Sparkles size={36}/></div><h3>Uma revisão feita para esta prova</h3><p>{sources.some(source=>source.result==='wrong') ? 'Seus erros têm prioridade. Com poucos erros, alguns acertos complementam a revisão.' : 'Você acertou as questões com contexto. Vamos reforçar os conceitos para mantê-los na memória.'}</p><div className="flashcards-source-summary"><span>{sources.filter(s=>s.result==='wrong').length} erros com contexto</span><span>{new Set(sources.map(s=>s.subject || 'A categorizar')).size} disciplinas</span></div>{sources.length > 30 && <p className="flashcards-note">Esta rodada seleciona 30 erros distribuídos entre as disciplinas.</p>}
            {signedIn ? <button className="primary-action" onClick={()=>void create()}><Sparkles size={17}/>Gerar meus flashcards</button> : <><p className="flashcards-note">Entre com Google para gerar a revisão e salvá-la na sua conta.</p><button className="primary-action" onClick={()=>void onSignIn().catch(()=>setError('Não foi possível entrar. Tente novamente.'))}>Entrar com Google</button></>}
            <p className="flashcards-note">Os enunciados e as respostas selecionados serão enviados à IA do Google. Confira as explicações com seu material de estudo.</p>
          </div>
          : finished ? <div className="flashcards-empty"><Check size={38}/><h3>Mais clareza para a próxima prova</h3><p>Você percorreu {deck.cards.length} cartões. Marcou {deck.masteredCardIds.length} como “Já sei”; os demais ficam para revisar de novo.</p><button className="primary-action" onClick={()=>{setFinished(false);move(0);}}><RotateCcw size={16}/>Revisar novamente</button><button className="secondary-action" onClick={close}>Voltar à prova</button></div>
          : !started ? <div className="flashcards-intro">
            <div className="flashcards-stack"><div className="flashcard-shadow-card flashcard-shadow-one"/><div className="flashcard-shadow-card flashcard-shadow-two"/>
              <motion.div className="flashcard-cover" initial={{ rotateY: reduced ? 0 : -25, y: reduced ? 0 : 25 }} animate={{ rotateY: 0, y: 0 }} transition={{ duration, delay: reduced ? 0 : 0.12 }}><span className="flashcard-cover-corner">GP / ESTUDO ATIVO</span><div className="flashcard-cover-emblem"><Sparkles size={38}/></div><p>Explore o conceito.<br/><strong>Prepare seu próximo acerto.</strong></p><span className="flashcard-cover-bottom">{deck.cards.length} CARTÕES · SUA PRÓXIMA EVOLUÇÃO</span></motion.div>
            </div><p className="flashcards-note">Pense na resposta antes de virar cada cartão.</p><button className="primary-action" onClick={()=>setStarted(true)}>Começar revisão<ArrowRight size={17}/></button>
            {legacyDeck && signedIn && <div className="flashcards-upgrade"><button className="secondary-action" onClick={()=>void create()}><Sparkles size={16}/>Atualizar cartões com mais contexto</button><p className="flashcards-note">Gera uma nova rodada pela IA e reinicia o progresso destes cartões quando ela estiver pronta.</p></div>}
          </div>
          : card && <>
            <div className="flashcards-progress"><span>Cartão {index+1} de {deck.cards.length}</span><span>{deck.masteredCardIds.length} {deck.masteredCardIds.length===1?'fixado':'fixados'}</span><div><i style={{ width: `${(index+1)/deck.cards.length*100}%` }}/></div></div>
            <FlashcardCarousel cards={deck.cards} proof={proof} index={index} flipped={flipped} onMove={move} onFlip={setFlipped} onReference={setReferenceQuestion}/>
            <div className="flashcards-actions">{flipped ? <><button className="secondary-action" onClick={()=>remember(false)}><RotateCcw size={16}/>Revisar de novo</button><button className="primary-action" onClick={()=>remember(true)}><Check size={16}/>Já sei</button></> : <button className="primary-action" onClick={()=>setFlipped(true)}>Revelar resposta<RotateCcw size={16}/></button>}</div>
            <nav className="flashcards-navigation" aria-label="Navegação dos flashcards"><button className="account-icon-button" aria-label="Flashcard anterior" disabled={index===0} onClick={()=>move(index-1)}><ChevronLeft size={18}/></button><span>Revisão por IA · confira com seu material</span><button className="account-icon-button" aria-label="Próximo flashcard" disabled={index>=deck.cards.length-1} onClick={()=>move(index+1)}><ChevronRight size={18}/></button></nav>
          </>}
          {error && <p role="alert" className="ai-error p-3 rounded-xl text-sm mt-4">{error}</p>}
        </div>
      </motion.section>
    </ModalLayer>}</AnimatePresence>
    {open && referenceQuestion !== null && <div className="flashcards-reference"><ExamReader simulado={proof} index={referenceQuestion} onNavigate={setReferenceQuestion} onClose={()=>setReferenceQuestion(null)} onAnswer={()=>{}} readOnly/></div>}
  </>;
}
