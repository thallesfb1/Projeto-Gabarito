import type {SimuladoData} from '../types';

export function orderedProofs(provas:SimuladoData[]):SimuladoData[]{
  return [...provas].sort((a,b)=>(a.sortOrder??Infinity)-(b.sortOrder??Infinity));
}
export function moveProof(provas:SimuladoData[],id:string,targetId:string):SimuladoData[]{
  const ordered=orderedProofs(provas),from=ordered.findIndex(proof=>proof.id===id),to=ordered.findIndex(proof=>proof.id===targetId);
  if(from<0 || to<0 || from===to)return provas;
  const [moved]=ordered.splice(from,1);ordered.splice(to,0,moved);
  const now=new Date().toISOString();
  return ordered.map((proof,index)=>proof.sortOrder===index?proof:{...proof,sortOrder:index,updatedAt:now});
}
