import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BookOpen, Sparkles } from 'lucide-react';
import type { SimuladoData, StudyFlashcard } from '../types';

interface Props {
  cards: StudyFlashcard[];
  proof: SimuladoData;
  index: number;
  flipped: boolean;
  onMove: (index: number) => void;
  onFlip: (flipped: boolean) => void;
  onReference: (index: number) => void;
}

export function FlashcardCarousel({ cards, proof, index, flipped, onMove, onFlip, onReference }: Props) {
  const reduced = useReducedMotion();
  const rail = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const target = useRef<number | null>(null);
  const fromScroll = useRef(false);
  const currentIndex = useRef(index);
  currentIndex.current = index;
  const center = (next: number) => {
    const item = items.current[next]; const container = rail.current;
    return item && container ? item.offsetLeft + item.clientWidth / 2 - container.clientWidth / 2 : 0;
  };
  useEffect(() => {
    if (fromScroll.current) { fromScroll.current = false; return; }
    const container = rail.current;
    if (!container?.scrollTo) return;
    const left = center(index);
    if (Math.abs(container.scrollLeft - left) < 2) { target.current = null; return; }
    target.current = index;
    container.scrollTo({ left, behavior: reduced ? 'instant' : 'smooth' });
  }, [index, reduced]);
  useEffect(() => {
    const container = rail.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      target.current = null;
      container.scrollTo({ left: center(currentIndex.current), behavior: 'instant' });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  const trackScroll = () => {
    const container = rail.current; if (!container) return;
    if (target.current !== null) {
      if (Math.abs(container.scrollLeft - center(target.current)) < 2) target.current = null;
      return;
    }
    let nearest = 0; let distance = Infinity;
    items.current.forEach((item, idx) => { if (item) { const delta = Math.abs(container.scrollLeft - center(idx)); if (delta < distance) { distance = delta; nearest = idx; } } });
    if (nearest !== currentIndex.current) { fromScroll.current = true; currentIndex.current = nearest; onMove(nearest); }
  };
  return <div className="flashcard-gallery">
    <div className="flashcard-ambient" aria-hidden="true"><i/><i/><i/></div>
    <div className="flashcard-rail" ref={rail} role="region" aria-label="Carrossel horizontal de flashcards" tabIndex={0}
      onPointerDown={()=>{target.current=null;}} onWheel={()=>{target.current=null;}}
      onScroll={event=>{if(event.target===event.currentTarget)trackScroll();}}
      onKeyDown={event=>{
        if (event.target !== event.currentTarget) return;
        const next = event.key === 'ArrowRight' ? Math.min(cards.length-1,index+1) : event.key === 'ArrowLeft' ? Math.max(0,index-1) : event.key === 'Home' ? 0 : event.key === 'End' ? cards.length-1 : null;
        if(next !== null){event.preventDefault();onMove(next);}
      }}>
      {cards.map((card, idx) => {
        const active = idx === index;
        const reinforcement = card.questionNumbers.every(number=>proof.userAnswers[number-1] === proof.keyAnswers[number-1]);
        return <div key={card.id} ref={element=>{items.current[idx]=element;}} className="flashcard-rail-item" data-active={active}>
          {active ? <motion.div className="flashcard-flipper" animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: reduced ? 0 : 0.6 }}>
            <article className="flashcard-face flashcard-front" aria-hidden={flipped} inert={flipped} tabIndex={flipped ? -1 : 0} aria-label="Pergunta do flashcard">
              <div className="flashcard-card-top"><div className="flashcard-category"><BookOpen size={15}/>{card.subject}</div><span className="flashcard-serial">{String(idx+1).padStart(2,'0')}</span></div>
              <span className="flashcard-result-tag">{reinforcement ? 'Reforço de acerto' : 'Revisão de erro'}</span>
              <span className="flashcard-topic">{card.topic}</span>
              {card.context && <div className="flashcard-context"><span>CONTEXTO DA REVISÃO</span><p>{card.context}</p></div>}
              <h3>{card.front}</h3>
              <div className="flashcard-origin"><span>Questão de origem</span>{card.questionNumbers.map(number=><button key={number} className="flashcard-source-button" aria-label={`Consultar questão ${number} de origem`} onClick={()=>onReference(number-1)}>Q{number}<BookOpen size={12}/></button>)}</div>
            </article>
            <article className="flashcard-face flashcard-answer" aria-hidden={!flipped} inert={!flipped}>
              <div className="flashcard-category"><Sparkles size={15}/>O CONCEITO PARA GUARDAR</div><h3>{card.topic}</h3><p className="flashcard-direct-answer">{card.back}</p>
              {card.explanation && <section className="flashcard-learning-section"><h4>Por que funciona</h4><p>{card.explanation}</p></section>}
              {card.example && <section className="flashcard-learning-section flashcard-example"><h4>Na prática</h4><p>{card.example}</p></section>}
              {card.pitfall && <section className="flashcard-learning-section"><h4>Atenção ao detalhe</h4><p>{card.pitfall}</p></section>}
              <button className="text-action" onClick={()=>onFlip(false)}>Ver pergunta novamente</button>
            </article>
          </motion.div> : <button className="flashcard-neighbor" aria-label={`Ir para cartão ${idx+1}: ${card.topic}`} onClick={()=>onMove(idx)}>
            <span className="flashcard-cover-corner">GP / ESTUDO ATIVO</span><span className="flashcard-neighbor-number">{String(idx+1).padStart(2,'0')}</span><span className="flashcard-cover-emblem"><Sparkles size={38}/></span><strong>{card.subject}</strong><span>{card.topic}</span><small>EXPLORAR CONCEITO →</small>
          </button>}
        </div>;
      })}
    </div>
    <p className="flashcard-scroll-hint">Deslize os cartões ou use a barra horizontal para explorar</p>
  </div>;
}
