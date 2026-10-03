import {motion,useReducedMotion} from 'motion/react';
import {Clock,Play,X} from 'lucide-react';
import {ModalLayer} from './ModalLayer';

export function TimerStartModal({onDecide}:{onDecide:(start:boolean)=>void}) {
  const reduced=useReducedMotion();
  return <ModalLayer label="Iniciar cronômetro da prova" onClose={()=>onDecide(false)} className="timer-prompt-overlay">
    <motion.section className="timer-prompt" initial={{opacity:0,x:reduced?0:180}} animate={{opacity:1,x:0}} transition={{duration:reduced?0:0.35,ease:'easeOut'}}>
      <button className="account-icon-button timer-prompt-close" aria-label="Fechar convite do cronômetro" onClick={()=>onDecide(false)}><X size={20}/></button>
      <span className="timer-prompt-emblem"><Clock size={27}/></span><h2>Começando sua prova?</h2>
      <p>Quer iniciar o cronômetro para acompanhar seu tempo? Ele para automaticamente ao corrigir o simulado.</p>
      <div className="timer-prompt-actions"><button className="secondary-action" onClick={()=>onDecide(false)}>Agora não</button><button className="primary-action" onClick={()=>onDecide(true)}><Play size={16}/>Sim, iniciar</button></div>
      <small>Você também pode iniciar pelo relógio no cabeçalho.</small>
    </motion.section>
  </ModalLayer>;
}
