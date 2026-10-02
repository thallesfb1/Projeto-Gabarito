// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const mocks=vi.hoisted(()=>({extract:vi.fn()}));
vi.mock('../utils/aiClient',()=>({extractWithAI:mocks.extract}));
import { AIImportModal } from './AIImportModal';
import { createNewSimulado } from '../utils/provasManager';
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
  fireEvent.click(screen.getByRole('checkbox',{name:/Enviar este arquivo/}));
}
describe('conferência de IA',()=>{
  it('exige consentimento e revisão, permite corrigir OCR e só então aplica',async()=>{
    const onKey=vi.fn().mockResolvedValue(undefined);const onClose=vi.fn();
    render(<AIImportModal initialMode="key" simulado={createNewSimulado('Minha prova',2)} onKey={onKey} onCreate={vi.fn()} onClose={onClose}/>);
    expect(screen.getByRole('button',{name:'Extrair e conferir'}).hasAttribute('disabled')).toBe(true);
    await prepare();fireEvent.click(screen.getByRole('button',{name:'Extrair e conferir'}));
    await screen.findByRole('heading',{name:'Confira a leitura antes de importar'});
    expect(onKey).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Importar gabarito conferido'}).hasAttribute('disabled')).toBe(true);
    fireEvent.change(screen.getByRole('combobox',{name:'Gabarito da questão 1'}),{target:{value:'B'}});
    fireEvent.click(screen.getByRole('checkbox',{name:/Conferi a leitura/}));fireEvent.click(screen.getByRole('button',{name:'Importar gabarito conferido'}));
    await waitFor(()=>expect(onKey).toHaveBeenCalled());expect(onKey.mock.calls[0][0].answers[0].answer).toBe('B');expect(onClose).toHaveBeenCalledTimes(1);
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
    expect((await screen.findByRole('alert')).textContent).toContain('tipo do gabarito');expect(onKey).not.toHaveBeenCalled();
  });
});
