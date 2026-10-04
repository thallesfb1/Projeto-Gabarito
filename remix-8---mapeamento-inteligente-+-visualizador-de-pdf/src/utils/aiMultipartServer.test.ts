import {beforeEach,describe,expect,it,vi} from 'vitest';
import {PDFDocument} from 'pdf-lib';
const generate=vi.hoisted(()=>vi.fn());
vi.mock('@google/genai',()=>({GoogleGenAI:class {models={generateContent:generate};}}));
import {readAIFile} from '../../server/ai';
const response=(number:number)=>({text:JSON.stringify({title:'Prova fictícia',examType:'multiple_choice',totalQuestions:number,questions:[{number,statement:`Questão ${number}`,options:[],subject:'Português',page:number}],answers:[],warnings:[]}),candidates:[{finishReason:'STOP'}]});
beforeEach(()=>generate.mockReset());
async function file(){const pdf=await PDFDocument.create();for(let i=0;i<13;i++)pdf.addPage();return {mime:'application/pdf',mode:'exam' as const,data:Buffer.from(await pdf.save()).toString('base64')};}
describe('leitura completa de PDFs em partes',()=>{
  it('divide o PDF real, mantém a numeração original e informa quatro partes',async()=>{
    generate.mockResolvedValueOnce(response(1)).mockResolvedValueOnce(response(2)).mockResolvedValueOnce(response(3)).mockResolvedValueOnce(response(4));
    const report=vi.fn(),save=vi.fn();
    const result=await readAIFile({},'test-key',await file(),'',new AbortController().signal,{report,loadPart:async()=>null,savePart:save});
    expect(generate).toHaveBeenCalledTimes(4);expect(result.questions.map(question=>question.number)).toEqual([1,2,3,4]);expect(result.warnings).toEqual([]);
    expect(save).toHaveBeenCalledTimes(4);expect(report).toHaveBeenCalledWith({stage:'reading',part:4,parts:4,attempt:1});
    expect(generate.mock.calls[1][0].contents[0].parts[0].text).toContain('1=1, 2=4, 3=5, 4=6, 5=7, 6=8, 7=9');
  });
  it('reaproveita a parte preservada e consulta o Google somente para as restantes',async()=>{
    const input=await file(),saved=new Map<number,any>();
    const context={report:async()=>{},loadPart:async(index:number,hash:string)=>saved.get(index)?.hash===hash?saved.get(index).reading:null,savePart:async(index:number,hash:string,reading:any)=>{saved.set(index,{hash,reading});}};
    generate.mockResolvedValueOnce(response(1)).mockRejectedValueOnce(Object.assign(new Error('Quota'),{status:429}));
    await expect(readAIFile({},'test-key',input,'',new AbortController().signal,context)).rejects.toMatchObject({status:429});
    expect(saved.size).toBe(1);generate.mockClear();
    generate.mockResolvedValueOnce(response(2)).mockResolvedValueOnce(response(3)).mockResolvedValueOnce(response(4));
    const result=await readAIFile({},'test-key',input,'',new AbortController().signal,context);
    expect(generate).toHaveBeenCalledTimes(3);expect(result.questions).toHaveLength(4);expect(saved.size).toBe(4);
  });
});
