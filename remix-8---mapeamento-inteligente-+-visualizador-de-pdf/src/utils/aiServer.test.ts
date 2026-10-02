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
async function start(config: Partial<typeof serverConfig>=serverConfig) { const app=createAIApp(config);server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));url=`http://127.0.0.1:${(server.address() as AddressInfo).port}`; }
async function post(body:unknown=payload,extra:Record<string,string>={}) {return fetch(`${url}/api/ai/extract`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer signed-session',...extra},body:JSON.stringify(body)});}
beforeEach(()=>{vi.clearAllMocks();mocks.getUser.mockResolvedValue({data:{user:{id:'conta1'}},error:null});mocks.generate.mockResolvedValue({text:JSON.stringify(output),candidates:[{finishReason:'STOP'}]});mocks.list.mockResolvedValue([{name:'models/gemini-3.8-flash',displayName:'Flash teste',supportedActions:['generateContent']},{name:'models/gemini-test-image',supportedActions:['generateContent']}]);});
afterEach(async()=>{if(server){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}});
describe('API de IA segura',()=>{
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
    expect(mocks.generate.mock.calls[0][0].model).toBe('gemini-3.8-flash');
  });
  it('tenta uma alternativa em caso de alta demanda, sem repetir erros de autorização',async()=>{
    mocks.generate.mockRejectedValueOnce({status:503});await start();expect((await post()).status).toBe(200);
    expect(mocks.generate.mock.calls.map(call=>call[0].model)).toEqual(['gemini-3.8-flash','gemini-flash-latest']);
  });
  it('rejeita sessões inválidas, mesmo com chave pessoal no cabeçalho',async()=>{
    mocks.getUser.mockResolvedValue({data:{user:null},error:{message:'invalid'}});await start();
    expect((await post(payload,{'x-gemini-api-key':key})).status).toBe(401);expect(mocks.generate).not.toHaveBeenCalled();
  });
  it('continua lendo quando a listagem de modelos está indisponível',async()=>{
    mocks.list.mockRejectedValue({status:503});await start();expect((await post()).status).toBe(200);
    expect(mocks.generate.mock.calls[0][0].model).toBe('gemini-flash-latest');
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
