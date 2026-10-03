import {describe,expect,it} from 'vitest';
import {moveProof,orderedProofs} from './proofOrder';
import {createNewSimulado,sanitizeSimulado} from './provasManager';
import {reconcileCloud} from './cloudSync';
const proofs=['Banco do Brasil','Petrobras','ENEM'].map((name,index)=>({...createNewSimulado(name,2),id:`p${index}`}));
describe('ordem das provas',()=>{
  it('move para cima e para baixo sem alterar respostas, progresso ou seleção',()=>{
    const moved=moveProof(proofs,'p0','p2');expect(moved.map(p=>p.id)).toEqual(['p1','p2','p0']);expect(proofs.map(p=>p.id)).toEqual(['p0','p1','p2']);expect(moved[2].userAnswers).toEqual(proofs[0].userAnswers);
    expect(moveProof(moved,'p0','p1').map(p=>p.id)).toEqual(['p0','p1','p2']);expect(moveProof(proofs,'missing','p0')).toBe(proofs);
  });
  it('preserva a ordem no JSON e recupera a mesma disposição em outra conta/dispositivo',()=>{
    const moved=moveProof(proofs,'p2','p0');const restored:typeof moved=JSON.parse(JSON.stringify(moved)).map(sanitizeSimulado);
    expect(orderedProofs([...restored].reverse()).map(p=>p.id)).toEqual(['p2','p0','p1']);
    const rows=Object.fromEntries(restored.map(proof=>[proof.id,{id:proof.id,user_id:'test',title:proof.title,data:proof,updated_at:proof.updatedAt}]));
    expect(reconcileCloud({version:3,activeId:'',provas:[]},{},rows).provas.map(p=>p.id)).toEqual(['p2','p0','p1']);
  });
});
