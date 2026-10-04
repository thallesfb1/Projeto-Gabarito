import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { splitPDF, mergeReadings } from '../../server/pdfParts';
import type { AIExtraction } from './aiExtraction';
const signal = () => new AbortController().signal;
const reading = (number: number, statement: string, page: number): AIExtraction => ({ title:'Prova',examType:'multiple_choice',totalQuestions:number,questions:[{number,statement,options:[],page}],answers:[],warnings:[] });
describe('partes de PDF e recuperação da numeração', () => {
  it('remove aviso de ausência resolvida pela junção e conserva conflitos antes dos avisos gerais',()=>{
    const first={...reading(1,'Texto.',1),warnings:Array.from({length:30},(_,i)=>`Aviso geral ${i}`)};
    const second={...reading(2,'Outro texto.',2),warnings:['As questões 1 a 6 não foram encontradas no documento fornecido.']};
    const repeated={...reading(1,'Texto completo.',1),options:[],questions:[{...first.questions[0],options:[{label:'A' as const,text:'Alternativa.'}]}]};
    const merged=mergeReadings([first,second,repeated],'exam');
    expect(merged.warnings[0]).toContain('diferenças');expect(merged.warnings.some(w=>w.includes('não foram encontradas'))).toBe(false);
    const incomplete=mergeReadings([{...second,totalQuestions:3}],'exam');expect(incomplete.warnings.some(w=>w.includes('não foram encontradas'))).toBe(true);
  });
  it('preserva capa, páginas vizinhas e todas as páginas principais', async () => {
    const pdf = await PDFDocument.create(); for (let i=0;i<13;i++) pdf.addPage().drawText(`Page ${i+1}`);
    const parts = await splitPDF(Buffer.from(await pdf.save()).toString('base64'), signal());
    expect(parts).toHaveLength(4);
    expect(parts[1].pages).toEqual([1,4,5,6,7,8,9]);
    expect(parts.map(part=>[part.mainStart,part.mainEnd])).toEqual([[1,4],[5,8],[9,12],[13,13]]);
    for(const part of parts) expect((await PDFDocument.load(Buffer.from(part.data,'base64'))).getPageCount()).toBe(part.pages.length);
  });
  it('mantém o original pequeno intacto e respeita cancelamento', async () => {
    const pdf = await PDFDocument.create(); pdf.addPage(); const data = Buffer.from(await pdf.save()).toString('base64');
    expect((await splitPDF(data,signal()))[0].data).toBe(data);
    const controller = new AbortController();controller.abort();await expect(splitPDF(data,controller.signal)).rejects.toThrow();
  });
  it('reúne partes fora de ordem sem perder páginas nem duplicar questões na sobreposição', () => {
    const merged = mergeReadings([reading(2,'Segundo enunciado.',5),reading(1,'Trecho.',1),reading(1,'Trecho completo com contexto.',1)],'exam');
    expect(merged.totalQuestions).toBe(2);expect(merged.questions.map(q=>q.number)).toEqual([1,2]);expect(merged.questions[0].statement).toContain('contexto');expect(merged.questions[1].page).toBe(5);
  });
  it('não escolhe silenciosamente entre gabaritos conflitantes nem mistura tipos de prova', () => {
    const key = {...reading(2,'Texto',1),questions:[],answers:[{number:1,answer:'A' as const},{number:2,answer:'B' as const}]};
    const merged = mergeReadings([key,{...key,answers:[{number:1,answer:'C' as const},{number:2,answer:'B' as const}]}],'key');
    expect(merged.answers[0].answer).toBeNull();expect(merged.warnings.some(w=>w.includes('respostas diferentes'))).toBe(true);
    expect(()=>mergeReadings([reading(1,'Texto',1),{...reading(2,'Texto',2),examType:'true_false'}],'exam')).toThrow('tipos');
  });
});
