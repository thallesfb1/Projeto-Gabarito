import { describe, expect, it } from 'vitest';
import { answersFromExtraction, validateAIExtraction, validateAIFile } from './aiExtraction';
import { sanitizeSimulado } from './provasManager';
const base = { title: 'Prova teste', totalQuestions: 4, examType: 'multiple_choice', questions: [], answers: [], warnings: [] };
describe('leitura de prova e gabarito', () => {
  it('preserva numeração e lacunas de um gabarito parcial', () => {
    const result=validateAIExtraction({...base, answers:[{number:1,answer:'A'},{number:3,answer:'C'},{number:4,answer:null}]},'key');
    expect(answersFromExtraction(result,4)).toEqual(['A',null,'C',null]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
  it('não importa alternativas inválidas nem números repetidos', () => {
    expect(()=>validateAIExtraction({...base,answers:[{number:1,answer:'Z'}]},'key')).toThrow('Alternativa inválida');
    expect(()=>validateAIExtraction({...base,answers:[{number:1,answer:'A'},{number:1,answer:'B'}]},'key')).toThrow('repetidos');
  });
  it('não reduz nem desloca o cartão para acomodar um gabarito maior',()=>{
    const result=validateAIExtraction({...base,answers:[{number:4,answer:'D'}]},'key');
    expect(()=>answersFromExtraction(result,3)).toThrow('além');
  });
  it('normaliza C/E somente em provas Certo/Errado',()=>{
    const result=validateAIExtraction({...base,examType:'true_false',answers:[{number:1,answer:'C'},{number:2,answer:'E'}]},'key');
    expect(answersFromExtraction(result,4)).toEqual(['V','F',null,null]);
  });
  it('exige enunciados e sinaliza PDF incompleto sem inventar questões',()=>{
    const result=validateAIExtraction({...base,questions:[{number:3,statement:'Enunciado real',options:[],page:2}]},'exam');
    expect(result.questions[0].number).toBe(3);expect(result.warnings[0]).toContain('1 de 4');
    expect(()=>validateAIExtraction(base,'exam')).toThrow('enunciados');
  });
  it('rejeita formatos ativos e arquivos excessivos antes de enviar',()=>{
    expect(()=>validateAIFile({type:'image/svg+xml',size:20},'key')).toThrow('PNG');
    expect(()=>validateAIFile({type:'image/png',size:20},'exam')).toThrow('PDF');
    expect(()=>validateAIFile({type:'application/pdf',size:11*1024*1024},'exam')).toThrow('10 MB');
  });
  it('sanitiza enunciados de backups e preserva o conteúdo válido',()=>{
    const result=sanitizeSimulado({...base,userAnswers:[],extractedQuestions:[{number:1,statement:'Texto',options:[{label:'A',text:'Opção'}]},{number:1,statement:'Duplicado'},{number:2,statement:{html:'<script>'}},{number:7,statement:'Fora'}]});
    expect(result.extractedQuestions).toEqual([{number:1,statement:'Texto',options:[{label:'A',text:'Opção'}],subject:'',page:undefined}]);
  });
});
