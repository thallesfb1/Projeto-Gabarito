// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen,waitFor,configure} from '@testing-library/react';
import type {MultiSimuladoStore} from './types';
const mocks=vi.hoisted(()=>({initial:null as MultiSimuladoStore|null,store:null as MultiSimuladoStore|null,extract:vi.fn(),upload:vi.fn(),snapshot:vi.fn()}));
vi.mock('./hooks/useWorkspace',()=>({useWorkspace:()=>{
  const[store,setStore]=React.useState(mocks.initial!);mocks.store=store;
  return {store,setStore,scope:'test-account',isStorageReady:true,configured:true,saveStatus:'saved',cloudStatus:'synced',error:'',session:{user:{id:'test-account',user_metadata:{},email:'test@example.test'}},signIn:vi.fn(),signOut:vi.fn(),importGuest:vi.fn(),retry:vi.fn(),persistNow:vi.fn().mockResolvedValue(undefined)};
}}));
vi.mock('./hooks/useAIReadingJobs',()=>({useAIReadingJobs:()=>{
  const[jobs,setJobs]=React.useState<any[]>([]);
  return {jobs,error:'',notice:null,dismissNotice:vi.fn(),refresh:vi.fn(),start:async(file:File,mode:string,target:any)=>{
    const id=crypto.randomUUID(),proof_id=target?.id || crypto.randomUUID();
    const source={...await mocks.upload(file,proof_id,mode),mime:file.type,name:file.name};
    const job={id,user_id:'test-account',proof_id,source,mode,target_snapshot:target,status:'running',extraction:null};
    setJobs(previous=>[job,...previous]);
    void mocks.extract(file,mode,new AbortController().signal).then((extraction:any)=>setJobs(previous=>previous.map(item=>item.id===id?{...item,status:'ready',extraction}:item)));
    return job;
  },remove:async(job:any)=>{setJobs(previous=>previous.filter(item=>item.id!==job.id));}};
}}));
vi.mock('./utils/aiJobClient',()=>({reviewAIJobFile:async(job:any)=>({job,file:new File(['file'],job.source.name,{type:job.source.mime})})}));
vi.mock('./utils/aiClient',()=>({extractWithAI:mocks.extract,generateFlashcardsWithAI:vi.fn()}));
vi.mock('./utils/sourceDocuments',()=>({uploadOriginalFile:mocks.upload}));
vi.mock('./utils/indexedDbStorage',()=>({saveSnapshotToIndexedDB:mocks.snapshot}));
vi.mock('./components/DocumentPreview',()=>({DocumentPreview:()=> <div>Visualizador de teste</div>}));
import App from './App';
import {createNewSimulado} from './utils/provasManager';
configure({getElementError:(message)=>new Error(message || 'Elemento não encontrado')});
const existing={...createNewSimulado('Minha prova corrigida',2),isCorrected:true,isLocked:true,userAnswers:['A','B'] as any,keyAnswers:['A','B'] as any};
beforeEach(()=>{
  vi.clearAllMocks();localStorage.clear();mocks.initial={version:3,activeId:existing.id,provas:[structuredClone(existing)]};
  mocks.snapshot.mockResolvedValue(true);mocks.upload.mockResolvedValue({path:'test/original',ownerId:'test-account',name:'gabarito.png',mime:'image/png',size:10,kind:'key',createdAt:'2026-10-03T10:00:00Z'});
  mocks.extract.mockResolvedValue({title:'Novo gabarito',examType:'multiple_choice',totalQuestions:3,questions:[],answers:[{number:1,answer:'C'},{number:2,answer:'D'},{number:3,answer:'E'}],warnings:[]});
  vi.stubGlobal('URL',class extends URL {static createObjectURL(){return 'blob:test';}static revokeObjectURL(){}});
  vi.stubGlobal('matchMedia',vi.fn(query=>({matches:false,media:query,addEventListener:vi.fn(),removeEventListener:vi.fn(),addListener:vi.fn(),removeListener:vi.fn()})));
  vi.stubGlobal('ResizeObserver',class {observe(){}unobserve(){}disconnect(){}});
  HTMLElement.prototype.scrollIntoView=vi.fn();
});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
async function readKey(){
  fireEvent.click(await screen.findByRole('button',{name:'Ler gabarito em imagem ou PDF'}));
  fireEvent.change(screen.getByLabelText('Selecione a imagem ou o PDF do gabarito oficial'),{target:{files:[new File(['image'],'gabarito.png',{type:'image/png'})]}});
  fireEvent.click(screen.getByRole('button',{name:'Ler arquivo'}));await screen.findByRole('heading',{name:'Confira a leitura antes de importar'});
  fireEvent.click(screen.getByRole('checkbox',{name:/Conferi a leitura/}));
}
describe('importação por contexto da aplicação',()=>{
  it('o cabeçalho oferece três provas ou uma nova e mantém o arquivo ao mudar o destino',async()=>{
    const second=createNewSimulado('Segunda prova',3),third=createNewSimulado('Terceira prova',3);
    mocks.initial!.provas.push(second,third);
    render(<App/>);fireEvent.click(screen.getByRole('button',{name:/Continuar minha prova/}));
    fireEvent.click(screen.getByRole('button',{name:'Importar com IA'}));
    const destination=await screen.findByLabelText('Destino da importação');
    expect(Array.from((destination as HTMLSelectElement).options).map(option=>option.value)).toEqual(['',existing.id,second.id,third.id]);
    expect((destination as HTMLSelectElement).value).toBe(existing.id);
    fireEvent.click(screen.getByRole('button',{name:'Ler gabarito em imagem ou PDF'}));
    fireEvent.change(screen.getByLabelText('Selecione a imagem ou o PDF do gabarito oficial'),{target:{files:[new File(['image'],'gabarito.png',{type:'image/png'})]}});
    fireEvent.change(destination,{target:{value:third.id}});
    expect(screen.getByText('Arquivo para: Terceira prova')).toBeTruthy();
    expect((screen.getByRole('button',{name:'Ler arquivo'}) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button',{name:'Ler arquivo'}));await screen.findByRole('heading',{name:'Confira a leitura antes de importar'});
    fireEvent.click(screen.getByRole('checkbox',{name:/Conferi a leitura/}));fireEvent.click(screen.getByRole('button',{name:'Importar gabarito conferido'}));
    await waitFor(()=>expect(mocks.store!.provas.find(proof=>proof.id===third.id)!.keyAnswers).toEqual(['C','D','E']));
    expect(mocks.store!.provas[0]).toEqual(existing);expect(mocks.store!.provas).toHaveLength(3);
  });
  it('libera as outras provas enquanto a leitura protege o cartão de destino',async()=>{
    let finish!: (value:any)=>void;
    mocks.extract.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
    const other={...createNewSimulado('Outra prova',2),timerPrompted:true};
    mocks.initial!.provas.push(other);
    render(<App/>);fireEvent.click(screen.getByRole('button',{name:/Continuar minha prova/}));
    fireEvent.click(screen.getByRole('button',{name:'Importar com IA'}));
    await screen.findByRole('dialog',{name:'Importar com IA'});
    fireEvent.click(screen.getByRole('button',{name:'Ler gabarito em imagem ou PDF'}));
    fireEvent.change(screen.getByLabelText('Selecione a imagem ou o PDF do gabarito oficial'),{target:{files:[new File(['image'],'gabarito.png',{type:'image/png'})]}});
    fireEvent.click(screen.getByRole('button',{name:'Ler arquivo'}));
    expect(await screen.findByText(/Você pode acessar o restante do site/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Continuar pelo site'}));
    await waitFor(()=>expect(screen.queryByRole('dialog',{name:'Importar com IA'})).toBeNull());
    expect(screen.getByText('Esta prova está aguardando a leitura com IA.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:/IA lendo em segundo plano/}));
    fireEvent.click(screen.getByRole('button',{name:'Acompanhar leitura'}));
    expect(await screen.findByText(/Você pode acessar o restante do site/)).toBeTruthy();
    expect(screen.getByText('Ver arquivo anexado')).toBeTruthy();
    expect(screen.getByRole('button',{name:'Ler gabarito em imagem ou PDF'}).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByLabelText('Selecione a imagem ou o PDF do gabarito oficial')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Continuar pelo site'}));
    fireEvent.click(screen.getByRole('button',{name:'Recolher leituras'}));
    fireEvent.keyDown(window,{key:'C'});expect(mocks.store!.provas[0].userAnswers).toEqual(['A','B']);
    fireEvent.click(screen.getAllByText('Outra prova')[0]);
    fireEvent.keyDown(window,{key:'C'});expect(mocks.store!.provas.find(proof=>proof.id===other.id)!.userAnswers[0]).toBe('C');
    finish({title:'Gabarito',examType:'multiple_choice',totalQuestions:2,questions:[],answers:[{number:1,answer:'D'},{number:2,answer:'E'}],warnings:[]});
    fireEvent.click(await screen.findByRole('button',{name:/Suas leituras com IA/}));fireEvent.click(await screen.findByRole('button',{name:'Conferir leitura'}));
    fireEvent.click(await screen.findByRole('checkbox',{name:/Conferi a leitura/}));fireEvent.click(screen.getByRole('button',{name:'Importar gabarito conferido'}));
    await waitFor(()=>expect(mocks.store!.provas[0].keyAnswers).toEqual(['D','E']));
    expect(mocks.store!.provas.find(proof=>proof.id===other.id)!.userAnswers[0]).toBe('C');
  });
  it('a página inicial cria uma prova nova por imagem e preserva a correção existente',async()=>{
    render(<App/>);expect(screen.queryByText('Central de Gabarito')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Importar com IA'}));await screen.findByRole('dialog',{name:'Importar com IA'});await readKey();
    fireEvent.click(screen.getByRole('button',{name:'Criar simulado com este gabarito'}));await waitFor(()=>expect(mocks.store?.provas).toHaveLength(2));
    const old=mocks.store!.provas.find(proof=>proof.id===existing.id)!;expect(old).toEqual(existing);
    const created=mocks.store!.provas.find(proof=>proof.id!==existing.id)!;expect(created.totalQuestions).toBe(3);expect(created.keyAnswers).toEqual(['C','D','E']);expect(created.userAnswers).toEqual([null,null,null]);expect(mocks.store?.activeId).toBe(created.id);
    expect(mocks.snapshot).not.toHaveBeenCalled();expect(mocks.upload.mock.calls[0][1]).toBe(created.id);
  });
  it('dentro da prova, importa o gabarito somente no cartão aberto',async()=>{
    mocks.extract.mockResolvedValue({title:'Gabarito',examType:'multiple_choice',totalQuestions:2,questions:[],answers:[{number:1,answer:'C'},{number:2,answer:'D'}],warnings:[]});
    render(<App/>);fireEvent.click(screen.getByRole('button',{name:/Continuar minha prova/}));expect(screen.getAllByText('Central de Gabarito').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button',{name:'Ler gabarito com IA'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Importar arquivo'}));await screen.findByText('Importar nesta prova');expect(screen.queryByLabelText('Destino da importação')).toBeNull();await readKey();
    fireEvent.click(screen.getByRole('button',{name:'Importar gabarito conferido'}));await waitFor(()=>expect(mocks.store!.provas[0].keyAnswers).toEqual(['C','D']));
    expect(mocks.store?.provas).toHaveLength(1);expect(mocks.store!.provas[0].userAnswers).toEqual(['A','B']);expect(mocks.store!.provas[0].isCorrected).toBe(false);expect(mocks.snapshot).toHaveBeenCalled();expect(mocks.upload.mock.calls[0][1]).toBe(existing.id);
  });
  it('adiciona o PDF à prova aberta e mapeia disciplinas sem apagar respostas ou gabarito',async()=>{
    mocks.extract.mockResolvedValue({title:'PDF da prova',examType:'multiple_choice',totalQuestions:2,questions:[{number:1,statement:'Uma questão de língua.',subject:'Português',options:[]},{number:2,statement:'Uma questão de cálculo.',subject:'Matemática',options:[]}],answers:[],warnings:[]});
    render(<App/>);fireEvent.click(screen.getByRole('button',{name:/Continuar minha prova/}));
    fireEvent.click(screen.getByRole('button',{name:'Importar com IA'}));await screen.findByText('Importar nesta prova');
    fireEvent.click(screen.getByRole('button',{name:'Ler prova em PDF'}));
    fireEvent.change(screen.getByLabelText('Selecione a prova em PDF'),{target:{files:[new File(['pdf'],'prova.pdf',{type:'application/pdf'})]}});
    fireEvent.click(screen.getByRole('button',{name:'Ler arquivo'}));await screen.findByRole('heading',{name:'Confira a leitura antes de importar'});
    expect(screen.getByText('Questão 1').closest('details')?.open).toBe(false);
    fireEvent.click(screen.getByRole('checkbox',{name:/Conferi a leitura/}));fireEvent.click(screen.getByRole('button',{name:'Adicionar PDF e disciplinas à prova'}));
    await waitFor(()=>expect(mocks.store!.provas[0].extractedQuestions).toHaveLength(2));
    expect(mocks.store?.provas).toHaveLength(1);expect(mocks.store!.provas[0].title).toBe('PDF da prova');expect(mocks.store!.provas[0].userAnswers).toEqual(['A','B']);expect(mocks.store!.provas[0].keyAnswers).toEqual(['A','B']);expect(mocks.store!.provas[0].isCorrected).toBe(true);
    expect(mocks.store!.provas[0].subjectRanges).toMatchObject([{name:'Português',start:1,end:1},{name:'Matemática',start:2,end:2}]);expect(mocks.upload.mock.calls[0][1]).toBe(existing.id);expect(mocks.upload.mock.calls[0][2]).toBe('exam');
  });
});

describe('cronômetro da prova',()=>{
  beforeEach(()=>{mocks.initial={version:3,activeId:existing.id,provas:[{...structuredClone(existing),isCorrected:false,isLocked:false,userAnswers:[null,null]}]};});
  it('oferece iniciar na primeira interação sem PDF, conta o tempo e para ao corrigir',()=>{
    render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Continuar minha prova'}));vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button',{name:'Selecionar questão 01'}));expect(screen.getByRole('dialog',{name:'Iniciar cronômetro da prova'})).toBeTruthy();
    fireEvent.keyDown(window,{key:'A'});expect(mocks.store!.provas[0].userAnswers).toEqual([null,null]);
    fireEvent.click(screen.getByRole('button',{name:'Sim, iniciar'}));act(()=>vi.advanceTimersByTime(3000));expect(mocks.store!.provas[0].timeSpentSeconds).toBe(3);
    fireEvent.click(screen.getByRole('button',{name:'Corrigir Simulado'}));act(()=>vi.advanceTimersByTime(4000));expect(mocks.store!.provas[0].timeSpentSeconds).toBe(3);expect(mocks.store!.provas[0].isCorrected).toBe(true);
  });
  it('permite recusar e não volta a incomodar nas próximas questões ou após reabrir',()=>{
    const first=render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Continuar minha prova'}));fireEvent.click(screen.getByRole('button',{name:'Selecionar questão 01'}));
    fireEvent.click(screen.getByRole('button',{name:'Fechar convite do cronômetro'}));expect(mocks.store!.provas[0].timerPrompted).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Selecionar questão 02'}));expect(screen.queryByRole('dialog',{name:'Iniciar cronômetro da prova'})).toBeNull();
    mocks.initial=structuredClone(mocks.store!);first.unmount();render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Continuar minha prova'}));fireEvent.click(screen.getByRole('button',{name:'Selecionar questão 01'}));expect(screen.queryByRole('dialog',{name:'Iniciar cronômetro da prova'})).toBeNull();
  });
  it('pergunta pelo cronômetro antes de abrir o enunciado, sem sobrepor os dois modais',()=>{
    mocks.initial!.provas[0].extractedQuestions=[{number:1,statement:'Enunciado da primeira questão.',options:[]}];
    render(<App/>);fireEvent.click(screen.getByRole('button',{name:'Continuar minha prova'}));fireEvent.click(screen.getByRole('button',{name:'Ver enunciado da questão 01'}));
    expect(screen.getByRole('dialog',{name:'Iniciar cronômetro da prova'})).toBeTruthy();expect(screen.queryByRole('dialog',{name:'Questão 1 da prova'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Agora não'}));expect(screen.getByRole('dialog',{name:'Questão 1 da prova'})).toBeTruthy();expect(screen.queryByRole('dialog',{name:'Iniciar cronômetro da prova'})).toBeNull();
  });
});
