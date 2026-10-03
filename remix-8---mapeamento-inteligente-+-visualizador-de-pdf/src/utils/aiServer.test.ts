import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Server } from 'node:http';
import { AddressInfo } from 'node:net';
const mocks=vi.hoisted(()=>({generate:vi.fn(),list:vi.fn(),getUser:vi.fn(),construct:vi.fn()}));
vi.mock('@google/genai',()=>({GoogleGenAI:class { constructor(config:unknown){mocks.construct(config);} models={generateContent:mocks.generate,list:mocks.list}; }}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({auth:{getUser:mocks.getUser}})}));
import { createAIApp, validateFilePayload } from '../../server/ai';
let server:Server;let url:string;
const key='AQ.test-personal-key-with-no-prefix-assumption';
const payload={mode:'key',model:'gemini-3.8-flash',mime:'image/png',data:Buffer.from([137,80,78,71,13,10,26,10,1]).toString('base64')};
const output={title:'Gabarito',examType:'multiple_choice',totalQuestions:3,questions:[],answers:[{number:1,answer:'A'},{number:3,answer:'C'}],warnings:[]};
const serverConfig={GEMINI_API_KEY:key,VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_ANON_KEY:'anon'};
async function start(config: Partial<typeof serverConfig> & { GEMINI_MODEL?: string }=serverConfig) { const app=createAIApp(config);server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));url=`http://127.0.0.1:${(server.address() as AddressInfo).port}`; }
async function post(body:unknown=payload,extra:Record<string,string>={}) {return fetch(`${url}/api/ai/extract`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer signed-session',...extra},body:JSON.stringify(body)});}
beforeEach(()=>{vi.clearAllMocks();mocks.getUser.mockResolvedValue({data:{user:{id:'conta1'}},error:null});mocks.generate.mockResolvedValue({text:JSON.stringify(output),candidates:[{finishReason:'STOP'}]});mocks.list.mockResolvedValue([{name:'models/gemini-3.8-flash',displayName:'Flash teste',supportedActions:['generateContent']},{name:'models/gemini-test-image',supportedActions:['generateContent']}]);});
afterEach(async()=>{if(server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}});
describe('API de IA segura',()=>{
  it('gera flashcards vinculados somente às questões erradas e ao modelo aprovado',async()=>{
    const card={subject:'Matemática',topic:'Frações',context:'Considere a soma 1/2 + 1/3.',front:'Como somar essas frações?',back:'Use um denominador comum.',explanation:'Reescreva as frações com denominador 6 e some os numeradores.',example:'1/2 + 1/3 = 3/6 + 2/6 = 5/6.',pitfall:'',questionNumbers:[1]};
    mocks.generate.mockResolvedValue({text:JSON.stringify({cards:Array.from({length:10},(_,index)=>({...card,front:`Pergunta sobre frações ${index+1}`}))}),candidates:[{finishReason:'STOP'}]});await start();
    const response=await fetch(`${url}/api/ai/flashcards`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer signed-session'},body:JSON.stringify({questions:[{number:1,subject:'Matemática',statement:'Uma questão sobre frações',options:[],userAnswer:'A',correctAnswer:'B'}],model:'gemini-3.8-flash'})});
    expect(response.status).toBe(200);expect((await response.json()).cards[0]).toMatchObject({context:card.context,explanation:card.explanation,questionNumbers:[1]});expect(mocks.generate.mock.calls[0][0].model).toBe('gemini-3.1-flash-lite');
  });
  it('recusa uma nova rodada sem contexto e explicação em vez de salvar cartões genéricos',async()=>{
    mocks.generate.mockResolvedValue({text:JSON.stringify({cards:Array.from({length:10},(_,index)=>({subject:'Matemática',topic:'Frações',front:`Definição ${index}`,back:'Uma definição.',questionNumbers:[1]}))}),candidates:[{finishReason:'STOP'}]});await start();
    const response=await fetch(`${url}/api/ai/flashcards`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer signed-session'},body:JSON.stringify({questions:[{number:1,subject:'Matemática',statement:'',options:[],userAnswer:'A',correctAnswer:'B'}]})});
    expect(response.status).toBe(422);
  });
  it('não gera flashcards sem autenticação, sem contexto ou com classificação adulterada',async()=>{
    await start();
    const call=(questions:unknown,token=true)=>fetch(`${url}/api/ai/flashcards`,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer signed-session'}:{})},body:JSON.stringify({questions})});
    expect((await call([],false)).status).toBe(401);expect((await call([])).status).toBe(400);
    expect((await call([{number:1,subject:'Matemática',userAnswer:'A',correctAnswer:'A',result:'wrong'}])).status).toBe(400);expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('permite acertos como reforço e recusa uma rodada que não prioriza erros',async()=>{
    const cards=Array.from({length:10},(_,index)=>({subject:'Matemática',topic:'Frações',context:'Considere 1/2 + 1/3.',front:`Como calcular frações ${index}?`,back:'Use denominadores comuns.',explanation:'Expresse ambas as frações em sextos para somar.',questionNumbers:[index<6?1:2]}));
    mocks.generate.mockResolvedValue({text:JSON.stringify({cards}),candidates:[{finishReason:'STOP'}]});await start();
    const questions=[{number:1,subject:'Matemática',userAnswer:'A',correctAnswer:'B',result:'wrong'},{number:2,subject:'Matemática',userAnswer:'B',correctAnswer:'B',result:'correct'}];
    const call=(selected:unknown)=>fetch(`${url}/api/ai/flashcards`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer signed-session'},body:JSON.stringify({questions:selected})});
    expect((await call(questions)).status).toBe(422);
    cards[6].questionNumbers=[1]; mocks.generate.mockResolvedValue({text:JSON.stringify({cards}),candidates:[{finishReason:'STOP'}]});expect((await call(questions)).status).toBe(200);
    cards.forEach(card=>{card.questionNumbers=[2];});mocks.generate.mockResolvedValue({text:JSON.stringify({cards}),candidates:[{finishReason:'STOP'}]});expect((await call([questions[1]])).status).toBe(200);
  });
  it('rejeita cartões que inventam números de questões de origem',async()=>{
    mocks.generate.mockResolvedValue({text:JSON.stringify({cards:[{subject:'Matemática',topic:'Frações',front:'Pergunta',back:'Explicação',questionNumbers:[99]}]}),candidates:[{finishReason:'STOP'}]});await start();
    const response=await fetch(`${url}/api/ai/flashcards`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer signed-session'},body:JSON.stringify({questions:[{number:1,subject:'Matemática',statement:'',options:[],userAnswer:'A',correctAnswer:'B'}]})});
    expect(response.status).toBe(422);
  });
  it('confere assinatura real, não somente extensão ou MIME',()=>{
    expect(()=>validateFilePayload('image/png',Buffer.from('<svg/>').toString('base64'),'key')).toThrow('conteúdo');
    expect(()=>validateFilePayload('application/pdf',Buffer.from('%PDF-1.7').toString('base64'),'exam')).not.toThrow();
  });
  it('aceita chave de autorização e retorna gabarito validado',async()=>{
    await start();const response=await post();expect(response.status).toBe(200);
    expect((await response.json()).extraction.answers).toEqual(output.answers);
    expect(mocks.generate.mock.calls[0][0].contents[0].parts[1].inlineData.mimeType).toBe('image/png');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('seleciona o modelo e a chave no servidor, ignorando valores do cliente',async()=>{
    await start();const response=await post({...payload,model:'https://example.com'},{'x-gemini-api-key':'untrusted-client-key'});
    expect(response.status).toBe(200);expect(mocks.construct).toHaveBeenCalledWith(expect.objectContaining({apiKey:key}));
    expect(mocks.generate.mock.calls[0][0].model).toBe('gemini-3.1-flash-lite');
  });
  it.each([400,401,403,429])('não troca de modelo nem repete a chamada ao receber %s',async(status)=>{
    mocks.generate.mockRejectedValueOnce({status});await start();expect((await post()).status).toBe(status===401?403:status);
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(mocks.generate.mock.calls[0][0].model).toBe('gemini-3.1-flash-lite');
  });
  it('recupera uma indisponibilidade temporária usando o mesmo modelo',async()=>{
    mocks.generate.mockRejectedValueOnce({status:503});await start();
    const response=await post();expect(response.status).toBe(200);
    expect((await response.json()).extraction.answers).toEqual(output.answers);
    expect(mocks.generate).toHaveBeenCalledTimes(2);
    expect(mocks.generate.mock.calls.every(([request])=>request.model==='gemini-3.1-flash-lite')).toBe(true);
    expect(mocks.construct).toHaveBeenCalledWith(expect.objectContaining({httpOptions:{timeout:120000,retryOptions:{attempts:1}}}));
  });
  it('limita as tentativas e diferencia capacidade do Google de cota disponível',async()=>{
    mocks.generate.mockRejectedValue({status:503,message:`secret ${key}`});await start();
    const response=await post();expect(response.status).toBe(503);
    const body=await response.text();expect(body).toContain('cota disponível');expect(body).not.toContain(key);
    expect(mocks.generate).toHaveBeenCalledTimes(3);
  });
  it('identifica tempo excedido sem chamar de alta demanda',async()=>{
    mocks.generate.mockRejectedValue(new DOMException('Timed out','TimeoutError'));await start();
    const response=await post();expect(response.status).toBe(504);
    expect((await response.json()).error).toContain('tempo de espera');expect(mocks.generate).toHaveBeenCalledTimes(1);
  });
  it('reserva menos tokens de saída para gabaritos do que para provas',async()=>{
    await start();await post();
    expect(mocks.generate.mock.calls[0][0].config.maxOutputTokens).toBe(8192);
    mocks.generate.mockResolvedValueOnce({text:JSON.stringify({...output,answers:[],questions:[{number:1,statement:'Qual alternativa?',options:[],subject:'',page:1}]}),candidates:[{finishReason:'STOP'}]});
    await post({mode:'exam',mime:'application/pdf',data:Buffer.from('%PDF-1.7').toString('base64')});
    expect(mocks.generate.mock.calls[1][0].config.maxOutputTokens).toBe(32768);
  });
  it('rejeita sessões inválidas, mesmo com chave pessoal no cabeçalho',async()=>{
    mocks.getUser.mockResolvedValue({data:{user:null},error:{message:'invalid'}});await start();
    expect((await post(payload,{'x-gemini-api-key':key})).status).toBe(401);expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('usa somente o modelo aprovado sem consultar modelos mais novos',async()=>{
    await start();expect((await post()).status).toBe(200);expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.generate.mock.calls[0][0].model).toBe('gemini-3.1-flash-lite');
  });
  it('recusa configuração administrativa de um modelo diferente',async()=>{
    await start({...serverConfig,GEMINI_MODEL:'gemini-3.8-flash'});
    expect((await post()).status).toBe(503);expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('bloqueia arquivo falso antes de chamar Gemini',async()=>{
    await start();const response=await post({...payload,data:Buffer.from('arquivo falso').toString('base64')});
    expect(response.status).toBe(400);expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('avisa quando a chave não foi configurada no servidor',async()=>{
    await start({});expect((await post()).status).toBe(503);expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('bloqueia chamadas de outra origem',async()=>{
    await start();expect((await post(payload,{Origin:'https://outro-site.example'})).status).toBe(403);expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('exige autenticação para gastar a chave compartilhada do servidor',async()=>{
    await start({GEMINI_API_KEY:key,VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_ANON_KEY:'anon'});
    const response=await fetch(`${url}/api/ai/extract`,{method:'POST',headers:{'Content-Type':'application/json','x-gemini-api-key':key},body:JSON.stringify(payload)});expect(response.status).toBe(401);expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('valida a sessão no servidor antes de usar a chave compartilhada',async()=>{
    mocks.getUser.mockResolvedValue({data:{user:{id:'conta1'}},error:null});
    await start({GEMINI_API_KEY:key,VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_ANON_KEY:'anon'});
    const response=await post();
    expect(response.status).toBe(200);expect(mocks.getUser).toHaveBeenCalledWith('signed-session');
  });
  it('não expõe mensagem do Google que contenha chaves',async()=>{
    mocks.generate.mockRejectedValue({status:403,message:`key=${key}`});await start();const response=await post();
    expect(response.status).toBe(403);expect(await response.text()).not.toContain(key);
  });
  it('rejeita resposta truncada e números duplicados da IA',async()=>{
    mocks.generate.mockResolvedValueOnce({text:JSON.stringify(output),candidates:[{finishReason:'MAX_TOKENS'}]});
    await start();expect((await post()).status).toBe(422);
    mocks.generate.mockResolvedValueOnce({text:JSON.stringify({...output,answers:[{number:1,answer:'A'},{number:1,answer:'B'}]}),candidates:[{finishReason:'STOP'}]});
    expect((await post()).status).toBe(422);
  });
  it('limita solicitações por janela de tempo',async()=>{
    await start();for(let i=0;i<20;i++){const response=await post();expect(response.status).toBe(200);await response.text();}
    const response=await post();expect(response.status).toBe(429);
  });
});
