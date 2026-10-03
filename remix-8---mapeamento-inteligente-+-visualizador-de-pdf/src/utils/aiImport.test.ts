import { describe,expect,it } from 'vitest';
import { applyAIReading } from './aiImport';
import { subjectRangesFromQuestions } from './aiExtraction';
import { createNewSimulado } from './provasManager';
import type { AIExtraction } from './aiExtraction';

const key:AIExtraction={title:'Gabarito novo',examType:'multiple_choice',totalQuestions:4,questions:[],answers:[{number:1,answer:'C'},{number:4,answer:'D'}],warnings:[]};
const existing={...createNewSimulado('Prova antiga',4),isCorrected:true,isLocked:true,userAnswers:['A','B','C','D'] as any,keyAnswers:['A','B','C','D'] as any};
const exam:AIExtraction={...key,title:'PDF',answers:[],questions:[1,2,3,4].map(number=>({number,statement:`Questão ${number}`,subject:number<=2?'Português':'Matemática',options:[]}))};
describe('destino e disciplinas da importação',()=>{
  it('cria um novo simulado a partir de um gabarito sem reutilizar prova existente',()=>{
    const proof=applyAIReading(key,'key',null);
    expect(proof.id).not.toBe(existing.id);expect(proof.userAnswers).toEqual([null,null,null,null]);expect(proof.keyAnswers).toEqual(['C',null,null,'D']);expect(proof.isCorrected).toBe(false);
    expect(existing.isCorrected).toBe(true);expect(existing.keyAnswers).toEqual(['A','B','C','D']);
  });
  it('adiciona PDF e mapa de disciplinas à prova, preservando respostas, gabarito e cartões',()=>{
    const saved={sourceKey:'old',createdAt:'2026-10-03T00:00:00Z',cards:[],masteredCardIds:[]};
    const proof=applyAIReading(exam,'exam',{...existing,flashcardDeck:saved});
    expect(proof.id).toBe(existing.id);expect(proof.title).toBe('Prova antiga');expect(proof.userAnswers).toEqual(existing.userAnswers);expect(proof.keyAnswers).toEqual(existing.keyAnswers);expect(proof.flashcardDeck).toBe(saved);
    expect(proof.subjectRanges).toMatchObject([{name:'Português',start:1,end:2},{name:'Matemática',start:3,end:4}]);
    expect(existing.subjectRanges).toEqual([]);
  });
  it('atualiza somente o gabarito da prova especificada e pede uma nova correção',()=>{
    const proof=applyAIReading(key,'key',existing);
    expect(proof.id).toBe(existing.id);expect(proof.userAnswers).toEqual(existing.userAnswers);expect(proof.keyAnswers).toEqual(['C',null,null,'D']);expect(proof.isCorrected).toBe(false);
    expect(()=>applyAIReading({...key,totalQuestions:5,answers:[{number:5,answer:'A'}]},'key',existing)).toThrow('além');
    expect(()=>applyAIReading({...key,examType:'true_false',answers:[{number:1,answer:'V'}]},'key',existing)).toThrow('tipo');
    expect(()=>applyAIReading({...exam,totalQuestions:5},'exam',existing)).toThrow('total');
  });
  it('separa blocos não contínuos e não atribui disciplinas a lacunas ou questões desconhecidas',()=>{
    const questions=[{number:6,subject:'Português'},{number:1,subject:' Português '},{number:2,subject:'PORTUGUÊS'},{number:3,subject:''},{number:4,subject:'Matemática'},{number:8,subject:'Português'}].map(item=>({...item,statement:'Enunciado',options:[]}));
    const ranges=subjectRangesFromQuestions(questions);
    expect(ranges).toMatchObject([{name:'Português',start:1,end:2},{name:'Matemática',start:4,end:4},{name:'Português',start:6,end:6},{name:'Português',start:8,end:8}]);
    expect(ranges[0].color).toBe(ranges[2].color);expect(questions[0].number).toBe(6);
  });
});
