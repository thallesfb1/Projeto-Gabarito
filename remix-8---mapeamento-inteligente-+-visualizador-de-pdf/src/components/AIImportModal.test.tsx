// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const mocks=vi.hoisted(()=>({extract:vi.fn()}));
vi.mock('../utils/aiClient',()=>({extractWithAI:mocks.extract}));
vi.mock('./DocumentPreview',()=>({DocumentPreview:()=> <div>Visualizador de teste</div>}));
import { AIImportModal } from './AIImportModal';
import { createNewSimulado } from '../utils/provasManager';
import { AI_READING_TIMEOUT_MESSAGE } from '../utils/aiTiming';
const result={title:'Prova lida',totalQuestions:2,examType:'multiple_choice',questions:[],answers:[{number:1,answer:'A'},{number:2,answer:null}],warnings:['Item 2 ilegível']};
beforeEach(()=>{
  vi.clearAllMocks();mocks.extract.mockResolvedValue(result);
  vi.stubGlobal('URL',class extends URL { static createObjectURL(){return 'blob:test';}static revokeObjectURL(){} });
});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
async function prepare(){
  expect(screen.queryByLabelText('Sua chave do Google AI Studio')).toBeNull();
  expect(screen.queryByLabelText('Modelo Gemini disponível')).toBeNull();
  fireEvent.change(screen.getByLabelText('Selecione a imagem ou o PDF do gabarito oficial'),{target:{files:[new File(['image'],'key.png',{type:'image/png'})]}});
  expect(screen.queryByRole('checkbox',{name:/Enviar este arquivo/})).toBeNull();
}
describe('conferência de IA',()=>{
  it('reabre uma leitura antiga sem relatos internos e mantém o mapa final e avisos úteis',()=>{
    const extraction={...result,examType:'multiple_choice' as const,answers:[],questions:[1,2].map(number=>({number,statement:'Enunciado',subject:'Atualidades',options:[]})),warnings:["As questões 1 a 2 foram classificadas como 'Direito Ambiental' por inferência de conteúdo.",'O documento contém 4 partes. Esta é a parte 2 de 4.','Confira a figura da questão 2 no PDF.']};
    render(<AIImportModal initialMode="exam" simulado={null} initialExtraction={extraction} initialFile={new File(['pdf'],'prova.pdf',{type:'application/pdf'})} onKey={vi.fn()} onCreate={vi.fn()} onClose={vi.fn()}/>);
    expect(screen.getByText('Disciplinas identificadas')).toBeTruthy();
    expect(screen.getByText('Atualidades')).toBeTruthy();expect(screen.getByText('Questões 1–2')).toBeTruthy();
    expect(screen.getByText('Pontos para conferir')).toBeTruthy();expect(screen.getByText('Confira a figura da questão 2 no PDF.')).toBeTruthy();
    expect(screen.queryByText(/Direito Ambiental/)).toBeNull();expect(screen.queryByText(/parte 2 de 4/)).toBeNull();
  });
  it('exige arquivo e revisão, permite corrigir OCR e só então aplica',async()=>{
    const onKey=vi.fn().mockResolvedValue(undefined);const onClose=vi.fn();
    render(<AIImportModal initialMode="key" simulado={createNewSimulado('Minha prova',2)} onKey={onKey} onCreate={vi.fn()} onClose={onClose}/>);
    expect(screen.getByRole('button',{name:'Extrair e conferir'}).hasAttribute('disabled')).toBe(true);
    await prepare();fireEvent.click(screen.getByRole('button',{name:'Extrair e conferir'}));
    await screen.findByRole('heading',{name:'Confira a leitura antes de importar'});
    expect(onKey).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Importar gabarito conferido'}).hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByRole('combobox',{name:'Gabarito da questão 1'}),{target:{value:'B'}});
    fireEvent.click(screen.getByRole('checkbox',{name:/Conferi a leitura/}));fireEvent.click(screen.getByRole('button',{name:'Importar gabarito conferido'}));
    await waitFor(()=>expect(onKey).toHaveBeenCalled());expect(onKey.mock.calls[0][0].answers[0].answer).toBe('B');expect(onKey.mock.calls[0][1]).toBeInstanceOf(File);expect(onKey.mock.calls[0][1].name).toBe('key.png');expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('preserva a prova quando a API falha',async()=>{
    mocks.extract.mockRejectedValue(new Error('Cota atingida'));
    const onKey=vi.fn();render(<AIImportModal initialMode="key" simulado={createNewSimulado('Minha prova',2)} onKey={onKey} onCreate={vi.fn()} onClose={vi.fn()}/>);
    await prepare();fireEvent.click(screen.getByRole('button',{name:'Extrair e conferir'}));
    expect((await screen.findByRole('alert')).textContent).toBe('Cota atingida');expect(onKey).not.toHaveBeenCalled();
  });
  it('bloqueia aplicação em uma prova de outro tipo',async()=>{
    const onKey=vi.fn();render(<AIImportModal initialMode="key" simulado={createNewSimulado('Certo e errado',2,0,'true_false')} onKey={onKey} onCreate={vi.fn()} onClose={vi.fn()}/>);
    await prepare();fireEvent.click(screen.getByRole('button',{name:'Extrair e conferir'}));await screen.findByRole('heading',{name:'Confira a leitura antes de importar'});
    fireEvent.click(screen.getByRole('checkbox',{name:/Conferi a leitura/}));fireEvent.click(screen.getByRole('button',{name:'Importar gabarito conferido'}));
    expect((await screen.findByRole('alert')).textContent).toContain('tipo do arquivo');expect(onKey).not.toHaveBeenCalled();
  });
  it('aceita arrastar um arquivo sem enviá-lo automaticamente e permite removê-lo',()=>{
    render(<AIImportModal initialMode="key" simulado={createNewSimulado('Minha prova',2)} onKey={vi.fn()} onCreate={vi.fn()} onClose={vi.fn()}/>);
    const drop=screen.getByRole('button',{name:/Arraste a imagem/});
    fireEvent.drop(drop,{dataTransfer:{files:[new File(['image'],'gabarito.png',{type:'image/png'})]}});
    expect(screen.getByAltText('Prévia do gabarito selecionado')).toBeTruthy();
    expect(screen.getByRole('button',{name:'Extrair e conferir'}).hasAttribute('disabled')).toBe(false);
    expect(mocks.extract).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Remover arquivo selecionado'}));
    expect(screen.getByRole('button',{name:'Extrair e conferir'}).hasAttribute('disabled')).toBe(true);
  });
  it('recusa formatos incorretos e vários arquivos ao arrastar',()=>{
    render(<AIImportModal initialMode="exam" simulado={null} onKey={vi.fn()} onCreate={vi.fn()} onClose={vi.fn()}/>);
    const drop=screen.getByRole('button',{name:/Arraste sua prova/});
    fireEvent.drop(drop,{dataTransfer:{files:[new File(['image'],'imagem.png',{type:'image/png'})]}});
    expect(screen.getByRole('alert').textContent).toContain('PDF');
    fireEvent.drop(drop,{dataTransfer:{files:[new File(['pdf'],'a.pdf',{type:'application/pdf'}),new File(['pdf'],'b.pdf',{type:'application/pdf'})]}});
    expect(screen.getByRole('alert').textContent).toContain('apenas um arquivo');expect(mocks.extract).not.toHaveBeenCalled();
  });
  it('mantém a leitura para nova tentativa se o armazenamento falhar',async()=>{
    const onKey=vi.fn().mockRejectedValue(new Error('Armazenamento indisponível'));const onClose=vi.fn();
    render(<AIImportModal initialMode="key" simulado={createNewSimulado('Minha prova',2)} onKey={onKey} onCreate={vi.fn()} onClose={onClose}/>);
    await prepare();fireEvent.click(screen.getByRole('button',{name:'Extrair e conferir'}));await screen.findByRole('heading',{name:'Confira a leitura antes de importar'});
    fireEvent.click(screen.getByRole('checkbox',{name:/Conferi a leitura/}));fireEvent.click(screen.getByRole('button',{name:'Importar gabarito conferido'}));
    expect((await screen.findByRole('alert')).textContent).toContain('Armazenamento indisponível');
    expect(screen.getByRole('combobox',{name:'Gabarito da questão 1'})).toBeTruthy();expect(onClose).not.toHaveBeenCalled();
  });
  it('avisa ao terminar, permite fechar o aviso e não importa sem conferência',async()=>{
    const onKey=vi.fn();render(<AIImportModal initialMode="key" simulado={createNewSimulado('Minha prova',2)} onKey={onKey} onCreate={vi.fn()} onClose={vi.fn()}/>);
    await prepare();fireEvent.click(screen.getByRole('button',{name:'Extrair e conferir'}));
    expect(await screen.findByText('Leitura concluída!')).toBeTruthy();expect(onKey).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Fechar aviso de leitura concluída'}));
    expect(screen.queryByText('Leitura concluída!')).toBeNull();expect(screen.getByRole('combobox',{name:'Gabarito da questão 1'})).toBeTruthy();
  });
  it('pede permissão apenas por clique e mantém o aviso no site mesmo com bloqueio no navegador',async()=>{
    const requestPermission=vi.fn().mockResolvedValue('denied');
    vi.stubGlobal('Notification',{permission:'default',requestPermission});vi.stubGlobal('isSecureContext',true);
    render(<AIImportModal initialMode="key" simulado={createNewSimulado('Minha prova',2)} onKey={vi.fn()} onCreate={vi.fn()} onClose={vi.fn()}/>);
    expect(requestPermission).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Ativar aviso neste dispositivo'}));
    await screen.findByText(/O navegador bloqueou/);expect(requestPermission).toHaveBeenCalledTimes(1);
    await prepare();fireEvent.click(screen.getByRole('button',{name:'Extrair e conferir'}));expect(await screen.findByText('Leitura concluída!')).toBeTruthy();
  });
  it('não emite aviso para uma leitura cancelada que termina depois',async()=>{
    let finish!: (value:typeof result)=>void;mocks.extract.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
    render(<AIImportModal initialMode="key" simulado={createNewSimulado('Minha prova',2)} onKey={vi.fn()} onCreate={vi.fn()} onClose={vi.fn()}/>);
    await prepare();fireEvent.click(screen.getByRole('button',{name:'Extrair e conferir'}));
    fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));finish(result);
    await waitFor(()=>expect(screen.queryByText(/Lendo o arquivo\./)).toBeNull());
    expect(screen.queryByText('Leitura concluída!')).toBeNull();expect(screen.queryByRole('combobox')).toBeNull();
  });
  it('explica uma demora temporária e tenta novamente com o mesmo PDF sem importar antes da conferência',async()=>{
    const onCreate=vi.fn();const onKey=vi.fn();
    mocks.extract.mockRejectedValueOnce(new Error(AI_READING_TIMEOUT_MESSAGE));
    mocks.extract.mockResolvedValue({...result,answers:[],questions:[{number:1,statement:'Enunciado.',subject:'Português',options:[]}]});
    render(<AIImportModal initialMode="exam" simulado={null} onKey={onKey} onCreate={onCreate} onClose={vi.fn()}/>);
    const file=new File(['%PDF-1.7'],'prova.pdf',{type:'application/pdf'});
    fireEvent.change(screen.getByLabelText('Selecione a prova em PDF'),{target:{files:[file]}});
    fireEvent.click(screen.getByRole('button',{name:'Extrair e conferir'}));
    expect((await screen.findByRole('alert')).textContent).toContain('Isso pode acontecer');
    expect(screen.queryByText('Leitura concluída!')).toBeNull();expect(onCreate).not.toHaveBeenCalled();expect(onKey).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Tentar novamente'}));
    await screen.findByRole('heading',{name:'Confira a leitura antes de importar'});
    expect(mocks.extract.mock.calls[0][0]).toBe(file);expect(mocks.extract.mock.calls[1][0]).toBe(file);
    expect(screen.queryByRole('alert')).toBeNull();expect(onCreate).not.toHaveBeenCalled();
  });
  it('na criação por imagem ignora uma prova passada em segundo plano e chama somente a criação',async()=>{
    const onCreate=vi.fn().mockResolvedValue(undefined);const onKey=vi.fn();
    render(<AIImportModal purpose="create" initialMode="key" simulado={createNewSimulado('Prova antiga',2)} onCreate={onCreate} onKey={onKey} onClose={vi.fn()}/>);
    expect(screen.getByText('Novo simulado')).toBeTruthy();await prepare();fireEvent.click(screen.getByRole('button',{name:'Extrair e conferir'}));
    await screen.findByRole('heading',{name:'Confira a leitura antes de importar'});
    fireEvent.click(screen.getByRole('checkbox',{name:/Conferi a leitura/}));fireEvent.click(screen.getByRole('button',{name:'Criar simulado com este gabarito'}));
    await waitFor(()=>expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({title:'Prova lida'}),expect.any(File),'key'));
    expect(onKey).not.toHaveBeenCalled();
  });
  it('confere e permite corrigir disciplinas antes de adicionar PDF à prova existente',async()=>{
    const pdfResult={...result,answers:[],questions:[{number:1,subject:'Português',statement:'Enunciado 1',options:[]},{number:2,subject:'Português',statement:'Enunciado 2',options:[]}]};
    mocks.extract.mockResolvedValue(pdfResult);const onCreate=vi.fn().mockResolvedValue(undefined);
    render(<AIImportModal purpose="attach" initialMode="exam" simulado={createNewSimulado('Minha prova',2)} onCreate={onCreate} onKey={vi.fn()} onClose={vi.fn()}/>);
    fireEvent.change(screen.getByLabelText('Selecione a prova em PDF'),{target:{files:[new File(['%PDF-1.7'],'prova.pdf',{type:'application/pdf'})]}});fireEvent.click(screen.getByRole('button',{name:'Extrair e conferir'}));
    await screen.findByText('Disciplinas identificadas');expect(screen.getByText('Questões 1–2')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Disciplina da questão 1'),{target:{value:'Matemática'}});
    fireEvent.click(screen.getByRole('checkbox',{name:/Conferi a leitura/}));fireEvent.click(screen.getByRole('button',{name:'Adicionar PDF e disciplinas à prova'}));
    await waitFor(()=>expect(onCreate).toHaveBeenCalled());expect(onCreate.mock.calls[0][0].questions[0].subject).toBe('Matemática');expect(onCreate.mock.calls[0][2]).toBe('exam');
  });
  it('não transforma em criação uma importação cuja prova de destino deixou de existir',()=>{
    render(<AIImportModal purpose="attach" initialMode="key" simulado={null} onCreate={vi.fn()} onKey={vi.fn()} onClose={vi.fn()}/>);
    expect(screen.getByText('A prova selecionada não está mais disponível.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Selecione a imagem ou o PDF do gabarito oficial'),{target:{files:[new File(['image'],'key.png',{type:'image/png'})]}});
    expect(screen.getByRole('button',{name:'Extrair e conferir'}).hasAttribute('disabled')).toBe(true);
  });
});
