import {useEffect,useRef,useState} from 'react';
import type {SimuladoData} from '../types';

export function useExamTimer(proof:SimuladoData|null, scope:string, onUpdate:(updater:(previous:SimuladoData)=>SimuladoData)=>void) {
  const [runningId,setRunningId]=useState<string|null>(null);
  const [promptId,setPromptId]=useState<string|null>(null);
  const prompted=useRef<string|null>(null);
  const pending=useRef<string|null>(null);
  const latest=useRef({proof,scope,onUpdate});latest.current={proof,scope,onUpdate};
  const running=Boolean(proof && runningId===proof.id && !proof.isCorrected);
  useEffect(()=>{setRunningId(null);setPromptId(null);prompted.current=null;pending.current=null;},[proof?.id,scope]);
  useEffect(()=>{if(proof?.isCorrected){pending.current=null;setRunningId(null);setPromptId(null);}},[proof?.isCorrected]);
  useEffect(()=>{
    if(!running || !proof)return;
    const id=proof.id,account=scope;
    const interval=setInterval(()=>{
      const current=latest.current;
      if(current.scope!==account || current.proof?.id!==id || current.proof.isCorrected)return;
      current.onUpdate(previous=>previous.id===id && !previous.isCorrected?{...previous,timeSpentSeconds:previous.timeSpentSeconds+1}:previous);
    },1000);
    return()=>clearInterval(interval);
  },[running,proof?.id,scope]);
  const requestStart=()=>{
    if(!proof || proof.isCorrected || running || proof.timeSpentSeconds>0)return false;
    if(pending.current===proof.id)return true;
    if(prompted.current===proof.id)return false;
    if(proof.timerPrompted)return false;
    prompted.current=proof.id;pending.current=proof.id;setPromptId(proof.id);
    onUpdate(previous=>previous.id===proof.id?{...previous,timerPrompted:true}:previous);
    return true;
  };
  const decide=(start:boolean)=>{if(start && proof && promptId===proof.id && !proof.isCorrected)setRunningId(proof.id);pending.current=null;setPromptId(null);};
  const toggle=()=>{if(!proof || proof.isCorrected)return;pending.current=null;setPromptId(null);setRunningId(running?null:proof.id);onUpdate(previous=>({...previous,timerPrompted:true}));};
  const stop=()=>{pending.current=null;setRunningId(null);setPromptId(null);};
  return {running,promptOpen:Boolean(proof && promptId===proof.id),requestStart,decide,toggle,stop};
}
