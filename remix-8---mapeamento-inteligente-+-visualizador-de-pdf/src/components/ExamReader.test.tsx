// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
vi.mock('./DocumentPreview', () => ({ DocumentPreview: ({ initialPage }: { initialPage: number }) => <div>PDF na página {initialPage}</div> }));
vi.mock('./SourceDocuments', () => ({ SourceDocuments: () => <div>Original da conta</div> }));
import { ExamReader } from './ExamReader';
import { createNewSimulado } from '../utils/provasManager';
const proof = { ...createNewSimulado('Minha prova', 2), extractedQuestions: [{ number: 1, subject: 'Matemática', page: 2, statement: 'Qual fração representa a metade?', options: [{ label: 'A' as const, text: '1/2' }] }] };
const props = { simulado: proof, index: 0, onNavigate: vi.fn(), onAnswer: vi.fn(), onClose: vi.fn() };
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  vi.stubGlobal('URL', class extends URL { static createObjectURL = vi.fn(() => 'blob:pdf'); static revokeObjectURL = vi.fn(); });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('consulta simultânea e móvel da prova', () => {
  it('usa abas no celular e mantém o PDF selecionado ao alternar para o enunciado', () => {
    render(<ExamReader {...props}/>); fireEvent.click(screen.getByRole('button', { name: 'Ver arquivo original da prova' }));
    expect(screen.getByRole('tab', { name: 'PDF original' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.change(screen.getByLabelText('Abrir PDF original da prova'), { target: { files: [new File(['%PDF'], 'Prova.pdf', { type: 'application/pdf' })] } });
    expect(screen.getByText('PDF na página 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Questão' })); expect(screen.getByRole('button', { name: /^A\s*1\/2$/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'PDF original' })); expect(screen.getByText('PDF na página 2')).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'PDF original' }), { key: 'ArrowLeft' }); expect(screen.getByRole('tab', { name: 'Questão' }).getAttribute('aria-selected')).toBe('true');
  });
  it('mostra questão e original simultaneamente no computador e fecha só o painel', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    render(<ExamReader {...props}/>); fireEvent.click(screen.getByRole('button', { name: 'Ver arquivo original da prova' }));
    expect(screen.getByRole('button', { name: /^A\s*1\/2$/ })).toBeTruthy(); expect(screen.getByRole('complementary', { name: 'Arquivo original da prova' })).toBeTruthy(); expect(screen.queryByRole('tablist')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Fechar painel do PDF' })); expect(screen.queryByRole('complementary')).toBeNull(); expect(props.onClose).not.toHaveBeenCalled();
  });
  it('consulta a origem de um flashcard sem editar a resposta', () => {
    render(<ExamReader {...props} readOnly/>); const option = screen.getByRole('button', { name: /^A\s*1\/2$/ }) as HTMLButtonElement;
    expect(option.disabled).toBe(true); fireEvent.click(option); expect(props.onAnswer).not.toHaveBeenCalled();
  });
});
